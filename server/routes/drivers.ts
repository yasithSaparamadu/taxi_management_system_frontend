import type { RequestHandler } from "express";
import { z } from "zod";
import { pool } from "../db";
import type { CreateDriverRequest, CreateDriverResponse } from "@shared/api";

const CreateDriverSchema = z.object({
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  email: z.string().email().max(255).optional().or(z.literal("")),
  phone: z.string().max(50).optional().or(z.literal("")),
  license_number: z.string().min(1).max(100),
  license_expiry: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  hire_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  address: z.string().max(255).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  state: z.string().max(100).optional().or(z.literal("")),
  zipcode: z.string().max(20).optional().or(z.literal("")),
  experience_years: z.coerce.number().int().min(0).optional(),
  salary_cents: z.coerce.number().int().min(0).optional(),
  status: z.enum(["active", "inactive"]).optional().default("active"),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export const handleCreateDriver: RequestHandler = async (req, res) => {
  try {
    // Admin-only guard using ADMIN_TOKEN when configured
    const configuredToken = process.env.ADMIN_TOKEN?.trim();
    if (configuredToken) {
      const headerToken = (req.headers["x-admin-token"] as string | undefined)?.trim();
      if (!headerToken || headerToken !== configuredToken) {
        return res.status(401).json({ ok: false, error: "Unauthorized: admin token required" } as CreateDriverResponse);
      }
    }

    const parsed = CreateDriverSchema.safeParse(req.body as CreateDriverRequest);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" } as CreateDriverResponse);
    }
    const d = parsed.data;

    const [result] = await pool.execute<import("mysql2/promise").ResultSetHeader>(
      `INSERT INTO drivers (
        first_name, last_name, email, phone, license_number, license_expiry,
        hire_date, dob, address, city, state, zipcode, experience_years,
        salary_cents, status, notes
      ) VALUES (
        ?, ?, NULLIF(?, ''), NULLIF(?, ''), ?, NULLIF(?, ''),
        NULLIF(?, ''), NULLIF(?, ''), NULLIF(?, ''), NULLIF(?, ''), NULLIF(?, ''), NULLIF(?, ''), ?,
        ?, ?, NULLIF(?, '')
      )`,
      [
        d.first_name,
        d.last_name,
        d.email ?? "",
        d.phone ?? "",
        d.license_number,
        d.license_expiry ?? "",
        d.hire_date ?? "",
        d.dob ?? "",
        d.address ?? "",
        d.city ?? "",
        d.state ?? "",
        d.zipcode ?? "",
        d.experience_years ?? null,
        d.salary_cents ?? null,
        d.status ?? "active",
        d.notes ?? "",
      ]
    );

    return res.json({ ok: true, id: result.insertId } as CreateDriverResponse);
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message ?? "Server error" } as CreateDriverResponse);
  }
};
