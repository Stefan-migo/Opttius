-- Migration: 20260122000007_add_on_hold_payment_status.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Add 'on_hold_payment' status to lab_work_orders
-- This status is used in Cash-First logic when payment is insufficient

-- Drop the existing CHECK constraint
ALTER TABLE public.lab_work_orders 
  DROP CONSTRAINT IF EXISTS lab_work_orders_status_check;

-- Add the new CHECK constraint with 'on_hold_payment' status
ALTER TABLE public.lab_work_orders 
  ADD CONSTRAINT lab_work_orders_status_check CHECK (status IN (
    'quote',           -- Quote created, not yet confirmed
    'ordered',         -- Order confirmed, preparing to send to lab
    'on_hold_payment', -- Payment insufficient, work order on hold (Cash-First)
    'sent_to_lab',     -- Sent to laboratory
    'in_progress_lab', -- In progress at laboratory
    'ready_at_lab',    -- Ready at lab, waiting for pickup
    'received_from_lab', -- Received from lab, needs mounting
    'mounted',         -- Lenses mounted in frame
    'quality_check',   -- Quality control check
    'ready_for_pickup', -- Ready for customer pickup
    'delivered',       -- Delivered to customer
    'cancelled',       -- Cancelled
    'returned'         -- Returned by customer
  ));

COMMENT ON CONSTRAINT lab_work_orders_status_check ON public.lab_work_orders IS 
  'Estado del trabajo. on_hold_payment: Pago insuficiente, trabajo en espera (Cash-First)';
