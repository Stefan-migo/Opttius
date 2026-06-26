-- Migration: 20260210040000_create_internal_orders_tracking.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Create Internal Orders Tracking System
-- This migration implements the complete internal order tracking system for branch-to-branch transfers

-- ===== CREATE DRIVERS TABLE =====
CREATE TABLE IF NOT EXISTS public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  license_number TEXT UNIQUE NOT NULL,
  phone TEXT,
  email TEXT,
  is_active BOOLEAN DEFAULT true,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ===== CREATE VEHICLES TABLE =====
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate_number TEXT UNIQUE NOT NULL,
  model TEXT,
  capacity INTEGER DEFAULT 0 CHECK (capacity >= 0),
  is_active BOOLEAN DEFAULT true,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ===== CREATE INTERNAL ORDERS TABLE =====
CREATE TABLE IF NOT EXISTS public.internal_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  origin_branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  destination_branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_transit', 'delivered', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  scheduled_date DATE,
  actual_delivery_date DATE,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES public.admin_users(id) ON DELETE RESTRICT,
  assigned_driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  assigned_vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT chk_different_branches CHECK (origin_branch_id != destination_branch_id),
  CONSTRAINT chk_valid_dates CHECK (
    scheduled_date IS NULL OR actual_delivery_date IS NULL OR scheduled_date <= actual_delivery_date
  )
);

-- ===== CREATE INTERNAL ORDER ITEMS TABLE =====
CREATE TABLE IF NOT EXISTS public.internal_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_order_id UUID NOT NULL REFERENCES public.internal_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ===== CREATE INTERNAL ORDER STATUS HISTORY TABLE =====
CREATE TABLE IF NOT EXISTS public.internal_order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_order_id UUID NOT NULL REFERENCES public.internal_orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'in_transit', 'delivered', 'cancelled')),
  notes TEXT,
  changed_by UUID NOT NULL REFERENCES public.admin_users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ===== CREATE INDEXES FOR PERFORMANCE =====
CREATE INDEX IF NOT EXISTS idx_drivers_org ON public.drivers(organization_id);
CREATE INDEX IF NOT EXISTS idx_drivers_active ON public.drivers(is_active);
CREATE INDEX IF NOT EXISTS idx_vehicles_org ON public.vehicles(organization_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_active ON public.vehicles(is_active);
CREATE INDEX IF NOT EXISTS idx_internal_orders_origin ON public.internal_orders(origin_branch_id);
CREATE INDEX IF NOT EXISTS idx_internal_orders_destination ON public.internal_orders(destination_branch_id);
CREATE INDEX IF NOT EXISTS idx_internal_orders_status ON public.internal_orders(status);
CREATE INDEX IF NOT EXISTS idx_internal_orders_priority ON public.internal_orders(priority);
CREATE INDEX IF NOT EXISTS idx_internal_orders_created_by ON public.internal_orders(created_by);
CREATE INDEX IF NOT EXISTS idx_internal_orders_org ON public.internal_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_internal_orders_scheduled_date ON public.internal_orders(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_internal_order_items_order ON public.internal_order_items(internal_order_id);
CREATE INDEX IF NOT EXISTS idx_internal_order_items_product ON public.internal_order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_internal_order_status_history_order ON public.internal_order_status_history(internal_order_id);
CREATE INDEX IF NOT EXISTS idx_internal_order_status_history_created ON public.internal_order_status_history(created_at DESC);

-- ===== CREATE TRIGGERS FOR UPDATED_AT =====
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_drivers_updated_at
    BEFORE UPDATE ON public.drivers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at
    BEFORE UPDATE ON public.vehicles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_internal_orders_updated_at
    BEFORE UPDATE ON public.internal_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===== ENABLE ROW LEVEL SECURITY =====
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_order_status_history ENABLE ROW LEVEL SECURITY;

-- ===== RLS POLICIES FOR DRIVERS =====
CREATE POLICY "Admins can view drivers in their organization"
ON public.drivers FOR SELECT
USING (
  organization_id = (
    SELECT organization_id FROM public.admin_users 
    WHERE id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Admins can manage drivers in their organization"
ON public.drivers FOR ALL
USING (
  organization_id = (
    SELECT organization_id FROM public.admin_users 
    WHERE id = auth.uid() AND is_active = true
  )
)
WITH CHECK (
  organization_id = (
    SELECT organization_id FROM public.admin_users 
    WHERE id = auth.uid() AND is_active = true
  )
);

-- ===== RLS POLICIES FOR VEHICLES =====
CREATE POLICY "Admins can view vehicles in their organization"
ON public.vehicles FOR SELECT
USING (
  organization_id = (
    SELECT organization_id FROM public.admin_users 
    WHERE id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Admins can manage vehicles in their organization"
ON public.vehicles FOR ALL
USING (
  organization_id = (
    SELECT organization_id FROM public.admin_users 
    WHERE id = auth.uid() AND is_active = true
  )
)
WITH CHECK (
  organization_id = (
    SELECT organization_id FROM public.admin_users 
    WHERE id = auth.uid() AND is_active = true
  )
);

-- ===== RLS POLICIES FOR INTERNAL ORDERS =====
CREATE POLICY "Admins can view internal orders in their organization"
ON public.internal_orders FOR SELECT
USING (
  organization_id = (
    SELECT organization_id FROM public.admin_users 
    WHERE id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Admins can manage internal orders in their organization"
ON public.internal_orders FOR ALL
USING (
  organization_id = (
    SELECT organization_id FROM public.admin_users 
    WHERE id = auth.uid() AND is_active = true
  )
)
WITH CHECK (
  organization_id = (
    SELECT organization_id FROM public.admin_users 
    WHERE id = auth.uid() AND is_active = true
  )
);

-- ===== RLS POLICIES FOR INTERNAL ORDER ITEMS =====
CREATE POLICY "Admins can view internal order items in their organization"
ON public.internal_order_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.internal_orders io
    WHERE io.id = internal_order_id
    AND io.organization_id = (
      SELECT organization_id FROM public.admin_users 
      WHERE id = auth.uid() AND is_active = true
    )
  )
);

CREATE POLICY "Admins can manage internal order items in their organization"
ON public.internal_order_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.internal_orders io
    WHERE io.id = internal_order_id
    AND io.organization_id = (
      SELECT organization_id FROM public.admin_users 
      WHERE id = auth.uid() AND is_active = true
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.internal_orders io
    WHERE io.id = internal_order_id
    AND io.organization_id = (
      SELECT organization_id FROM public.admin_users 
      WHERE id = auth.uid() AND is_active = true
    )
  )
);

-- ===== RLS POLICIES FOR INTERNAL ORDER STATUS HISTORY =====
CREATE POLICY "Admins can view status history in their organization"
ON public.internal_order_status_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.internal_orders io
    WHERE io.id = internal_order_id
    AND io.organization_id = (
      SELECT organization_id FROM public.admin_users 
      WHERE id = auth.uid() AND is_active = true
    )
  )
);

CREATE POLICY "Admins can create status history in their organization"
ON public.internal_order_status_history FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.internal_orders io
    WHERE io.id = internal_order_id
    AND io.organization_id = (
      SELECT organization_id FROM public.admin_users 
      WHERE id = auth.uid() AND is_active = true
    )
  )
  AND changed_by = auth.uid()
);

-- ===== CREATE HELPER FUNCTIONS =====

-- Function to generate order number
CREATE OR REPLACE FUNCTION public.generate_internal_order_number(org_id UUID)
RETURNS TEXT AS $$
DECLARE
  prefix TEXT;
  next_number INTEGER;
  order_number TEXT;
BEGIN
  -- Get organization prefix (first 3 letters of organization name)
  SELECT UPPER(LEFT(name, 3)) INTO prefix
  FROM public.organizations
  WHERE id = org_id;
  
  -- Get next sequence number for this organization
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM LENGTH(prefix) + 2) AS INTEGER)), 0) + 1 INTO next_number
  FROM public.internal_orders
  WHERE organization_id = org_id
  AND order_number LIKE prefix || '-%';
  
  -- Generate order number (e.g., OPT-0001)
  order_number := prefix || '-' || LPAD(next_number::TEXT, 4, '0');
  
  RETURN order_number;
END;
$$ LANGUAGE plpgsql;

-- Function to log status changes
CREATE OR REPLACE FUNCTION public.log_internal_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log when status actually changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.internal_order_status_history (
      internal_order_id,
      status,
      notes,
      changed_by
    ) VALUES (
      NEW.id,
      NEW.status,
      'Status changed from ' || OLD.status || ' to ' || NEW.status,
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for status change logging
CREATE TRIGGER log_internal_order_status_changes
    AFTER UPDATE OF status ON public.internal_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.log_internal_order_status_change();

-- ===== CREATE DEFAULT DATA =====

-- Insert sample drivers for demo organization
DO $$
DECLARE
  demo_org_id UUID;
BEGIN
  -- Get demo organization ID
  SELECT id INTO demo_org_id
  FROM public.organizations
  WHERE name = 'Root Optical Demo'
  LIMIT 1;
  
  IF demo_org_id IS NOT NULL THEN
    -- Insert sample drivers
    INSERT INTO public.drivers (name, license_number, phone, email, organization_id)
    VALUES 
      ('Carlos Rodríguez', 'DRV001', '+56912345678', 'carlos.rodriguez@example.com', demo_org_id),
      ('María González', 'DRV002', '+56987654321', 'maria.gonzalez@example.com', demo_org_id),
      ('Juan Pérez', 'DRV003', '+56911223344', 'juan.perez@example.com', demo_org_id)
    ON CONFLICT (license_number) DO NOTHING;
    
    -- Insert sample vehicles
    INSERT INTO public.vehicles (plate_number, model, capacity, organization_id)
    VALUES 
      ('ABC123', 'Toyota Hilux', 50, demo_org_id),
      ('XYZ789', 'Ford Transit', 100, demo_org_id),
      ('DEF456', 'Nissan NV200', 30, demo_org_id)
    ON CONFLICT (plate_number) DO NOTHING;
  END IF;
END $$;

-- ===== ADD COMMENTS =====
COMMENT ON TABLE public.drivers IS 'Drivers for internal order transportation';
COMMENT ON TABLE public.vehicles IS 'Vehicles used for internal order transportation';
COMMENT ON TABLE public.internal_orders IS 'Internal orders for branch-to-branch transfers';
COMMENT ON TABLE public.internal_order_items IS 'Items included in internal orders';
COMMENT ON TABLE public.internal_order_status_history IS 'History of status changes for internal orders';
COMMENT ON FUNCTION public.generate_internal_order_number IS 'Generates unique order numbers for internal orders';
COMMENT ON FUNCTION public.log_internal_order_status_change IS 'Automatically logs status changes for internal orders';
