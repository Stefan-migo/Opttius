-- Migration: 20260206000000_add_mercadopago_metadata.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migración: Agregar campos adicionales para metadata de MercadoPago
-- Fecha: 2026-02-06
-- Descripción: Campos opcionales para almacenar información detallada de MercadoPago

-- Agregar columnas adicionales para MercadoPago si es necesario
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS mp_preference_id TEXT,
  ADD COLUMN IF NOT EXISTS mp_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS mp_merchant_order_id TEXT,
  ADD COLUMN IF NOT EXISTS mp_payment_type TEXT,
  ADD COLUMN IF NOT EXISTS mp_payment_method TEXT;

-- Índices para mejorar consultas
CREATE INDEX IF NOT EXISTS idx_payments_mp_preference_id ON public.payments(mp_preference_id);
CREATE INDEX IF NOT EXISTS idx_payments_mp_payment_id ON public.payments(mp_payment_id);

-- Comentarios
COMMENT ON COLUMN public.payments.mp_preference_id IS 'ID de la preferencia de MercadoPago';
COMMENT ON COLUMN public.payments.mp_payment_id IS 'ID del pago en MercadoPago';
COMMENT ON COLUMN public.payments.mp_merchant_order_id IS 'ID de la orden comercial en MercadoPago';
COMMENT ON COLUMN public.payments.mp_payment_type IS 'Tipo de pago (credit_card, debit_card, ticket, bank_transfer, etc.)';
COMMENT ON COLUMN public.payments.mp_payment_method IS 'Método de pago específico (visa, mastercard, redlink, etc.)';
