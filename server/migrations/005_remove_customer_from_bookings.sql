-- Remove customer functionality from bookings table
-- This removes the customer_id column and foreign key constraint

-- First, drop the foreign key constraint if it exists
ALTER TABLE bookings DROP FOREIGN KEY IF EXISTS fk_bookings_customer;

-- Remove the customer_id column from bookings table
ALTER TABLE bookings DROP COLUMN IF EXISTS customer_id;
