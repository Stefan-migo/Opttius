-- Migration: 20251221000000_add_branch_to_pos_and_cash_register.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Add branch_id to POS system and create cash register closure system
-- This allows each branch to have independent POS operations and daily cash closures

-- ===== ADD BRANCH_ID TO ORDERS (if not exists) =====
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'orders' 
    AND column_name = 'branch_id'
  ) THEN
    ALTER TABLE public.orders
      ADD COLUMN branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_orders_branch_id ON public.orders(branch_id);
    
    -- Update existing POS orders to use cashier's branch (if available)
    UPDATE public.orders o
    SET branch_id = (
      SELECT aba.branch_id 
      FROM public.admin_branch_access aba
      WHERE aba.admin_user_id = o.pos_cashier_id
      AND aba.is_primary = true
      LIMIT 1
    )
    WHERE o.is_pos_sale = true
    AND o.branch_id IS NULL;
  END IF;
END $$;

-- ===== ADD BRANCH_ID TO POS_SESSIONS =====
ALTER TABLE public.pos_sessions
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_pos_sessions_branch_id ON public.pos_sessions(branch_id);

-- Update existing open sessions to use cashier's branch
UPDATE public.pos_sessions ps
SET branch_id = (
  SELECT aba.branch_id 
  FROM public.admin_branch_access aba
  WHERE aba.admin_user_id = ps.cashier_id
  AND aba.is_primary = true
  LIMIT 1
)
WHERE ps.branch_id IS NULL
AND ps.status = 'open';

-- ===== CREATE CASH REGISTER CLOSURES TABLE =====
CREATE TABLE IF NOT EXISTS public.cash_register_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  closure_date DATE NOT NULL DEFAULT CURRENT_DATE,
  closed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Opening amounts
  opening_cash_amount DECIMAL(12,2) DEFAULT 0 NOT NULL,
  
  -- Sales summary
  total_sales DECIMAL(12,2) DEFAULT 0 NOT NULL,
  total_transactions INTEGER DEFAULT 0 NOT NULL,
  
  -- Payment method breakdown
  cash_sales DECIMAL(12,2) DEFAULT 0 NOT NULL,
  debit_card_sales DECIMAL(12,2) DEFAULT 0 NOT NULL,
  credit_card_sales DECIMAL(12,2) DEFAULT 0 NOT NULL,
  installments_sales DECIMAL(12,2) DEFAULT 0 NOT NULL,
  other_payment_sales DECIMAL(12,2) DEFAULT 0 NOT NULL,
  
  -- Cash reconciliation
  expected_cash DECIMAL(12,2) DEFAULT 0 NOT NULL, -- opening_cash + cash_sales
  actual_cash DECIMAL(12,2), -- Physical cash count
  cash_difference DECIMAL(12,2) DEFAULT 0, -- actual_cash - expected_cash
  
  -- Card machine reconciliation
  card_machine_debit_total DECIMAL(12,2) DEFAULT 0,
  card_machine_credit_total DECIMAL(12,2) DEFAULT 0,
  card_machine_difference DECIMAL(12,2) DEFAULT 0,
  
  -- Totals
  total_subtotal DECIMAL(12,2) DEFAULT 0 NOT NULL,
  total_tax DECIMAL(12,2) DEFAULT 0 NOT NULL,
  total_discounts DECIMAL(12,2) DEFAULT 0 NOT NULL,
  
  -- Closing amounts
  closing_cash_amount DECIMAL(12,2), -- actual_cash (if provided)
  
  -- Notes and observations
  notes TEXT,
  discrepancies TEXT, -- Any discrepancies found during closure
  
  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'reviewed')),
  
  -- Timestamps
  opened_at TIMESTAMPTZ NOT NULL, -- When the cash register was opened (start of day)
  closed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL, -- When closure was created
  confirmed_at TIMESTAMPTZ, -- When closure was confirmed
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Ensure one closure per branch per day
  CONSTRAINT unique_branch_closure_date UNIQUE (branch_id, closure_date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cash_register_closures_branch_id ON public.cash_register_closures(branch_id);
CREATE INDEX IF NOT EXISTS idx_cash_register_closures_date ON public.cash_register_closures(closure_date DESC);
CREATE INDEX IF NOT EXISTS idx_cash_register_closures_closed_by ON public.cash_register_closures(closed_by);
CREATE INDEX IF NOT EXISTS idx_cash_register_closures_status ON public.cash_register_closures(status);

-- ===== UPDATE RLS POLICIES FOR ORDERS =====
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view orders in their branches" ON public.orders;
DROP POLICY IF EXISTS "Admins can insert orders in their branches" ON public.orders;
DROP POLICY IF EXISTS "Admins can update orders in their branches" ON public.orders;

-- Create new RLS policies that consider branch_id
CREATE POLICY "Admins can view orders in their branches"
ON public.orders
FOR SELECT
USING (
  -- Super admin sees all orders
  public.is_super_admin(auth.uid())
  OR
  -- Regular admin sees orders in their accessible branches or orders without branch (legacy)
  (
    branch_id IS NULL
    OR
    EXISTS (
      SELECT 1 FROM public.admin_branch_access aba
      WHERE aba.admin_user_id = auth.uid()
      AND aba.branch_id = orders.branch_id
    )
  )
);

CREATE POLICY "Admins can insert orders in their branches"
ON public.orders
FOR INSERT
WITH CHECK (
  -- Super admin can create orders for any branch
  public.is_super_admin(auth.uid())
  OR
  -- Regular admin can only create orders for their accessible branches
  (
    branch_id IS NULL
    OR
    EXISTS (
      SELECT 1 FROM public.admin_branch_access aba
      WHERE aba.admin_user_id = auth.uid()
      AND aba.branch_id = orders.branch_id
    )
  )
);

CREATE POLICY "Admins can update orders in their branches"
ON public.orders
FOR UPDATE
USING (
  -- Super admin can update any order
  public.is_super_admin(auth.uid())
  OR
  -- Regular admin can update orders in their accessible branches
  (
    branch_id IS NULL
    OR
    EXISTS (
      SELECT 1 FROM public.admin_branch_access aba
      WHERE aba.admin_user_id = auth.uid()
      AND aba.branch_id = orders.branch_id
    )
  )
);

-- ===== UPDATE RLS POLICIES FOR POS_SESSIONS =====
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view pos_sessions" ON public.pos_sessions;
DROP POLICY IF EXISTS "Admins can insert pos_sessions" ON public.pos_sessions;
DROP POLICY IF EXISTS "Admins can update pos_sessions" ON public.pos_sessions;

-- Create new RLS policies that consider branch_id
CREATE POLICY "Admins can view pos_sessions in their branches"
ON public.pos_sessions
FOR SELECT
USING (
  -- Super admin sees all sessions
  public.is_super_admin(auth.uid())
  OR
  -- Regular admin sees sessions in their accessible branches
  (
    branch_id IS NULL
    OR
    EXISTS (
      SELECT 1 FROM public.admin_branch_access aba
      WHERE aba.admin_user_id = auth.uid()
      AND aba.branch_id = pos_sessions.branch_id
    )
  )
  OR
  -- Cashier can see their own sessions
  cashier_id = auth.uid()
);

CREATE POLICY "Admins can insert pos_sessions in their branches"
ON public.pos_sessions
FOR INSERT
WITH CHECK (
  -- Super admin can create sessions for any branch
  public.is_super_admin(auth.uid())
  OR
  -- Regular admin can only create sessions for their accessible branches
  (
    branch_id IS NULL
    OR
    EXISTS (
      SELECT 1 FROM public.admin_branch_access aba
      WHERE aba.admin_user_id = auth.uid()
      AND aba.branch_id = pos_sessions.branch_id
    )
  )
  OR
  -- Cashier can create their own session
  cashier_id = auth.uid()
);

CREATE POLICY "Admins can update pos_sessions in their branches"
ON public.pos_sessions
FOR UPDATE
USING (
  -- Super admin can update any session
  public.is_super_admin(auth.uid())
  OR
  -- Regular admin can update sessions in their accessible branches
  (
    branch_id IS NULL
    OR
    EXISTS (
      SELECT 1 FROM public.admin_branch_access aba
      WHERE aba.admin_user_id = auth.uid()
      AND aba.branch_id = pos_sessions.branch_id
    )
  )
  OR
  -- Cashier can update their own session
  cashier_id = auth.uid()
);

-- ===== RLS POLICIES FOR CASH REGISTER CLOSURES =====
ALTER TABLE public.cash_register_closures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view cash register closures in their branches"
ON public.cash_register_closures
FOR SELECT
USING (
  -- Super admin sees all closures
  public.is_super_admin(auth.uid())
  OR
  -- Regular admin sees closures in their accessible branches
  EXISTS (
    SELECT 1 FROM public.admin_branch_access aba
    WHERE aba.admin_user_id = auth.uid()
    AND aba.branch_id = cash_register_closures.branch_id
  )
);

CREATE POLICY "Admins can insert cash register closures in their branches"
ON public.cash_register_closures
FOR INSERT
WITH CHECK (
  -- Super admin can create closures for any branch
  public.is_super_admin(auth.uid())
  OR
  -- Regular admin can only create closures for their accessible branches
  EXISTS (
    SELECT 1 FROM public.admin_branch_access aba
    WHERE aba.admin_user_id = auth.uid()
    AND aba.branch_id = cash_register_closures.branch_id
  )
  OR
  -- User can create closure for their own branch
  closed_by = auth.uid()
);

CREATE POLICY "Admins can update cash register closures in their branches"
ON public.cash_register_closures
FOR UPDATE
USING (
  -- Super admin can update any closure
  public.is_super_admin(auth.uid())
  OR
  -- Regular admin can update closures in their accessible branches
  EXISTS (
    SELECT 1 FROM public.admin_branch_access aba
    WHERE aba.admin_user_id = auth.uid()
    AND aba.branch_id = cash_register_closures.branch_id
  )
  OR
  -- User can update their own closure (if draft)
  (closed_by = auth.uid() AND status = 'draft')
);

-- ===== COMMENTS =====
COMMENT ON COLUMN public.orders.branch_id IS 'Sucursal donde se realizó la venta POS. NULL para órdenes legacy.';
COMMENT ON COLUMN public.pos_sessions.branch_id IS 'Sucursal donde se realiza la sesión de caja.';
COMMENT ON TABLE public.cash_register_closures IS 'Cierres de caja diarios por sucursal. Permite cuadrar ventas con efectivo y tarjetas.';
COMMENT ON COLUMN public.cash_register_closures.expected_cash IS 'Efectivo esperado: monto inicial + ventas en efectivo';
COMMENT ON COLUMN public.cash_register_closures.actual_cash IS 'Efectivo físico contado al cerrar la caja';
COMMENT ON COLUMN public.cash_register_closures.cash_difference IS 'Diferencia entre efectivo esperado y real (actual - expected)';
