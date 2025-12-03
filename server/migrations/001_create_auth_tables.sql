-- Enable UUID extension if not already enabled
SET sql_mode = 'STRICT_TRANS_TABLES';

-- Core Users Table
CREATE TABLE users (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'driver', 'customer') NOT NULL,
    status ENUM('active', 'inactive', 'pending') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_email (email),
    INDEX idx_users_role (role),
    INDEX idx_users_status (status)
);

-- User Profiles
CREATE TABLE profiles (
    user_id BINARY(16) PRIMARY KEY,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    address TEXT,
    payment_preferences JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Driver Profiles
CREATE TABLE driver_profiles (
    user_id BINARY(16) PRIMARY KEY,
    license_number VARCHAR(100),
    id_proof_url VARCHAR(500),
    work_permit_url VARCHAR(500),
    employment_status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_driver_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_driver_employment_status (employment_status)
);

-- Admin Roles
CREATE TABLE admin_roles (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    role_name VARCHAR(50) NOT NULL UNIQUE,
    permissions JSON NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- User Sessions (for JWT token management)
CREATE TABLE user_sessions (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    user_id BINARY(16) NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_sessions_user (user_id),
    INDEX idx_sessions_expires (expires_at)
);

-- Insert default admin role
INSERT INTO admin_roles (role_name, permissions, description) VALUES 
('super_admin', '{"users": ["read", "write", "delete"], "bookings": ["read", "write", "delete"], "drivers": ["read", "write", "delete"], "vehicles": ["read", "write", "delete"], "system": ["read", "write"]}', 'Super administrator with full access');

-- Create a default admin user (password: admin123)
INSERT INTO users (email, password_hash, role, status) VALUES 
('admin@taxi.com', '$2b$10$rOzJqQjQjQjQjQjQjQjQjOzJqQjQjQjQjQjQjQjQjQjQjQjQjQjQjQjQ', 'admin', 'active');

INSERT INTO profiles (user_id, first_name, last_name) VALUES 
((SELECT id FROM users WHERE email = 'admin@taxi.com'), 'System', 'Administrator');

INSERT INTO admin_roles (role_name, permissions, description) VALUES 
('dispatcher', '{"users": ["read"], "bookings": ["read", "write"], "drivers": ["read"], "vehicles": ["read"]}', 'Dispatcher with limited access');
