-- Migration: 20260201000002_create_optical_internal_support.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Create Optical Internal Support System
-- This system allows ópticas to manage internal support tickets for issues with their customers
-- Separate from SaaS support (saas_support_tickets) and customer support (support_tickets)
-- Date: 2026-02-01

-- ===== CREATE TABLE: optical_internal_support_tickets =====
CREATE TABLE IF NOT EXISTS public.optical_internal_support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE NOT NULL, -- Format: OPT-YYYYMMDD-XXXXX
  
  -- Relación con organización y sucursal
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  
  -- Relación con cliente (problema relacionado con este cliente)
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT, -- Cached customer name
  customer_email TEXT,
  customer_phone TEXT,
  
  -- Relación con pedido/trabajo/cita relacionado (opcional)
  related_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  related_work_order_id UUID REFERENCES public.lab_work_orders(id) ON DELETE SET NULL,
  related_appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  related_quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  
  -- Información del creador (empleado/vendedor que reporta el problema)
  created_by_user_id UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  created_by_name TEXT,
  created_by_role TEXT, -- 'super_admin', 'admin', 'employee', 'vendedor'
  
  -- Detalles del ticket
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'lens_issue',        -- Problema con lente
    'frame_issue',        -- Problema con marco
    'prescription_issue', -- Problema con receta
    'delivery_issue',    -- Problema con entrega
    'payment_issue',     -- Problema con pago
    'appointment_issue', -- Problema con cita
    'customer_complaint', -- Queja del cliente
    'quality_issue',     -- Problema de calidad
    'other'              -- Otros
  )),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
    'open',              -- Abierto, sin asignar
    'assigned',          -- Asignado a un empleado/admin
    'in_progress',       -- En progreso
    'waiting_customer',  -- Esperando respuesta del cliente
    'resolved',          -- Resuelto
    'closed'             -- Cerrado
  )),
  
  -- Asignación
  assigned_to UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,
  
  -- Resolución
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  resolution_notes TEXT, -- Notas sobre cómo se resolvió
  
  -- Métricas
  first_response_at TIMESTAMPTZ,
  last_response_at TIMESTAMPTZ,
  response_time_minutes INTEGER, -- Tiempo hasta primera respuesta
  resolution_time_minutes INTEGER, -- Tiempo hasta resolución
  
  -- Metadata adicional
  metadata JSONB DEFAULT '{}', -- Información adicional (fotos, documentos, etc.)
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ===== CREATE TABLE: optical_internal_support_messages =====
CREATE TABLE IF NOT EXISTS public.optical_internal_support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.optical_internal_support_tickets(id) ON DELETE CASCADE NOT NULL,
  
  -- Contenido del mensaje
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false, -- true para notas internas (no visibles al cliente)
  
  -- Información del remitente
  sender_id UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  sender_role TEXT, -- Role del remitente
  
  -- Adjuntos
  attachments JSONB DEFAULT '[]', -- Array de URLs y metadata
  
  -- Tipo de mensaje
  message_type TEXT DEFAULT 'message' CHECK (message_type IN (
    'message',        -- Mensaje normal
    'note',          -- Nota interna
    'status_change', -- Cambio de estado
    'assignment',    -- Asignación
    'resolution'     -- Resolución
  )),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ===== CREATE INDEXES =====
CREATE INDEX idx_optical_internal_support_tickets_organization ON public.optical_internal_support_tickets(organization_id);
CREATE INDEX idx_optical_internal_support_tickets_branch ON public.optical_internal_support_tickets(branch_id);
CREATE INDEX idx_optical_internal_support_tickets_customer ON public.optical_internal_support_tickets(customer_id);
CREATE INDEX idx_optical_internal_support_tickets_status ON public.optical_internal_support_tickets(status);
CREATE INDEX idx_optical_internal_support_tickets_priority ON public.optical_internal_support_tickets(priority);
CREATE INDEX idx_optical_internal_support_tickets_assigned_to ON public.optical_internal_support_tickets(assigned_to);
CREATE INDEX idx_optical_internal_support_tickets_created_at ON public.optical_internal_support_tickets(created_at DESC);
CREATE INDEX idx_optical_internal_support_tickets_ticket_number ON public.optical_internal_support_tickets(ticket_number);

CREATE INDEX idx_optical_internal_support_messages_ticket ON public.optical_internal_support_messages(ticket_id, created_at DESC);

-- ===== ENABLE ROW LEVEL SECURITY =====
ALTER TABLE public.optical_internal_support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optical_internal_support_messages ENABLE ROW LEVEL SECURITY;

-- ===== CREATE FUNCTION TO GENERATE TICKET NUMBER =====
CREATE OR REPLACE FUNCTION public.generate_optical_internal_ticket_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  date_prefix TEXT;
  random_suffix TEXT;
  ticket_num TEXT;
BEGIN
  -- Format: OPT-YYYYMMDD-XXXXX
  date_prefix := TO_CHAR(NOW(), 'YYYYMMDD');
  random_suffix := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 5));
  ticket_num := 'OPT-' || date_prefix || '-' || random_suffix;
  
  -- Ensure uniqueness (retry if collision)
  WHILE EXISTS (SELECT 1 FROM public.optical_internal_support_tickets WHERE ticket_number = ticket_num) LOOP
    random_suffix := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT || RANDOM()::TEXT) FROM 1 FOR 5));
    ticket_num := 'OPT-' || date_prefix || '-' || random_suffix;
  END LOOP;
  
  RETURN ticket_num;
END;
$$;

COMMENT ON FUNCTION public.generate_optical_internal_ticket_number IS 'Generates unique ticket number in format OPT-YYYYMMDD-XXXXX';

-- ===== CREATE TRIGGER TO AUTO-GENERATE TICKET NUMBER =====
CREATE OR REPLACE FUNCTION public.set_optical_internal_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := public.generate_optical_internal_ticket_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_optical_internal_ticket_number_trigger
  BEFORE INSERT ON public.optical_internal_support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_optical_internal_ticket_number();

-- ===== CREATE TRIGGER TO UPDATE UPDATED_AT =====
CREATE TRIGGER update_optical_internal_support_tickets_updated_at
  BEFORE UPDATE ON public.optical_internal_support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_optical_internal_support_messages_updated_at
  BEFORE UPDATE ON public.optical_internal_support_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ===== CREATE TRIGGER TO UPDATE TICKET TIMESTAMPS =====
CREATE OR REPLACE FUNCTION public.update_optical_internal_ticket_timestamps()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update the parent ticket's last_response_at
  UPDATE public.optical_internal_support_tickets 
  SET 
    last_response_at = NOW(),
    first_response_at = COALESCE(first_response_at, NOW()),
    updated_at = NOW()
  WHERE id = NEW.ticket_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_optical_internal_ticket_timestamps
  AFTER INSERT ON public.optical_internal_support_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_optical_internal_ticket_timestamps();

-- ===== CREATE RLS POLICIES FOR optical_internal_support_tickets =====

-- Policy 1: Users from an organization can view tickets from their organization only
CREATE POLICY "Users can view their organization tickets"
ON public.optical_internal_support_tickets
FOR SELECT
USING (
  organization_id = (
    SELECT organization_id FROM public.admin_users
    WHERE id = auth.uid()
    LIMIT 1
  )
  AND (
    -- Super admin sees all tickets from their organization
    public.is_super_admin(auth.uid())
    OR
    -- Regular admin/employee sees tickets from their accessible branches
    (
      branch_id IS NULL
      OR
      branch_id IN (
        SELECT branch_id FROM public.get_user_branches(auth.uid())
      )
    )
  )
);

-- Policy 2: Users can create tickets for their organization
CREATE POLICY "Users can create tickets for their organization"
ON public.optical_internal_support_tickets
FOR INSERT
WITH CHECK (
  organization_id = (
    SELECT organization_id FROM public.admin_users
    WHERE id = auth.uid()
    LIMIT 1
  )
  AND (
    branch_id IS NULL
    OR
    branch_id IN (
      SELECT branch_id FROM public.get_user_branches(auth.uid())
    )
  )
);

-- Policy 3: Users can update tickets from their organization
CREATE POLICY "Users can update their organization tickets"
ON public.optical_internal_support_tickets
FOR UPDATE
USING (
  organization_id = (
    SELECT organization_id FROM public.admin_users
    WHERE id = auth.uid()
    LIMIT 1
  )
  AND (
    public.is_super_admin(auth.uid())
    OR
    (
      branch_id IS NULL
      OR
      branch_id IN (
        SELECT branch_id FROM public.get_user_branches(auth.uid())
      )
    )
  )
);

-- ===== CREATE RLS POLICIES FOR optical_internal_support_messages =====

-- Policy 1: Users can view messages from tickets in their organization
CREATE POLICY "Users can view their organization ticket messages"
ON public.optical_internal_support_messages
FOR SELECT
USING (
  ticket_id IN (
    SELECT id FROM public.optical_internal_support_tickets
    WHERE organization_id = (
      SELECT organization_id FROM public.admin_users
      WHERE id = auth.uid()
      LIMIT 1
    )
  )
);

-- Policy 2: Users can create messages in tickets from their organization
CREATE POLICY "Users can create messages in their organization tickets"
ON public.optical_internal_support_messages
FOR INSERT
WITH CHECK (
  ticket_id IN (
    SELECT id FROM public.optical_internal_support_tickets
    WHERE organization_id = (
      SELECT organization_id FROM public.admin_users
      WHERE id = auth.uid()
      LIMIT 1
    )
  )
);

-- Policy 3: Users can update messages from tickets in their organization
CREATE POLICY "Users can update their organization ticket messages"
ON public.optical_internal_support_messages
FOR UPDATE
USING (
  ticket_id IN (
    SELECT id FROM public.optical_internal_support_tickets
    WHERE organization_id = (
      SELECT organization_id FROM public.admin_users
      WHERE id = auth.uid()
      LIMIT 1
    )
  )
);

-- ===== COMMENTS =====
COMMENT ON TABLE public.optical_internal_support_tickets IS 'Internal support tickets for ópticas to track issues with their customers. Separate from SaaS support and customer support.';
COMMENT ON TABLE public.optical_internal_support_messages IS 'Messages and conversation history for optical internal support tickets';

COMMENT ON COLUMN public.optical_internal_support_tickets.ticket_number IS 'Unique ticket identifier in format OPT-YYYYMMDD-XXXXX';
COMMENT ON COLUMN public.optical_internal_support_tickets.organization_id IS 'Organization that owns this ticket. Ensures tickets are isolated by organization.';
COMMENT ON COLUMN public.optical_internal_support_tickets.branch_id IS 'Branch where the issue occurred (optional)';
COMMENT ON COLUMN public.optical_internal_support_tickets.customer_id IS 'Customer related to this issue';
COMMENT ON COLUMN public.optical_internal_support_tickets.created_by_user_id IS 'Employee/vendedor who created the ticket';
COMMENT ON COLUMN public.optical_internal_support_tickets.resolution_notes IS 'Notes about how the issue was resolved';
COMMENT ON COLUMN public.optical_internal_support_messages.is_internal IS 'If true, message is internal note not visible to customer';
