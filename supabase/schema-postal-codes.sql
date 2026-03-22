-- Run this in the Supabase SQL Editor to create or reset the postal_codes table.
-- Then run: npm run db:seed (after TRUNCATE postal_codes; in SQL Editor if re-seeding).

-- Optional: drop and recreate (removes all data)
-- DROP TABLE IF EXISTS postal_codes;

-- Create table (skip if already created)
CREATE TABLE IF NOT EXISTS postal_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  postal_code text NOT NULL,
  area text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  province text NOT NULL DEFAULT '',
  aliases text NOT NULL DEFAULT ''
);

-- If table already exists without aliases, add the column:
-- ALTER TABLE postal_codes ADD COLUMN IF NOT EXISTS aliases text NOT NULL DEFAULT '';

-- Index for exact postal code lookups
CREATE INDEX IF NOT EXISTS idx_postal_codes_postal_code ON postal_codes (postal_code);

-- Optional: enable pg_trgm then add GIN indexes for faster ilike search (run in SQL Editor if needed)
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CREATE INDEX IF NOT EXISTS idx_postal_codes_area_trgm ON postal_codes USING gin (area gin_trgm_ops);
-- CREATE INDEX IF NOT EXISTS idx_postal_codes_aliases_trgm ON postal_codes USING gin (aliases gin_trgm_ops);

-- To clear all rows before re-seeding (run when you want to reload data):
-- TRUNCATE postal_codes RESTART IDENTITY;
