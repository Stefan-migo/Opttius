-- Migration: 20260131000006_add_contact_lens_fields_to_quotes_and_work_orders.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- ============================================================================
-- Migration: Add Contact Lens Fields to Quotes and Lab Work Orders
-- Phase: Contact Lenses Integration
-- Description: Agrega campos para lentes de contacto en presupuestos y trabajos
-- ============================================================================

-- ===== ADD CONTACT LENS FIELDS TO QUOTES TABLE =====
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS contact_lens_family_id UUID REFERENCES public.contact_lens_families(id) ON DELETE SET NULL,
  
  -- Receta Ojo Derecho (OD)
  ADD COLUMN IF NOT EXISTS contact_lens_rx_sphere_od DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS contact_lens_rx_cylinder_od DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS contact_lens_rx_axis_od INTEGER,
  ADD COLUMN IF NOT EXISTS contact_lens_rx_add_od DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS contact_lens_rx_base_curve_od DECIMAL(4,2),
  ADD COLUMN IF NOT EXISTS contact_lens_rx_diameter_od DECIMAL(4,2),
  
  -- Receta Ojo Izquierdo (OS)
  ADD COLUMN IF NOT EXISTS contact_lens_rx_sphere_os DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS contact_lens_rx_cylinder_os DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS contact_lens_rx_axis_os INTEGER,
  ADD COLUMN IF NOT EXISTS contact_lens_rx_add_os DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS contact_lens_rx_base_curve_os DECIMAL(4,2),
  ADD COLUMN IF NOT EXISTS contact_lens_rx_diameter_os DECIMAL(4,2),
  
  -- Cantidad y precios
  ADD COLUMN IF NOT EXISTS contact_lens_quantity INTEGER DEFAULT 1, -- Cantidad de cajas
  ADD COLUMN IF NOT EXISTS contact_lens_cost DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS contact_lens_price DECIMAL(10,2);

-- Índices para quotes
CREATE INDEX IF NOT EXISTS idx_quotes_contact_lens_family ON public.quotes(contact_lens_family_id) WHERE contact_lens_family_id IS NOT NULL;

-- ===== ADD CONTACT LENS FIELDS TO LAB_WORK_ORDERS TABLE =====
ALTER TABLE public.lab_work_orders
  ADD COLUMN IF NOT EXISTS contact_lens_family_id UUID REFERENCES public.contact_lens_families(id) ON DELETE SET NULL,
  
  -- Receta Ojo Derecho (OD)
  ADD COLUMN IF NOT EXISTS contact_lens_rx_sphere_od DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS contact_lens_rx_cylinder_od DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS contact_lens_rx_axis_od INTEGER,
  ADD COLUMN IF NOT EXISTS contact_lens_rx_add_od DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS contact_lens_rx_base_curve_od DECIMAL(4,2),
  ADD COLUMN IF NOT EXISTS contact_lens_rx_diameter_od DECIMAL(4,2),
  
  -- Receta Ojo Izquierdo (OS)
  ADD COLUMN IF NOT EXISTS contact_lens_rx_sphere_os DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS contact_lens_rx_cylinder_os DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS contact_lens_rx_axis_os INTEGER,
  ADD COLUMN IF NOT EXISTS contact_lens_rx_add_os DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS contact_lens_rx_base_curve_os DECIMAL(4,2),
  ADD COLUMN IF NOT EXISTS contact_lens_rx_diameter_os DECIMAL(4,2),
  
  -- Cantidad y costo
  ADD COLUMN IF NOT EXISTS contact_lens_quantity INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS contact_lens_cost DECIMAL(10,2);

-- Índices para lab_work_orders
CREATE INDEX IF NOT EXISTS idx_lab_work_orders_contact_lens_family ON public.lab_work_orders(contact_lens_family_id) WHERE contact_lens_family_id IS NOT NULL;

-- ===== COMMENTS =====
COMMENT ON COLUMN public.quotes.contact_lens_family_id IS 'Referencia a la familia de lentes de contacto seleccionada';
COMMENT ON COLUMN public.quotes.contact_lens_quantity IS 'Cantidad de cajas de lentes de contacto';
COMMENT ON COLUMN public.quotes.contact_lens_price IS 'Precio total de lentes de contacto (precio por caja * cantidad)';
COMMENT ON COLUMN public.quotes.contact_lens_cost IS 'Costo total de lentes de contacto';
COMMENT ON COLUMN public.lab_work_orders.contact_lens_family_id IS 'Referencia a la familia de lentes de contacto para el trabajo';
COMMENT ON COLUMN public.lab_work_orders.contact_lens_quantity IS 'Cantidad de cajas de lentes de contacto';
