-- Migration: 20251218000000_separate_customers_from_users.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Separate Customers from Users
-- This migration creates a separate customers table for branch-specific customer management
-- Users (profiles) are for software users (admins, signup users)
-- Customers are created only from within the platform and are branch-specific

-- ===== CREATE CUSTOMERS TABLE =====
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  
  -- Basic information
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT, -- Optional, customers may not have email
  phone TEXT, -- Optional but recommended
  
  -- Identification
  rut TEXT, -- Chilean RUT (Rol Único Tributario) or similar
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  
  -- Address
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'Chile',
  
  -- Medical/Visual Information (for optical shop)
  medical_conditions TEXT[],
  allergies TEXT[],
  medications TEXT[],
  medical_notes TEXT,
  last_eye_exam_date DATE,
  next_eye_exam_due DATE,
  
  -- Contact preferences
  preferred_contact_method TEXT CHECK (preferred_contact_method IN ('email', 'phone', 'sms', 'whatsapp')),
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  
  -- Insurance
  insurance_provider TEXT,
  insurance_policy_number TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  notes TEXT, -- General notes about the customer
  tags TEXT[], -- Tags for categorization
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_customers_branch_id ON public.customers(branch_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_rut ON public.customers(rut) WHERE rut IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_customers_is_active ON public.customers(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON public.customers(created_at DESC);

-- Create updated_at trigger
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ===== ENABLE ROW LEVEL SECURITY =====
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customers
-- Super admin can view all customers
CREATE POLICY "Super admins can view all customers"
  ON public.customers FOR SELECT
  USING (
    public.is_super_admin(auth.uid())
  );

-- Regular admins can view customers in their accessible branches
CREATE POLICY "Admins can view customers in their branches"
  ON public.customers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_branch_access aba
      WHERE aba.admin_user_id = auth.uid()
      AND aba.branch_id = customers.branch_id
    )
  );

-- Super admin can insert customers in any branch
CREATE POLICY "Super admins can insert customers"
  ON public.customers FOR INSERT
  WITH CHECK (
    public.is_super_admin(auth.uid())
  );

-- Regular admins can insert customers in their accessible branches
CREATE POLICY "Admins can insert customers in their branches"
  ON public.customers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_branch_access aba
      WHERE aba.admin_user_id = auth.uid()
      AND aba.branch_id = customers.branch_id
    )
  );

-- Super admin can update any customer
CREATE POLICY "Super admins can update customers"
  ON public.customers FOR UPDATE
  USING (
    public.is_super_admin(auth.uid())
  );

-- Regular admins can update customers in their accessible branches
CREATE POLICY "Admins can update customers in their branches"
  ON public.customers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_branch_access aba
      WHERE aba.admin_user_id = auth.uid()
      AND aba.branch_id = customers.branch_id
    )
  );

-- Super admin can delete any customer
CREATE POLICY "Super admins can delete customers"
  ON public.customers FOR DELETE
  USING (
    public.is_super_admin(auth.uid())
  );

-- Regular admins can delete customers in their accessible branches
CREATE POLICY "Admins can delete customers in their branches"
  ON public.customers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_branch_access aba
      WHERE aba.admin_user_id = auth.uid()
      AND aba.branch_id = customers.branch_id
    )
  );

-- ===== COMMENTS =====
COMMENT ON TABLE public.customers IS 'Branch-specific customers. Separate from users (profiles). Customers are created only from within the platform.';
COMMENT ON COLUMN public.customers.branch_id IS 'The branch this customer belongs to. Each branch manages its own customers independently.';
COMMENT ON COLUMN public.customers.email IS 'Optional email. Customers may not have email addresses.';
COMMENT ON COLUMN public.customers.rut IS 'Chilean RUT (Rol Único Tributario) or similar identification number.';
