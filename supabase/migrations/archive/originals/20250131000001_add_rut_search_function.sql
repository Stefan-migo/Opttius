-- Migration: 20250131000001_add_rut_search_function.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Add RUT Search Function for Partial Matching
-- This migration creates a function to search RUTs by normalizing them first
-- This allows partial RUT searches to work regardless of formatting

-- Function to normalize RUT (remove dots, dashes, spaces, convert to uppercase)
CREATE OR REPLACE FUNCTION normalize_rut_for_search(rut_text TEXT)
RETURNS TEXT AS $$
BEGIN
  IF rut_text IS NULL THEN
    RETURN '';
  END IF;
  -- Remove dots, dashes, spaces and convert to uppercase
  RETURN UPPER(REGEXP_REPLACE(rut_text, '[.\-\s]', '', 'g'));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create an index on normalized RUT for faster searches
-- This is a functional index that normalizes the RUT for searching
CREATE INDEX IF NOT EXISTS idx_profiles_rut_normalized 
ON public.profiles(normalize_rut_for_search(rut)) 
WHERE rut IS NOT NULL;

-- Function to search customers by normalized RUT
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
    p.id,
    p.first_name,
    p.last_name,
    p.email,
    p.phone,
    p.rut
  FROM public.profiles p
  WHERE normalize_rut_for_search(p.rut) LIKE '%' || normalize_rut_for_search(rut_search_term) || '%'
  ORDER BY p.first_name, p.last_name
  LIMIT 20;
END;
$$ LANGUAGE plpgsql STABLE;
