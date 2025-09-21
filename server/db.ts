import { createPool } from "mysql2/promise";

// Centralized MySQL connection pool
export const pool = createPool({
  host: process.env.MYSQL_HOST || "localhost",
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || 10),
  queueLimit: 0,
});

export async function dbHealthCheck() {
  // Simple query to validate connectivity
  const [rows] = await pool.query("SELECT 1 AS ok");
  return rows;
}
