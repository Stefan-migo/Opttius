-- Consolidated Migration: optical_conversion
-- Generated: Sun, Feb  8, 2026 12:53:56 AM
-- Original files: 6

-- === Source: 20250120000000_add_admin_profiles_access.sql ===
-- Add admin access policies for profiles table
-- This allows admins to view and manage all user profiles

-- Create policy for admins to view all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- Create policy for admins to update all profiles
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- Create policy for admins to insert profiles (for manual user creation)
CREATE POLICY "Admins can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- Create policy for admins to delete profiles (for user management)
CREATE POLICY "Admins can delete profiles" ON public.profiles
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.admin_users 
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- Add comments for documentation
COMMENT ON POLICY "Admins can view all profiles" ON public.profiles IS 'Allow admins to view all user profiles for customer management';
COMMENT ON POLICY "Admins can update all profiles" ON public.profiles IS 'Allow admins to update user profiles for customer support';
COMMENT ON POLICY "Admins can insert profiles" ON public.profiles IS 'Allow admins to create profiles for manual user creation';
COMMENT ON POLICY "Admins can delete profiles" ON public.profiles IS 'Allow admins to delete profiles for user management';

-- === End of 20250120000000_add_admin_profiles_access.sql ===

-- === Source: 20250121000000_create_pos_system.sql ===
-- Migration: Create POS (Point of Sale) System
-- This migration adds POS functionality, payment methods, and SII (Chile) integration

-- Add POS-specific fields to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS is_pos_sale BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pos_terminal_id TEXT,
ADD COLUMN IF NOT EXISTS pos_cashier_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS pos_location TEXT;

-- Update payment method to support POS payment types
-- Note: We'll use a more flexible approach with a separate payment_methods table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS payment_method_type TEXT CHECK (payment_method_type IN (
  'cash', 
  'debit_card', 
  'credit_card', 
  'installments',
  'transfer',
  'check',
  'mercadopago',
  'other'
));

-- Add card machine transaction details
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS card_machine_transaction_id TEXT,
ADD COLUMN IF NOT EXISTS card_machine_authorization_code TEXT,
ADD COLUMN IF NOT EXISTS card_machine_brand TEXT, -- Visa, Mastercard, etc.
ADD COLUMN IF NOT EXISTS card_last_four_digits TEXT;

-- Add installment payment details
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS installments_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS installment_amount DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS first_installment_due_date TIMESTAMPTZ;

-- Add SII (Chile Tax System) fields
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS sii_invoice_type TEXT CHECK (sii_invoice_type IN ('boleta', 'factura', 'none')),
ADD COLUMN IF NOT EXISTS sii_rut TEXT, -- Customer tax ID (RUT)
ADD COLUMN IF NOT EXISTS sii_business_name TEXT, -- Razón social for facturas
ADD COLUMN IF NOT EXISTS sii_address TEXT, -- Address for tax purposes
ADD COLUMN IF NOT EXISTS sii_commune TEXT, -- Comuna
ADD COLUMN IF NOT EXISTS sii_city TEXT, -- Ciudad
ADD COLUMN IF NOT EXISTS sii_invoice_number TEXT UNIQUE, -- Folio number
ADD COLUMN IF NOT EXISTS sii_dte_number TEXT, -- DTE (Documento Tributario Electrónico) number
ADD COLUMN IF NOT EXISTS sii_track_id TEXT, -- SII tracking ID
ADD COLUMN IF NOT EXISTS sii_status TEXT DEFAULT 'pending' CHECK (sii_status IN ('pending', 'sent', 'accepted', 'rejected', 'cancelled')),
ADD COLUMN IF NOT EXISTS sii_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sii_response JSONB; -- Store SII API response

-- Add tax breakdown for SII
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS tax_breakdown JSONB; -- {iva: 19%, other_taxes: {...}}

-- Create payment_installments table for tracking installment payments
CREATE TABLE IF NOT EXISTS public.payment_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  installment_number INTEGER NOT NULL CHECK (installment_number > 0),
  due_date TIMESTAMPTZ NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  paid_amount DECIMAL(12,2) DEFAULT 0,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue', 'cancelled')),
  paid_at TIMESTAMPTZ,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT unique_order_installment UNIQUE (order_id, installment_number)
);

-- Create pos_sessions table to track POS sessions (cash register sessions)
CREATE TABLE IF NOT EXISTS public.pos_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cashier_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  terminal_id TEXT,
  location TEXT,
  opening_cash_amount DECIMAL(12,2) DEFAULT 0,
  closing_cash_amount DECIMAL(12,2),
  opening_time TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  closing_time TIMESTAMPTZ,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'suspended')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create pos_transactions table for detailed transaction tracking
CREATE TABLE IF NOT EXISTS public.pos_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  pos_session_id UUID REFERENCES public.pos_sessions(id) ON DELETE SET NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('sale', 'refund', 'void', 'return')),
  payment_method TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  change_amount DECIMAL(12,2) DEFAULT 0, -- For cash payments
  card_machine_transaction_id TEXT,
  card_machine_authorization_code TEXT,
  receipt_printed BOOLEAN DEFAULT FALSE,
  receipt_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_is_pos_sale ON public.orders(is_pos_sale);
CREATE INDEX IF NOT EXISTS idx_orders_pos_cashier ON public.orders(pos_cashier_id);
CREATE INDEX IF NOT EXISTS idx_orders_sii_invoice_number ON public.orders(sii_invoice_number);
CREATE INDEX IF NOT EXISTS idx_orders_sii_status ON public.orders(sii_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_method_type ON public.orders(payment_method_type);

CREATE INDEX IF NOT EXISTS idx_payment_installments_order ON public.payment_installments(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_installments_due_date ON public.payment_installments(due_date);
CREATE INDEX IF NOT EXISTS idx_payment_installments_status ON public.payment_installments(payment_status);

CREATE INDEX IF NOT EXISTS idx_pos_sessions_cashier ON public.pos_sessions(cashier_id);
CREATE INDEX IF NOT EXISTS idx_pos_sessions_status ON public.pos_sessions(status);
CREATE INDEX IF NOT EXISTS idx_pos_sessions_opening_time ON public.pos_sessions(opening_time DESC);

CREATE INDEX IF NOT EXISTS idx_pos_transactions_order ON public.pos_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_session ON public.pos_transactions(pos_session_id);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_created ON public.pos_transactions(created_at DESC);

-- Add updated_at triggers
CREATE TRIGGER update_payment_installments_updated_at
  BEFORE UPDATE ON public.payment_installments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pos_sessions_updated_at
  BEFORE UPDATE ON public.pos_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pos_transactions_updated_at
  BEFORE UPDATE ON public.pos_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.payment_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_installments
CREATE POLICY "Admins can manage installments" ON public.payment_installments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- RLS Policies for pos_sessions
CREATE POLICY "Admins can manage POS sessions" ON public.pos_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- RLS Policies for pos_transactions
CREATE POLICY "Admins can manage POS transactions" ON public.pos_transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- Function to generate SII invoice number (folio)
CREATE OR REPLACE FUNCTION generate_sii_invoice_number(invoice_type TEXT)
RETURNS TEXT AS $$
DECLARE
  prefix TEXT;
  year_part TEXT;
  sequence_number INTEGER;
  invoice_number TEXT;
BEGIN
  -- Set prefix based on invoice type
  IF invoice_type = 'boleta' THEN
    prefix := 'B';
  ELSIF invoice_type = 'factura' THEN
    prefix := 'F';
  ELSE
    prefix := 'N';
  END IF;
  
  -- Get year (last 2 digits)
  year_part := TO_CHAR(NOW(), 'YY');
  
  -- Get next sequence number for this year and type
  SELECT COALESCE(MAX(CAST(SUBSTRING(sii_invoice_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO sequence_number
  FROM public.orders
  WHERE sii_invoice_type = invoice_type
    AND sii_invoice_number LIKE prefix || year_part || '%';
  
  -- Format: B240001, F240001, etc.
  invoice_number := prefix || year_part || LPAD(sequence_number::TEXT, 6, '0');
  
  RETURN invoice_number;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate IVA (19% VAT for Chile)
CREATE OR REPLACE FUNCTION calculate_iva(amount DECIMAL, include_iva BOOLEAN DEFAULT true)
RETURNS DECIMAL AS $$
BEGIN
  IF include_iva THEN
    -- If amount includes IVA, calculate the base amount
    RETURN ROUND(amount / 1.19, 2);
  ELSE
    -- If amount doesn't include IVA, calculate IVA amount
    RETURN ROUND(amount * 0.19, 2);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement inventory
CREATE OR REPLACE FUNCTION decrement_inventory(product_id UUID, quantity INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  current_stock INTEGER;
BEGIN
  -- Get current inventory
  SELECT inventory_quantity INTO current_stock
  FROM public.products
  WHERE id = product_id;
  
  IF current_stock IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Update inventory
  UPDATE public.products
  SET inventory_quantity = GREATEST(0, current_stock - quantity),
      updated_at = NOW()
  WHERE id = product_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update POS session cash amount
CREATE OR REPLACE FUNCTION update_pos_session_cash(session_id UUID, cash_amount DECIMAL)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.pos_sessions
  SET closing_cash_amount = COALESCE(closing_cash_amount, opening_cash_amount) + cash_amount,
      updated_at = NOW()
  WHERE id = session_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE public.payment_installments IS 'Tracks installment payments for orders';
COMMENT ON TABLE public.pos_sessions IS 'Tracks POS cash register sessions';
COMMENT ON TABLE public.pos_transactions IS 'Detailed transaction log for POS operations';
COMMENT ON COLUMN public.orders.is_pos_sale IS 'Indicates if this order was created through POS';
COMMENT ON COLUMN public.orders.sii_invoice_type IS 'SII invoice type: boleta (B2C) or factura (B2B)';
COMMENT ON COLUMN public.orders.sii_rut IS 'Customer RUT (Chilean tax ID)';
COMMENT ON COLUMN public.orders.sii_dte_number IS 'DTE (Documento Tributario Electrónico) number from SII';


-- === End of 20250121000000_create_pos_system.sql ===

-- === Source: 20250122000000_convert_to_optical_shop.sql ===
-- Migration: Convert Products to Optical Shop Products
-- This migration transforms the generic product system into an optical shop product management system

-- Add optical product type
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'frame' CHECK (product_type IN ('frame', 'lens', 'accessory', 'service'));

-- Add optical product category
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS optical_category TEXT CHECK (optical_category IN ('sunglasses', 'prescription_glasses', 'reading_glasses', 'safety_glasses', 'contact_lenses', 'accessories', 'services'));

-- ===== FRAME SPECIFICATIONS =====
-- Frame Type
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS frame_type TEXT CHECK (frame_type IN ('full_frame', 'half_frame', 'rimless', 'semi_rimless', 'browline', 'cat_eye', 'aviator', 'round', 'square', 'rectangular', 'oval', 'geometric'));

-- Frame Material
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS frame_material TEXT CHECK (frame_material IN ('acetate', 'metal', 'titanium', 'stainless_steel', 'aluminum', 'carbon_fiber', 'wood', 'horn', 'plastic', 'tr90', 'monel', 'beta_titanium'));

-- Frame Measurements (in mm)
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS frame_measurements JSONB; -- {lens_width: 52, bridge_width: 18, temple_length: 140, lens_height: 40, total_width: 140}

-- Frame Shape
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS frame_shape TEXT CHECK (frame_shape IN ('round', 'square', 'rectangular', 'oval', 'cat_eye', 'aviator', 'browline', 'geometric', 'shield', 'wrap', 'sport'));

-- Frame Color
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS frame_color TEXT;
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS frame_colors TEXT[]; -- Multiple color options

-- Frame Brand/Manufacturer
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS frame_brand TEXT;
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS frame_model TEXT;
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS frame_sku TEXT;

-- Frame Gender/Age
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS frame_gender TEXT CHECK (frame_gender IN ('mens', 'womens', 'unisex', 'kids', 'youth'));
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS frame_age_group TEXT CHECK (frame_age_group IN ('adult', 'youth', 'kids', 'senior'));

-- Frame Features
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS frame_features TEXT[]; -- ['spring_hinges', 'adjustable_nose_pads', 'flexible_temples', 'lightweight', 'durable']

-- Frame Size
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS frame_size TEXT CHECK (frame_size IN ('narrow', 'medium', 'wide', 'extra_wide'));

-- ===== LENS SPECIFICATIONS =====
-- Lens Type
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS lens_type TEXT CHECK (lens_type IN ('single_vision', 'bifocal', 'trifocal', 'progressive', 'reading', 'computer', 'driving', 'sports', 'photochromic', 'polarized'));

-- Lens Material
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS lens_material TEXT CHECK (lens_material IN ('cr39', 'polycarbonate', 'high_index_1_67', 'high_index_1_74', 'trivex', 'glass', 'photochromic'));

-- Lens Prescription Fields (for prescription lenses)
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS prescription_available BOOLEAN DEFAULT FALSE;
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS prescription_range JSONB; -- {sph_min: -10, sph_max: +6, cyl_min: -4, cyl_max: +4, add_min: 0, add_max: 4}

-- Lens Coatings and Treatments
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS lens_coatings TEXT[]; -- ['anti_reflective', 'blue_light_filter', 'uv_protection', 'scratch_resistant', 'anti_fog', 'mirror', 'tint']

-- Lens Index (refractive index)
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS lens_index DECIMAL(3,2); -- 1.50, 1.59, 1.67, 1.74, etc.

-- UV Protection Level
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS uv_protection TEXT CHECK (uv_protection IN ('none', 'uv400', 'uv380', 'uv350'));

-- Blue Light Filter
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS blue_light_filter BOOLEAN DEFAULT FALSE;
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS blue_light_filter_percentage INTEGER; -- 0-100%

-- Photochromic Properties
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS photochromic BOOLEAN DEFAULT FALSE;
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS photochromic_tint_levels JSONB; -- {clear: 0, dark: 3} or similar

-- Lens Tint Options
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS lens_tint_options TEXT[]; -- ['clear', 'gray', 'brown', 'green', 'blue', 'yellow', 'rose', 'mirror']

-- ===== GENERAL OPTICAL PRODUCT FIELDS =====
-- Brand/Manufacturer (general)
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS manufacturer TEXT;
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS model_number TEXT;

-- Warranty Information
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS warranty_months INTEGER;
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS warranty_details TEXT;

-- Compatibility
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS compatible_with TEXT[]; -- For accessories or lens compatibility

-- Prescription Required
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS requires_prescription BOOLEAN DEFAULT FALSE;

-- Customizable
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS is_customizable BOOLEAN DEFAULT FALSE;

-- ===== REMOVE/DEPRECATE COSMETICS-SPECIFIC FIELDS =====
-- We'll keep these columns but they won't be used for optical products
-- skin_type, benefits, ingredients, certifications, usage_instructions, precautions, shelf_life_months

-- Add indexes for optical product queries
CREATE INDEX IF NOT EXISTS idx_products_product_type ON public.products(product_type);
CREATE INDEX IF NOT EXISTS idx_products_optical_category ON public.products(optical_category);
CREATE INDEX IF NOT EXISTS idx_products_frame_type ON public.products(frame_type);
CREATE INDEX IF NOT EXISTS idx_products_frame_material ON public.products(frame_material);
CREATE INDEX IF NOT EXISTS idx_products_frame_brand ON public.products(frame_brand);
CREATE INDEX IF NOT EXISTS idx_products_frame_gender ON public.products(frame_gender);
CREATE INDEX IF NOT EXISTS idx_products_lens_type ON public.products(lens_type);
CREATE INDEX IF NOT EXISTS idx_products_lens_material ON public.products(lens_material);
CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products(brand);

-- Create GIN indexes for array fields
CREATE INDEX IF NOT EXISTS idx_products_frame_colors ON public.products USING gin(frame_colors);
CREATE INDEX IF NOT EXISTS idx_products_frame_features ON public.products USING gin(frame_features);
CREATE INDEX IF NOT EXISTS idx_products_lens_coatings ON public.products USING gin(lens_coatings);
CREATE INDEX IF NOT EXISTS idx_products_lens_tint_options ON public.products USING gin(lens_tint_options);

-- Create function to search optical products by measurements
CREATE OR REPLACE FUNCTION search_frames_by_measurements(
  min_lens_width INTEGER DEFAULT NULL,
  max_lens_width INTEGER DEFAULT NULL,
  min_bridge_width INTEGER DEFAULT NULL,
  max_bridge_width INTEGER DEFAULT NULL,
  min_temple_length INTEGER DEFAULT NULL,
  max_temple_length INTEGER DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  frame_measurements JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.frame_measurements
  FROM public.products p
  WHERE p.product_type = 'frame'
    AND p.frame_measurements IS NOT NULL
    AND (min_lens_width IS NULL OR (p.frame_measurements->>'lens_width')::INTEGER >= min_lens_width)
    AND (max_lens_width IS NULL OR (p.frame_measurements->>'lens_width')::INTEGER <= max_lens_width)
    AND (min_bridge_width IS NULL OR (p.frame_measurements->>'bridge_width')::INTEGER >= min_bridge_width)
    AND (max_bridge_width IS NULL OR (p.frame_measurements->>'bridge_width')::INTEGER <= max_bridge_width)
    AND (min_temple_length IS NULL OR (p.frame_measurements->>'temple_length')::INTEGER >= min_temple_length)
    AND (max_temple_length IS NULL OR (p.frame_measurements->>'temple_length')::INTEGER <= max_temple_length);
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON COLUMN public.products.product_type IS 'Type of optical product: frame, lens, accessory, or service';
COMMENT ON COLUMN public.products.frame_measurements IS 'Frame measurements in mm: {lens_width, bridge_width, temple_length, lens_height, total_width}';
COMMENT ON COLUMN public.products.prescription_range IS 'Prescription range supported: {sph_min, sph_max, cyl_min, cyl_max, add_min, add_max}';
COMMENT ON COLUMN public.products.lens_index IS 'Refractive index of lens material (1.50, 1.59, 1.67, 1.74, etc.)';


-- === End of 20250122000000_convert_to_optical_shop.sql ===

-- === Source: 20250123000000_adapt_customers_for_optical_shop.sql ===
-- Migration: Adapt Customers for Optical Shop
-- This migration adds optical shop specific fields and tables for customer management
-- Includes: prescriptions, appointments, and medical information

-- ===== ADD OPTICAL-SPECIFIC FIELDS TO PROFILES =====
-- Medical/Visual Information
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS rut TEXT; -- Chilean RUT (Rol Único Tributario)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say'));
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS medical_conditions TEXT[]; -- Array of medical conditions
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS allergies TEXT[]; -- Array of allergies
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS medications TEXT[]; -- Current medications
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS medical_notes TEXT; -- General medical notes
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS last_eye_exam_date DATE; -- Last eye examination date
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS next_eye_exam_due DATE; -- Next recommended eye exam date
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS preferred_contact_method TEXT CHECK (preferred_contact_method IN ('email', 'phone', 'sms', 'whatsapp'));
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS insurance_provider TEXT; -- Insurance company name
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS insurance_policy_number TEXT;
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_active_customer BOOLEAN DEFAULT TRUE; -- Active customer flag

-- ===== CREATE PRESCRIPTIONS TABLE (RECETAS) =====
CREATE TABLE IF NOT EXISTS public.prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Prescription metadata
  prescription_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiration_date DATE, -- When prescription expires
  prescription_number TEXT, -- Unique prescription number
  issued_by TEXT, -- Doctor/Optometrist name
  issued_by_license TEXT, -- Professional license number
  
  -- Right Eye (OD - Oculus Dexter)
  od_sphere DECIMAL(5,2), -- Sphere power
  od_cylinder DECIMAL(5,2), -- Cylinder power
  od_axis INTEGER CHECK (od_axis >= 0 AND od_axis <= 180), -- Axis in degrees
  od_add DECIMAL(5,2), -- Addition for reading (bifocal/progressive)
  od_pd DECIMAL(4,1), -- Pupillary Distance in mm
  od_near_pd DECIMAL(4,1), -- Near PD if different
  
  -- Left Eye (OS - Oculus Sinister)
  os_sphere DECIMAL(5,2),
  os_cylinder DECIMAL(5,2),
  os_axis INTEGER CHECK (os_axis >= 0 AND os_axis <= 180),
  os_add DECIMAL(5,2),
  os_pd DECIMAL(4,1),
  os_near_pd DECIMAL(4,1),
  
  -- Additional measurements
  frame_pd DECIMAL(4,1), -- Frame PD (distance between lenses)
  height_segmentation DECIMAL(4,1), -- Height for bifocal/progressive
  
  -- Prescription type
  prescription_type TEXT CHECK (prescription_type IN ('single_vision', 'bifocal', 'trifocal', 'progressive', 'reading', 'computer', 'sports')),
  lens_type TEXT, -- Type of lens prescribed
  lens_material TEXT, -- Material recommended
  
  -- Special requirements
  prism_od TEXT, -- Prism prescription for right eye (e.g., "2.0 Base Up")
  prism_os TEXT, -- Prism prescription for left eye
  tint_od TEXT, -- Tint requirements for right eye
  tint_os TEXT, -- Tint requirements for left eye
  coatings TEXT[], -- Required coatings (anti-reflective, blue light, etc.)
  
  -- Notes and observations
  notes TEXT, -- General notes about the prescription
  observations TEXT, -- Clinical observations
  recommendations TEXT, -- Recommendations for the patient
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE, -- Active prescription
  is_current BOOLEAN DEFAULT FALSE, -- Current/primary prescription
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- ===== CREATE APPOINTMENTS TABLE (CITAS/AGENDAS) =====
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Appointment details
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 30, -- Duration in minutes
  appointment_type TEXT CHECK (appointment_type IN (
    'eye_exam', -- Examen de la vista
    'consultation', -- Consulta
    'fitting', -- Ajuste de lentes
    'delivery', -- Entrega de lentes
    'repair', -- Reparación
    'follow_up', -- Seguimiento
    'emergency', -- Emergencia
    'other' -- Otro
  )),
  
  -- Status
  status TEXT CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')) DEFAULT 'scheduled',
  
  -- Staff assignment
  assigned_to UUID REFERENCES auth.users(id), -- Staff member assigned
  created_by UUID REFERENCES auth.users(id),
  
  -- Notes
  notes TEXT, -- Appointment notes
  reason TEXT, -- Reason for appointment
  outcome TEXT, -- Outcome/results of appointment
  follow_up_required BOOLEAN DEFAULT FALSE,
  follow_up_date DATE, -- Suggested follow-up date
  
  -- Related records
  prescription_id UUID REFERENCES public.prescriptions(id), -- Related prescription if applicable
  order_id UUID REFERENCES public.orders(id), -- Related order if applicable
  
  -- Reminders
  reminder_sent BOOLEAN DEFAULT FALSE,
  reminder_sent_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ, -- When appointment was completed
  cancelled_at TIMESTAMPTZ, -- When appointment was cancelled
  cancellation_reason TEXT -- Reason for cancellation
);

-- ===== CREATE CUSTOMER PURCHASE HISTORY TABLE =====
-- This links customer orders with prescriptions and provides detailed lens purchase history
CREATE TABLE IF NOT EXISTS public.customer_lens_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE SET NULL,
  
  -- Product information
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_type TEXT CHECK (product_type IN ('frame', 'lens', 'accessory', 'service')),
  
  -- Purchase details
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  
  -- Lens specifications (if applicable)
  lens_type TEXT, -- Type of lens purchased
  lens_material TEXT,
  lens_index DECIMAL(3,2),
  coatings TEXT[],
  tint TEXT,
  
  -- Frame specifications (if applicable)
  frame_brand TEXT,
  frame_model TEXT,
  frame_color TEXT,
  frame_size TEXT,
  
  -- Prescription used
  prescription_used JSONB, -- Snapshot of prescription at time of purchase
  
  -- Status
  status TEXT CHECK (status IN ('ordered', 'in_progress', 'ready', 'delivered', 'cancelled')) DEFAULT 'ordered',
  delivery_date DATE,
  
  -- Warranty
  warranty_start_date DATE,
  warranty_end_date DATE,
  warranty_details TEXT,
  
  -- Notes
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== CREATE INDEXES =====
-- Prescriptions indexes
CREATE INDEX IF NOT EXISTS idx_prescriptions_customer_id ON public.prescriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_prescription_date ON public.prescriptions(prescription_date DESC);
CREATE INDEX IF NOT EXISTS idx_prescriptions_is_current ON public.prescriptions(is_current) WHERE is_current = TRUE;
CREATE INDEX IF NOT EXISTS idx_prescriptions_is_active ON public.prescriptions(is_active) WHERE is_active = TRUE;

-- Appointments indexes
CREATE INDEX IF NOT EXISTS idx_appointments_customer_id ON public.appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(appointment_date, appointment_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_assigned_to ON public.appointments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_appointments_prescription_id ON public.appointments(prescription_id);
CREATE INDEX IF NOT EXISTS idx_appointments_order_id ON public.appointments(order_id);

-- Customer lens purchases indexes
CREATE INDEX IF NOT EXISTS idx_customer_lens_purchases_customer_id ON public.customer_lens_purchases(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_lens_purchases_order_id ON public.customer_lens_purchases(order_id);
CREATE INDEX IF NOT EXISTS idx_customer_lens_purchases_prescription_id ON public.customer_lens_purchases(prescription_id);
CREATE INDEX IF NOT EXISTS idx_customer_lens_purchases_purchase_date ON public.customer_lens_purchases(purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_customer_lens_purchases_status ON public.customer_lens_purchases(status);

-- Profiles indexes for optical fields
CREATE INDEX IF NOT EXISTS idx_profiles_rut ON public.profiles(rut) WHERE rut IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_is_active_customer ON public.profiles(is_active_customer) WHERE is_active_customer = TRUE;
CREATE INDEX IF NOT EXISTS idx_profiles_last_eye_exam_date ON public.profiles(last_eye_exam_date);
CREATE INDEX IF NOT EXISTS idx_profiles_next_eye_exam_due ON public.profiles(next_eye_exam_due);

-- ===== CREATE FUNCTIONS =====
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_prescriptions_updated_at
  BEFORE UPDATE ON public.prescriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_lens_purchases_updated_at
  BEFORE UPDATE ON public.customer_lens_purchases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to get customer's current prescription
CREATE OR REPLACE FUNCTION get_current_prescription(customer_uuid UUID)
RETURNS TABLE (
  id UUID,
  prescription_date DATE,
  expiration_date DATE,
  od_sphere DECIMAL,
  od_cylinder DECIMAL,
  od_axis INTEGER,
  os_sphere DECIMAL,
  os_cylinder DECIMAL,
  os_axis INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.prescription_date,
    p.expiration_date,
    p.od_sphere,
    p.od_cylinder,
    p.od_axis,
    p.os_sphere,
    p.os_cylinder,
    p.os_axis
  FROM public.prescriptions p
  WHERE p.customer_id = customer_uuid
    AND p.is_current = TRUE
    AND p.is_active = TRUE
  ORDER BY p.prescription_date DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to get upcoming appointments for a customer
CREATE OR REPLACE FUNCTION get_upcoming_appointments(customer_uuid UUID, days_ahead INTEGER DEFAULT 30)
RETURNS TABLE (
  id UUID,
  appointment_date DATE,
  appointment_time TIME,
  appointment_type TEXT,
  status TEXT,
  notes TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.appointment_date,
    a.appointment_time,
    a.appointment_type,
    a.status,
    a.notes
  FROM public.appointments a
  WHERE a.customer_id = customer_uuid
    AND a.appointment_date >= CURRENT_DATE
    AND a.appointment_date <= CURRENT_DATE + (days_ahead || ' days')::INTERVAL
    AND a.status IN ('scheduled', 'confirmed')
  ORDER BY a.appointment_date ASC, a.appointment_time ASC;
END;
$$ LANGUAGE plpgsql;

-- ===== ROW LEVEL SECURITY (RLS) =====
-- Enable RLS
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_lens_purchases ENABLE ROW LEVEL SECURITY;

-- Prescriptions policies
CREATE POLICY "Admins can view all prescriptions"
  ON public.prescriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.id = auth.uid()
      AND au.is_active = TRUE
    )
  );

CREATE POLICY "Admins can insert prescriptions"
  ON public.prescriptions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.id = auth.uid()
      AND au.is_active = TRUE
    )
  );

CREATE POLICY "Admins can update prescriptions"
  ON public.prescriptions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.id = auth.uid()
      AND au.is_active = TRUE
    )
  );

CREATE POLICY "Admins can delete prescriptions"
  ON public.prescriptions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.id = auth.uid()
      AND au.is_active = TRUE
    )
  );

-- Appointments policies
CREATE POLICY "Admins can view all appointments"
  ON public.appointments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.id = auth.uid()
      AND au.is_active = TRUE
    )
  );

CREATE POLICY "Admins can insert appointments"
  ON public.appointments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.id = auth.uid()
      AND au.is_active = TRUE
    )
  );

CREATE POLICY "Admins can update appointments"
  ON public.appointments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.id = auth.uid()
      AND au.is_active = TRUE
    )
  );

CREATE POLICY "Admins can delete appointments"
  ON public.appointments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.id = auth.uid()
      AND au.is_active = TRUE
    )
  );

-- Customer lens purchases policies
CREATE POLICY "Admins can view all lens purchases"
  ON public.customer_lens_purchases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.id = auth.uid()
      AND au.is_active = TRUE
    )
  );

CREATE POLICY "Admins can insert lens purchases"
  ON public.customer_lens_purchases FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.id = auth.uid()
      AND au.is_active = TRUE
    )
  );

CREATE POLICY "Admins can update lens purchases"
  ON public.customer_lens_purchases FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.id = auth.uid()
      AND au.is_active = TRUE
    )
  );

CREATE POLICY "Admins can delete lens purchases"
  ON public.customer_lens_purchases FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au
      WHERE au.id = auth.uid()
      AND au.is_active = TRUE
    )
  );

-- ===== COMMENTS =====
COMMENT ON TABLE public.prescriptions IS 'Eye prescriptions for customers';
COMMENT ON TABLE public.appointments IS 'Customer appointments and schedules';
COMMENT ON TABLE public.customer_lens_purchases IS 'Detailed history of lens and frame purchases linked to prescriptions';
COMMENT ON COLUMN public.prescriptions.od_sphere IS 'Right eye sphere power (e.g., -2.50, +1.75)';
COMMENT ON COLUMN public.prescriptions.os_sphere IS 'Left eye sphere power';
COMMENT ON COLUMN public.prescriptions.od_axis IS 'Right eye axis in degrees (0-180)';
COMMENT ON COLUMN public.prescriptions.os_axis IS 'Left eye axis in degrees (0-180)';
COMMENT ON COLUMN public.prescriptions.od_pd IS 'Right eye pupillary distance in millimeters';
COMMENT ON COLUMN public.prescriptions.os_pd IS 'Left eye pupillary distance in millimeters';


-- === End of 20250123000000_adapt_customers_for_optical_shop.sql ===

-- === Source: 20250124000000_remove_membership_from_customers.sql ===
-- Migration: Remove Membership Fields from Customers
-- This migration removes all membership-related fields from the profiles table
-- as membership concept is not applicable for optical shop customers

-- First, update admin_users_view to remove membership_tier reference
DROP VIEW IF EXISTS public.admin_users_view CASCADE;

CREATE OR REPLACE VIEW public.admin_users_view AS
SELECT 
  au.id,
  au.email,
  au.role,
  au.is_active,
  au.created_at,
  au.last_login,
  CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')) AS full_name
FROM admin_users au
LEFT JOIN profiles p ON au.id = p.id
WHERE au.is_active = true;

-- Drop membership-related columns from profiles table
ALTER TABLE public.profiles
DROP COLUMN IF EXISTS is_member;

ALTER TABLE public.profiles
DROP COLUMN IF EXISTS membership_tier CASCADE;

ALTER TABLE public.profiles
DROP COLUMN IF EXISTS membership_start_date;

ALTER TABLE public.profiles
DROP COLUMN IF EXISTS membership_end_date;

-- Update handle_new_user() function to remove membership_tier
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: The memberships table may still exist but won't be used for customers
-- We're only removing membership fields from profiles, not the entire memberships table
-- in case it's used elsewhere in the system


-- === End of 20250124000000_remove_membership_from_customers.sql ===

-- === Source: 20250125000000_create_lab_work_orders_system.sql ===
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


-- === End of 20250125000000_create_lab_work_orders_system.sql ===

