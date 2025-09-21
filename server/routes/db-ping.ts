import { RequestHandler } from "express";
import { dbHealthCheck } from "../db";
import type { DbPingResponse } from "@shared/api";

export const handleDbPing: RequestHandler = async (_req, res) => {
  try {
    const rows = await dbHealthCheck();
    const response: DbPingResponse = {
      ok: true,
      info: Array.isArray(rows) ? rows : [],
    };
    res.json(response);
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message ?? "DB error" });
  }
};
