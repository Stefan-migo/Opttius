-- Migration: 20260130000000_protect_default_categories.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Protect default categories from deletion
-- This migration adds protection for system default categories

-- Add is_default column to categories table
ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_categories_is_default ON public.categories(is_default);

-- Mark default categories as protected
-- These are the core categories that should not be deleted
UPDATE public.categories
SET is_default = TRUE
WHERE slug IN ('marcos', 'lentes-de-sol', 'accesorios', 'servicios')
  AND is_default IS NULL OR is_default = FALSE;

-- Create a function to prevent deletion of default categories
CREATE OR REPLACE FUNCTION prevent_default_category_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the category being deleted is a default category
  IF OLD.is_default = TRUE THEN
    RAISE EXCEPTION 'Cannot delete default category: %. Default categories are protected and cannot be deleted.', OLD.name;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent deletion of default categories
DROP TRIGGER IF EXISTS check_default_category_deletion ON public.categories;
CREATE TRIGGER check_default_category_deletion
  BEFORE DELETE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION prevent_default_category_deletion();

-- Add comment
COMMENT ON COLUMN public.categories.is_default IS 'Indicates if this is a system default category that cannot be deleted';
