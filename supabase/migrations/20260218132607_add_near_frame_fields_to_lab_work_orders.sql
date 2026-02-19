-- Migration: Add near_frame fields to lab_work_orders table
-- For two_separate presbyopia solution, the near frame data must be stored
-- when converting from quote to work order

ALTER TABLE public.lab_work_orders
  ADD COLUMN IF NOT EXISTS near_frame_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS near_frame_name TEXT,
  ADD COLUMN IF NOT EXISTS near_frame_brand TEXT,
  ADD COLUMN IF NOT EXISTS near_frame_model TEXT,
  ADD COLUMN IF NOT EXISTS near_frame_color TEXT,
  ADD COLUMN IF NOT EXISTS near_frame_size TEXT,
  ADD COLUMN IF NOT EXISTS near_frame_sku TEXT,
  ADD COLUMN IF NOT EXISTS near_frame_price DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS near_frame_price_includes_tax BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS near_frame_cost DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS customer_own_near_frame BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_lab_work_orders_near_frame_product_id ON public.lab_work_orders(near_frame_product_id);

COMMENT ON COLUMN public.lab_work_orders.near_frame_product_id IS 'Referencia al producto marco de cerca (presbyopia_solution = two_separate)';
COMMENT ON COLUMN public.lab_work_orders.near_frame_name IS 'Nombre del marco de cerca';
COMMENT ON COLUMN public.lab_work_orders.near_frame_brand IS 'Marca del marco de cerca';
COMMENT ON COLUMN public.lab_work_orders.near_frame_model IS 'Modelo del marco de cerca';
COMMENT ON COLUMN public.lab_work_orders.near_frame_color IS 'Color del marco de cerca';
COMMENT ON COLUMN public.lab_work_orders.near_frame_size IS 'Tamaño del marco de cerca';
COMMENT ON COLUMN public.lab_work_orders.near_frame_sku IS 'SKU del marco de cerca';
COMMENT ON COLUMN public.lab_work_orders.near_frame_price IS 'Precio de venta del marco de cerca';
COMMENT ON COLUMN public.lab_work_orders.near_frame_price_includes_tax IS 'Indica si el precio del marco de cerca incluye IVA';
COMMENT ON COLUMN public.lab_work_orders.near_frame_cost IS 'Costo interno del marco de cerca';
COMMENT ON COLUMN public.lab_work_orders.customer_own_near_frame IS 'Indica si el cliente trae su propio marco de cerca';
