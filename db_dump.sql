-- MySQL Dump for Taxi Management System
-- Requires MySQL 8+; InnoDB; utf8mb4
-- Schema + seed data

SET NAMES utf8mb4;
SET time_zone = "+00:00";
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";

-- Create database
DROP DATABASE IF EXISTS `taxi_management`;
CREATE DATABASE IF NOT EXISTS `taxi_management`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE `taxi_management`;

-- Tables
DROP TABLE IF EXISTS `bookings`;
DROP TABLE IF EXISTS `staff_availability`;
DROP TABLE IF EXISTS `drivers`;
DROP TABLE IF EXISTS `services`;
DROP TABLE IF EXISTS `staff`;
DROP TABLE IF EXISTS `customers`;

-- Customers
CREATE TABLE `customers` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `first_name` VARCHAR(100) NOT NULL,
  `last_name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(255) NULL,
  `phone` VARCHAR(50) NULL,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_customers_email` (`email`),
  KEY `idx_customers_last_first` (`last_name`, `first_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Staff
CREATE TABLE `staff` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(255) NULL,
  `phone` VARCHAR(50) NULL,
  `color` VARCHAR(20) NULL,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_staff_email` (`email`),
  KEY `idx_staff_active` (`active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Drivers (personal + professional details)
CREATE TABLE `drivers` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `first_name` VARCHAR(100) NOT NULL,
  `last_name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(255) NULL,
  `phone` VARCHAR(50) NULL,
  `license_number` VARCHAR(100) NOT NULL,
  `license_expiry` DATE NULL,
  `hire_date` DATE NULL,
  `dob` DATE NULL,
  `address` VARCHAR(255) NULL,
  `city` VARCHAR(100) NULL,
  `state` VARCHAR(100) NULL,
  `zipcode` VARCHAR(20) NULL,
  `experience_years` INT UNSIGNED NULL,
  `salary_cents` INT UNSIGNED NULL,
  `status` ENUM('active','inactive') NOT NULL DEFAULT 'active',
  `notes` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_drivers_license` (`license_number`),
  KEY `idx_drivers_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Services
CREATE TABLE `services` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(150) NOT NULL,
  `description` TEXT NULL,
  `duration_minutes` INT UNSIGNED NOT NULL,
  `price_cents` INT UNSIGNED NULL,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_services_name` (`name`),
  KEY `idx_services_active` (`active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Bookings
CREATE TABLE `bookings` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `customer_id` BIGINT UNSIGNED NOT NULL,
  `service_id` BIGINT UNSIGNED NOT NULL,
  `source` ENUM('email','phone','web') NOT NULL DEFAULT 'phone',
  `created_by_role` ENUM('admin','staff') NOT NULL DEFAULT 'staff',
  `created_by_name` VARCHAR(150) NULL,
  `staff_id` BIGINT UNSIGNED NULL,
  `pickup_point` VARCHAR(255) NULL,
  `dropoff_point` VARCHAR(255) NULL,
  `special_instructions` TEXT NULL,
  `contact_name` VARCHAR(150) NULL,
  `contact_phone` VARCHAR(50) NULL,
  `contact_email` VARCHAR(255) NULL,
  `start_time` DATETIME NOT NULL,
  `end_time` DATETIME NOT NULL,
  `estimated_price_cents` INT UNSIGNED NULL,
  `status` ENUM('scheduled','confirmed','completed','cancelled','no_show')
    NOT NULL DEFAULT 'scheduled',
  `admin_note` TEXT NULL,
  `driver_id` BIGINT UNSIGNED NULL,
  `confirmed_at` DATETIME NULL,
  `assigned_at` DATETIME NULL,
  `outlook_event_id` VARCHAR(255) NULL,
  `customer_verify_token` VARCHAR(255) NULL,
  `admin_approve_token` VARCHAR(255) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_bookings_customer`
    FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_bookings_service`
    FOREIGN KEY (`service_id`) REFERENCES `services`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_bookings_staff`
    FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_bookings_driver`
    FOREIGN KEY (`driver_id`) REFERENCES `drivers`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  KEY `idx_bookings_start` (`start_time`),
  KEY `idx_bookings_staff_start` (`staff_id`, `start_time`),
  KEY `idx_bookings_customer` (`customer_id`),
  KEY `idx_bookings_status` (`status`),
  KEY `idx_bookings_created_role` (`created_by_role`),
  KEY `idx_bookings_status_created` (`status`, `created_at`),
  UNIQUE KEY `uq_staff_start` (`staff_id`, `start_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Audit table to track admin/staff actions on bookings
CREATE TABLE IF NOT EXISTS `bookings_audit` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `booking_id` BIGINT UNSIGNED NOT NULL,
  `actor_role` ENUM('admin','staff') NOT NULL,
  `action` ENUM('create','confirm','assign_driver','update','downgrade','cancel') NOT NULL,
  `admin_only_note` TEXT NULL,
  `diff` JSON NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_booking` (`booking_id`),
  CONSTRAINT `fk_audit_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Admin-only notes table for bookings
CREATE TABLE IF NOT EXISTS `bookings_notes` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `booking_id` BIGINT UNSIGNED NOT NULL,
  `note` TEXT NOT NULL,
  `admin_only` TINYINT(1) NOT NULL DEFAULT 1,
  `created_by` VARCHAR(150) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notes_booking` (`booking_id`),
  CONSTRAINT `fk_notes_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Staff Availability
CREATE TABLE `staff_availability` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `staff_id` BIGINT UNSIGNED NOT NULL,
  `weekday` TINYINT UNSIGNED NOT NULL,
  `start_time` TIME NOT NULL,
  `end_time` TIME NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_availability_staff`
    FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY `uq_staff_weekday_time` (`staff_id`, `weekday`, `start_time`, `end_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed data
INSERT INTO `customers` (`first_name`, `last_name`, `email`, `phone`) VALUES
('Alice', 'Nguyen', 'alice@example.com', '+15550001'),
('Bob', 'Smith', 'bob@example.com', '+15550002');

INSERT INTO `staff` (`name`, `email`, `phone`, `color`) VALUES
('Dispatcher', 'dispatch@example.com', '+15551111', '#8b5cf6'),
('Driver One', 'driver1@example.com', '+15552222', '#10b981');

INSERT INTO `services` (`name`, `description`, `duration_minutes`, `price_cents`) VALUES
('Standard Ride', 'City ride up to 10km', 30, 1000),
('Airport Transfer', 'To/From airport', 60, 3000);

-- Example booking
INSERT INTO `bookings`
(`customer_id`,`service_id`,`staff_id`,`start_time`,`end_time`,`status`,`notes`)
VALUES
(1, 1, 2, '2025-09-22 10:00:00', '2025-09-22 10:30:00', 'scheduled', 'Pickup at 5th Ave');

SET FOREIGN_KEY_CHECKS = 1;
