-- Create table for contact lens purchase orders (encargos)
CREATE TABLE IF NOT EXISTS public.contact_lens_encargos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  
  -- Customer info (optional - can be linked later)
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_rut TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  
  -- Contact lens family
  contact_lens_family_id UUID NOT NULL REFERENCES contact_lens_families(id) ON DELETE CASCADE,
  family_name TEXT NOT NULL,
  family_brand TEXT,
  
  -- Prescription details
  sphere_od NUMERIC(5,2) NOT NULL,
  cylinder_od NUMERIC(5,2) DEFAULT 0,
  axis_od INTEGER,
  add_od NUMERIC(5,2),
  base_curve_od NUMERIC(5,2),
  diameter_od NUMERIC(5,2),
  sphere_os NUMERIC(5,2) NOT NULL,
  cylinder_os NUMERIC(5,2) DEFAULT 0,
  axis_os INTEGER,
  add_os NUMERIC(5,2),
  base_curve_os NUMERIC(5,2),
  diameter_os NUMERIC(5,2),
  
  -- Quantity
  quantity INTEGER NOT NULL DEFAULT 1,
  
  -- Pricing
  estimated_price NUMERIC(12,2),
  cost NUMERIC(12,2),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ordered', 'arrived', 'delivered', 'cancelled')),
  
  -- Notes
  notes TEXT,
  
  -- Tracking
  expected_arrival_date DATE,
  arrival_notification_sent BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  created_by UUID REFERENCES admin_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_contact_lens_encargos_org_branch ON public.contact_lens_encargos(organization_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_contact_lens_encargos_status ON public.contact_lens_encargos(status);
CREATE INDEX IF NOT EXISTS idx_contact_lens_encargos_family ON public.contact_lens_encargos(contact_lens_family_id);
CREATE INDEX IF NOT EXISTS idx_contact_lens_encargos_customer ON public.contact_lens_encargos(customer_id);

-- Add RLS
ALTER TABLE public.contact_lens_encargos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view encargos in their organization"
  ON public.contact_lens_encargos FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM admin_users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create encargos in their branch"
  ON public.contact_lens_encargos FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM admin_users WHERE id = auth.uid()
    )
    AND branch_id IN (
      SELECT branch_id FROM admin_branch_access WHERE admin_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update encargos in their branch"
  ON public.contact_lens_encargos FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM admin_users WHERE id = auth.uid()
    )
    AND branch_id IN (
      SELECT branch_id FROM admin_branch_access WHERE admin_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete encargos in their branch"
  ON public.contact_lens_encargos FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM admin_users WHERE id = auth.uid()
    )
    AND branch_id IN (
      SELECT branch_id FROM admin_branch_access WHERE admin_user_id = auth.uid()
    )
  );

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_contact_lens_encargos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_contact_lens_encargos_updated_at
  BEFORE UPDATE ON public.contact_lens_encargos
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_lens_encargos_updated_at();