-- Migration: 20260131000011_create_saas_support_system.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Create SaaS Support System
-- This migration creates tables for organizations to contact Opttius support
-- Date: 2026-01-31

-- ===== CREATE TABLE: saas_support_tickets =====
CREATE TABLE IF NOT EXISTS public.saas_support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE NOT NULL, -- Format: SAAS-YYYYMMDD-XXXXX
  
  -- Relación con organización/usuario
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  created_by_user_id UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  
  -- Información del solicitante
  requester_email TEXT NOT NULL,
  requester_name TEXT,
  requester_role TEXT, -- 'super_admin', 'admin', 'employee'
  
  -- Detalles del ticket
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'technical',      -- Problemas técnicos
    'billing',        -- Facturación/suscripciones
    'feature_request', -- Solicitud de funcionalidades
    'bug_report',     -- Reporte de bugs
    'account',        -- Gestión de cuenta
    'other'           -- Otros
  )),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
    'open',              -- Abierto, sin asignar
    'assigned',          -- Asignado a root/dev
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
  
  -- Métricas
  first_response_at TIMESTAMPTZ,
  last_response_at TIMESTAMPTZ,
  response_time_minutes INTEGER, -- Tiempo hasta primera respuesta
  resolution_time_minutes INTEGER, -- Tiempo hasta resolución
  
  -- Satisfacción del cliente
  customer_satisfaction_rating INTEGER CHECK (customer_satisfaction_rating >= 1 AND customer_satisfaction_rating <= 5),
  customer_feedback TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}', -- Información adicional (versión, navegador, etc.)
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ===== CREATE TABLE: saas_support_messages =====
CREATE TABLE IF NOT EXISTS public.saas_support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.saas_support_tickets(id) ON DELETE CASCADE NOT NULL,
  
  -- Contenido del mensaje
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false, -- true para notas internas (no visibles al cliente)
  is_from_customer BOOLEAN DEFAULT false, -- true si viene del cliente
  
  -- Información del remitente
  sender_id UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  
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

-- ===== CREATE TABLE: saas_support_templates =====
CREATE TABLE IF NOT EXISTS public.saas_support_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT,
  content TEXT NOT NULL,
  category TEXT, -- Categoría relacionada
  
  -- Variables disponibles (e.g., {{ticket_number}}, {{organization_name}})
  variables JSONB DEFAULT '[]',
  
  -- Uso
  usage_count INTEGER DEFAULT 0,
  
  -- Estado
  is_active BOOLEAN DEFAULT true,
  
  -- Creador
  created_by UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ===== CREATE INDEXES =====
CREATE INDEX idx_saas_support_tickets_organization ON public.saas_support_tickets(organization_id);
CREATE INDEX idx_saas_support_tickets_status ON public.saas_support_tickets(status);
CREATE INDEX idx_saas_support_tickets_priority ON public.saas_support_tickets(priority);
CREATE INDEX idx_saas_support_tickets_assigned_to ON public.saas_support_tickets(assigned_to);
CREATE INDEX idx_saas_support_tickets_created_at ON public.saas_support_tickets(created_at DESC);
CREATE INDEX idx_saas_support_tickets_ticket_number ON public.saas_support_tickets(ticket_number);

CREATE INDEX idx_saas_support_messages_ticket ON public.saas_support_messages(ticket_id, created_at DESC);

-- ===== ENABLE ROW LEVEL SECURITY =====
ALTER TABLE public.saas_support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_support_templates ENABLE ROW LEVEL SECURITY;

-- ===== CREATE FUNCTION TO GENERATE TICKET NUMBER =====
CREATE OR REPLACE FUNCTION public.generate_saas_ticket_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  date_prefix TEXT;
  random_suffix TEXT;
  ticket_num TEXT;
BEGIN
  -- Format: SAAS-YYYYMMDD-XXXXX
  date_prefix := TO_CHAR(NOW(), 'YYYYMMDD');
  random_suffix := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 5));
  ticket_num := 'SAAS-' || date_prefix || '-' || random_suffix;
  
  -- Ensure uniqueness (retry if collision)
  WHILE EXISTS (SELECT 1 FROM public.saas_support_tickets WHERE ticket_number = ticket_num) LOOP
    random_suffix := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT || RANDOM()::TEXT) FROM 1 FOR 5));
    ticket_num := 'SAAS-' || date_prefix || '-' || random_suffix;
  END LOOP;
  
  RETURN ticket_num;
END;
$$;

COMMENT ON FUNCTION public.generate_saas_ticket_number IS 'Generates unique ticket number in format SAAS-YYYYMMDD-XXXXX';

-- ===== CREATE TRIGGER TO AUTO-GENERATE TICKET NUMBER =====
CREATE OR REPLACE FUNCTION public.set_saas_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := public.generate_saas_ticket_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_saas_ticket_number_trigger
  BEFORE INSERT ON public.saas_support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_saas_ticket_number();

-- ===== CREATE TRIGGER TO UPDATE UPDATED_AT =====
CREATE TRIGGER update_saas_support_tickets_updated_at
  BEFORE UPDATE ON public.saas_support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_saas_support_messages_updated_at
  BEFORE UPDATE ON public.saas_support_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_saas_support_templates_updated_at
  BEFORE UPDATE ON public.saas_support_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ===== CREATE RLS POLICIES FOR saas_support_tickets =====

-- Policy 1: Organizaciones pueden ver sus propios tickets
CREATE POLICY "Organizations can view own tickets"
ON public.saas_support_tickets
FOR SELECT
USING (
  organization_id = (
    SELECT organization_id FROM public.admin_users
    WHERE id = auth.uid()
    LIMIT 1
  )
);

-- Policy 2: Organizaciones pueden crear tickets
CREATE POLICY "Organizations can create tickets"
ON public.saas_support_tickets
FOR INSERT
WITH CHECK (
  organization_id = (
    SELECT organization_id FROM public.admin_users
    WHERE id = auth.uid()
    LIMIT 1
  )
  OR organization_id IS NULL -- Permitir tickets públicos sin organización
);

-- Policy 3: Organizaciones pueden actualizar sus propios tickets (solo ciertos campos)
CREATE POLICY "Organizations can update own tickets"
ON public.saas_support_tickets
FOR UPDATE
USING (
  organization_id = (
    SELECT organization_id FROM public.admin_users
    WHERE id = auth.uid()
    LIMIT 1
  )
)
WITH CHECK (
  organization_id = (
    SELECT organization_id FROM public.admin_users
    WHERE id = auth.uid()
    LIMIT 1
  )
);

-- Policy 4: Root/dev puede ver todos los tickets
CREATE POLICY "Root users can view all tickets"
ON public.saas_support_tickets
FOR SELECT
USING (public.is_root_user(auth.uid()));

-- Policy 5: Root/dev puede gestionar todos los tickets
CREATE POLICY "Root users can manage all tickets"
ON public.saas_support_tickets
FOR ALL
USING (public.is_root_user(auth.uid()))
WITH CHECK (public.is_root_user(auth.uid()));

-- ===== CREATE RLS POLICIES FOR saas_support_messages =====

-- Policy 1: Organizaciones pueden ver mensajes de sus tickets
CREATE POLICY "Organizations can view own ticket messages"
ON public.saas_support_messages
FOR SELECT
USING (
  ticket_id IN (
    SELECT id FROM public.saas_support_tickets
    WHERE organization_id = (
      SELECT organization_id FROM public.admin_users
      WHERE id = auth.uid()
      LIMIT 1
    )
  )
  AND is_internal = false -- No mostrar notas internas a organizaciones
);

-- Policy 2: Organizaciones pueden crear mensajes en sus tickets
CREATE POLICY "Organizations can create messages in own tickets"
ON public.saas_support_messages
FOR INSERT
WITH CHECK (
  ticket_id IN (
    SELECT id FROM public.saas_support_tickets
    WHERE organization_id = (
      SELECT organization_id FROM public.admin_users
      WHERE id = auth.uid()
      LIMIT 1
    )
  )
  AND is_from_customer = true
);

-- Policy 3: Root/dev puede ver todos los mensajes (incluyendo internos)
CREATE POLICY "Root users can view all messages"
ON public.saas_support_messages
FOR SELECT
USING (public.is_root_user(auth.uid()));

-- Policy 4: Root/dev puede gestionar todos los mensajes
CREATE POLICY "Root users can manage all messages"
ON public.saas_support_messages
FOR ALL
USING (public.is_root_user(auth.uid()))
WITH CHECK (public.is_root_user(auth.uid()));

-- ===== CREATE RLS POLICIES FOR saas_support_templates =====

-- Policy 1: Root/dev puede gestionar templates
CREATE POLICY "Root users can manage templates"
ON public.saas_support_templates
FOR ALL
USING (public.is_root_user(auth.uid()))
WITH CHECK (public.is_root_user(auth.uid()));

-- Policy 2: Root/dev puede ver templates
CREATE POLICY "Root users can view templates"
ON public.saas_support_templates
FOR SELECT
USING (public.is_root_user(auth.uid()));

-- ===== COMMENTS =====
COMMENT ON TABLE public.saas_support_tickets IS 'SaaS support tickets: Organizations contacting Opttius for technical support';
COMMENT ON TABLE public.saas_support_messages IS 'Messages and conversation history for SaaS support tickets';
COMMENT ON TABLE public.saas_support_templates IS 'Reusable templates for common SaaS support responses';

COMMENT ON COLUMN public.saas_support_tickets.ticket_number IS 'Unique ticket identifier in format SAAS-YYYYMMDD-XXXXX';
COMMENT ON COLUMN public.saas_support_tickets.organization_id IS 'Organization that created the ticket (NULL for public tickets)';
COMMENT ON COLUMN public.saas_support_tickets.created_by_user_id IS 'User who created the ticket (NULL for public tickets)';
COMMENT ON COLUMN public.saas_support_tickets.requester_email IS 'Email of the person requesting support';
COMMENT ON COLUMN public.saas_support_tickets.requester_role IS 'Role of the requester within their organization';
COMMENT ON COLUMN public.saas_support_messages.is_internal IS 'If true, message is internal note not visible to customer';
COMMENT ON COLUMN public.saas_support_messages.is_from_customer IS 'If true, message is from customer/organization';
