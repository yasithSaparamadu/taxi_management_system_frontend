/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

/**
 * Response for /api/db-ping
 */
export interface DbPingResponse {
  ok: boolean;
  info?: unknown;
  error?: string;
}

/**
 * Drivers API shared types
 */
export interface Driver {
  id: number;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  license_number: string;
  license_expiry?: string | null; // ISO date string
  hire_date?: string | null; // ISO date string
  dob?: string | null; // ISO date string
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipcode?: string | null;
  experience_years?: number | null;
  salary_cents?: number | null;
  status: "active" | "inactive";
  notes?: string | null;
  created_at: string; // ISO
  updated_at: string; // ISO
}

export interface CreateDriverRequest {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  license_number: string;
  license_expiry?: string; // YYYY-MM-DD
  hire_date?: string; // YYYY-MM-DD
  dob?: string; // YYYY-MM-DD
  address?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  experience_years?: number;
  salary_cents?: number;
  status?: "active" | "inactive";
  notes?: string;
}

export interface CreateDriverResponse {
  ok: boolean;
  id?: number;
  error?: string;
}

/**
 * Bookings shared types
 */
export type BookingStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

export interface Booking {
  id: number;
  service_id: number;
  source: 'email' | 'phone' | 'web';
  created_by_role: 'admin' | 'staff';
  created_by_name?: string | null;
  pickup_point?: string | null;
  dropoff_point?: string | null;
  special_instructions?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  start_time: string; // ISO
  end_time: string;   // ISO
  original_start_time?: string | null; // ISO - original scheduled time
  original_end_time?: string | null;   // ISO - original end time
  move_count: number; // Number of times this booking has been moved
  estimated_price_cents?: number | null;
  status: BookingStatus;
  deleted: boolean; // Soft delete flag
  admin_note?: string | null;
  driver_id?: number | null;
  vehicle_id?: number | null;
  confirmed_at?: string | null;
  assigned_at?: string | null;
  outlook_event_id?: string | null;
  customer_verify_token?: string | null;
  admin_approve_token?: string | null;
  created_at: string; // ISO
  updated_at: string; // ISO
}

export interface CreateBookingRequest {
  service_id: number;
  start_time: string; // YYYY-MM-DDTHH:mm:ss
  end_time: string;   // YYYY-MM-DDTHH:mm:ss
  source: 'email' | 'phone' | 'web';
  pickup_point?: string;
  dropoff_point?: string;
  special_instructions?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  estimated_price_cents?: number;
  admin_note?: string;
  created_by_name?: string;
  driver_id?: number | null;
  customer_id?: number; // Add customer_id field
  vehicle_id?: number | null; // Add vehicle_id field
  is_registered_customer?: boolean; // Add registered customer flag
  registered_number?: string; // Add registered customer number
}

export interface CreateBookingResponse { ok: boolean; id?: number; error?: string }

export interface ConfirmBookingRequest {
  driver_id?: number; // optional immediate assignment
}
export interface ConfirmBookingResponse { ok: boolean; error?: string }

export interface UpdateBookingRequest {
  service_id?: number;
  start_time?: string;
  end_time?: string;
  source?: 'email' | 'phone' | 'web';
  pickup_point?: string;
  dropoff_point?: string;
  special_instructions?: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  estimated_price_cents?: number | null;
  status?: BookingStatus; // allow downgrade/cancel
  admin_note?: string; // admin-only
  created_by_name?: string;
  driver_id?: number | null;
  customer_id?: number | null;
  vehicle_id?: number | null;
}
export interface UpdateBookingResponse { ok: boolean; error?: string }

export interface ListBookingsResponse { ok: boolean; items: Booking[] }

/**
 * Vehicles and Availability (new)
 */
export interface Vehicle {
  id: number;
  name: string; // e.g., Toyota Prius 2018
  make?: string | null;
  model?: string | null;
  year?: number | null;
  plate?: string | null;
  color?: string | null;
  vin?: string | null;
  capacity?: number | null; // seats
  status: 'active' | 'inactive';
  image_url?: string | null; // vehicle image URL
  partner_id?: number | null; // null for in-house
  created_at: string; // ISO
  updated_at: string; // ISO
}

export interface VehicleSearchRequest {
  q?: string; // free text on name/make/model/plate
  capacity_min?: number;
  start_time?: string; // for availability filtering (optional)
  end_time?: string;   // for availability filtering (optional)
}

export interface VehicleSearchResponse {
  ok: boolean;
  items: Vehicle[];
}

export interface CreateVehicleRequest {
  name: string;
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  plate?: string;
  vin?: string;
  capacity?: number;
  status?: 'active' | 'inactive';
}

export interface CreateVehicleResponse { ok: boolean; id?: number; error?: string }

export interface ListVehiclesResponse { ok: boolean; items: Vehicle[] }

// Documents
export interface VehicleDocument {
  id: number;
  vehicle_id: number;
  type: 'registration' | 'insurance' | 'maintenance' | 'other';
  title: string;
  file_url: string; // stored URL/path; actual storage handled externally
  created_at: string; // ISO
}
export interface AddVehicleDocumentRequest {
  type: VehicleDocument['type'];
  title: string;
  file_url: string;
}
export interface AddVehicleDocumentResponse { ok: boolean; id?: number; error?: string }

// Maintenance
export interface MaintenanceEntry {
  id: number;
  vehicle_id: number;
  title: string;
  schedule_date: string; // ISO date
  notes?: string | null;
  completed_at?: string | null; // ISO date
}
export interface AddMaintenanceRequest {
  title: string;
  schedule_date: string;
  notes?: string;
}
export interface AddMaintenanceResponse { ok: boolean; id?: number; error?: string }

// Mileage (driver-submitted, job sheet compulsory)
export interface MileageLog {
  id: number;
  vehicle_id: number;
  driver_id?: number | null;
  odometer_km: number;
  job_sheet_url: string; // compulsory proof
  note?: string | null;
  created_at: string; // ISO
}
export interface AddMileageRequest {
  driver_id?: number;
  odometer_km: number;
  job_sheet_url: string;
  note?: string;
}
export interface AddMileageResponse { ok: boolean; id?: number; error?: string }

// Insurance policies and claims
export interface InsurancePolicy {
  id: number;
  vehicle_id: number;
  provider: string;
  policy_number: string;
  category?: 'comprehensive' | 'third_party' | 'collision' | 'liability' | 'other';
  coverage_details?: string | null;
  start_date: string; // ISO date
  expiry_date: string; // ISO date
}
export interface AddInsurancePolicyRequest {
  provider: string;
  policy_number: string;
  category?: InsurancePolicy['category'];
  coverage_details?: string;
  start_date: string;
  expiry_date: string;
}
export interface AddInsurancePolicyResponse { ok: boolean; id?: number; error?: string }

export interface InsuranceClaim {
  id: number;
  vehicle_id: number;
  policy_id?: number | null;
  incident_date: string; // ISO date
  description: string;
  claim_number?: string | null;
  status: 'open' | 'closed' | 'pending';
}
export interface AddInsuranceClaimRequest {
  policy_id?: number;
  incident_date: string;
  description: string;
  claim_number?: string;
  status?: InsuranceClaim['status'];
}
export interface AddInsuranceClaimResponse { ok: boolean; id?: number; error?: string }

// Fuel logs (optional)
export interface FuelLog {
  id: number;
  vehicle_id: number;
  driver_id?: number | null;
  liters: number;
  cost_cents: number;
  odometer_km?: number | null;
  filled_at: string; // ISO datetime
}
export interface AddFuelLogRequest {
  driver_id?: number;
  liters: number;
  cost_cents: number;
  odometer_km?: number;
  filled_at: string;
}
export interface AddFuelLogResponse { ok: boolean; id?: number; error?: string }

export interface AvailabilityQuery {
  start_time: string; // ISO-like YYYY-MM-DDTHH:mm:ss
  end_time: string;   // ISO-like YYYY-MM-DDTHH:mm:ss
  vehicle_id?: number; // if provided, check specific vehicle
  driver_id?: number;  // if provided, check specific driver
}

export interface AvailabilityResponse {
  ok: boolean;
  vehicle_available?: boolean;
  driver_available?: boolean;
  conflicts?: Array<{
    booking_id: number;
    start_time: string;
    end_time: string;
    resource: 'vehicle' | 'driver';
  }>;
}

/**
 * Admin decisions for bookings (assign/confirm/decline)
 */
export interface AssignBookingRequest {
  vehicle_id?: number | null; // optional if using partner
  driver_id?: number | null;  // optional immediate assignment
  partner_fallback?: boolean; // allow partner search if not available
}

export interface AssignBookingResponse { ok: boolean; error?: string }

export interface DecisionRequest {
  action: 'confirm' | 'decline';
  reason?: string; // for decline
}

export interface DecisionResponse { ok: boolean; error?: string }

/**
 * Authentication and User Management
 */
export type UserRole = 'admin' | 'driver' | 'customer';
export type UserStatus = 'active' | 'inactive' | 'suspended';

export interface User {
  id: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  created_at?: string;
  profile?: UserProfile;
  driver_profile?: DriverProfile;
}

export interface UserProfile {
  first_name?: string;
  last_name?: string;
  phone?: string;
  address?: string;
  payment_preferences?: any;
  is_registered_customer?: boolean;
  registered_number?: string;
}

export interface DriverProfile {
  license_number?: string;
  id_proof_url?: string;
  work_permit_url?: string;
  employment_status?: 'active' | 'inactive' | 'suspended';
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  ok: boolean;
  token?: string;
  user?: User;
  error?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
  profile?: UserProfile;
  driver_profile?: DriverProfile;
}

export interface RegisterResponse {
  ok: boolean;
  userId?: string;
  error?: string;
}

export interface PublicRegisterRequest {
  email: string;
  password: string;
  phone?: string;
  profile?: UserProfile;
}

export interface LogoutResponse {
  ok: boolean;
  message?: string;
  error?: string;
}

export interface MeResponse {
  ok: boolean;
  user?: User;
  error?: string;
}

export interface UserManagementRequest {
  email?: string;
  role?: UserRole;
  status?: UserStatus;
  page?: number;
  limit?: number;
}

export interface UserManagementResponse {
  ok: boolean;
  users?: User[];
  total?: number;
  error?: string;
}

export interface UpdateUserRequest {
  phone?: string;
  status?: UserStatus;
  profile?: Partial<UserProfile>;
  driver_profile?: Partial<DriverProfile>;
}

export interface UpdateUserResponse {
  ok: boolean;
  user?: User;
  error?: string;
}

export interface DeleteUserResponse {
  ok: boolean;
  message?: string;
  error?: string;
}
