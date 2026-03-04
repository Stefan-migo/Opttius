-- Migration: Create Credit Notes System
-- Required for order cancellation and refunds (POS, Caja)
-- Fixes: "Could not find the function public.generate_credit_note_number"

-- Table credit_notes
CREATE TABLE IF NOT EXISTS public.credit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_number TEXT NOT NULL UNIQUE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  amount DECIMAL(12,2) NOT NULL,
  reason TEXT,
  refund_method TEXT NOT NULL CHECK (refund_method IN ('cash', 'debit', 'credit', 'transfer')),
  pos_session_id UUID REFERENCES public.pos_sessions(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Table credit_note_movements
CREATE TABLE IF NOT EXISTS public.credit_note_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_id UUID REFERENCES public.credit_notes(id) ON DELETE CASCADE NOT NULL,
  pos_session_id UUID REFERENCES public.pos_sessions(id) ON DELETE SET NULL,
  amount DECIMAL(12,2) NOT NULL,
  refund_method TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Function generate_credit_note_number (no parameters)
CREATE OR REPLACE FUNCTION public.generate_credit_note_number()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  sequence_number INTEGER;
  cn_number TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(c.credit_note_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO sequence_number
  FROM public.credit_notes c
  WHERE c.credit_note_number LIKE 'NC-' || year_part || '%';
  cn_number := 'NC-' || year_part || LPAD(sequence_number::TEXT, 6, '0');
  RETURN cn_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_credit_notes_order_id ON public.credit_notes(order_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_branch_id ON public.credit_notes(branch_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_organization_id ON public.credit_notes(organization_id);
CREATE INDEX IF NOT EXISTS idx_credit_note_movements_credit_note_id ON public.credit_note_movements(credit_note_id);
CREATE INDEX IF NOT EXISTS idx_credit_note_movements_pos_session_id ON public.credit_note_movements(pos_session_id);

-- Trigger updated_at for credit_notes
CREATE TRIGGER update_credit_notes_updated_at
  BEFORE UPDATE ON public.credit_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_note_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage credit_notes" ON public.credit_notes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Admins can manage credit_note_movements" ON public.credit_note_movements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE id = auth.uid() AND is_active = true
    )
  );

COMMENT ON TABLE public.credit_notes IS 'Credit notes for order cancellations and refunds - integrates with Caja';
COMMENT ON TABLE public.credit_note_movements IS 'Credit note movements linked to POS sessions for caja reconciliation';
COMMENT ON FUNCTION public.generate_credit_note_number() IS 'Generates next credit note number (NC-YYXXXXXX format)';
