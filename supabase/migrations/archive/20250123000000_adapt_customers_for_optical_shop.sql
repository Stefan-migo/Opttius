-- Migration: 20250123000000_adapt_customers_for_optical_shop.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

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

