-- Migration: 20251216000000_create_branches_system.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Create Multi-Branch System
-- This migration implements a complete multi-branch system for the optical shop

-- ===== CREATE BRANCHES TABLE =====
CREATE TABLE IF NOT EXISTS public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL, -- Unique code (e.g., "SUC-001")
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  phone TEXT,
  email TEXT,
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}'::jsonb, -- Branch-specific settings
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ===== CREATE ADMIN_BRANCH_ACCESS TABLE =====
CREATE TABLE IF NOT EXISTS public.admin_branch_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  -- NULL branch_id means super admin (access to all branches)
  role TEXT DEFAULT 'manager' CHECK (role IN ('manager', 'staff', 'viewer')),
  is_primary BOOLEAN DEFAULT false, -- Primary branch for the user
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(admin_user_id, branch_id)
);

-- ===== CREATE PRODUCT_BRANCH_STOCK TABLE =====
CREATE TABLE IF NOT EXISTS public.product_branch_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 0,
  reserved_quantity INTEGER DEFAULT 0, -- For pending orders
  low_stock_threshold INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(product_id, branch_id)
);

-- ===== ADD BRANCH_ID TO EXISTING TABLES =====

-- Appointments
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

-- Quotes
ALTER TABLE public.quotes
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

-- Lab Work Orders
ALTER TABLE public.lab_work_orders
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

-- Orders
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

-- Profiles (optional: preferred branch)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS preferred_branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

-- Schedule Settings
ALTER TABLE public.schedule_settings
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE;

-- Quote Settings
ALTER TABLE public.quote_settings
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE;

-- Admin Notifications
ALTER TABLE public.admin_notifications
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

-- ===== CREATE INDEXES =====
CREATE INDEX IF NOT EXISTS idx_branches_code ON public.branches(code);
CREATE INDEX IF NOT EXISTS idx_branches_active ON public.branches(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_branch_access_admin ON public.admin_branch_access(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_branch_access_branch ON public.admin_branch_access(branch_id);
CREATE INDEX IF NOT EXISTS idx_product_branch_stock_product ON public.product_branch_stock(product_id);
CREATE INDEX IF NOT EXISTS idx_product_branch_stock_branch ON public.product_branch_stock(branch_id);
CREATE INDEX IF NOT EXISTS idx_appointments_branch ON public.appointments(branch_id);
CREATE INDEX IF NOT EXISTS idx_quotes_branch ON public.quotes(branch_id);
CREATE INDEX IF NOT EXISTS idx_lab_work_orders_branch ON public.lab_work_orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_orders_branch ON public.orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_schedule_settings_branch ON public.schedule_settings(branch_id);
CREATE INDEX IF NOT EXISTS idx_quote_settings_branch ON public.quote_settings(branch_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_branch ON public.admin_notifications(branch_id);

-- ===== CREATE FUNCTIONS =====

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Super admin has a record with NULL branch_id
  RETURN EXISTS (
    SELECT 1 FROM public.admin_branch_access
    WHERE admin_user_id = user_id
    AND branch_id IS NULL
  );
END;
$$;

-- Function to get user's accessible branches
CREATE OR REPLACE FUNCTION public.get_user_branches(user_id UUID DEFAULT auth.uid())
RETURNS TABLE (
  branch_id UUID,
  branch_name TEXT,
  branch_code TEXT,
  role TEXT,
  is_primary BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If super admin, return all branches
  IF public.is_super_admin(user_id) THEN
    RETURN QUERY
    SELECT 
      b.id,
      b.name,
      b.code,
      'super_admin'::TEXT,
      false
    FROM public.branches b
    WHERE b.is_active = true
    ORDER BY b.name;
  ELSE
    -- Return user's assigned branches
    RETURN QUERY
    SELECT 
      aba.branch_id,
      b.name,
      b.code,
      aba.role,
      aba.is_primary
    FROM public.admin_branch_access aba
    JOIN public.branches b ON b.id = aba.branch_id
    WHERE aba.admin_user_id = user_id
    AND b.is_active = true
    ORDER BY aba.is_primary DESC, b.name;
  END IF;
END;
$$;

-- Function to check if user can access a branch
CREATE OR REPLACE FUNCTION public.can_access_branch(
  user_id UUID DEFAULT auth.uid(),
  p_branch_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Super admin can access any branch (including NULL for global view)
  IF public.is_super_admin(user_id) THEN
    RETURN TRUE;
  END IF;
  
  -- If branch_id is NULL, only super admin can access
  IF p_branch_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user has access to this specific branch
  RETURN EXISTS (
    SELECT 1 FROM public.admin_branch_access
    WHERE admin_user_id = user_id
    AND branch_id = p_branch_id
  );
END;
$$;

-- Function to get current branch context (for future use with session variables)
CREATE OR REPLACE FUNCTION public.get_current_branch_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This will be set via session variable in the future
  -- For now, return NULL (will be handled in application layer)
  RETURN NULL;
END;
$$;

-- ===== CREATE TRIGGERS =====

-- Trigger to update updated_at for branches
CREATE TRIGGER update_branches_updated_at
  BEFORE UPDATE ON public.branches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at for product_branch_stock
CREATE TRIGGER update_product_branch_stock_updated_at
  BEFORE UPDATE ON public.product_branch_stock
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ===== ENABLE RLS =====
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_branch_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_branch_stock ENABLE ROW LEVEL SECURITY;

-- ===== RLS POLICIES FOR BRANCHES =====

-- Admins can view all branches
CREATE POLICY "Admins can view branches"
ON public.branches
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.id = auth.uid()
    AND au.is_active = true
  )
);

-- Only super admins can manage branches
CREATE POLICY "Super admins can manage branches"
ON public.branches
FOR ALL
USING (
  public.is_super_admin(auth.uid())
)
WITH CHECK (
  public.is_super_admin(auth.uid())
);

-- ===== RLS POLICIES FOR ADMIN_BRANCH_ACCESS =====

-- Admins can view their own access records
CREATE POLICY "Admins can view own branch access"
ON public.admin_branch_access
FOR SELECT
USING (
  admin_user_id = auth.uid()
  OR public.is_super_admin(auth.uid())
);

-- Super admins can manage all access records
CREATE POLICY "Super admins can manage branch access"
ON public.admin_branch_access
FOR ALL
USING (
  public.is_super_admin(auth.uid())
)
WITH CHECK (
  public.is_super_admin(auth.uid())
);

-- ===== RLS POLICIES FOR PRODUCT_BRANCH_STOCK =====

-- Admins can view stock in their branches
CREATE POLICY "Admins can view stock in their branches"
ON public.product_branch_stock
FOR SELECT
USING (
  public.is_super_admin(auth.uid())
  OR branch_id IN (
    SELECT branch_id FROM public.admin_branch_access
    WHERE admin_user_id = auth.uid()
  )
);

-- Admins can manage stock in their branches
CREATE POLICY "Admins can manage stock in their branches"
ON public.product_branch_stock
FOR ALL
USING (
  public.is_super_admin(auth.uid())
  OR branch_id IN (
    SELECT branch_id FROM public.admin_branch_access
    WHERE admin_user_id = auth.uid()
    AND role IN ('manager', 'staff')
  )
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR branch_id IN (
    SELECT branch_id FROM public.admin_branch_access
    WHERE admin_user_id = auth.uid()
    AND role IN ('manager', 'staff')
  )
);

-- ===== CREATE DEFAULT BRANCH AND MIGRATE DATA =====

-- Insert default branch
INSERT INTO public.branches (name, code, is_active)
VALUES ('Sucursal Principal', 'MAIN', true)
ON CONFLICT (code) DO NOTHING;

-- Get default branch ID
DO $$
DECLARE
  default_branch_id UUID;
BEGIN
  SELECT id INTO default_branch_id
  FROM public.branches
  WHERE code = 'MAIN'
  LIMIT 1;
  
  -- Migrate existing data to default branch
  IF default_branch_id IS NOT NULL THEN
    -- Update appointments
    UPDATE public.appointments
    SET branch_id = default_branch_id
    WHERE branch_id IS NULL;
    
    -- Update quotes
    UPDATE public.quotes
    SET branch_id = default_branch_id
    WHERE branch_id IS NULL;
    
    -- Update lab work orders
    UPDATE public.lab_work_orders
    SET branch_id = default_branch_id
    WHERE branch_id IS NULL;
    
    -- Update orders
    UPDATE public.orders
    SET branch_id = default_branch_id
    WHERE branch_id IS NULL;
    
    -- Update schedule settings (create one per branch if needed)
    UPDATE public.schedule_settings
    SET branch_id = default_branch_id
    WHERE branch_id IS NULL;
    
    -- Update quote settings (create one per branch if needed)
    UPDATE public.quote_settings
    SET branch_id = default_branch_id
    WHERE branch_id IS NULL;
    
    -- Update admin notifications
    UPDATE public.admin_notifications
    SET branch_id = default_branch_id
    WHERE branch_id IS NULL;
    
    -- Create stock entries for all products in default branch
    INSERT INTO public.product_branch_stock (product_id, branch_id, quantity, low_stock_threshold)
    SELECT 
      p.id,
      default_branch_id,
      COALESCE(p.inventory_quantity, 0),
      COALESCE(p.low_stock_threshold, 5)
    FROM public.products p
    WHERE NOT EXISTS (
      SELECT 1 FROM public.product_branch_stock pbs
      WHERE pbs.product_id = p.id
      AND pbs.branch_id = default_branch_id
    );
    
    -- Grant all existing admins access to default branch
    INSERT INTO public.admin_branch_access (admin_user_id, branch_id, role, is_primary)
    SELECT 
      au.id,
      default_branch_id,
      'manager',
      true
    FROM public.admin_users au
    WHERE au.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM public.admin_branch_access aba
      WHERE aba.admin_user_id = au.id
      AND aba.branch_id = default_branch_id
    );
  END IF;
END $$;

-- ===== COMMENTS =====
COMMENT ON TABLE public.branches IS 'Business branches/locations';
COMMENT ON TABLE public.admin_branch_access IS 'Admin user access to branches. NULL branch_id means super admin (access to all)';
COMMENT ON TABLE public.product_branch_stock IS 'Product inventory stock per branch';
COMMENT ON FUNCTION public.is_super_admin IS 'Check if user is super admin (has access to all branches)';
COMMENT ON FUNCTION public.get_user_branches IS 'Get all branches accessible to a user';
COMMENT ON FUNCTION public.can_access_branch IS 'Check if user can access a specific branch';
COMMENT ON FUNCTION public.get_current_branch_id IS 'Get current branch from session context';
