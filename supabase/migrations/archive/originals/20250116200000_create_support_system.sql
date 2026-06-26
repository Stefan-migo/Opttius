-- Migration: 20250116200000_create_support_system.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Create support system tables
-- This migration sets up customer support ticket system for DA LUZ CONSCIENTE

-- Create support ticket priorities enum
DO $$ BEGIN
    CREATE TYPE support_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create support ticket status enum  
DO $$ BEGIN
    CREATE TYPE support_status AS ENUM ('open', 'in_progress', 'pending_customer', 'resolved', 'closed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create support categories table
CREATE TABLE IF NOT EXISTS public.support_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create support tickets table
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  
  -- Ticket details
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category_id UUID REFERENCES public.support_categories(id) ON DELETE SET NULL,
  priority support_priority DEFAULT 'medium',
  status support_status DEFAULT 'open',
  
  -- Assignment
  assigned_to UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,
  
  -- Related order (if applicable)
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  
  -- Resolution
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  
  -- Tracking
  first_response_at TIMESTAMPTZ,
  last_response_at TIMESTAMPTZ,
  customer_satisfaction_rating INTEGER CHECK (customer_satisfaction_rating >= 1 AND customer_satisfaction_rating <= 5),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create support ticket messages table (conversation history)
CREATE TABLE IF NOT EXISTS public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE NOT NULL,
  
  -- Message details
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false, -- true for internal admin notes
  is_from_customer BOOLEAN DEFAULT false,
  
  -- Sender information
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_name TEXT,
  sender_email TEXT,
  
  -- Attachments
  attachments JSONB, -- array of file URLs and metadata
  
  -- Message type
  message_type TEXT DEFAULT 'message' CHECK (message_type IN ('message', 'note', 'status_change', 'assignment')),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create support templates table (for common responses)
CREATE TABLE IF NOT EXISTS public.support_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT,
  content TEXT NOT NULL,
  category_id UUID REFERENCES public.support_categories(id) ON DELETE SET NULL,
  
  -- Template variables support (e.g., {{customer_name}}, {{order_number}})
  variables JSONB, -- array of available variables
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Creator
  created_by UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.support_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for support_categories
CREATE POLICY "Admin users can manage support categories" ON public.support_categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au 
      WHERE au.id = auth.uid() 
      AND au.is_active = true
    )
  );

-- Create RLS policies for support_tickets
CREATE POLICY "Admin users can view all tickets" ON public.support_tickets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au 
      WHERE au.id = auth.uid() 
      AND au.is_active = true
    )
  );

CREATE POLICY "Admin users can manage tickets" ON public.support_tickets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au 
      WHERE au.id = auth.uid() 
      AND au.is_active = true
    )
  );

CREATE POLICY "Customers can view own tickets" ON public.support_tickets
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Customers can create tickets" ON public.support_tickets
  FOR INSERT WITH CHECK (customer_id = auth.uid());

-- Create RLS policies for support_messages
CREATE POLICY "Admin users can view all messages" ON public.support_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au 
      WHERE au.id = auth.uid() 
      AND au.is_active = true
    )
  );

CREATE POLICY "Admin users can manage messages" ON public.support_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au 
      WHERE au.id = auth.uid() 
      AND au.is_active = true
    )
  );

CREATE POLICY "Customers can view messages in own tickets" ON public.support_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets st 
      WHERE st.id = ticket_id 
      AND st.customer_id = auth.uid()
    )
    AND NOT is_internal -- customers cannot see internal notes
  );

CREATE POLICY "Customers can create messages in own tickets" ON public.support_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_tickets st 
      WHERE st.id = ticket_id 
      AND st.customer_id = auth.uid()
    )
    AND sender_id = auth.uid()
    AND NOT is_internal
  );

-- Create RLS policies for support_templates
CREATE POLICY "Admin users can manage templates" ON public.support_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au 
      WHERE au.id = auth.uid() 
      AND au.is_active = true
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_support_tickets_customer_id ON public.support_tickets(customer_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_support_tickets_priority ON public.support_tickets(priority);
CREATE INDEX idx_support_tickets_assigned_to ON public.support_tickets(assigned_to);
CREATE INDEX idx_support_tickets_created_at ON public.support_tickets(created_at);
CREATE INDEX idx_support_messages_ticket_id ON public.support_messages(ticket_id);
CREATE INDEX idx_support_messages_created_at ON public.support_messages(created_at);

-- Create function to generate ticket numbers
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  ticket_number TEXT;
  counter INTEGER;
BEGIN
  -- Get current year and month
  SELECT 
    'TKT-' || 
    to_char(NOW(), 'YYYY') || 
    to_char(NOW(), 'MM') || 
    '-' || 
    LPAD((
      SELECT COUNT(*) + 1 
      FROM public.support_tickets 
      WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())
    )::TEXT, 4, '0')
  INTO ticket_number;
  
  RETURN ticket_number;
END;
$$;

-- Create trigger to auto-generate ticket numbers
CREATE OR REPLACE FUNCTION set_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := generate_ticket_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_ticket_number
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION set_ticket_number();

-- Create function to update ticket timestamps
CREATE OR REPLACE FUNCTION update_ticket_timestamps()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update the parent ticket's last_response_at
  UPDATE public.support_tickets 
  SET 
    last_response_at = NOW(),
    first_response_at = COALESCE(first_response_at, NOW()),
    updated_at = NOW()
  WHERE id = NEW.ticket_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_ticket_timestamps
  AFTER INSERT ON public.support_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_timestamps();

-- Apply updated_at trigger to all support tables
CREATE TRIGGER update_support_categories_updated_at
  BEFORE UPDATE ON public.support_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_messages_updated_at
  BEFORE UPDATE ON public.support_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_templates_updated_at
  BEFORE UPDATE ON public.support_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default support categories
INSERT INTO public.support_categories (name, description, sort_order) VALUES
  ('Pedidos', 'Consultas sobre estado de pedidos, envíos y entregas', 1),
  ('Productos', 'Preguntas sobre productos, ingredientes y uso', 2),
  ('Membresía', 'Soporte para el programa de transformación de 7 meses', 3),
  ('Facturación', 'Consultas sobre pagos, facturas y reembolsos', 4),
  ('Técnico', 'Problemas técnicos con la plataforma web', 5),
  ('General', 'Consultas generales y otros temas', 6)
ON CONFLICT DO NOTHING;

-- Insert default support templates
INSERT INTO public.support_templates (name, subject, content, variables) VALUES
  (
    'Confirmación de Recepción', 
    'Hemos recibido tu consulta - Ticket {{ticket_number}}',
    'Hola {{customer_name}},

Gracias por contactarnos. Hemos recibido tu consulta y la hemos registrado con el número de ticket {{ticket_number}}.

Nuestro equipo revisará tu solicitud y te responderemos dentro de las próximas 24 horas.

Si tienes alguna pregunta adicional, no dudes en responder a este email.

Saludos,
Equipo de Soporte DA LUZ CONSCIENTE',
    '["customer_name", "ticket_number"]'::jsonb
  ),
  (
    'Seguimiento de Pedido',
    'Actualización sobre tu pedido {{order_number}}',
    'Hola {{customer_name}},

Te escribimos para informarte sobre el estado de tu pedido {{order_number}}.

{{order_status_message}}

Si tienes alguna pregunta, no dudes en contactarnos.

Saludos,
Equipo de DA LUZ CONSCIENTE',
    '["customer_name", "order_number", "order_status_message"]'::jsonb
  ),
  (
    'Resolución de Consulta',
    'Consulta resuelta - Ticket {{ticket_number}}',
    'Hola {{customer_name}},

Nos complace informarte que hemos resuelto tu consulta (Ticket {{ticket_number}}).

{{resolution_details}}

Si consideras que tu consulta ha sido resuelta satisfactoriamente, puedes cerrar este ticket. Si necesitas ayuda adicional, no dudes en responder.

¡Gracias por ser parte de la comunidad DA LUZ CONSCIENTE!

Saludos,
Equipo de Soporte',
    '["customer_name", "ticket_number", "resolution_details"]'::jsonb
  )
ON CONFLICT DO NOTHING;

-- Create view for ticket statistics
CREATE OR REPLACE VIEW public.support_ticket_stats AS
SELECT 
  COUNT(*) as total_tickets,
  COUNT(*) FILTER (WHERE status = 'open') as open_tickets,
  COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_tickets,
  COUNT(*) FILTER (WHERE status = 'pending_customer') as pending_customer_tickets,
  COUNT(*) FILTER (WHERE status = 'resolved') as resolved_tickets,
  COUNT(*) FILTER (WHERE status = 'closed') as closed_tickets,
  COUNT(*) FILTER (WHERE priority = 'urgent') as urgent_tickets,
  COUNT(*) FILTER (WHERE priority = 'high') as high_priority_tickets,
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as tickets_this_week,
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') as tickets_this_month,
  AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) FILTER (WHERE resolved_at IS NOT NULL) as avg_resolution_time_hours
FROM public.support_tickets;

COMMENT ON TABLE public.support_categories IS 'Categories for organizing support tickets';
COMMENT ON TABLE public.support_tickets IS 'Customer support tickets with full lifecycle tracking';
COMMENT ON TABLE public.support_messages IS 'Messages and conversation history for support tickets';
COMMENT ON TABLE public.support_templates IS 'Reusable templates for common support responses';
COMMENT ON VIEW public.support_ticket_stats IS 'Real-time statistics for support ticket dashboard';
