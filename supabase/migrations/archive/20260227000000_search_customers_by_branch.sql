-- Migration: 20260227000000_search_customers_by_branch.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Add branch filter to search_customers_by_rut
-- Adds optional p_branch_id and p_branch_ids for branch-scoped customer search.
-- When p_branch_id is set: filter by single branch.
-- When p_branch_ids is set: filter by any of the branches (for org-wide view).
-- When both null: no branch filter (backward compatible).

-- Drop old 1-parameter version to avoid overload conflict
DROP FUNCTION IF EXISTS search_customers_by_rut(TEXT);

CREATE OR REPLACE FUNCTION search_customers_by_rut(
  rut_search_term TEXT,
  p_branch_id UUID DEFAULT NULL,
  p_branch_ids UUID[] DEFAULT NULL
)
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
    AND (
      p_branch_id IS NULL AND p_branch_ids IS NULL
      OR (p_branch_id IS NOT NULL AND c.branch_id = p_branch_id)
      OR (p_branch_ids IS NOT NULL AND c.branch_id = ANY(p_branch_ids))
    )
  ORDER BY c.first_name, c.last_name
  LIMIT 20;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION search_customers_by_rut(TEXT, UUID, UUID[]) IS 'Searches customers by RUT with optional branch filter. p_branch_id: single branch; p_branch_ids: org branches for global view; both null: no filter.';
