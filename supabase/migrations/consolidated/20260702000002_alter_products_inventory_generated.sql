BEGIN;

-- ============================================================================
-- T-103: Migrar products.inventory_quantity a GENERATED
-- No se dropea la columna existente (~100+ referencias en código).
-- Se renombra a _legacy y se agrega nueva GENERATED column al lado.
-- ============================================================================

ALTER TABLE public.products RENAME COLUMN inventory_quantity TO inventory_quantity_legacy;

ALTER TABLE public.products ADD COLUMN inventory_quantity INTEGER
  GENERATED ALWAYS AS (get_product_total_stock(id)) STORED;

COMMENT ON COLUMN public.products.inventory_quantity IS
  'GENERATED column — suma de product_branch_stock (via get_product_total_stock). Legacy inventory_quantity_legacy renombrada.';

COMMENT ON COLUMN public.products.inventory_quantity_legacy IS
  'LEGACY — reemplazada por inventory_quantity (GENERATED). Mantener hasta migrar consumidores.';

-- ============================================================================
-- T-104: Migrar product_variants.inventory_quantity a GENERATED
-- Mismo patrón que T-103.
-- ============================================================================

ALTER TABLE public.product_variants RENAME COLUMN inventory_quantity TO inventory_quantity_legacy;

ALTER TABLE public.product_variants ADD COLUMN inventory_quantity INTEGER
  GENERATED ALWAYS AS (get_product_variant_total_stock(id)) STORED;

COMMENT ON COLUMN public.product_variants.inventory_quantity IS
  'GENERATED column — suma de product_branch_stock (via get_product_variant_total_stock).';

COMMENT ON COLUMN public.product_variants.inventory_quantity_legacy IS
  'LEGACY — reemplazada por inventory_quantity (GENERATED).';

-- ============================================================================
-- T-105 (parte schema): COMMENTS en tablas anchas
-- Documentando decisión de NO dividir (ADR-3).
-- ============================================================================

COMMENT ON TABLE public.lab_work_orders IS
  '109 cols. No split: columnas se leen juntas en flujo de OT. '
  'Agrupación lógica: lens_prescription_data (~30 cols), delivery_data (~15), '
  'lab_data (~15), pricing/warranty (~15), base header (~34). '
  'Re-evaluar split cuando haya consumidor que necesite subconjunto.';

COMMENT ON TABLE public.orders IS
  '87 cols. No split: columnas se leen juntas en flujo de venta. '
  'Agrupación: shipping (~10), billing/SII (~15), POS (~10), gateway (~15), base (~37).';

COMMENT ON TABLE public.quotes IS
  '84 cols. No split: columnas se leen juntas en presupuesto completo. '
  'Agrupación: lens_options (~25), frame (~15), contact_lens (~10), pricing (~10), base (~24).';

COMMIT;
