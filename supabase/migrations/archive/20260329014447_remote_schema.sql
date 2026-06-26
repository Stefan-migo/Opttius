-- Migration: 20260329014447_remote_schema.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Drop old index if exists
DROP INDEX IF EXISTS "public"."idx_schedule_settings_org_branch";

-- Recreate indexes with IF NOT EXISTS to handle idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_schedule_settings_branch_unique ON public.schedule_settings USING btree (branch_id) WHERE (branch_id IS NOT NULL);

-- Only create global index if there's at most one row with branch_id IS NULL
-- This handles the case where duplicate NULL values exist
DO $$
DECLARE
    null_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_count FROM public.schedule_settings WHERE branch_id IS NULL;
    IF null_count <= 1 THEN
        EXECUTE 'DROP INDEX IF EXISTS "public"."idx_schedule_settings_global_unique"';
        EXECUTE 'CREATE UNIQUE INDEX idx_schedule_settings_global_unique ON public.schedule_settings USING btree ((1)) WHERE (branch_id IS NULL)';
    END IF;
END $$;

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.delete_campaign_cascade(p_campaign_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$ BEGIN DELETE FROM leads WHERE campaign_id = p_campaign_id; DELETE FROM enrichment_audit WHERE campaign_id = p_campaign_id; DELETE FROM campaigns WHERE id = p_campaign_id; END; $function$
;


-- Drop existing policy if exists and recreate
DROP POLICY IF EXISTS "Public can view subscription tiers for landing" ON "public"."subscription_tiers";

CREATE POLICY "Public can view subscription tiers for landing"
ON "public"."subscription_tiers"
AS PERMISSIVE
FOR SELECT
TO PUBLIC
USING (true);


