import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { handleDbPing } from "./routes/db-ping";
import { handleCreateCustomer } from "./routes/customers";
import { 
  createBooking,
  confirmBooking,
  decideBooking,
  updateBooking,
  listBookings
} from "./routes/bookings";
import { 
  searchVehicles,
  createVehicle,
  listVehicles,
  addVehicleDocument,
  addMaintenance,
  addMileage,
  addInsurancePolicy,
  addInsuranceClaim,
  addFuelLog,
  checkAvailability
} from "./routes/vehicles";
import { 
  handleLogin, 
  handleRegister, 
  handleLogout, 
  handleMe,
  handlePublicRegister
} from "./routes/auth";
import {
  handleListUsers,
  handleGetUser,
  handleCreateUser,
  handleUpdateUser,
  handleDeleteUser,
  handleGetUserStats
} from "./routes/users";
import { authenticate, authorize } from "./middleware/auth";
import { 
  handleDriverDocumentUpload,
  handleDriverDocumentUploadInfo,
  serveUploadedFile
} from "./routes/upload";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Serve uploaded files
  app.use('/uploads', express.static('uploads'));

  // Example API routes
  app.get("/api/ping", (_, res) => res.json({ status: "ok" }));
  app.get("/api/demo", handleDemo);
  app.get("/api/db-ping", handleDbPing);

  // Authentication routes
  app.post("/api/auth/login", handleLogin);
  app.post("/api/auth/register", handleRegister);
  app.post("/api/auth/logout", authenticate, handleLogout);
  app.get("/api/auth/me", authenticate, handleMe);

  // User management routes (admin only)
  app.get("/api/users", authenticate, authorize(['admin']), handleListUsers);
  app.get("/api/users/stats", authenticate, authorize(['admin']), handleGetUserStats);
  app.get("/api/users/:id", authenticate, authorize(['admin']), handleGetUser);
  app.post("/api/users", authenticate, authorize(['admin']), handleCreateUser);
  app.put("/api/users/:id", authenticate, authorize(['admin']), handleUpdateUser);
  app.delete("/api/users/:id", authenticate, authorize(['admin']), handleDeleteUser);

  // Customer routes (admin only for now)
  app.post("/api/customers", authenticate, authorize(['admin']), handleCreateCustomer);

  // File upload routes
  app.post("/api/upload/driver-documents", authenticate, authorize(['admin']), handleDriverDocumentUpload, handleDriverDocumentUploadInfo);
  app.get("/uploads/documents/:filename", serveUploadedFile);

  // Booking routes
  app.post("/api/bookings", authenticate, createBooking);
  app.get("/api/bookings", authenticate, listBookings);
  app.patch("/api/bookings/:id/confirm", authenticate, confirmBooking);
  app.patch("/api/bookings/:id/decide", authenticate, decideBooking);
  app.patch("/api/bookings/:id", authenticate, updateBooking);

  // Test endpoint for debugging
  app.get("/api/auth-test", authenticate, (req, res) => {
    res.json({ message: "Authentication working!", user: (req as any).user });
  });

  // Vehicle routes
  app.get("/api/vehicles/search", searchVehicles);
  app.post("/api/vehicles", authenticate, authorize(['admin']), createVehicle);
  app.get("/api/vehicles", listVehicles);
  app.post("/api/vehicles/:id/documents", authenticate, addVehicleDocument);
  app.post("/api/vehicles/:id/maintenance", authenticate, addMaintenance);
  app.post("/api/vehicles/:id/mileage", authenticate, addMileage);
  app.post("/api/vehicles/:id/insurance", authenticate, addInsurancePolicy);
  app.post("/api/vehicles/:id/claims", authenticate, addInsuranceClaim);
  app.post("/api/vehicles/:id/fuel", authenticate, addFuelLog);
  app.get("/api/vehicles/:id/availability", checkAvailability);
  app.get("/api/vehicles/availability", checkAvailability);

  return app;
}
