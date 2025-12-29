import type { RequestHandler } from "express";
import { z } from "zod";
import { pool } from "../db";
import type {
  VehicleSearchRequest,
  VehicleSearchResponse,
  AvailabilityQuery,
  AvailabilityResponse,
  CreateVehicleRequest,
  CreateVehicleResponse,
  ListVehiclesResponse,
  AddVehicleDocumentRequest,
  AddVehicleDocumentResponse,
  AddMaintenanceRequest,
  AddMaintenanceResponse,
  AddMileageRequest,
  AddMileageResponse,
  AddInsurancePolicyRequest,
  AddInsurancePolicyResponse,
  AddInsuranceClaimRequest,
  AddInsuranceClaimResponse,
  AddFuelLogRequest,
  AddFuelLogResponse,
} from "@shared/api";

// NOTE: The current schema does not include a `vehicles` table nor `bookings.vehicle_id`.
// We implement vehicle search (in-house + partner) as a stub for now and provide
// driver availability checks using the existing `bookings.driver_id` field.
// See db_dump.sql migration snippet to add vehicles support.

const VehicleSearchSchema = z.object({
  q: z.string().optional(),
  capacity_min: z.coerce.number().int().min(1).optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
});

export const searchVehicles: RequestHandler = async (req, res) => {
  try {
    const parsed = VehicleSearchSchema.safeParse(req.query as VehicleSearchRequest);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ ok: false, items: [], error: parsed.error.issues[0]?.message } as VehicleSearchResponse & { error: string });
    }

    const { q, capacity_min, start_time, end_time } = parsed.data;

    // Build dynamic SQL
    const conditions: string[] = [];
    const vals: any[] = [];
    if (q && q.trim()) {
      conditions.push("(v.name LIKE ? OR v.make LIKE ? OR v.model LIKE ? OR v.plate LIKE ? OR v.vin LIKE ?)");
      const like = `%${q.trim()}%`;
      vals.push(like, like, like, like, like);
    }
    if (capacity_min !== undefined) {
      conditions.push("(v.capacity IS NULL OR v.capacity >= ?)");
      vals.push(capacity_min);
    }

    let where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // Exclude vehicles with overlapping bookings if time window provided
    let availabilityJoin = '';
    if (start_time && end_time) {
      availabilityJoin = `
        AND NOT EXISTS (
          SELECT 1 FROM bookings b
           WHERE b.vehicle_id = v.id
             AND b.status IN ('scheduled','confirmed')
             AND NOT (b.end_time <= ? OR b.start_time >= ?)
        )`;
      vals.push(start_time.replace('T',' '), end_time.replace('T',' '));
    }

    const sql = `SELECT v.*
                 FROM vehicles v
                 ${where}
                 ${availabilityJoin}
                 ORDER BY v.created_at DESC
                 LIMIT 200`;

    const [rows] = await pool.query<any[]>(sql, vals);
    const items = (rows as any[]).map((r) => ({
      ...r,
      created_at: new Date(r.created_at).toISOString(),
      updated_at: new Date(r.updated_at).toISOString(),
    }));

    return res.json({ ok: true, items } as VehicleSearchResponse);
  } catch (err: any) {
    return res.status(500).json({ ok: false, items: [] } as VehicleSearchResponse);
  }
};

const AvailabilitySchema = z.object({
  start_time: z.string().min(10),
  end_time: z.string().min(10),
  driver_id: z.coerce.number().int().positive().optional(),
  vehicle_id: z.coerce.number().int().positive().optional(),
});

export const checkAvailability: RequestHandler = async (req, res) => {
  try {
    const parsed = AvailabilitySchema.safeParse((req.method === 'GET' ? req.query : req.body) as AvailabilityQuery);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ ok: false, conflicts: [], error: parsed.error.issues[0]?.message } as AvailabilityResponse & { error: string });
    }
    const { start_time, end_time, driver_id, vehicle_id } = parsed.data;

    const conflicts: AvailabilityResponse["conflicts"] = [];

    // Driver conflict check using existing bookings table
    let driver_available: boolean | undefined = undefined;
    if (driver_id) {
      const [rows] = await pool.query<any[]>(
        `SELECT id, start_time, end_time FROM bookings
         WHERE driver_id = ?
           AND status IN ('scheduled','confirmed')
           AND NOT (end_time <= ? OR start_time >= ?)
         LIMIT 10`,
        [driver_id, start_time.replace('T',' '), end_time.replace('T',' ')]
      );
      if (Array.isArray(rows) && rows.length > 0) {
        driver_available = false;
        for (const r of rows) {
          conflicts!.push({
            booking_id: r.id,
            start_time: new Date(r.start_time).toISOString(),
            end_time: new Date(r.end_time).toISOString(),
            resource: 'driver',
          });
        }
      } else {
        driver_available = true;
      }
    }

    // Vehicle conflict check using bookings table (requires migration applied)
    let vehicle_available: boolean | undefined = undefined;
    if (vehicle_id) {
      const [vrows] = await pool.query<any[]>(
        `SELECT id, start_time, end_time FROM bookings
         WHERE vehicle_id = ?
           AND status IN ('scheduled','confirmed')
           AND NOT (end_time <= ? OR start_time >= ?)
         LIMIT 10`,
        [vehicle_id, start_time.replace('T',' '), end_time.replace('T',' ')]
      );
      if (Array.isArray(vrows) && vrows.length > 0) {
        vehicle_available = false;
        for (const r of vrows) {
          conflicts!.push({
            booking_id: r.id,
            start_time: new Date(r.start_time).toISOString(),
            end_time: new Date(r.end_time).toISOString(),
            resource: 'vehicle',
          });
        }
      } else {
        vehicle_available = true;
      }
    }

    return res.json({ ok: true, driver_available, vehicle_available, conflicts } as AvailabilityResponse);
  } catch (err: any) {
    return res.status(500).json({ ok: false } as AvailabilityResponse);
  }
};

// ---- Vehicle Management Handlers ----

function requireAdmin(req: any): boolean {
  const configured = process.env.ADMIN_TOKEN?.trim();
  if (!configured) return true; // no guard configured
  const header = (req.headers["x-admin-token"] as string | undefined)?.trim();
  return Boolean(header && configured && header === configured);
}

// Create vehicle
const CreateVehicleSchema = z.object({
  name: z.string().min(1).max(150),
  make: z.string().max(100).optional().or(z.literal("")),
  model: z.string().max(100).optional().or(z.literal("")),
  year: z.coerce.number().int().min(1900).max(3000).optional(),
  color: z.string().max(50).optional().or(z.literal("")),
  plate: z.string().max(50).optional().or(z.literal("")),
  vin: z.string().max(100).optional().or(z.literal("")),
  capacity: z.coerce.number().int().min(1).max(100).optional(),
  status: z.enum(["active","inactive"]).optional().default("active"),
  image_url: z.string().optional(),
});

export const createVehicle: RequestHandler = async (req, res) => {
  try {
    if (!requireAdmin(req)) return res.status(401).json({ ok: false, error: "Admin only" } as CreateVehicleResponse);
    const parsed = CreateVehicleSchema.safeParse(req.body as CreateVehicleRequest);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" } as CreateVehicleResponse);
    }
    const v = parsed.data;
    const [result] = await pool.execute<import("mysql2/promise").ResultSetHeader>(
      `INSERT INTO vehicles (name, make, model, year, color, plate, vin, capacity, status, image_url)
       VALUES (?, NULLIF(?, ''), NULLIF(?, ''), ?, NULLIF(?, ''), NULLIF(?, ''), NULLIF(?, ''), ?, ?, ?)`,
      [v.name, v.make ?? "", v.model ?? "", v.year ?? null, v.color ?? "", v.plate ?? "", v.vin ?? "", v.capacity ?? null, v.status ?? "active", v.image_url ?? null]
    );
    return res.json({ ok: true, id: result.insertId } as CreateVehicleResponse);
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message ?? "Server error" } as CreateVehicleResponse);
  }
};

export const listVehicles: RequestHandler = async (_req, res) => {
  try {
    const [rows] = await pool.query<any[]>(`SELECT * FROM vehicles ORDER BY created_at DESC LIMIT 500`);
    const items = (rows as any[]).map((r) => ({
      ...r,
      created_at: new Date(r.created_at).toISOString(),
      updated_at: new Date(r.updated_at).toISOString(),
    }));
    return res.json({ ok: true, items } as ListVehiclesResponse);
  } catch (err: any) {
    return res.status(500).json({ ok: false, items: [] } as ListVehiclesResponse);
  }
};

// Documents
const AddDocSchema = z.object({
  type: z.enum(["registration","insurance","maintenance","other"]),
  title: z.string().min(1).max(200),
  file_url: z.string().min(1),
});

export const addVehicleDocument: RequestHandler = async (req, res) => {
  try {
    if (!requireAdmin(req)) return res.status(401).json({ ok: false, error: "Admin only" } as AddVehicleDocumentResponse);
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ ok: false, error: "Invalid vehicle id" } as AddVehicleDocumentResponse);
    const parsed = AddDocSchema.safeParse(req.body as AddVehicleDocumentRequest);
    if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" } as AddVehicleDocumentResponse);
    const d = parsed.data;
    const [result] = await pool.execute<import("mysql2/promise").ResultSetHeader>(
      `INSERT INTO vehicle_documents (vehicle_id, type, title, file_url) VALUES (?, ?, ?, ?)`,
      [id, d.type, d.title, d.file_url]
    );
    return res.json({ ok: true, id: result.insertId } as AddVehicleDocumentResponse);
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message ?? "Server error" } as AddVehicleDocumentResponse);
  }
};

// Maintenance
const AddMaintSchema = z.object({
  title: z.string().min(1).max(200),
  schedule_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export const addMaintenance: RequestHandler = async (req, res) => {
  try {
    if (!requireAdmin(req)) return res.status(401).json({ ok: false, error: "Admin only" } as AddMaintenanceResponse);
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ ok: false, error: "Invalid vehicle id" } as AddMaintenanceResponse);
    const parsed = AddMaintSchema.safeParse(req.body as AddMaintenanceRequest);
    if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" } as AddMaintenanceResponse);
    const m = parsed.data;
    const [result] = await pool.execute<import("mysql2/promise").ResultSetHeader>(
      `INSERT INTO maintenance (vehicle_id, title, schedule_date, notes) VALUES (?, ?, ?, NULLIF(?, ''))`,
      [id, m.title, m.schedule_date, m.notes ?? ""]
    );
    return res.json({ ok: true, id: result.insertId } as AddMaintenanceResponse);
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message ?? "Server error" } as AddMaintenanceResponse);
  }
};

// Mileage
const AddMileageSchema = z.object({
  driver_id: z.coerce.number().int().positive().optional(),
  odometer_km: z.coerce.number().int().min(0),
  job_sheet_url: z.string().min(1),
  note: z.string().max(2000).optional().or(z.literal("")),
});

export const addMileage: RequestHandler = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ ok: false, error: "Invalid vehicle id" } as AddMileageResponse);
    const parsed = AddMileageSchema.safeParse(req.body as AddMileageRequest);
    if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" } as AddMileageResponse);
    const m = parsed.data;
    const [result] = await pool.execute<import("mysql2/promise").ResultSetHeader>(
      `INSERT INTO mileage_logs (vehicle_id, driver_id, odometer_km, job_sheet_url, note)
       VALUES (?, ?, ?, ?, NULLIF(?, ''))`,
      [id, m.driver_id ?? null, m.odometer_km, m.job_sheet_url, m.note ?? ""]
    );
    return res.json({ ok: true, id: result.insertId } as AddMileageResponse);
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message ?? "Server error" } as AddMileageResponse);
  }
};

// Insurance policy
const AddPolicySchema = z.object({
  provider: z.string().min(1).max(200),
  policy_number: z.string().min(1).max(200),
  category: z.enum(["comprehensive","third_party","collision","liability","other"]).optional(),
  coverage_details: z.string().max(5000).optional().or(z.literal("")),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const addInsurancePolicy: RequestHandler = async (req, res) => {
  try {
    if (!requireAdmin(req)) return res.status(401).json({ ok: false, error: "Admin only" } as AddInsurancePolicyResponse);
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ ok: false, error: "Invalid vehicle id" } as AddInsurancePolicyResponse);
    const parsed = AddPolicySchema.safeParse(req.body as AddInsurancePolicyRequest);
    if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" } as AddInsurancePolicyResponse);
    const p = parsed.data;
    const [result] = await pool.execute<import("mysql2/promise").ResultSetHeader>(
      `INSERT INTO insurance_policies (vehicle_id, provider, policy_number, category, coverage_details, start_date, expiry_date)
       VALUES (?, ?, ?, NULLIF(?, ''), NULLIF(?, ''), ?, ?)`,
      [id, p.provider, p.policy_number, p.category ?? "", p.coverage_details ?? "", p.start_date, p.expiry_date]
    );
    return res.json({ ok: true, id: result.insertId } as AddInsurancePolicyResponse);
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message ?? "Server error" } as AddInsurancePolicyResponse);
  }
};

// Insurance claim
const AddClaimSchema = z.object({
  policy_id: z.coerce.number().int().positive().optional(),
  incident_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().min(1).max(5000),
  claim_number: z.string().max(200).optional().or(z.literal("")),
  status: z.enum(["open","closed","pending"]).optional().default("open"),
});

export const addInsuranceClaim: RequestHandler = async (req, res) => {
  try {
    if (!requireAdmin(req)) return res.status(401).json({ ok: false, error: "Admin only" } as AddInsuranceClaimResponse);
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ ok: false, error: "Invalid vehicle id" } as AddInsuranceClaimResponse);
    const parsed = AddClaimSchema.safeParse(req.body as AddInsuranceClaimRequest);
    if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" } as AddInsuranceClaimResponse);
    const c = parsed.data;
    const [result] = await pool.execute<import("mysql2/promise").ResultSetHeader>(
      `INSERT INTO insurance_claims (vehicle_id, policy_id, incident_date, description, claim_number, status)
       VALUES (?, ?, ?, ?, NULLIF(?, ''), ?)`,
      [id, c.policy_id ?? null, c.incident_date, c.description, c.claim_number ?? "", c.status ?? "open"]
    );
    return res.json({ ok: true, id: result.insertId } as AddInsuranceClaimResponse);
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message ?? "Server error" } as AddInsuranceClaimResponse);
  }
};

// Fuel log
const AddFuelSchema = z.object({
  driver_id: z.coerce.number().int().positive().optional(),
  liters: z.coerce.number().min(0),
  cost_cents: z.coerce.number().int().min(0),
  odometer_km: z.coerce.number().int().min(0).optional(),
  filled_at: z.string().min(10),
});

export const addFuelLog: RequestHandler = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ ok: false, error: "Invalid vehicle id" } as AddFuelLogResponse);
    const parsed = AddFuelSchema.safeParse(req.body as AddFuelLogRequest);
    if (!parsed.success) return res.status(400).json({ ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" } as AddFuelLogResponse);
    const f = parsed.data;
    const [result] = await pool.execute<import("mysql2/promise").ResultSetHeader>(
      `INSERT INTO fuel_logs (vehicle_id, driver_id, liters, cost_cents, odometer_km, filled_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, f.driver_id ?? null, f.liters, f.cost_cents, f.odometer_km ?? null, f.filled_at.replace('T',' ')]
    );
    return res.json({ ok: true, id: result.insertId } as AddFuelLogResponse);
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message ?? "Server error" } as AddFuelLogResponse);
  }
};

// Update vehicle
export const updateVehicle: RequestHandler = async (req, res) => {
  try {
    if (!requireAdmin(req)) return res.status(401).json({ ok: false, error: "Admin only" });
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ ok: false, error: "Invalid vehicle id" });
    
    const parsed = CreateVehicleSchema.safeParse(req.body as CreateVehicleRequest);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" });
    }
    
    const v = parsed.data;
    const image_url = (req.body as any).image_url || null;
    
    const [result] = await pool.execute<import("mysql2/promise").ResultSetHeader>(
      `UPDATE vehicles 
       SET name = ?, make = NULLIF(?, ''), model = NULLIF(?, ''), year = ?, 
           color = NULLIF(?, ''), plate = NULLIF(?, ''), vin = NULLIF(?, ''), 
           capacity = ?, status = ?, image_url = ?
       WHERE id = ?`,
      [v.name, v.make ?? "", v.model ?? "", v.year ?? null, v.color ?? "", v.plate ?? "", v.vin ?? "", v.capacity ?? null, v.status ?? "active", image_url, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, error: "Vehicle not found" });
    }
    
    return res.json({ ok: true, message: "Vehicle updated successfully" });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message ?? "Server error" });
  }
};

// Delete vehicle
export const deleteVehicle: RequestHandler = async (req, res) => {
  try {
    if (!requireAdmin(req)) return res.status(401).json({ ok: false, error: "Admin only" });
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ ok: false, error: "Invalid vehicle id" });
    
    // Check if vehicle has bookings
    const [bookings] = await pool.query<any[]>(
      'SELECT id FROM bookings WHERE vehicle_id = ? LIMIT 1',
      [id]
    );
    
    if (Array.isArray(bookings) && bookings.length > 0) {
      return res.status(400).json({ ok: false, error: "Cannot delete vehicle with existing bookings" });
    }
    
    const [result] = await pool.execute<import("mysql2/promise").ResultSetHeader>(
      'DELETE FROM vehicles WHERE id = ?',
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ ok: false, error: "Vehicle not found" });
    }
    
    return res.json({ ok: true, message: "Vehicle deleted successfully" });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message ?? "Server error" });
  }
};

// Get single vehicle
export const getVehicle: RequestHandler = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ ok: false, error: "Invalid vehicle id" });
    
    const [rows] = await pool.query<any[]>(
      'SELECT * FROM vehicles WHERE id = ?',
      [id]
    );
    
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Vehicle not found" });
    }
    
    const vehicle = {
      ...rows[0],
      created_at: new Date(rows[0].created_at).toISOString(),
      updated_at: new Date(rows[0].updated_at).toISOString(),
    };
    
    return res.json({ ok: true, vehicle });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message ?? "Server error" });
  }
};

// Get vehicle documents
export const getVehicleDocuments: RequestHandler = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ ok: false, error: "Invalid vehicle id" });
    
    const [rows] = await pool.query<any[]>(
      'SELECT * FROM vehicle_documents WHERE vehicle_id = ? ORDER BY created_at DESC',
      [id]
    );
    
    const documents = rows.map(doc => ({
      ...doc,
      created_at: new Date(doc.created_at).toISOString(),
    }));
    
    return res.json({ ok: true, documents });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message ?? "Server error" });
  }
};
