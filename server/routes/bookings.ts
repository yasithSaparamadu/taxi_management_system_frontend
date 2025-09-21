import type { RequestHandler } from "express";
import { z } from "zod";
import { pool } from "../db";
import type {
  CreateBookingRequest,
  CreateBookingResponse,
  ConfirmBookingRequest,
  ConfirmBookingResponse,
  UpdateBookingRequest,
  UpdateBookingResponse,
  ListBookingsResponse,
  Booking,
  DecisionRequest,
  DecisionResponse,
} from "@shared/api";
import { sendEmail } from "../services/notify";
import { upsertCalendarEvent } from "../services/calendar.ts";

function getRoleFromHeaders(req: any): 'admin' | 'staff' | 'unknown' {
  const admin = process.env.ADMIN_TOKEN?.trim();
  const staff = process.env.STAFF_TOKEN?.trim();
  const hAdmin = (req.headers["x-admin-token"] as string | undefined)?.trim();
  const hStaff = (req.headers["x-staff-token"] as string | undefined)?.trim();
  if (admin && hAdmin && hAdmin === admin) return 'admin';
  if (staff && hStaff && hStaff === staff) return 'staff';
  // Allow admin token in staff header as well
  if (admin && hStaff && hStaff === admin) return 'admin';
  return 'unknown';
}

const isoDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

const CreateSchema = z.object({
  customer_id: z.coerce.number().int().positive(),
  service_id: z.coerce.number().int().positive(),
  start_time: z.string().regex(isoDateTime, "start_time must be ISO-like e.g. 2025-09-22T10:00:00"),
  end_time: z.string().regex(isoDateTime, "end_time must be ISO-like e.g. 2025-09-22T10:30:00"),
  source: z.enum(['email','phone','web']),
  pickup_point: z.string().max(255).optional().or(z.literal("")),
  dropoff_point: z.string().max(255).optional().or(z.literal("")),
  special_instructions: z.string().max(5000).optional().or(z.literal("")),
  contact_name: z.string().max(150).optional().or(z.literal("")),
  contact_phone: z.string().max(50).optional().or(z.literal("")),
  contact_email: z.string().email().max(255).optional().or(z.literal("")),
  estimated_price_cents: z.coerce.number().int().min(0).optional(),
  admin_note: z.string().max(5000).optional(),
  created_by_name: z.string().max(150).optional(),
});

export const createBooking: RequestHandler = async (req, res) => {
  try {
    const role = getRoleFromHeaders(req);
    if (role === 'unknown') {
      return res.status(401).json({ ok: false, error: 'Unauthorized' } as CreateBookingResponse);
    }

    const parsed = CreateSchema.safeParse(req.body as CreateBookingRequest);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' } as CreateBookingResponse);
    }
    const b = parsed.data;

    const [result] = await pool.execute<import('mysql2/promise').ResultSetHeader>(
      `INSERT INTO bookings (
        customer_id, service_id, source, created_by_role, created_by_name,
        staff_id, pickup_point, dropoff_point, special_instructions,
        contact_name, contact_phone, contact_email,
        start_time, end_time, estimated_price_cents, status, admin_note
      ) VALUES (?, ?, ?, ?, NULLIF(?, ''), NULL, NULLIF(?, ''), NULLIF(?, ''), NULLIF(?, ''),
        NULLIF(?, ''), NULLIF(?, ''), NULLIF(?, ''), ?, ?, ?, 'scheduled', NULLIF(?, ''))`,
      [
        b.customer_id,
        b.service_id,
        b.source,
        role,
        b.created_by_name ?? '',
        b.pickup_point ?? '',
        b.dropoff_point ?? '',
        b.special_instructions ?? '',
        b.contact_name ?? '',
        b.contact_phone ?? '',
        b.contact_email ?? '',
        b.start_time.replace('T', ' '),
        b.end_time.replace('T', ' '),
        b.estimated_price_cents ?? null,
        b.admin_note ?? '',
      ]
    );

    // Audit
    await pool.execute(
      `INSERT INTO bookings_audit (booking_id, actor_role, action, admin_only_note)
       VALUES (?, ?, 'create', NULLIF(?, ''))`,
      [result.insertId, role, b.admin_note ?? '']
    );

    const bookingId = result.insertId;

    // Email notifications on create
    const adminTo = process.env.ADMIN_NOTIFY_TO || process.env.SMTP_USER;
    const baseUrl = process.env.BASE_URL || "http://localhost:8080";
    if (adminTo) {
      await sendEmail({
        to: adminTo,
        subject: `New booking (id ${bookingId}) pending approval`,
        html: `<p>A new booking was created by ${role} ${b.created_by_name ?? ''}.</p>
<ul>
  <li>Customer ID: ${b.customer_id}</li>
  <li>Service ID: ${b.service_id}</li>
  <li>When: ${b.start_time} to ${b.end_time}</li>
  <li>Pickup: ${b.pickup_point ?? ''}</li>
  <li>Dropoff: ${b.dropoff_point ?? ''}</li>
  <li>Contact: ${b.contact_name ?? ''} ${b.contact_phone ?? ''} ${b.contact_email ?? ''}</li>
</ul>
<p>Approve in admin panel at ${baseUrl}/bookings</p>`
      });
    }
    if (b.contact_email) {
      await sendEmail({
        to: b.contact_email,
        subject: `We received your booking request (pending confirmation)`,
        html: `<p>Thank you for your request. This is an acknowledgement only; confirmation is pending.</p>
<ul>
  <li>When: ${b.start_time} to ${b.end_time}</li>
  <li>Pickup: ${b.pickup_point ?? ''}</li>
  <li>Dropoff: ${b.dropoff_point ?? ''}</li>
</ul>`
      });
    }

    return res.json({ ok: true, id: bookingId } as CreateBookingResponse);
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message ?? 'Server error' } as CreateBookingResponse);
  }
};

// Admin-only decision endpoint: confirm or decline
export const decideBooking: RequestHandler = async (req, res) => {
  try {
    const role = getRoleFromHeaders(req);
    if (role !== 'admin') {
      return res.status(401).json({ ok: false, error: 'Admin only' } as DecisionResponse);
    }
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ ok: false, error: 'Invalid booking id' } as DecisionResponse);

    const parsed = z.object({ action: z.enum(['confirm','decline']), reason: z.string().max(2000).optional() }).safeParse(req.body as DecisionRequest);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' } as DecisionResponse);
    }
    const { action, reason } = parsed.data;

    if (action === 'confirm') {
      // Defer to the existing confirm flow without driver assignment
      req.body = {};
      return confirmBooking(req, res, (() => {}) as any);
    }

    // decline -> set status cancelled, audit, notify customer
    await pool.execute(
      `UPDATE bookings SET status='cancelled', updated_at=CURRENT_TIMESTAMP WHERE id=?`,
      [id]
    );

    await pool.execute(
      `INSERT INTO bookings_audit (booking_id, actor_role, action, admin_only_note)
       VALUES (?, 'admin', 'cancel', NULLIF(?, ''))`,
      [id, reason ?? '']
    );

    try { await upsertCalendarEvent(id); } catch (e) { console.warn('[calendar] upsert failed', e); }

    // Notify customer about decline
    try {
      const [rows] = await pool.query<any[]>(`SELECT contact_email, start_time, end_time FROM bookings WHERE id=?`, [id]);
      const row = Array.isArray(rows) ? rows[0] : undefined;
      if (row?.contact_email) {
        await sendEmail({
          to: row.contact_email,
          subject: `Booking declined (#${id})`,
          html: `<p>We are sorry, but your booking could not be accommodated.</p>
${reason ? `<p>Reason: ${reason}</p>` : ''}
<p>Window: ${new Date(row.start_time).toISOString()} to ${new Date(row.end_time).toISOString()}</p>`
        });
      }
    } catch (e) { console.warn('[notify] decline notification failed', e); }

    return res.json({ ok: true } as DecisionResponse);
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message ?? 'Server error' } as DecisionResponse);
  }
};

const ConfirmSchema = z.object({
  driver_id: z.coerce.number().int().positive().optional(),
});

export const confirmBooking: RequestHandler = async (req, res) => {
  try {
    const role = getRoleFromHeaders(req);
    if (role !== 'admin') {
      return res.status(401).json({ ok: false, error: 'Admin only' } as ConfirmBookingResponse);
    }
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ ok: false, error: 'Invalid booking id' } as ConfirmBookingResponse);

    const parsed = ConfirmSchema.safeParse(req.body as ConfirmBookingRequest);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' } as ConfirmBookingResponse);
    }
    const d = parsed.data;

    // Generate a customer verification token if not exists
    const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    await pool.execute(
      `UPDATE bookings
       SET status='confirmed', confirmed_at=NOW(), driver_id=COALESCE(?, driver_id),
           customer_verify_token = COALESCE(customer_verify_token, ?)
       WHERE id=?`,
      [d.driver_id ?? null, token, id]
    );

    await pool.execute(
      `INSERT INTO bookings_audit (booking_id, actor_role, action)
       VALUES (?, 'admin', 'confirm')`,
      [id]
    );

    // Calendar sync
    try { await upsertCalendarEvent(id); } catch (e) { console.warn('[calendar] upsert failed', e); }

    // Email customer with verification link (if we have contact email)
    const baseUrl = process.env.BASE_URL || "http://localhost:8080";
    const [rows] = await pool.query<any[]>(`SELECT contact_email, pickup_point, dropoff_point, start_time, end_time, customer_verify_token, driver_id FROM bookings WHERE id=?`, [id]);
    const row = Array.isArray(rows) ? rows[0] : undefined;
    if (row?.contact_email && row?.customer_verify_token) {
      const verifyUrl = `${baseUrl}/api/bookings/${id}/customer-verify?token=${encodeURIComponent(row.customer_verify_token)}`;
      await sendEmail({
        to: row.contact_email,
        subject: `Booking confirmed - please verify details`,
        html: `<p>Your booking has been confirmed. Please verify the details:</p>
<ul>
  <li>When: ${new Date(row.start_time).toISOString()} to ${new Date(row.end_time).toISOString()}</li>
  <li>Pickup: ${row.pickup_point ?? ''}</li>
  <li>Dropoff: ${row.dropoff_point ?? ''}</li>
</ul>
<p>Click to verify: <a href="${verifyUrl}">${verifyUrl}</a></p>`
      });
    }

    // Notify assigned driver (if driver set and driver has email)
    if (d.driver_id || row?.driver_id) {
      const driverId = d.driver_id ?? row.driver_id;
      const [drows] = await pool.query<any[]>(
        `SELECT email, first_name, last_name FROM drivers WHERE id=? LIMIT 1`,
        [driverId]
      );
      const drow = Array.isArray(drows) ? drows[0] : undefined;
      if (drow?.email) {
        await sendEmail({
          to: drow.email,
          subject: `New assignment: Booking #${id}`,
          html: `<p>Hello ${drow.first_name ?? ''} ${drow.last_name ?? ''},</p>
<p>You have been assigned a booking.</p>
<ul>
  <li>When: ${row ? new Date(row.start_time).toISOString() : ''} to ${row ? new Date(row.end_time).toISOString() : ''}</li>
  <li>Pickup: ${row?.pickup_point ?? ''}</li>
  <li>Dropoff: ${row?.dropoff_point ?? ''}</li>
</ul>`
        });
      }
    }

    return res.json({ ok: true } as ConfirmBookingResponse);
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message ?? 'Server error' } as ConfirmBookingResponse);
  }
};

const UpdateSchema = z.object({
  service_id: z.coerce.number().int().positive().optional(),
  start_time: z.string().regex(isoDateTime).optional(),
  end_time: z.string().regex(isoDateTime).optional(),
  estimated_price_cents: z.union([z.coerce.number().int().min(0), z.null()]).optional(),
  status: z.enum(['scheduled','confirmed','completed','cancelled','no_show']).optional(),
  admin_note: z.string().max(5000).optional(),
});

export const updateBooking: RequestHandler = async (req, res) => {
  try {
    const role = getRoleFromHeaders(req);
    if (role !== 'admin') {
      return res.status(401).json({ ok: false, error: 'Admin only' } as UpdateBookingResponse);
    }
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ ok: false, error: 'Invalid booking id' } as UpdateBookingResponse);

    const parsed = UpdateSchema.safeParse(req.body as UpdateBookingRequest);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' } as UpdateBookingResponse);
    }
    const b = parsed.data;

    // Build dynamic update
    const fields: string[] = [];
    const vals: any[] = [];
    if (b.service_id !== undefined) { fields.push('service_id=?'); vals.push(b.service_id); }
    if (b.start_time !== undefined) { fields.push('start_time=?'); vals.push(b.start_time.replace('T', ' ')); }
    if (b.end_time !== undefined) { fields.push('end_time=?'); vals.push(b.end_time.replace('T', ' ')); }
    if (b.estimated_price_cents !== undefined) { fields.push('estimated_price_cents=?'); vals.push(b.estimated_price_cents); }
    if (b.status !== undefined) { fields.push('status=?'); vals.push(b.status); }
    if (b.admin_note !== undefined) { fields.push('admin_note=NULLIF(?, "")'); vals.push(b.admin_note ?? ''); }

    if (fields.length === 0) {
      return res.json({ ok: true } as UpdateBookingResponse);
    }

    const sql = `UPDATE bookings SET ${fields.join(', ')}, updated_at=CURRENT_TIMESTAMP WHERE id=?`;
    vals.push(id);
    await pool.execute(sql, vals);

    await pool.execute(
      `INSERT INTO bookings_audit (booking_id, actor_role, action, admin_only_note)
       VALUES (?, 'admin', 'update', NULLIF(?, ''))`,
      [id, b.admin_note ?? '']
    );

    // Try calendar sync
    try { await upsertCalendarEvent(id); } catch (e) { console.warn('[calendar] upsert failed', e); }

    // Notify customer and driver of update (best-effort)
    try {
      const [rows] = await pool.query<any[]>(
        `SELECT b.contact_email, b.pickup_point, b.dropoff_point, b.start_time, b.end_time, b.driver_id,
                d.email as driver_email, d.first_name as df, d.last_name as dl
         FROM bookings b
         LEFT JOIN drivers d ON d.id = b.driver_id
         WHERE b.id=?`,
        [id]
      );
      const row = Array.isArray(rows) ? rows[0] : undefined;
      const windowText = row ? `${new Date(row.start_time).toISOString()} to ${new Date(row.end_time).toISOString()}` : '';
      if (row?.contact_email) {
        await sendEmail({
          to: row.contact_email,
          subject: `Booking updated (#${id})`,
          html: `<p>Your booking has been updated by admin.</p>
<ul>
  <li>When: ${windowText}</li>
  <li>Pickup: ${row?.pickup_point ?? ''}</li>
  <li>Dropoff: ${row?.dropoff_point ?? ''}</li>
</ul>`
        });
      }
      if (row?.driver_email) {
        await sendEmail({
          to: row.driver_email,
          subject: `Assigned booking updated (#${id})`,
          html: `<p>A booking assigned to you has been updated.</p>
<ul>
  <li>When: ${windowText}</li>
  <li>Pickup: ${row?.pickup_point ?? ''}</li>
  <li>Dropoff: ${row?.dropoff_point ?? ''}</li>
</ul>`
        });
      }
    } catch (e) {
      console.warn('[notify] update notification failed', e);
    }

    return res.json({ ok: true } as UpdateBookingResponse);
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message ?? 'Server error' } as UpdateBookingResponse);
  }
};

export const listBookings: RequestHandler = async (req, res) => {
  try {
    const role = getRoleFromHeaders(req);
    if (role === 'unknown') {
      return res.status(401).json({ ok: false, items: [] } as ListBookingsResponse);
    }
    const { status, source } = req.query as { status?: string; source?: string };
    const conditions: string[] = [];
    const vals: any[] = [];
    if (status) { conditions.push('b.status=?'); vals.push(status); }
    if (source) { conditions.push('b.source=?'); vals.push(source); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await pool.query<any[]>(
      `SELECT b.* FROM bookings b ${where} ORDER BY b.created_at DESC LIMIT 200`
    );

    // Normalize times to ISO strings
    const items: Booking[] = rows.map((r) => ({
      ...r,
      start_time: new Date(r.start_time).toISOString().replace('.000Z',''),
      end_time: new Date(r.end_time).toISOString().replace('.000Z',''),
      created_at: new Date(r.created_at).toISOString(),
      updated_at: new Date(r.updated_at).toISOString(),
    }));

    return res.json({ ok: true, items } as ListBookingsResponse);
  } catch (err: any) {
    return res.status(500).json({ ok: false, items: [] } as ListBookingsResponse);
  }
};
