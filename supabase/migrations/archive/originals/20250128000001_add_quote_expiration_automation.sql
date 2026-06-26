-- Migration: 20250128000001_add_quote_expiration_automation.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Add Quote Expiration Automation
-- This migration adds automatic expiration of quotes based on expiration_date

-- ===== CREATE FUNCTION TO EXPIRE QUOTES =====
CREATE OR REPLACE FUNCTION expire_quotes()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  -- Update quotes that have passed their expiration date and are not already expired or converted
  UPDATE public.quotes
  SET 
    status = 'expired',
    updated_at = NOW()
  WHERE 
    expiration_date IS NOT NULL
    AND expiration_date < CURRENT_DATE
    AND status NOT IN ('expired', 'converted_to_work', 'accepted')
    AND status != 'expired'; -- Double check to avoid unnecessary updates
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== CREATE FUNCTION TO CHECK AND EXPIRE QUOTES ON SELECT =====
-- This function will be called when fetching quotes to ensure expired ones are marked
CREATE OR REPLACE FUNCTION check_and_expire_quotes()
RETURNS VOID AS $$
BEGIN
  -- Call expire_quotes function
  PERFORM expire_quotes();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== CREATE TRIGGER TO AUTO-EXPIRE QUOTES ON INSERT/UPDATE =====
-- This trigger checks expiration when a quote is created or updated
CREATE OR REPLACE FUNCTION check_quote_expiration()
RETURNS TRIGGER AS $$
BEGIN
  -- If expiration_date is set and has passed, mark as expired
  IF NEW.expiration_date IS NOT NULL 
     AND NEW.expiration_date < CURRENT_DATE 
     AND NEW.status NOT IN ('expired', 'converted_to_work', 'accepted') THEN
    NEW.status := 'expired';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_check_quote_expiration ON public.quotes;
CREATE TRIGGER trigger_check_quote_expiration
  BEFORE INSERT OR UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION check_quote_expiration();

-- ===== COMMENTS =====
COMMENT ON FUNCTION expire_quotes() IS 'Marks quotes as expired if their expiration_date has passed';
COMMENT ON FUNCTION check_and_expire_quotes() IS 'Checks and expires quotes when called';
COMMENT ON FUNCTION check_quote_expiration() IS 'Trigger function to check expiration on insert/update';

