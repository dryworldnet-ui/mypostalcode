-- Run this in the Supabase SQL Editor to clear all postal code data.
-- Then run: npm run db:seed to load from postal-codes-database-ready.csv

TRUNCATE postal_codes RESTART IDENTITY;
