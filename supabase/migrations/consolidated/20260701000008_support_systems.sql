-- Migration: 20260703000008_support_systems.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

BEGIN;

-- ========================================
-- Tables (topological order)
-- ========================================

-- Table: support_categories
CREATE TABLE IF NOT EXISTS public.support_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    branch_id uuid
);

-- Table: support_tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_number text NOT NULL,
    customer_id uuid,
    customer_email text NOT NULL,
    customer_name text,
    subject text NOT NULL,
    description text NOT NULL,
    category_id uuid,
    priority public.support_priority DEFAULT 'medium'::public.support_priority,
    status public.support_status DEFAULT 'open'::public.support_status,
    assigned_to uuid,
    assigned_at timestamp with time zone,
    order_id uuid,
    resolution text,
    resolved_at timestamp with time zone,
    resolved_by uuid,
    first_response_at timestamp with time zone,
    last_response_at timestamp with time zone,
    customer_satisfaction_rating integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    branch_id uuid,
    CONSTRAINT support_tickets_customer_satisfaction_rating_check CHECK (((customer_satisfaction_rating >= 1) AND (customer_satisfaction_rating <= 5)))
);

-- Table: support_messages
CREATE TABLE IF NOT EXISTS public.support_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    message text NOT NULL,
    is_internal boolean DEFAULT false,
    is_from_customer boolean DEFAULT false,
    sender_id uuid,
    sender_name text,
    sender_email text,
    attachments jsonb,
    message_type text DEFAULT 'message'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT support_messages_message_type_check CHECK ((message_type = ANY (ARRAY['message'::text, 'note'::text, 'status_change'::text, 'assignment'::text])))
);

-- Table: support_templates
CREATE TABLE IF NOT EXISTS public.support_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    subject text,
    content text NOT NULL,
    category_id uuid,
    variables jsonb,
    usage_count integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Table: optical_internal_support_tickets
CREATE TABLE IF NOT EXISTS public.optical_internal_support_tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_number text NOT NULL,
    organization_id uuid NOT NULL,
    branch_id uuid,
    customer_id uuid,
    customer_name text,
    customer_email text,
    customer_phone text,
    related_order_id uuid,
    related_work_order_id uuid,
    related_appointment_id uuid,
    related_quote_id uuid,
    created_by_user_id uuid,
    created_by_name text,
    created_by_role text,
    subject text NOT NULL,
    description text NOT NULL,
    category text NOT NULL,
    priority text DEFAULT 'medium'::text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    assigned_to uuid,
    assigned_at timestamp with time zone,
    resolution text,
    resolved_at timestamp with time zone,
    resolved_by uuid,
    resolution_notes text,
    first_response_at timestamp with time zone,
    last_response_at timestamp with time zone,
    response_time_minutes integer,
    resolution_time_minutes integer,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT optical_internal_support_tickets_category_check CHECK ((category = ANY (ARRAY['lens_issue'::text, 'frame_issue'::text, 'prescription_issue'::text, 'delivery_issue'::text, 'payment_issue'::text, 'appointment_issue'::text, 'customer_complaint'::text, 'quality_issue'::text, 'other'::text]))),
    CONSTRAINT optical_internal_support_tickets_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text]))),
    CONSTRAINT optical_internal_support_tickets_status_check CHECK ((status = ANY (ARRAY['open'::text, 'assigned'::text, 'in_progress'::text, 'waiting_customer'::text, 'resolved'::text, 'closed'::text])))
);

-- Table: optical_internal_support_messages
CREATE TABLE IF NOT EXISTS public.optical_internal_support_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    message text NOT NULL,
    is_internal boolean DEFAULT false,
    sender_id uuid,
    sender_name text NOT NULL,
    sender_email text NOT NULL,
    sender_role text,
    attachments jsonb DEFAULT '[]'::jsonb,
    message_type text DEFAULT 'message'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT optical_internal_support_messages_message_type_check CHECK ((message_type = ANY (ARRAY['message'::text, 'note'::text, 'status_change'::text, 'assignment'::text, 'resolution'::text])))
);

-- Table: saas_support_tickets
CREATE TABLE IF NOT EXISTS public.saas_support_tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_number text NOT NULL,
    organization_id uuid,
    created_by_user_id uuid,
    requester_email text NOT NULL,
    requester_name text,
    requester_role text,
    subject text NOT NULL,
    description text NOT NULL,
    category text NOT NULL,
    priority text DEFAULT 'medium'::text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    assigned_to uuid,
    assigned_at timestamp with time zone,
    resolution text,
    resolved_at timestamp with time zone,
    resolved_by uuid,
    first_response_at timestamp with time zone,
    last_response_at timestamp with time zone,
    response_time_minutes integer,
    resolution_time_minutes integer,
    customer_satisfaction_rating integer,
    customer_feedback text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT saas_support_tickets_category_check CHECK ((category = ANY (ARRAY['technical'::text, 'billing'::text, 'feature_request'::text, 'bug_report'::text, 'account'::text, 'other'::text]))),
    CONSTRAINT saas_support_tickets_customer_satisfaction_rating_check CHECK (((customer_satisfaction_rating >= 1) AND (customer_satisfaction_rating <= 5))),
    CONSTRAINT saas_support_tickets_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text]))),
    CONSTRAINT saas_support_tickets_status_check CHECK ((status = ANY (ARRAY['open'::text, 'assigned'::text, 'in_progress'::text, 'waiting_customer'::text, 'resolved'::text, 'closed'::text])))
);

-- Table: saas_support_messages
CREATE TABLE IF NOT EXISTS public.saas_support_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    message text NOT NULL,
    is_internal boolean DEFAULT false,
    is_from_customer boolean DEFAULT false,
    sender_id uuid,
    sender_name text NOT NULL,
    sender_email text NOT NULL,
    attachments jsonb DEFAULT '[]'::jsonb,
    message_type text DEFAULT 'message'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT saas_support_messages_message_type_check CHECK ((message_type = ANY (ARRAY['message'::text, 'note'::text, 'status_change'::text, 'assignment'::text, 'resolution'::text])))
);

-- Table: saas_support_templates
CREATE TABLE IF NOT EXISTS public.saas_support_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    subject text,
    content text NOT NULL,
    category text,
    variables jsonb DEFAULT '[]'::jsonb,
    usage_count integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- ========================================
-- Comments
-- ========================================

COMMENT ON TABLE public.support_categories IS 'Categories for organizing support tickets';
COMMENT ON COLUMN public.support_categories.branch_id IS 'Sucursal a la que pertenece la categoría. NULL para categorías globales.';

COMMENT ON TABLE public.support_tickets IS 'Customer support tickets with full lifecycle tracking';
COMMENT ON COLUMN public.support_tickets.branch_id IS 'Sucursal a la que pertenece el ticket de soporte. NULL para tickets legacy.';

COMMENT ON TABLE public.support_messages IS 'Messages and conversation history for support tickets';

COMMENT ON TABLE public.support_templates IS 'Reusable templates for common support responses';

COMMENT ON TABLE public.optical_internal_support_tickets IS 'Internal support tickets for ópticas to track issues with their customers. Separate from SaaS support and customer support.';
COMMENT ON COLUMN public.optical_internal_support_tickets.ticket_number IS 'Unique ticket identifier in format OPT-YYYYMMDD-XXXXX';
COMMENT ON COLUMN public.optical_internal_support_tickets.organization_id IS 'Organization that owns this ticket. Ensures tickets are isolated by organization.';
COMMENT ON COLUMN public.optical_internal_support_tickets.branch_id IS 'Branch where the issue occurred (optional)';
COMMENT ON COLUMN public.optical_internal_support_tickets.customer_id IS 'Customer related to this issue';
COMMENT ON COLUMN public.optical_internal_support_tickets.created_by_user_id IS 'Employee/vendedor who created the ticket';
COMMENT ON COLUMN public.optical_internal_support_tickets.resolution_notes IS 'Notes about how the issue was resolved';

COMMENT ON TABLE public.optical_internal_support_messages IS 'Messages and conversation history for optical internal support tickets';
COMMENT ON COLUMN public.optical_internal_support_messages.is_internal IS 'If true, message is internal note not visible to customer';

COMMENT ON TABLE public.saas_support_tickets IS 'SaaS support tickets: Organizations contacting Opttius for technical support';
COMMENT ON COLUMN public.saas_support_tickets.ticket_number IS 'Unique ticket identifier in format SAAS-YYYYMMDD-XXXXX';
COMMENT ON COLUMN public.saas_support_tickets.organization_id IS 'Organization that created the ticket (NULL for public tickets)';
COMMENT ON COLUMN public.saas_support_tickets.created_by_user_id IS 'User who created the ticket (NULL for public tickets)';
COMMENT ON COLUMN public.saas_support_tickets.requester_email IS 'Email of the person requesting support';
COMMENT ON COLUMN public.saas_support_tickets.requester_role IS 'Role of the requester within their organization';

COMMENT ON TABLE public.saas_support_messages IS 'Messages and conversation history for SaaS support tickets';
COMMENT ON COLUMN public.saas_support_messages.is_internal IS 'If true, message is internal note not visible to customer';
COMMENT ON COLUMN public.saas_support_messages.is_from_customer IS 'If true, message is from customer/organization';

COMMENT ON TABLE public.saas_support_templates IS 'Reusable templates for common SaaS support responses';

-- ========================================
-- Row Level Security
-- ========================================

ALTER TABLE public.support_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optical_internal_support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optical_internal_support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_support_templates ENABLE ROW LEVEL SECURITY;

-- ========================================
-- Triggers
-- ========================================

CREATE TRIGGER update_support_categories_updated_at BEFORE UPDATE ON public.support_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_set_ticket_number BEFORE INSERT ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.set_ticket_number();
CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_update_ticket_timestamps AFTER INSERT ON public.support_messages FOR EACH ROW EXECUTE FUNCTION public.update_ticket_timestamps();
CREATE TRIGGER update_support_messages_updated_at BEFORE UPDATE ON public.support_messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_support_templates_updated_at BEFORE UPDATE ON public.support_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_optical_internal_ticket_number_trigger BEFORE INSERT ON public.optical_internal_support_tickets FOR EACH ROW EXECUTE FUNCTION public.set_optical_internal_ticket_number();
CREATE TRIGGER update_optical_internal_support_tickets_updated_at BEFORE UPDATE ON public.optical_internal_support_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_update_optical_internal_ticket_timestamps AFTER INSERT ON public.optical_internal_support_messages FOR EACH ROW EXECUTE FUNCTION public.update_optical_internal_ticket_timestamps();
CREATE TRIGGER update_optical_internal_support_messages_updated_at BEFORE UPDATE ON public.optical_internal_support_messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_saas_ticket_number_trigger BEFORE INSERT ON public.saas_support_tickets FOR EACH ROW EXECUTE FUNCTION public.set_saas_ticket_number();
CREATE TRIGGER update_saas_support_tickets_updated_at BEFORE UPDATE ON public.saas_support_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_saas_support_messages_updated_at BEFORE UPDATE ON public.saas_support_messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_saas_support_templates_updated_at BEFORE UPDATE ON public.saas_support_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- Constraints (PK, UNIQUE)
-- ========================================

ALTER TABLE public.support_categories
    ADD CONSTRAINT support_categories_pkey PRIMARY KEY (id);

ALTER TABLE public.support_tickets
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);

ALTER TABLE public.support_tickets
    ADD CONSTRAINT support_tickets_ticket_number_key UNIQUE (ticket_number);

ALTER TABLE public.support_messages
    ADD CONSTRAINT support_messages_pkey PRIMARY KEY (id);

ALTER TABLE public.support_templates
    ADD CONSTRAINT support_templates_pkey PRIMARY KEY (id);

ALTER TABLE public.optical_internal_support_tickets
    ADD CONSTRAINT optical_internal_support_tickets_pkey PRIMARY KEY (id);

ALTER TABLE public.optical_internal_support_tickets
    ADD CONSTRAINT optical_internal_support_tickets_ticket_number_key UNIQUE (ticket_number);

ALTER TABLE public.optical_internal_support_messages
    ADD CONSTRAINT optical_internal_support_messages_pkey PRIMARY KEY (id);

ALTER TABLE public.saas_support_tickets
    ADD CONSTRAINT saas_support_tickets_pkey PRIMARY KEY (id);

ALTER TABLE public.saas_support_tickets
    ADD CONSTRAINT saas_support_tickets_ticket_number_key UNIQUE (ticket_number);

ALTER TABLE public.saas_support_messages
    ADD CONSTRAINT saas_support_messages_pkey PRIMARY KEY (id);

ALTER TABLE public.saas_support_templates
    ADD CONSTRAINT saas_support_templates_pkey PRIMARY KEY (id);

-- ========================================
-- Foreign Keys
-- ========================================

ALTER TABLE public.support_categories
    ADD CONSTRAINT support_categories_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;

ALTER TABLE public.support_tickets
    ADD CONSTRAINT support_tickets_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.admin_users(id) ON DELETE SET NULL;

ALTER TABLE public.support_tickets
    ADD CONSTRAINT support_tickets_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;

ALTER TABLE public.support_tickets
    ADD CONSTRAINT support_tickets_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.support_categories(id) ON DELETE SET NULL;

ALTER TABLE public.support_tickets
    ADD CONSTRAINT support_tickets_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.support_tickets
    ADD CONSTRAINT support_tickets_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;

ALTER TABLE public.support_tickets
    ADD CONSTRAINT support_tickets_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.admin_users(id) ON DELETE SET NULL;

ALTER TABLE public.support_messages
    ADD CONSTRAINT support_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.support_messages
    ADD CONSTRAINT support_messages_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON DELETE CASCADE;

ALTER TABLE public.support_templates
    ADD CONSTRAINT support_templates_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.support_categories(id) ON DELETE SET NULL;

ALTER TABLE public.support_templates
    ADD CONSTRAINT support_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admin_users(id) ON DELETE SET NULL;

ALTER TABLE public.optical_internal_support_tickets
    ADD CONSTRAINT optical_internal_support_tickets_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.admin_users(id) ON DELETE SET NULL;

ALTER TABLE public.optical_internal_support_tickets
    ADD CONSTRAINT optical_internal_support_tickets_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;

ALTER TABLE public.optical_internal_support_tickets
    ADD CONSTRAINT optical_internal_support_tickets_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;

ALTER TABLE public.optical_internal_support_tickets
    ADD CONSTRAINT optical_internal_support_tickets_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;

ALTER TABLE public.optical_internal_support_tickets
    ADD CONSTRAINT optical_internal_support_tickets_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.optical_internal_support_tickets
    ADD CONSTRAINT optical_internal_support_tickets_related_appointment_id_fkey FOREIGN KEY (related_appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL;

ALTER TABLE public.optical_internal_support_tickets
    ADD CONSTRAINT optical_internal_support_tickets_related_order_id_fkey FOREIGN KEY (related_order_id) REFERENCES public.orders(id) ON DELETE SET NULL;

ALTER TABLE public.optical_internal_support_tickets
    ADD CONSTRAINT optical_internal_support_tickets_related_quote_id_fkey FOREIGN KEY (related_quote_id) REFERENCES public.quotes(id) ON DELETE SET NULL;

ALTER TABLE public.optical_internal_support_tickets
    ADD CONSTRAINT optical_internal_support_tickets_related_work_order_id_fkey FOREIGN KEY (related_work_order_id) REFERENCES public.lab_work_orders(id) ON DELETE SET NULL;

ALTER TABLE public.optical_internal_support_tickets
    ADD CONSTRAINT optical_internal_support_tickets_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.admin_users(id) ON DELETE SET NULL;

ALTER TABLE public.optical_internal_support_messages
    ADD CONSTRAINT optical_internal_support_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;

ALTER TABLE public.optical_internal_support_messages
    ADD CONSTRAINT optical_internal_support_messages_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.optical_internal_support_tickets(id) ON DELETE CASCADE;

ALTER TABLE public.saas_support_tickets
    ADD CONSTRAINT saas_support_tickets_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.admin_users(id) ON DELETE SET NULL;

ALTER TABLE public.saas_support_tickets
    ADD CONSTRAINT saas_support_tickets_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;

ALTER TABLE public.saas_support_tickets
    ADD CONSTRAINT saas_support_tickets_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;

ALTER TABLE public.saas_support_tickets
    ADD CONSTRAINT saas_support_tickets_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.admin_users(id) ON DELETE SET NULL;

ALTER TABLE public.saas_support_messages
    ADD CONSTRAINT saas_support_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;

ALTER TABLE public.saas_support_messages
    ADD CONSTRAINT saas_support_messages_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.saas_support_tickets(id) ON DELETE CASCADE;

ALTER TABLE public.saas_support_templates
    ADD CONSTRAINT saas_support_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admin_users(id) ON DELETE SET NULL;

-- ========================================
-- Policies
-- ========================================

-- support_categories
CREATE POLICY "Admin users can manage support categories" ON public.support_categories USING ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.is_active = true)))));
CREATE POLICY "Admins can delete support categories in their branches" ON public.support_categories FOR DELETE USING ((public.is_super_admin(auth.uid()) OR ((branch_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.admin_branch_access aba
  WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = support_categories.branch_id)))))));
CREATE POLICY "Admins can insert support categories in their branches" ON public.support_categories FOR INSERT WITH CHECK ((public.is_super_admin(auth.uid()) OR ((branch_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.admin_branch_access aba
  WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = support_categories.branch_id)))))));
CREATE POLICY "Admins can update support categories in their branches" ON public.support_categories FOR UPDATE USING ((public.is_super_admin(auth.uid()) OR ((branch_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.admin_branch_access aba
  WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = support_categories.branch_id)))))));
CREATE POLICY "Admins can view support categories in their branches" ON public.support_categories FOR SELECT USING ((public.is_super_admin(auth.uid()) OR ((branch_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.admin_branch_access aba
  WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = support_categories.branch_id)))))));

-- support_tickets
CREATE POLICY "Admin users can manage tickets" ON public.support_tickets USING ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.is_active = true)))));
CREATE POLICY "Admin users can view all tickets" ON public.support_tickets FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.is_active = true)))));
CREATE POLICY "Admins can delete support tickets in their branches" ON public.support_tickets FOR DELETE USING ((public.is_super_admin(auth.uid()) OR ((branch_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.admin_branch_access aba
  WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = support_tickets.branch_id)))))));
CREATE POLICY "Admins can insert support tickets in their branches" ON public.support_tickets FOR INSERT WITH CHECK ((public.is_super_admin(auth.uid()) OR ((branch_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.admin_branch_access aba
  WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = support_tickets.branch_id)))))));
CREATE POLICY "Admins can update support tickets in their branches" ON public.support_tickets FOR UPDATE USING ((public.is_super_admin(auth.uid()) OR ((branch_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.admin_branch_access aba
  WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = support_tickets.branch_id)))))));
CREATE POLICY "Admins can view support tickets in their branches" ON public.support_tickets FOR SELECT USING ((public.is_super_admin(auth.uid()) OR ((branch_id IS NULL) OR (EXISTS ( SELECT 1
   FROM public.admin_branch_access aba
  WHERE ((aba.admin_user_id = auth.uid()) AND (aba.branch_id = support_tickets.branch_id)))))));
CREATE POLICY "Customers can create tickets" ON public.support_tickets FOR INSERT WITH CHECK ((customer_id = auth.uid()));
CREATE POLICY "Customers can view own tickets" ON public.support_tickets FOR SELECT USING ((customer_id = auth.uid()));

-- support_messages
CREATE POLICY "Admin users can manage messages" ON public.support_messages USING ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.is_active = true)))));
CREATE POLICY "Admin users can view all messages" ON public.support_messages FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.is_active = true)))));
CREATE POLICY "Customers can create messages in own tickets" ON public.support_messages FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM public.support_tickets st
  WHERE ((st.id = support_messages.ticket_id) AND (st.customer_id = auth.uid())))) AND (sender_id = auth.uid()) AND (NOT is_internal)));
CREATE POLICY "Customers can view messages in own tickets" ON public.support_messages FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.support_tickets st
  WHERE ((st.id = support_messages.ticket_id) AND (st.customer_id = auth.uid())))) AND (NOT is_internal)));

-- support_templates
CREATE POLICY "Admin users can manage templates" ON public.support_templates USING ((EXISTS ( SELECT 1
   FROM public.admin_users au
  WHERE ((au.id = auth.uid()) AND (au.is_active = true)))));

-- optical_internal_support_tickets
CREATE POLICY "Users can create tickets for their organization" ON public.optical_internal_support_tickets FOR INSERT WITH CHECK (((organization_id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid())
 LIMIT 1)) AND ((branch_id IS NULL) OR (branch_id IN ( SELECT get_user_branches.branch_id
   FROM public.get_user_branches(auth.uid()) get_user_branches(branch_id, branch_name, branch_code, role, is_primary))))));
CREATE POLICY "Users can update their organization tickets" ON public.optical_internal_support_tickets FOR UPDATE USING (((organization_id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid())
 LIMIT 1)) AND (public.is_super_admin(auth.uid()) OR ((branch_id IS NULL) OR (branch_id IN ( SELECT get_user_branches.branch_id
   FROM public.get_user_branches(auth.uid()) get_user_branches(branch_id, branch_name, branch_code, role, is_primary)))))));
CREATE POLICY "Users can view their organization tickets" ON public.optical_internal_support_tickets FOR SELECT USING (((organization_id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid())
 LIMIT 1)) AND (public.is_super_admin(auth.uid()) OR ((branch_id IS NULL) OR (branch_id IN ( SELECT get_user_branches.branch_id
   FROM public.get_user_branches(auth.uid()) get_user_branches(branch_id, branch_name, branch_code, role, is_primary)))))));

-- optical_internal_support_messages
CREATE POLICY "Users can create messages in their organization tickets" ON public.optical_internal_support_messages FOR INSERT WITH CHECK ((ticket_id IN ( SELECT optical_internal_support_tickets.id
   FROM public.optical_internal_support_tickets
  WHERE (optical_internal_support_tickets.organization_id = ( SELECT admin_users.organization_id
           FROM public.admin_users
          WHERE (admin_users.id = auth.uid())
         LIMIT 1)))));
CREATE POLICY "Users can update their organization ticket messages" ON public.optical_internal_support_messages FOR UPDATE USING ((ticket_id IN ( SELECT optical_internal_support_tickets.id
   FROM public.optical_internal_support_tickets
  WHERE (optical_internal_support_tickets.organization_id = ( SELECT admin_users.organization_id
           FROM public.admin_users
          WHERE (admin_users.id = auth.uid())
         LIMIT 1)))));
CREATE POLICY "Users can view their organization ticket messages" ON public.optical_internal_support_messages FOR SELECT USING ((ticket_id IN ( SELECT optical_internal_support_tickets.id
   FROM public.optical_internal_support_tickets
  WHERE (optical_internal_support_tickets.organization_id = ( SELECT admin_users.organization_id
           FROM public.admin_users
          WHERE (admin_users.id = auth.uid())
         LIMIT 1)))));

-- saas_support_tickets
CREATE POLICY "Organizations can create tickets" ON public.saas_support_tickets FOR INSERT WITH CHECK (((organization_id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid())
 LIMIT 1)) OR (organization_id IS NULL)));
CREATE POLICY "Organizations can update own tickets" ON public.saas_support_tickets FOR UPDATE USING ((organization_id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid())
 LIMIT 1))) WITH CHECK ((organization_id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid())
 LIMIT 1)));
CREATE POLICY "Organizations can view own tickets" ON public.saas_support_tickets FOR SELECT USING ((organization_id = ( SELECT admin_users.organization_id
   FROM public.admin_users
  WHERE (admin_users.id = auth.uid())
 LIMIT 1)));
CREATE POLICY "Root users can manage all tickets" ON public.saas_support_tickets USING (public.is_root_user(auth.uid())) WITH CHECK (public.is_root_user(auth.uid()));
CREATE POLICY "Root users can view all tickets" ON public.saas_support_tickets FOR SELECT USING (public.is_root_user(auth.uid()));

-- saas_support_messages
CREATE POLICY "Organizations can create messages in own tickets" ON public.saas_support_messages FOR INSERT WITH CHECK (((ticket_id IN ( SELECT saas_support_tickets.id
   FROM public.saas_support_tickets
  WHERE (saas_support_tickets.organization_id = ( SELECT admin_users.organization_id
           FROM public.admin_users
          WHERE (admin_users.id = auth.uid())
         LIMIT 1)))) AND (is_from_customer = true)));
CREATE POLICY "Organizations can view own ticket messages" ON public.saas_support_messages FOR SELECT USING (((ticket_id IN ( SELECT saas_support_tickets.id
   FROM public.saas_support_tickets
  WHERE (saas_support_tickets.organization_id = ( SELECT admin_users.organization_id
           FROM public.admin_users
          WHERE (admin_users.id = auth.uid())
         LIMIT 1)))) AND (is_internal = false)));
CREATE POLICY "Root users can manage all messages" ON public.saas_support_messages USING (public.is_root_user(auth.uid())) WITH CHECK (public.is_root_user(auth.uid()));
CREATE POLICY "Root users can view all messages" ON public.saas_support_messages FOR SELECT USING (public.is_root_user(auth.uid()));

-- saas_support_templates
CREATE POLICY "Root users can manage templates" ON public.saas_support_templates USING (public.is_root_user(auth.uid())) WITH CHECK (public.is_root_user(auth.uid()));
CREATE POLICY "Root users can view templates" ON public.saas_support_templates FOR SELECT USING (public.is_root_user(auth.uid()));

-- ========================================
-- Indexes
-- ========================================

CREATE INDEX IF NOT EXISTS idx_support_categories_branch_id ON public.support_categories USING btree (branch_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON public.support_tickets USING btree (assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_branch_id ON public.support_tickets USING btree (branch_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON public.support_tickets USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_support_tickets_customer_id ON public.support_tickets USING btree (customer_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON public.support_tickets USING btree (priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets USING btree (status);
CREATE INDEX IF NOT EXISTS idx_support_messages_created_at ON public.support_messages USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_support_messages_sender_id ON public.support_messages USING btree (sender_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON public.support_messages USING btree (ticket_id);
CREATE INDEX IF NOT EXISTS idx_optical_internal_support_tickets_assigned_to ON public.optical_internal_support_tickets USING btree (assigned_to);
CREATE INDEX IF NOT EXISTS idx_optical_internal_support_tickets_branch ON public.optical_internal_support_tickets USING btree (branch_id);
CREATE INDEX IF NOT EXISTS idx_optical_internal_support_tickets_created_at ON public.optical_internal_support_tickets USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_optical_internal_support_tickets_customer ON public.optical_internal_support_tickets USING btree (customer_id);
CREATE INDEX IF NOT EXISTS idx_optical_internal_support_tickets_organization ON public.optical_internal_support_tickets USING btree (organization_id);
CREATE INDEX IF NOT EXISTS idx_optical_internal_support_tickets_priority ON public.optical_internal_support_tickets USING btree (priority);
CREATE INDEX IF NOT EXISTS idx_optical_internal_support_tickets_status ON public.optical_internal_support_tickets USING btree (status);
CREATE INDEX IF NOT EXISTS idx_optical_internal_support_tickets_ticket_number ON public.optical_internal_support_tickets USING btree (ticket_number);
CREATE INDEX IF NOT EXISTS idx_optical_internal_support_messages_ticket ON public.optical_internal_support_messages USING btree (ticket_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saas_support_tickets_assigned_to ON public.saas_support_tickets USING btree (assigned_to);
CREATE INDEX IF NOT EXISTS idx_saas_support_tickets_created_at ON public.saas_support_tickets USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saas_support_tickets_organization ON public.saas_support_tickets USING btree (organization_id);
CREATE INDEX IF NOT EXISTS idx_saas_support_tickets_priority ON public.saas_support_tickets USING btree (priority);
CREATE INDEX IF NOT EXISTS idx_saas_support_tickets_status ON public.saas_support_tickets USING btree (status);
CREATE INDEX IF NOT EXISTS idx_saas_support_tickets_ticket_number ON public.saas_support_tickets USING btree (ticket_number);
CREATE INDEX IF NOT EXISTS idx_saas_support_messages_ticket ON public.saas_support_messages USING btree (ticket_id, created_at DESC);

COMMIT;
