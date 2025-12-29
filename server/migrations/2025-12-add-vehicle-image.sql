-- Add image_url column to vehicles table
-- Migration to add vehicle image storage capability

ALTER TABLE vehicles 
ADD COLUMN image_url TEXT NULL 
AFTER status;

-- Add index for faster image URL queries (optional)
CREATE INDEX idx_vehicles_image_url ON vehicles(image_url(255));
