-- Vehicle & Fleet Management schema migration
-- Apply this to your MySQL 8+ database used by this app.

-- Partners (optional)
CREATE TABLE IF NOT EXISTS partners (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  contact_email VARCHAR(255) NULL,
  api_base_url VARCHAR(255) NULL,
  api_key VARCHAR(255) NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_partners_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Vehicles
CREATE TABLE IF NOT EXISTS vehicles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  make VARCHAR(100) NULL,
  model VARCHAR(100) NULL,
  year INT UNSIGNED NULL,
  color VARCHAR(50) NULL,
  plate VARCHAR(50) NULL,
  vin VARCHAR(100) NULL,
  capacity INT UNSIGNED NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  partner_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_vehicles_plate (plate),
  UNIQUE KEY uq_vehicles_vin (vin),
  KEY idx_vehicles_status (status),
  CONSTRAINT fk_vehicles_partner
    FOREIGN KEY (partner_id) REFERENCES partners(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Link a vehicle to bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS vehicle_id BIGINT UNSIGNED NULL AFTER driver_id;

ALTER TABLE bookings
  ADD KEY IF NOT EXISTS idx_bookings_vehicle_start (vehicle_id, start_time);

ALTER TABLE bookings
  ADD CONSTRAINT fk_bookings_vehicle
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Vehicle documents
CREATE TABLE IF NOT EXISTS vehicle_documents (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  vehicle_id BIGINT UNSIGNED NOT NULL,
  type ENUM('registration','insurance','maintenance','other') NOT NULL,
  title VARCHAR(200) NOT NULL,
  file_url TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_vdocs_vehicle (vehicle_id),
  CONSTRAINT fk_vdocs_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Maintenance schedules
CREATE TABLE IF NOT EXISTS maintenance (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  vehicle_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  schedule_date DATE NOT NULL,
  notes TEXT NULL,
  completed_at DATE NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_maint_vehicle (vehicle_id),
  CONSTRAINT fk_maint_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Mileage logs (driver-submitted)
CREATE TABLE IF NOT EXISTS mileage_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  vehicle_id BIGINT UNSIGNED NOT NULL,
  driver_id BIGINT UNSIGNED NULL,
  odometer_km INT UNSIGNED NOT NULL,
  job_sheet_url TEXT NOT NULL,
  note TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_mileage_vehicle (vehicle_id),
  KEY idx_mileage_driver (driver_id),
  CONSTRAINT fk_mileage_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_mileage_driver FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insurance policies
CREATE TABLE IF NOT EXISTS insurance_policies (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  vehicle_id BIGINT UNSIGNED NOT NULL,
  provider VARCHAR(200) NOT NULL,
  policy_number VARCHAR(200) NOT NULL,
  category ENUM('comprehensive','third_party','collision','liability','other') NULL,
  coverage_details TEXT NULL,
  start_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_policy_vehicle (vehicle_id),
  CONSTRAINT fk_policy_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insurance claims
CREATE TABLE IF NOT EXISTS insurance_claims (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  vehicle_id BIGINT UNSIGNED NOT NULL,
  policy_id BIGINT UNSIGNED NULL,
  incident_date DATE NOT NULL,
  description TEXT NOT NULL,
  claim_number VARCHAR(200) NULL,
  status ENUM('open','closed','pending') NOT NULL DEFAULT 'open',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_claim_vehicle (vehicle_id),
  KEY idx_claim_policy (policy_id),
  CONSTRAINT fk_claim_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_claim_policy FOREIGN KEY (policy_id) REFERENCES insurance_policies(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Fuel logs
CREATE TABLE IF NOT EXISTS fuel_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  vehicle_id BIGINT UNSIGNED NOT NULL,
  driver_id BIGINT UNSIGNED NULL,
  liters DECIMAL(10,2) NOT NULL,
  cost_cents INT UNSIGNED NOT NULL,
  odometer_km INT UNSIGNED NULL,
  filled_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_fuel_vehicle (vehicle_id),
  KEY idx_fuel_driver (driver_id),
  CONSTRAINT fk_fuel_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_fuel_driver FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
