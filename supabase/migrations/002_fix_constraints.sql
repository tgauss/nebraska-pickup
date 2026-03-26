-- Fix drive_minutes to allow NULL (some out-of-state customers don't have drive times)
ALTER TABLE customers ALTER COLUMN drive_minutes DROP NOT NULL;
ALTER TABLE customers ALTER COLUMN drive_minutes SET DEFAULT 0;

-- Fix size column to allow longer values (some data has non-standard sizes)
ALTER TABLE customers ALTER COLUMN size TYPE VARCHAR(10);
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_size_check;
