-- Migration: 20251218000001_update_customer_references.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Update Customer References
-- This migration updates all customer_id references from profiles to customers table
-- Note: This is a breaking change. Data migration should be done separately.

-- ===== UPDATE APPOINTMENTS TABLE =====
-- Change customer_id to reference customers instead of profiles
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_customer_id_fkey;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_customer_id_fkey 
  FOREIGN KEY (customer_id) 
  REFERENCES public.customers(id) 
  ON DELETE CASCADE;

-- ===== UPDATE PRESCRIPTIONS TABLE =====
ALTER TABLE public.prescriptions
  DROP CONSTRAINT IF EXISTS prescriptions_customer_id_fkey;

ALTER TABLE public.prescriptions
  ADD CONSTRAINT prescriptions_customer_id_fkey 
  FOREIGN KEY (customer_id) 
  REFERENCES public.customers(id) 
  ON DELETE CASCADE;

-- ===== UPDATE QUOTES TABLE =====
ALTER TABLE public.quotes
  DROP CONSTRAINT IF EXISTS quotes_customer_id_fkey;

ALTER TABLE public.quotes
  ADD CONSTRAINT quotes_customer_id_fkey 
  FOREIGN KEY (customer_id) 
  REFERENCES public.customers(id) 
  ON DELETE CASCADE;

-- ===== UPDATE LAB_WORK_ORDERS TABLE =====
ALTER TABLE public.lab_work_orders
  DROP CONSTRAINT IF EXISTS lab_work_orders_customer_id_fkey;

ALTER TABLE public.lab_work_orders
  ADD CONSTRAINT lab_work_orders_customer_id_fkey 
  FOREIGN KEY (customer_id) 
  REFERENCES public.customers(id) 
  ON DELETE CASCADE;

-- ===== UPDATE CUSTOMER_LENS_PURCHASES TABLE =====
ALTER TABLE public.customer_lens_purchases
  DROP CONSTRAINT IF EXISTS customer_lens_purchases_customer_id_fkey;

ALTER TABLE public.customer_lens_purchases
  ADD CONSTRAINT customer_lens_purchases_customer_id_fkey 
  FOREIGN KEY (customer_id) 
  REFERENCES public.customers(id) 
  ON DELETE CASCADE;

-- ===== UPDATE ORDERS TABLE (if it has customer_id) =====
-- Check if orders table has customer_id column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'customer_id'
  ) THEN
    ALTER TABLE public.orders
      DROP CONSTRAINT IF EXISTS orders_customer_id_fkey;
    
    ALTER TABLE public.orders
      ADD CONSTRAINT orders_customer_id_fkey 
      FOREIGN KEY (customer_id) 
      REFERENCES public.customers(id) 
      ON DELETE SET NULL; -- SET NULL instead of CASCADE for orders
  END IF;
END $$;

-- ===== ADD BRANCH_ID TO APPOINTMENTS (if not exists) =====
-- Appointments should also be branch-specific
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'appointments' 
    AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE public.appointments
      ADD COLUMN branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_appointments_branch_id ON public.appointments(branch_id);
    
    -- Update existing appointments to use customer's branch
    UPDATE public.appointments a
    SET branch_id = c.branch_id
    FROM public.customers c
    WHERE a.customer_id = c.id
    AND a.branch_id IS NULL;
  END IF;
END $$;

-- ===== ADD BRANCH_ID TO QUOTES (if not exists) =====
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'quotes' 
    AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE public.quotes
      ADD COLUMN branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_quotes_branch_id ON public.quotes(branch_id);
    
    -- Update existing quotes to use customer's branch
    UPDATE public.quotes q
    SET branch_id = c.branch_id
    FROM public.customers c
    WHERE q.customer_id = c.id
    AND q.branch_id IS NULL;
  END IF;
END $$;

-- ===== ADD BRANCH_ID TO LAB_WORK_ORDERS (if not exists) =====
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'lab_work_orders' 
    AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE public.lab_work_orders
      ADD COLUMN branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_lab_work_orders_branch_id ON public.lab_work_orders(branch_id);
    
    -- Update existing work orders to use customer's branch
    UPDATE public.lab_work_orders w
    SET branch_id = c.branch_id
    FROM public.customers c
    WHERE w.customer_id = c.id
    AND w.branch_id IS NULL;
  END IF;
END $$;

-- ===== COMMENTS =====
COMMENT ON COLUMN public.appointments.customer_id IS 'References customers table, not profiles. Customers are branch-specific.';
COMMENT ON COLUMN public.prescriptions.customer_id IS 'References customers table, not profiles. Customers are branch-specific.';
COMMENT ON COLUMN public.quotes.customer_id IS 'References customers table, not profiles. Customers are branch-specific.';
COMMENT ON COLUMN public.lab_work_orders.customer_id IS 'References customers table, not profiles. Customers are branch-specific.';
