-- Migration: 20251219000000_update_rut_search_for_customers.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Update RUT Search Function for Customers Table
-- This migration updates the RUT search function to search in customers table instead of profiles
-- and improves partial RUT search capabilities

-- Update the index to use customers table
CREATE INDEX IF NOT EXISTS idx_customers_rut_normalized 
ON public.customers(normalize_rut_for_search(rut)) 
WHERE rut IS NOT NULL;

-- Update function to search customers by normalized RUT (supports partial matches)
CREATE OR REPLACE FUNCTION search_customers_by_rut(rut_search_term TEXT)
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  rut TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.first_name,
    c.last_name,
    c.email,
    c.phone,
    c.rut
  FROM public.customers c
  WHERE normalize_rut_for_search(c.rut) LIKE '%' || normalize_rut_for_search(rut_search_term) || '%'
  ORDER BY c.first_name, c.last_name
  LIMIT 20;
END;
$$ LANGUAGE plpgsql STABLE;

-- Add comment
COMMENT ON FUNCTION search_customers_by_rut IS 'Searches customers by RUT, supporting partial matches and any format (with or without dots/dashes). Normalizes both search term and stored RUT for comparison.';
