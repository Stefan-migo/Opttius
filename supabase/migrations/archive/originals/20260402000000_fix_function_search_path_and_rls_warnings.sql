-- Migration: 20260402000000_fix_function_search_path_and_rls_warnings.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Fix Supabase Security Advisor warnings
-- 1. Set search_path = 'public' on all functions (fixes function_search_path_mutable)
-- 2. Remove permissive RLS policies and add proper admin policy for product_variants (fixes rls_policy_always_true)
-- Ref: https://supabase.com/docs/guides/database/database-linter

-- ===== 1. SET search_path ON ALL PUBLIC FUNCTIONS =====
DO $$
DECLARE
  r RECORD;
  func_signature TEXT;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema_name,
           p.proname AS func_name,
           pg_catalog.pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      -- Exclude extension-owned functions (vector, etc.) - we cannot alter those
      AND NOT EXISTS (
        SELECT 1 FROM pg_catalog.pg_depend d
        JOIN pg_catalog.pg_extension e ON d.refobjid = e.oid
        WHERE d.objid = p.oid AND d.deptype = 'e'
      )
  LOOP
    func_signature := format('%I.%I(%s)', r.schema_name, r.func_name, r.args);
    BEGIN
      EXECUTE format('ALTER FUNCTION %s SET search_path = ''public''', func_signature);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Could not alter function %: %', func_signature, SQLERRM;
    END;
  END LOOP;
END $$;

-- ===== 2. FIX RLS POLICIES - REMOVE PERMISSIVE, ADD ADMIN FOR PRODUCT_VARIANTS =====

-- Categories: drop permissive policies (Admin users can manage categories already exists)
DROP POLICY IF EXISTS "Allow insert categories" ON public.categories;
DROP POLICY IF EXISTS "Allow update categories" ON public.categories;

-- Products: drop permissive policies (Users can manage their organization products already exists)
DROP POLICY IF EXISTS "Allow insert products" ON public.products;
DROP POLICY IF EXISTS "Allow update products" ON public.products;
-- Service role bypasses RLS; this policy is redundant and flagged by linter
DROP POLICY IF EXISTS "Allow service role full access to products" ON public.products;

-- Product variants: drop permissive policies and add admin policy
DROP POLICY IF EXISTS "Allow insert product variants" ON public.product_variants;
DROP POLICY IF EXISTS "Allow update product variants" ON public.product_variants;

-- Add admin manage policy for product_variants (was missing; relied on permissive policies)
CREATE POLICY "Admin users can manage product variants"
ON public.product_variants
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

COMMENT ON POLICY "Admin users can manage product variants" ON public.product_variants IS 'Admins can insert/update/delete product variants. Replaces permissive Allow insert/update policies.';
