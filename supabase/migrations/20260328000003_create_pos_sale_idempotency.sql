-- Migration: Create pos_sale_idempotency table for duplicate sale prevention
-- When same idempotency_key is sent twice, return stored result instead of creating duplicate

CREATE TABLE IF NOT EXISTS public.pos_sale_idempotency (
  idempotency_key UUID PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  work_order_id UUID REFERENCES public.lab_work_orders(id) ON DELETE SET NULL,
  response_snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pos_sale_idempotency_created_at
  ON public.pos_sale_idempotency(created_at);

COMMENT ON TABLE public.pos_sale_idempotency IS 'Stores successful POS sale results by idempotency key to prevent duplicates on retry';
