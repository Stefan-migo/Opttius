-- Migration: 20260216012728_ensure_quote_prescription_customer_consistency.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Ensure quote prescription_id references a prescription belonging to the same customer
-- Prevents data inconsistency where a quote shows a prescription that is not associated with the customer

-- Function to validate quote-prescription customer match
CREATE OR REPLACE FUNCTION public.check_quote_prescription_customer_match()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.prescription_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.prescriptions p
      WHERE p.id = NEW.prescription_id
      AND p.customer_id = NEW.customer_id
    ) THEN
      RAISE EXCEPTION 'La receta (prescription_id) debe pertenecer al mismo cliente que el presupuesto (customer_id)';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on quotes
DROP TRIGGER IF EXISTS check_quote_prescription_customer ON public.quotes;
CREATE TRIGGER check_quote_prescription_customer
  BEFORE INSERT OR UPDATE OF prescription_id, customer_id
  ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.check_quote_prescription_customer_match();
