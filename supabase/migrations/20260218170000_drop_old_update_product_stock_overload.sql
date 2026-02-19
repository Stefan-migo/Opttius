-- Resolve RPC ambiguity: two overloads of update_product_stock exist.
-- The 4-param version (20260120000000) conflicts with the 8-param version (20260218164824).
-- Drop the old 4-param overload; the 8-param version has defaults for optional params.
DROP FUNCTION IF EXISTS public.update_product_stock(UUID, UUID, INTEGER, BOOLEAN);
