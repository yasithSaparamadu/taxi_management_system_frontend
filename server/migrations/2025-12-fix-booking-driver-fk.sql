-- Fix booking driver foreign key constraint to reference users table instead of drivers table
-- Migration: Update bookings driver_id foreign key

-- Drop the existing foreign key constraint
ALTER TABLE bookings DROP FOREIGN KEY fk_bookings_driver;

-- Add the new foreign key constraint referencing users table
ALTER TABLE bookings 
ADD CONSTRAINT fk_bookings_driver 
FOREIGN KEY (driver_id) REFERENCES users(id) 
ON DELETE SET NULL ON UPDATE CASCADE;
