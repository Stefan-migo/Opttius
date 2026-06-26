-- Migration: 20260220100000_add_optical_support_time_metrics.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Add response_time_minutes calculation to optical internal support trigger
-- When the first message is inserted, calculate minutes from ticket creation to first response
-- Date: 2026-02-20

CREATE OR REPLACE FUNCTION public.update_optical_internal_ticket_timestamps()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update the parent ticket's last_response_at, first_response_at, and response_time_minutes
  UPDATE public.optical_internal_support_tickets t
  SET 
    last_response_at = NOW(),
    first_response_at = COALESCE(t.first_response_at, NOW()),
    response_time_minutes = CASE 
      WHEN t.first_response_at IS NULL THEN 
        ROUND(EXTRACT(EPOCH FROM (NOW() - t.created_at)) / 60)::INTEGER 
      ELSE t.response_time_minutes 
    END,
    updated_at = NOW()
  WHERE t.id = NEW.ticket_id;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_optical_internal_ticket_timestamps IS 'Updates ticket timestamps and calculates response_time_minutes when first message is added';
