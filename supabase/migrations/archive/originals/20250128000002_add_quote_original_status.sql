-- Migration: 20250128000002_add_quote_original_status.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Add original_status field to quotes table
-- This allows preserving the original status when a quote is converted to a work order

-- Add original_status column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quotes' 
    AND column_name = 'original_status'
  ) THEN
    ALTER TABLE public.quotes ADD COLUMN original_status TEXT;
    
    -- Set original_status for existing converted quotes
    UPDATE public.quotes
    SET original_status = status
    WHERE status = 'converted_to_work' AND original_status IS NULL;
    
    -- Set original_status for all other quotes to their current status
    UPDATE public.quotes
    SET original_status = status
    WHERE original_status IS NULL;
  END IF;
END $$;

-- Update the convert function to preserve original status
CREATE OR REPLACE FUNCTION preserve_quote_original_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When converting to work order, preserve the original status
  IF NEW.status = 'converted_to_work' AND NEW.original_status IS NULL THEN
    NEW.original_status := OLD.status;
  END IF;
  
  -- Prevent changing status if already converted
  IF OLD.status = 'converted_to_work' AND NEW.status != 'converted_to_work' THEN
    RAISE EXCEPTION 'Cannot change status of a converted quote';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_preserve_quote_original_status ON public.quotes;
CREATE TRIGGER trigger_preserve_quote_original_status
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION preserve_quote_original_status();

COMMENT ON COLUMN public.quotes.original_status IS 'Preserves the original status before conversion to work order';


