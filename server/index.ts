import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { handleDbPing } from "./routes/db-ping";
import { handleCreateCustomer } from "./routes/customers";
import { handleCreateDriver } from "./routes/drivers";
import { createBooking, confirmBooking, updateBooking, listBookings, decideBooking } from "./routes/bookings";
import { searchVehicles, checkAvailability, createVehicle, listVehicles, addVehicleDocument, addMaintenance, addMileage, addInsurancePolicy, addInsuranceClaim, addFuelLog } from "./routes/vehicles";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);
  app.get("/api/db-ping", handleDbPing);
  app.post("/api/customers", handleCreateCustomer);
  app.post("/api/drivers", handleCreateDriver);
  // Bookings
  app.get("/api/bookings", listBookings);
  app.post("/api/bookings", createBooking);
  app.post("/api/bookings/:id/confirm", confirmBooking);
  app.post("/api/bookings/:id/decision", decideBooking);
  app.patch("/api/bookings/:id", updateBooking);

  // Vehicles & Availability
  app.get("/api/vehicles/search", searchVehicles);
  app.post("/api/vehicles", createVehicle);
  app.get("/api/vehicles", listVehicles);
  app.post("/api/vehicles/:id/documents", addVehicleDocument);
  app.post("/api/vehicles/:id/maintenance", addMaintenance);
  app.post("/api/vehicles/:id/mileage", addMileage);
  app.post("/api/vehicles/:id/insurance/policies", addInsurancePolicy);
  app.post("/api/vehicles/:id/insurance/claims", addInsuranceClaim);
  app.post("/api/vehicles/:id/fuel-logs", addFuelLog);
  app.get("/api/availability", checkAvailability);
  app.post("/api/availability", checkAvailability);

  return app;
}
