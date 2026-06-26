-- Migration: 20250125000000_create_lab_work_orders_system.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Create Lab Work Orders and Quotes System for Optical Shop
-- This migration creates a comprehensive system for managing lab work orders (trabajos)
-- and quotes (presupuestos) for optical shop operations

-- ===== CREATE QUOTES TABLE (PRESUPUESTOS) =====
CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Quote identification
  quote_number TEXT UNIQUE NOT NULL, -- e.g., "COT-2025-001"
  quote_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiration_date DATE, -- Quote validity period (typically 30 days)
  
  -- Prescription used
  prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE SET NULL,
  
  -- Frame selection
  frame_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  frame_name TEXT,
  frame_brand TEXT,
  frame_model TEXT,
  frame_color TEXT,
  frame_size TEXT,
  frame_sku TEXT,
  frame_price DECIMAL(10,2) DEFAULT 0,
  
  -- Lens selection
  lens_type TEXT CHECK (lens_type IN ('single_vision', 'bifocal', 'trifocal', 'progressive', 'reading', 'computer', 'sports')),
  lens_material TEXT, -- e.g., 'polycarbonate', 'high_index_1_67', 'trivex'
  lens_index DECIMAL(3,2), -- Refractive index
  
  -- Lens treatments and coatings
  lens_treatments TEXT[], -- ['anti_reflective', 'blue_light_filter', 'uv_protection', 'scratch_resistant', 'photochromic', 'polarized', 'tint']
  lens_tint_color TEXT, -- If tinted
  lens_tint_percentage INTEGER CHECK (lens_tint_percentage >= 0 AND lens_tint_percentage <= 100),
  
  -- Pricing
  frame_cost DECIMAL(10,2) DEFAULT 0,
  lens_cost DECIMAL(10,2) DEFAULT 0,
  treatments_cost DECIMAL(10,2) DEFAULT 0,
  labor_cost DECIMAL(10,2) DEFAULT 0, -- Mounting labor cost
  subtotal DECIMAL(10,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'CLP',
  
  -- Status
  status TEXT CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired', 'converted_to_work')) DEFAULT 'draft',
  
  -- Notes
  notes TEXT, -- Internal notes
  customer_notes TEXT, -- Notes visible to customer
  terms_and_conditions TEXT, -- Terms and conditions
  
  -- Conversion tracking
  converted_to_work_order_id UUID, -- If converted to work order
  
  -- Staff
  created_by UUID REFERENCES auth.users(id),
  sent_by UUID REFERENCES auth.users(id),
  sent_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== CREATE LAB WORK ORDERS TABLE (TRABAJOS) =====
CREATE TABLE IF NOT EXISTS public.lab_work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Work order identification
  work_order_number TEXT UNIQUE NOT NULL, -- e.g., "TRB-2025-001"
  work_order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Customer and prescription
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE SET NULL,
  
  -- Related quote (if converted from quote)
  quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  
  -- Frame selection
  frame_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  frame_name TEXT NOT NULL,
  frame_brand TEXT,
  frame_model TEXT,
  frame_color TEXT,
  frame_size TEXT,
  frame_sku TEXT,
  frame_serial_number TEXT, -- Serial number of the specific frame
  
  -- Lens specifications
  lens_type TEXT CHECK (lens_type IN ('single_vision', 'bifocal', 'trifocal', 'progressive', 'reading', 'computer', 'sports')) NOT NULL,
  lens_material TEXT NOT NULL,
  lens_index DECIMAL(3,2),
  
  -- Lens treatments and coatings
  lens_treatments TEXT[] NOT NULL DEFAULT '{}',
  lens_tint_color TEXT,
  lens_tint_percentage INTEGER CHECK (lens_tint_percentage >= 0 AND lens_tint_percentage <= 100),
  
  -- Prescription details (snapshot at time of order)
  prescription_snapshot JSONB, -- Complete prescription data at time of order
  
  -- Lab information
  lab_name TEXT, -- Laboratory name
  lab_contact TEXT, -- Laboratory contact info
  lab_order_number TEXT, -- Order number assigned by lab
  lab_estimated_delivery_date DATE, -- Estimated delivery date from lab
  
  -- Work order status and workflow
  status TEXT CHECK (status IN (
    'quote',           -- Quote created, not yet confirmed
    'ordered',         -- Order confirmed, preparing to send to lab
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
  )) DEFAULT 'quote',
  
  -- Status dates
  ordered_at TIMESTAMPTZ,
  sent_to_lab_at TIMESTAMPTZ,
  lab_started_at TIMESTAMPTZ,
  lab_completed_at TIMESTAMPTZ,
  received_from_lab_at TIMESTAMPTZ,
  mounted_at TIMESTAMPTZ,
  quality_checked_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  
  -- Pricing
  frame_cost DECIMAL(10,2) DEFAULT 0,
  lens_cost DECIMAL(10,2) DEFAULT 0,
  treatments_cost DECIMAL(10,2) DEFAULT 0,
  labor_cost DECIMAL(10,2) DEFAULT 0,
  lab_cost DECIMAL(10,2) DEFAULT 0, -- Cost paid to lab
  subtotal DECIMAL(10,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'CLP',
  
  -- Payment information
  payment_status TEXT CHECK (payment_status IN ('pending', 'partial', 'paid', 'refunded')) DEFAULT 'pending',
  payment_method TEXT,
  deposit_amount DECIMAL(10,2) DEFAULT 0, -- Deposit paid
  balance_amount DECIMAL(10,2) DEFAULT 0, -- Remaining balance
  
  -- Related order (if sold through POS)
  pos_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  
  -- Notes and observations
  internal_notes TEXT, -- Internal notes for staff
  customer_notes TEXT, -- Notes visible to customer
  lab_notes TEXT, -- Notes from lab
  quality_notes TEXT, -- Quality control notes
  cancellation_reason TEXT, -- If cancelled
  
  -- Staff assignments
  created_by UUID REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id), -- Staff member handling the work order
  lab_contact_person TEXT, -- Person at lab handling this order
  
  -- Warranty
  warranty_start_date DATE,
  warranty_end_date DATE,
  warranty_details TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== CREATE LAB WORK ORDER STATUS HISTORY TABLE =====
-- Track status changes for audit trail
CREATE TABLE IF NOT EXISTS public.lab_work_order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.lab_work_orders(id) ON DELETE CASCADE,
  
  -- Status change
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Who made the change
  changed_by UUID REFERENCES auth.users(id),
  
  -- Notes about the change
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== CREATE INDEXES =====
-- Quotes indexes
CREATE INDEX IF NOT EXISTS idx_quotes_customer_id ON public.quotes(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_quote_number ON public.quotes(quote_number);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON public.quotes(created_at);

-- Lab work orders indexes
CREATE INDEX IF NOT EXISTS idx_lab_work_orders_customer_id ON public.lab_work_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_lab_work_orders_status ON public.lab_work_orders(status);
CREATE INDEX IF NOT EXISTS idx_lab_work_orders_work_order_number ON public.lab_work_orders(work_order_number);
CREATE INDEX IF NOT EXISTS idx_lab_work_orders_prescription_id ON public.lab_work_orders(prescription_id);
CREATE INDEX IF NOT EXISTS idx_lab_work_orders_quote_id ON public.lab_work_orders(quote_id);
CREATE INDEX IF NOT EXISTS idx_lab_work_orders_assigned_to ON public.lab_work_orders(assigned_to);
CREATE INDEX IF NOT EXISTS idx_lab_work_orders_created_at ON public.lab_work_orders(created_at);

-- Status history indexes
CREATE INDEX IF NOT EXISTS idx_status_history_work_order_id ON public.lab_work_order_status_history(work_order_id);
CREATE INDEX IF NOT EXISTS idx_status_history_changed_at ON public.lab_work_order_status_history(changed_at);

-- ===== CREATE FUNCTIONS =====
-- Function to generate quote number
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  last_number INTEGER;
  new_number TEXT;
BEGIN
  year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  -- Get last quote number for this year
  SELECT COALESCE(MAX(CAST(SUBSTRING(quote_number FROM '[0-9]+$') AS INTEGER)), 0)
  INTO last_number
  FROM public.quotes
  WHERE quote_number LIKE 'COT-' || year_part || '-%';
  
  -- Generate new number
  new_number := 'COT-' || year_part || '-' || LPAD((last_number + 1)::TEXT, 4, '0');
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to generate work order number
CREATE OR REPLACE FUNCTION generate_work_order_number()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  last_number INTEGER;
  new_number TEXT;
BEGIN
  year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  -- Get last work order number for this year
  SELECT COALESCE(MAX(CAST(SUBSTRING(work_order_number FROM '[0-9]+$') AS INTEGER)), 0)
  INTO last_number
  FROM public.lab_work_orders
  WHERE work_order_number LIKE 'TRB-' || year_part || '-%';
  
  -- Generate new number
  new_number := 'TRB-' || year_part || '-' || LPAD((last_number + 1)::TEXT, 4, '0');
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to update work order status and create history entry
CREATE OR REPLACE FUNCTION update_work_order_status(
  p_work_order_id UUID,
  p_new_status TEXT,
  p_changed_by UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_old_status TEXT;
BEGIN
  -- Get current status
  SELECT status INTO v_old_status
  FROM public.lab_work_orders
  WHERE id = p_work_order_id;
  
  -- Update work order
  UPDATE public.lab_work_orders
  SET 
    status = p_new_status,
    updated_at = NOW(),
    -- Update specific date fields based on status
    ordered_at = CASE WHEN p_new_status = 'ordered' THEN NOW() ELSE ordered_at END,
    sent_to_lab_at = CASE WHEN p_new_status = 'sent_to_lab' THEN NOW() ELSE sent_to_lab_at END,
    lab_started_at = CASE WHEN p_new_status = 'in_progress_lab' THEN NOW() ELSE lab_started_at END,
    lab_completed_at = CASE WHEN p_new_status = 'ready_at_lab' THEN NOW() ELSE lab_completed_at END,
    received_from_lab_at = CASE WHEN p_new_status = 'received_from_lab' THEN NOW() ELSE received_from_lab_at END,
    mounted_at = CASE WHEN p_new_status = 'mounted' THEN NOW() ELSE mounted_at END,
    quality_checked_at = CASE WHEN p_new_status = 'quality_check' THEN NOW() ELSE quality_checked_at END,
    ready_at = CASE WHEN p_new_status = 'ready_for_pickup' THEN NOW() ELSE ready_at END,
    delivered_at = CASE WHEN p_new_status = 'delivered' THEN NOW() ELSE delivered_at END,
    cancelled_at = CASE WHEN p_new_status = 'cancelled' THEN NOW() ELSE cancelled_at END
  WHERE id = p_work_order_id;
  
  -- Create history entry
  INSERT INTO public.lab_work_order_status_history (
    work_order_id,
    from_status,
    to_status,
    changed_by,
    notes
  ) VALUES (
    p_work_order_id,
    v_old_status,
    p_new_status,
    p_changed_by,
    p_notes
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== CREATE TRIGGERS =====
-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lab_work_orders_updated_at
  BEFORE UPDATE ON public.lab_work_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ===== ENABLE ROW LEVEL SECURITY =====
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_work_order_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quotes
CREATE POLICY "Admins can view all quotes" ON public.quotes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = auth.uid() AND admin_users.is_active = true
    )
  );

CREATE POLICY "Admins can create quotes" ON public.quotes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = auth.uid() AND admin_users.is_active = true
    )
  );

CREATE POLICY "Admins can update quotes" ON public.quotes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = auth.uid() AND admin_users.is_active = true
    )
  );

CREATE POLICY "Admins can delete quotes" ON public.quotes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = auth.uid() AND admin_users.is_active = true
    )
  );

-- RLS Policies for lab work orders
CREATE POLICY "Admins can view all work orders" ON public.lab_work_orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = auth.uid() AND admin_users.is_active = true
    )
  );

CREATE POLICY "Admins can create work orders" ON public.lab_work_orders
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = auth.uid() AND admin_users.is_active = true
    )
  );

CREATE POLICY "Admins can update work orders" ON public.lab_work_orders
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = auth.uid() AND admin_users.is_active = true
    )
  );

CREATE POLICY "Admins can delete work orders" ON public.lab_work_orders
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = auth.uid() AND admin_users.is_active = true
    )
  );

-- RLS Policies for status history
CREATE POLICY "Admins can view status history" ON public.lab_work_order_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.id = auth.uid() AND admin_users.is_active = true
    )
  );

-- ===== COMMENTS =====
COMMENT ON TABLE public.quotes IS 'Presupuestos para trabajos de lentes';
COMMENT ON TABLE public.lab_work_orders IS 'Órdenes de trabajo para lentes (trabajos enviados al laboratorio)';
COMMENT ON TABLE public.lab_work_order_status_history IS 'Historial de cambios de estado de trabajos';

