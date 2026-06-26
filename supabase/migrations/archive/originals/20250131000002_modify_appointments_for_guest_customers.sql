-- Migration: 20250131000002_modify_appointments_for_guest_customers.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Modify Appointments Table for Guest (Non-Registered) Customers
-- This migration allows appointments to be created without requiring a registered customer
-- Guest customer data is stored directly in the appointments table

-- Make customer_id optional (allow NULL for guest customers)
ALTER TABLE public.appointments
ALTER COLUMN customer_id DROP NOT NULL;

-- Add guest customer fields (for non-registered customers)
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS guest_first_name TEXT,
ADD COLUMN IF NOT EXISTS guest_last_name TEXT,
ADD COLUMN IF NOT EXISTS guest_rut TEXT,
ADD COLUMN IF NOT EXISTS guest_email TEXT,
ADD COLUMN IF NOT EXISTS guest_phone TEXT;

-- Add constraint: either customer_id or guest data must be present
ALTER TABLE public.appointments
ADD CONSTRAINT appointments_customer_or_guest_check 
CHECK (
  (customer_id IS NOT NULL) OR 
  (guest_first_name IS NOT NULL AND guest_last_name IS NOT NULL AND guest_rut IS NOT NULL)
);

-- Add index for guest RUT searches
CREATE INDEX IF NOT EXISTS idx_appointments_guest_rut ON public.appointments(guest_rut) WHERE guest_rut IS NOT NULL;

-- Add index for guest email searches
CREATE INDEX IF NOT EXISTS idx_appointments_guest_email ON public.appointments(guest_email) WHERE guest_email IS NOT NULL;

-- Add comment explaining the guest customer system
COMMENT ON COLUMN public.appointments.customer_id IS 'Registered customer ID. NULL if this is a guest (non-registered) appointment.';
COMMENT ON COLUMN public.appointments.guest_first_name IS 'First name of guest (non-registered) customer. Required if customer_id is NULL.';
COMMENT ON COLUMN public.appointments.guest_last_name IS 'Last name of guest (non-registered) customer. Required if customer_id is NULL.';
COMMENT ON COLUMN public.appointments.guest_rut IS 'RUT of guest (non-registered) customer. Required if customer_id is NULL.';
COMMENT ON COLUMN public.appointments.guest_email IS 'Email of guest (non-registered) customer. Optional.';
COMMENT ON COLUMN public.appointments.guest_phone IS 'Phone of guest (non-registered) customer. Optional.';
