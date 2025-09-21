import type { RequestHandler } from "express";
import { z } from "zod";
import { pool } from "../db";
import type { CreateCustomerRequest, CreateCustomerResponse } from "@shared/api";

const CreateCustomerSchema = z.object({
  first_name: z.string().min(1, "First name is required").max(100),
  last_name: z.string().min(1, "Last name is required").max(100),
  email: z.string().email().max(255).optional().or(z.literal("")),
  phone: z.string().max(50).optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export const handleCreateCustomer: RequestHandler = async (req, res) => {
  try {
    // Admin-only guard: require a matching ADMIN_TOKEN when it's configured
    const configuredToken = process.env.ADMIN_TOKEN?.trim();
    if (configuredToken) {
      const headerToken = (req.headers["x-admin-token"] as string | undefined)?.trim();
      if (!headerToken || headerToken !== configuredToken) {
        return res.status(401).json({ ok: false, error: "Unauthorized: admin token required" } as CreateCustomerResponse);
      }
    }

    const parse = CreateCustomerSchema.safeParse(req.body as CreateCustomerRequest);
    if (!parse.success) {
      return res.status(400).json({ ok: false, error: parse.error.issues[0]?.message ?? "Invalid input" } as CreateCustomerResponse);
    }

    const data = parse.data;
    const [result] = await pool.execute<import("mysql2/promise").ResultSetHeader>(
      `INSERT INTO customers (first_name, last_name, email, phone, notes)
       VALUES (?, ?, NULLIF(?, ''), NULLIF(?, ''), NULLIF(?, ''))`,
      [data.first_name, data.last_name, data.email ?? "", data.phone ?? "", data.notes ?? ""]
    );

    return res.json({ ok: true, id: result.insertId } as CreateCustomerResponse);
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message ?? "Server error" } as CreateCustomerResponse);
  }
};
