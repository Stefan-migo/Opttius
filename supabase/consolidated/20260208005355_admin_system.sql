-- Consolidated Migration: admin_system
-- Generated: Sun, Feb  8, 2026 12:53:55 AM
-- Original files: 6

-- === Source: 20250116000000_setup_admin_users.sql ===
-- Create admin users management system
-- This migration sets up proper admin user management for DA LUZ CONSCIENTE

-- Create admin_users table
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'store_manager' CHECK (role IN ('super_admin', 'store_manager', 'customer_support', 'content_manager')),
  permissions JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES public.admin_users(id)
);

-- Create admin activity log table
CREATE TABLE IF NOT EXISTS public.admin_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admin_users
CREATE POLICY "Admin users can view admin users" ON public.admin_users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au 
      WHERE au.id = auth.uid() 
      AND au.is_active = true
    )
  );

CREATE POLICY "Super admins can manage admin users" ON public.admin_users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au 
      WHERE au.id = auth.uid() 
      AND au.role = 'super_admin' 
      AND au.is_active = true
    )
  );

-- Create RLS policies for admin_activity_log
CREATE POLICY "Admin users can view activity log" ON public.admin_activity_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au 
      WHERE au.id = auth.uid() 
      AND au.is_active = true
    )
  );

CREATE POLICY "Admin users can insert activity log" ON public.admin_activity_log
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users au 
      WHERE au.id = auth.uid() 
      AND au.is_active = true
    )
  );

-- Create indexes for performance
CREATE INDEX idx_admin_users_email ON public.admin_users(email);
CREATE INDEX idx_admin_users_role ON public.admin_users(role);
CREATE INDEX idx_admin_users_active ON public.admin_users(is_active);
CREATE INDEX idx_admin_activity_admin_user ON public.admin_activity_log(admin_user_id);
CREATE INDEX idx_admin_activity_created_at ON public.admin_activity_log(created_at);

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE id = user_id 
    AND is_active = true
  );
END;
$$;

-- Function to get admin role
CREATE OR REPLACE FUNCTION public.get_admin_role(user_id UUID DEFAULT auth.uid())
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_role TEXT;
BEGIN
  SELECT role INTO admin_role
  FROM public.admin_users 
  WHERE id = user_id 
  AND is_active = true;
  
  RETURN admin_role;
END;
$$;

-- Function to log admin activity
CREATE OR REPLACE FUNCTION public.log_admin_activity(
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  activity_id UUID;
BEGIN
  -- Only log if user is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admin users can log activities';
  END IF;

  INSERT INTO public.admin_activity_log (
    admin_user_id,
    action,
    resource_type,
    resource_id,
    details
  ) VALUES (
    auth.uid(),
    p_action,
    p_resource_type,
    p_resource_id,
    p_details
  ) RETURNING id INTO activity_id;

  RETURN activity_id;
END;
$$;

-- Grant admin access to daluzalkimya@gmail.com
-- This will be executed after the user signs up/exists in auth.users
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Get the user ID for daluzalkimya@gmail.com if it exists
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'daluzalkimya@gmail.com';
  
  -- If user exists, make them super admin
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO public.admin_users (
      id,
      email,
      role,
      permissions,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      admin_user_id,
      'daluzalkimya@gmail.com',
      'super_admin',
      '{
        "orders": ["read", "create", "update", "delete"],
        "products": ["read", "create", "update", "delete"],
        "customers": ["read", "create", "update", "delete"],
        "analytics": ["read"],
        "settings": ["read", "create", "update", "delete"],
        "admin_users": ["read", "create", "update", "delete"]
      }'::jsonb,
      true,
      NOW(),
      NOW()
    ) ON CONFLICT (id) DO UPDATE SET
      role = 'super_admin',
      permissions = '{
        "orders": ["read", "create", "update", "delete"],
        "products": ["read", "create", "update", "delete"],
        "customers": ["read", "create", "update", "delete"],
        "analytics": ["read"],
        "settings": ["read", "create", "update", "delete"],
        "admin_users": ["read", "create", "update", "delete"]
      }'::jsonb,
      is_active = true,
      updated_at = NOW();
      
    RAISE NOTICE 'Admin access granted to daluzalkimya@gmail.com';
  ELSE
    RAISE NOTICE 'User daluzalkimya@gmail.com not found in auth.users yet. Admin access will be granted when they sign up.';
  END IF;
END $$;

-- Function to automatically grant admin access when daluzalkimya@gmail.com signs up
CREATE OR REPLACE FUNCTION public.handle_new_admin_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if this is the designated admin email
  IF NEW.email = 'daluzalkimya@gmail.com' THEN
    INSERT INTO public.admin_users (
      id,
      email,
      role,
      permissions,
      is_active,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      NEW.email,
      'super_admin',
      '{
        "orders": ["read", "create", "update", "delete"],
        "products": ["read", "create", "update", "delete"],
        "customers": ["read", "create", "update", "delete"],
        "analytics": ["read"],
        "settings": ["read", "create", "update", "delete"],
        "admin_users": ["read", "create", "update", "delete"]
      }'::jsonb,
      true,
      NOW(),
      NOW()
    ) ON CONFLICT (id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user admin setup
DROP TRIGGER IF EXISTS trigger_handle_new_admin_user ON auth.users;
CREATE TRIGGER trigger_handle_new_admin_user
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_admin_user();

-- Update existing profile if user already exists
-- First check what membership tiers are allowed
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Get the user ID for daluzalkimya@gmail.com if it exists
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'daluzalkimya@gmail.com';
  
  -- If user exists, update their profile with an allowed membership tier
  IF admin_user_id IS NOT NULL THEN
    -- Try to update with existing allowed values first
    UPDATE public.profiles 
    SET 
      membership_tier = COALESCE(membership_tier, 'premium'),
      updated_at = NOW()
    WHERE id = admin_user_id;
    
    RAISE NOTICE 'Profile updated for daluzalkimya@gmail.com';
  END IF;
END $$;

COMMENT ON TABLE public.admin_users IS 'Administrative users with access to admin dashboard';
COMMENT ON TABLE public.admin_activity_log IS 'Log of all administrative actions for audit purposes';
COMMENT ON FUNCTION public.is_admin IS 'Check if a user has admin privileges';
COMMENT ON FUNCTION public.get_admin_role IS 'Get the admin role of a user';
COMMENT ON FUNCTION public.log_admin_activity IS 'Log administrative actions for audit trail';

-- === End of 20250116000000_setup_admin_users.sql ===

-- === Source: 20250116000001_fix_admin_profile.sql ===
-- Fix admin profile for daluzalkimya@gmail.com
-- This migration fixes the profiles table constraint issue

-- Check current constraint on profiles table
DO $$
BEGIN
  -- Check if we need to add 'admin' to the membership_tier constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'profiles_membership_tier_check' 
    AND check_clause LIKE '%admin%'
  ) THEN
    -- Drop existing constraint if it exists
    BEGIN
      ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_membership_tier_check;
      
      -- Add new constraint that includes 'admin'
      ALTER TABLE public.profiles ADD CONSTRAINT profiles_membership_tier_check 
        CHECK (membership_tier IN ('basic', 'premium', 'vip', 'admin'));
        
      RAISE NOTICE 'Updated membership_tier constraint to include admin';
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Could not update constraint, will use alternative approach';
    END;
  END IF;
END $$;

-- Now safely update the profile for daluzalkimya@gmail.com
DO $$
DECLARE
  admin_user_id UUID;
  current_tier TEXT;
BEGIN
  -- Get the user ID for daluzalkimya@gmail.com
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'daluzalkimya@gmail.com';
  
  IF admin_user_id IS NOT NULL THEN
    -- Get current membership tier
    SELECT membership_tier INTO current_tier
    FROM public.profiles 
    WHERE id = admin_user_id;
    
    -- Try to update with 'admin' first, fallback to 'premium' if constraint fails
    BEGIN
      UPDATE public.profiles 
      SET 
        membership_tier = 'admin',
        updated_at = NOW()
      WHERE id = admin_user_id;
      
      RAISE NOTICE 'Successfully set membership_tier to admin for daluzalkimya@gmail.com';
    EXCEPTION
      WHEN check_violation THEN
        -- Fallback: use premium tier and note the admin status is in admin_users table
        UPDATE public.profiles 
        SET 
          membership_tier = 'premium',
          updated_at = NOW()
        WHERE id = admin_user_id;
        
        RAISE NOTICE 'Set membership_tier to premium for daluzalkimya@gmail.com (admin status tracked in admin_users table)';
    END;
    
    -- Verify admin_users entry exists
    IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE id = admin_user_id) THEN
      -- Create admin user entry if somehow missing
      INSERT INTO public.admin_users (
        id,
        email,
        role,
        permissions,
        is_active,
        created_at,
        updated_at
      ) VALUES (
        admin_user_id,
        'daluzalkimya@gmail.com',
        'super_admin',
        '{
          "orders": ["read", "create", "update", "delete"],
          "products": ["read", "create", "update", "delete"],
          "customers": ["read", "create", "update", "delete"],
          "analytics": ["read"],
          "settings": ["read", "create", "update", "delete"],
          "admin_users": ["read", "create", "update", "delete"]
        }'::jsonb,
        true,
        NOW(),
        NOW()
      );
      
      RAISE NOTICE 'Created admin_users entry for daluzalkimya@gmail.com';
    ELSE
      RAISE NOTICE 'Admin user entry already exists for daluzalkimya@gmail.com';
    END IF;
    
    -- Test admin functions
    DECLARE
      is_admin_result BOOLEAN;
      admin_role_result TEXT;
    BEGIN
      SELECT public.is_admin(admin_user_id) INTO is_admin_result;
      SELECT public.get_admin_role(admin_user_id) INTO admin_role_result;
      
      RAISE NOTICE 'Admin verification: is_admin=%, role=%', is_admin_result, admin_role_result;
    END;
    
  ELSE
    RAISE NOTICE 'User daluzalkimya@gmail.com not found in auth.users';
  END IF;
END $$;

-- Create a view for easy admin user management (with correct column names)
CREATE OR REPLACE VIEW public.admin_users_view AS
SELECT 
  au.id,
  au.email,
  au.role,
  au.is_active,
  au.created_at,
  au.last_login,
  CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')) as full_name,
  p.membership_tier as profile_tier
FROM public.admin_users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE au.is_active = true;

COMMENT ON VIEW public.admin_users_view IS 'Convenient view for admin user management';

-- Grant access to view for authenticated users (will be filtered by RLS)
GRANT SELECT ON public.admin_users_view TO authenticated;

-- Final notice
DO $$
BEGIN
  RAISE NOTICE 'Admin profile setup completed for daluzalkimya@gmail.com';
END $$;

-- === End of 20250116000001_fix_admin_profile.sql ===

-- === Source: 20250116000003_fix_admin_rls.sql ===
-- Fix infinite recursion in admin_users RLS policies
-- This migration fixes the circular dependency in admin table policies

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admin users can view admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Super admins can manage admin users" ON public.admin_users;
DROP POLICY IF EXISTS "Admin users can view activity log" ON public.admin_activity_log;
DROP POLICY IF EXISTS "Admin users can insert activity log" ON public.admin_activity_log;

-- Create simpler policies that don't cause recursion
-- Allow authenticated users to read their own admin record
CREATE POLICY "Users can view own admin record" ON public.admin_users
  FOR SELECT USING (id = auth.uid());

-- Allow service role to manage admin users (for admin functions)
CREATE POLICY "Service role can manage admin users" ON public.admin_users
  FOR ALL USING (auth.role() = 'service_role');

-- Allow authenticated users to read admin activity logs (for audit)
CREATE POLICY "Users can view admin activity logs" ON public.admin_activity_log
  FOR SELECT USING (admin_user_id = auth.uid());

-- Allow service role to manage activity logs (for admin functions)
CREATE POLICY "Service role can manage activity logs" ON public.admin_activity_log
  FOR ALL USING (auth.role() = 'service_role');

-- Update the is_admin function to bypass RLS completely
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_exists BOOLEAN := FALSE;
BEGIN
  -- Use direct query with explicit schema to bypass RLS
  EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I.%I WHERE id = $1 AND is_active = true)', 
    'public', 'admin_users') 
  INTO admin_exists 
  USING user_id;
  
  RETURN admin_exists;
END;
$$;

-- Update the get_admin_role function to bypass RLS completely
CREATE OR REPLACE FUNCTION public.get_admin_role(user_id UUID DEFAULT auth.uid())
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_role TEXT;
BEGIN
  -- Use direct query with explicit schema to bypass RLS
  EXECUTE format('SELECT role FROM %I.%I WHERE id = $1 AND is_active = true', 
    'public', 'admin_users') 
  INTO admin_role 
  USING user_id;
  
  RETURN admin_role;
END;
$$;

-- Grant necessary permissions to authenticated users for the functions
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_admin_activity(TEXT, TEXT, TEXT, JSONB) TO authenticated;

COMMENT ON POLICY "Users can view own admin record" ON public.admin_users IS 'Allow users to view their own admin record to avoid recursion';
COMMENT ON POLICY "Service role can manage admin users" ON public.admin_users IS 'Allow service role full access for admin functions';

-- === End of 20250116000003_fix_admin_rls.sql ===

-- === Source: 20250116200000_create_support_system.sql ===
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

-- === End of 20250116200000_create_support_system.sql ===

-- === Source: 20250116210000_create_system_admin_tools.sql ===
-- Create system administration tools
-- This migration sets up system-wide email templates, configuration, and maintenance tools

-- Create system email templates table
CREATE TABLE IF NOT EXISTS public.system_email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'order_confirmation',
    'order_shipped', 
    'order_delivered',
    'password_reset',
    'account_welcome',
    'membership_welcome',
    'membership_reminder',
    'low_stock_alert',
    'marketing',
    'custom'
  )),
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb, -- Available template variables
  
  -- Template status
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false, -- System templates cannot be deleted
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Creator
  created_by UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(name, type)
);

-- Create system configuration table
CREATE TABLE IF NOT EXISTS public.system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT UNIQUE NOT NULL,
  config_value JSONB NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  is_public BOOLEAN DEFAULT false, -- Can be accessed by non-admin users
  is_sensitive BOOLEAN DEFAULT false, -- Requires extra permissions to view/edit
  
  -- Validation
  value_type TEXT DEFAULT 'string' CHECK (value_type IN ('string', 'number', 'boolean', 'json', 'array')),
  validation_rules JSONB, -- JSON schema for validation
  
  -- Modification tracking
  last_modified_by UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create system maintenance logs table
CREATE TABLE IF NOT EXISTS public.system_maintenance_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type TEXT NOT NULL CHECK (task_type IN (
    'backup',
    'cleanup',
    'migration',
    'optimization',
    'security_scan',
    'health_check',
    'update',
    'custom'
  )),
  task_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  
  -- Task details
  description TEXT,
  parameters JSONB,
  
  -- Execution info
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  
  -- Results
  result_data JSONB,
  error_message TEXT,
  
  -- Execution context
  executed_by UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  automated BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create system health metrics table
CREATE TABLE IF NOT EXISTS public.system_health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_value DECIMAL(12,4) NOT NULL,
  metric_unit TEXT, -- 'count', 'percentage', 'seconds', 'bytes', etc.
  
  -- Categorization
  category TEXT NOT NULL DEFAULT 'general',
  subcategory TEXT,
  
  -- Alerting
  threshold_warning DECIMAL(12,4),
  threshold_critical DECIMAL(12,4),
  is_healthy BOOLEAN DEFAULT true,
  
  -- Metadata
  metadata JSONB,
  collected_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Retention (for cleanup)
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

-- Enable RLS
ALTER TABLE public.system_email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_maintenance_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_health_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for system_email_templates
CREATE POLICY "Admin users can manage email templates" ON public.system_email_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au 
      WHERE au.id = auth.uid() 
      AND au.is_active = true
    )
  );

-- Create RLS policies for system_config
CREATE POLICY "Admin users can view all config" ON public.system_config
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au 
      WHERE au.id = auth.uid() 
      AND au.is_active = true
    )
  );

CREATE POLICY "Super admin can manage sensitive config" ON public.system_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au 
      WHERE au.id = auth.uid() 
      AND au.role = 'super_admin'
      AND au.is_active = true
    )
    OR NOT is_sensitive
  );

-- Create RLS policies for system_maintenance_log
CREATE POLICY "Admin users can view maintenance logs" ON public.system_maintenance_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au 
      WHERE au.id = auth.uid() 
      AND au.is_active = true
    )
  );

CREATE POLICY "Admin users can create maintenance logs" ON public.system_maintenance_log
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users au 
      WHERE au.id = auth.uid() 
      AND au.is_active = true
    )
  );

-- Create RLS policies for system_health_metrics
CREATE POLICY "Admin users can view health metrics" ON public.system_health_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au 
      WHERE au.id = auth.uid() 
      AND au.is_active = true
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_system_email_templates_type ON public.system_email_templates(type);
CREATE INDEX idx_system_email_templates_active ON public.system_email_templates(is_active);
CREATE INDEX idx_system_config_category ON public.system_config(category);
CREATE INDEX idx_system_config_key ON public.system_config(config_key);
CREATE INDEX idx_system_maintenance_log_type ON public.system_maintenance_log(task_type);
CREATE INDEX idx_system_maintenance_log_status ON public.system_maintenance_log(status);
CREATE INDEX idx_system_maintenance_log_created_at ON public.system_maintenance_log(created_at);
CREATE INDEX idx_system_health_metrics_name ON public.system_health_metrics(metric_name);
CREATE INDEX idx_system_health_metrics_category ON public.system_health_metrics(category);
CREATE INDEX idx_system_health_metrics_collected_at ON public.system_health_metrics(collected_at);
CREATE INDEX idx_system_health_metrics_expires_at ON public.system_health_metrics(expires_at);

-- Apply updated_at trigger to all system tables
CREATE TRIGGER update_system_email_templates_updated_at
  BEFORE UPDATE ON public.system_email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_config_updated_at
  BEFORE UPDATE ON public.system_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_maintenance_log_updated_at
  BEFORE UPDATE ON public.system_maintenance_log
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default system email templates
INSERT INTO public.system_email_templates (name, type, subject, content, variables, is_system) VALUES
  (
    'Confirmación de Pedido',
    'order_confirmation',
    'Confirmación de tu pedido {{order_number}} - DA LUZ CONSCIENTE',
    '<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #8B4513;">¡Gracias por tu pedido!</h1>
    
    <p>Hola {{customer_name}},</p>
    
    <p>Hemos recibido tu pedido y lo estamos procesando. Aquí tienes los detalles:</p>
    
    <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <h3>Pedido #{{order_number}}</h3>
      <p><strong>Fecha:</strong> {{order_date}}</p>
      <p><strong>Total:</strong> {{order_total}}</p>
    </div>
    
    <h3>Productos:</h3>
    {{order_items}}
    
    <p>Te enviaremos otra confirmación cuando tu pedido sea enviado.</p>
    
    <p>Gracias por elegir DA LUZ CONSCIENTE para tu transformación natural.</p>
    
    <p>Saludos,<br>Equipo DA LUZ CONSCIENTE</p>
  </div>
</body>
</html>',
    '["customer_name", "order_number", "order_date", "order_total", "order_items"]'::jsonb,
    true
  ),
  (
    'Pedido Enviado',
    'order_shipped',
    'Tu pedido {{order_number}} ha sido enviado',
    '<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #8B4513;">¡Tu pedido está en camino!</h1>
    
    <p>Hola {{customer_name}},</p>
    
    <p>Nos complace informarte que tu pedido #{{order_number}} ha sido enviado.</p>
    
    <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <h3>Información de Envío</h3>
      <p><strong>Transportista:</strong> {{carrier}}</p>
      <p><strong>Número de seguimiento:</strong> {{tracking_number}}</p>
      <p><strong>Fecha estimada de entrega:</strong> {{estimated_delivery}}</p>
    </div>
    
    <p>Puedes rastrear tu pedido usando el número de seguimiento proporcionado.</p>
    
    <p>Gracias por tu paciencia y por elegir DA LUZ CONSCIENTE.</p>
    
    <p>Saludos,<br>Equipo DA LUZ CONSCIENTE</p>
  </div>
</body>
</html>',
    '["customer_name", "order_number", "carrier", "tracking_number", "estimated_delivery"]'::jsonb,
    true
  ),
  (
    'Bienvenida Membresía',
    'membership_welcome',
    '¡Bienvenida a tu transformación de 7 meses! 🌟',
    '<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #8B4513;">¡Bienvenida a DA LUZ CONSCIENTE!</h1>
    
    <p>Querida {{customer_name}},</p>
    
    <p>¡Estamos emocionados de tenerte en nuestro programa de transformación de 7 meses!</p>
    
    <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
      <h3>Tu Membresía {{membership_tier}}</h3>
      <p><strong>Fecha de inicio:</strong> {{membership_start_date}}</p>
      <p><strong>Duración:</strong> 7 meses</p>
    </div>
    
    <h3>¿Qué sigue?</h3>
    <ul>
      <li>Accede a tu área personal en nuestra plataforma</li>
      <li>Descarga tu guía de inicio</li>
      <li>Comienza con la semana 1 de tu transformación</li>
    </ul>
    
    <p>Recuerda que estamos aquí para acompañarte en cada paso de tu viaje hacia una vida más consciente y natural.</p>
    
    <p>Con amor y luz,<br>Equipo DA LUZ CONSCIENTE</p>
  </div>
</body>
</html>',
    '["customer_name", "membership_tier", "membership_start_date"]'::jsonb,
    true
  ),
  (
    'Alerta Stock Bajo',
    'low_stock_alert',
    'Alerta: Stock bajo en productos - DA LUZ CONSCIENTE',
    '<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #DC2626;">⚠️ Alerta de Stock Bajo</h1>
    
    <p>Los siguientes productos tienen stock bajo y requieren atención:</p>
    
    <div style="background: #FEF2F2; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #DC2626;">
      {{low_stock_products}}
    </div>
    
    <p>Por favor, revisa el inventario y considera realizar pedidos de reposición.</p>
    
    <p>Saludos,<br>Sistema de Gestión DA LUZ CONSCIENTE</p>
  </div>
</body>
</html>',
    '["low_stock_products"]'::jsonb,
    true
  )
ON CONFLICT DO NOTHING;

-- Insert default system configuration
INSERT INTO public.system_config (config_key, config_value, description, category, is_public, value_type) VALUES
  ('site_name', '"DA LUZ CONSCIENTE"', 'Nombre del sitio web', 'general', true, 'string'),
  ('site_description', '"Biocosmética consciente y transformación natural"', 'Descripción del sitio', 'general', true, 'string'),
  ('contact_email', '"info@daluzconsciente.com"', 'Email de contacto principal', 'contact', true, 'string'),
  ('support_email', '"soporte@daluzconsciente.com"', 'Email de soporte al cliente', 'contact', true, 'string'),
  ('phone_number', '"+54 11 1234-5678"', 'Número de teléfono principal', 'contact', true, 'string'),
  ('address', '"Buenos Aires, Argentina"', 'Dirección física', 'contact', true, 'string'),
  
  ('currency', '"ARS"', 'Moneda por defecto', 'ecommerce', false, 'string'),
  ('tax_rate', '21.0', 'Tasa de impuesto (IVA)', 'ecommerce', false, 'number'),
  ('shipping_cost', '500.0', 'Costo de envío por defecto', 'ecommerce', false, 'number'),
  ('free_shipping_threshold', '5000.0', 'Monto mínimo para envío gratis', 'ecommerce', true, 'number'),
  
  ('low_stock_threshold', '5', 'Umbral para alertas de stock bajo', 'inventory', false, 'number'),
  ('auto_low_stock_alerts', 'true', 'Enviar alertas automáticas de stock bajo', 'inventory', false, 'boolean'),
  
  ('membership_trial_days', '7', 'Días de prueba para membresías', 'membership', false, 'number'),
  ('membership_reminder_days', '3', 'Días antes del vencimiento para recordatorios', 'membership', false, 'number'),
  
  ('smtp_host', '""', 'Servidor SMTP para emails', 'email', false, 'string'),
  ('smtp_port', '587', 'Puerto SMTP', 'email', false, 'number'),
  ('smtp_username', '""', 'Usuario SMTP', 'email', false, 'string'),
  ('smtp_password', '""', 'Contraseña SMTP', 'email', false, 'string'),
  
  ('maintenance_mode', 'false', 'Activar modo mantenimiento', 'system', false, 'boolean'),
  ('maintenance_message', '"Estamos realizando mejoras en el sitio. Volveremos pronto."', 'Mensaje durante mantenimiento', 'system', false, 'string'),
  ('max_upload_size', '10485760', 'Tamaño máximo de archivo (bytes)', 'system', false, 'number'),
  ('session_timeout', '3600', 'Tiempo de sesión en segundos', 'system', false, 'number')
ON CONFLICT DO NOTHING;

-- Create function to collect basic health metrics
CREATE OR REPLACE FUNCTION collect_system_health_metrics()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Clear old metrics (keep last 30 days)
  DELETE FROM public.system_health_metrics 
  WHERE collected_at < NOW() - INTERVAL '30 days';
  
  -- Collect database metrics
  INSERT INTO public.system_health_metrics (metric_name, metric_value, metric_unit, category)
  SELECT 
    'database_size_mb',
    pg_database_size(current_database()) / 1024.0 / 1024.0,
    'megabytes',
    'database';
    
  INSERT INTO public.system_health_metrics (metric_name, metric_value, metric_unit, category)
  SELECT 
    'active_connections',
    count(*),
    'count',
    'database'
  FROM pg_stat_activity 
  WHERE state = 'active';
  
  -- Collect business metrics
  INSERT INTO public.system_health_metrics (metric_name, metric_value, metric_unit, category)
  SELECT 
    'total_products',
    count(*),
    'count',
    'business'
  FROM public.products 
  WHERE status = 'active';
  
  INSERT INTO public.system_health_metrics (metric_name, metric_value, metric_unit, category)
  SELECT 
    'total_orders_today',
    count(*),
    'count',
    'business'
  FROM public.orders 
  WHERE created_at >= CURRENT_DATE;
  
  INSERT INTO public.system_health_metrics (metric_name, metric_value, metric_unit, category)
  SELECT 
    'total_customers',
    count(*),
    'count',
    'business'
  FROM public.profiles;
  
  INSERT INTO public.system_health_metrics (metric_name, metric_value, metric_unit, category)
  SELECT 
    'low_stock_products',
    count(*),
    'count',
    'inventory'
  FROM public.products 
  WHERE inventory_quantity <= 5 AND track_inventory = true;
  
END;
$$;

COMMENT ON TABLE public.system_email_templates IS 'System-wide email templates for automated communications';
COMMENT ON TABLE public.system_config IS 'System configuration settings and parameters';
COMMENT ON TABLE public.system_maintenance_log IS 'Log of system maintenance tasks and operations';
COMMENT ON TABLE public.system_health_metrics IS 'System health and performance metrics over time';
COMMENT ON FUNCTION collect_system_health_metrics IS 'Collects basic system health metrics for monitoring';

-- === End of 20250116210000_create_system_admin_tools.sql ===

-- === Source: 20250118000000_create_admin_notifications.sql ===
-- Create admin notifications system
-- This migration sets up a notification system for admin users to receive important alerts

-- Create notification types enum
CREATE TYPE public.admin_notification_type AS ENUM (
  'order_new',
  'order_status_change',
  'low_stock',
  'out_of_stock',
  'new_customer',
  'new_review',
  'review_pending',
  'support_ticket_new',
  'support_ticket_update',
  'payment_received',
  'payment_failed',
  'system_alert',
  'system_update',
  'security_alert',
  'custom'
);

-- Create notification priority enum
CREATE TYPE public.admin_notification_priority AS ENUM (
  'low',
  'medium',
  'high',
  'urgent'
);

-- Create admin notifications table
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Notification details
  type admin_notification_type NOT NULL,
  priority admin_notification_priority DEFAULT 'medium',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Related entities
  related_entity_type TEXT, -- 'order', 'product', 'customer', 'review', 'ticket', etc.
  related_entity_id UUID,
  
  -- Link/Action
  action_url TEXT, -- URL to navigate to when clicked
  action_label TEXT, -- Button text like "Ver Pedido", "Revisar Stock"
  
  -- Metadata
  metadata JSONB, -- Additional data about the notification
  
  -- Status tracking
  is_read BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  
  -- Target recipients (null = all admins)
  target_admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  target_admin_role TEXT, -- 'super_admin', 'admin', 'manager', etc.
  
  -- Automatic expiration
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  
  -- Creator (system or specific admin)
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_system BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_admin_notifications_target ON public.admin_notifications(target_admin_id) WHERE target_admin_id IS NOT NULL;
CREATE INDEX idx_admin_notifications_type ON public.admin_notifications(type);
CREATE INDEX idx_admin_notifications_priority ON public.admin_notifications(priority);
CREATE INDEX idx_admin_notifications_unread ON public.admin_notifications(is_read) WHERE is_read = false;
CREATE INDEX idx_admin_notifications_created_at ON public.admin_notifications(created_at DESC);
CREATE INDEX idx_admin_notifications_expires_at ON public.admin_notifications(expires_at) WHERE expires_at IS NOT NULL;

-- Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admin_notifications
-- Admin users can view notifications targeted to them or all admins
CREATE POLICY "Admin users can view their notifications" ON public.admin_notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au 
      WHERE au.id = auth.uid() 
      AND au.is_active = true
    )
    AND (
      target_admin_id = auth.uid() 
      OR target_admin_id IS NULL
      OR target_admin_role IN (
        SELECT role FROM public.admin_users WHERE id = auth.uid()
      )
    )
  );

-- Admin users can mark their own notifications as read/archived
CREATE POLICY "Admin users can update their notifications" ON public.admin_notifications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au 
      WHERE au.id = auth.uid() 
      AND au.is_active = true
    )
    AND (target_admin_id = auth.uid() OR target_admin_id IS NULL)
  );

-- Super admin can manage all notifications
CREATE POLICY "Super admin can manage all notifications" ON public.admin_notifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users au 
      WHERE au.id = auth.uid() 
      AND au.role = 'super_admin'
      AND au.is_active = true
    )
  );

-- Create function to automatically create notification for new orders
CREATE OR REPLACE FUNCTION public.notify_admin_new_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create notification for non-draft orders
  IF NEW.status != 'draft' THEN
    INSERT INTO public.admin_notifications (
      type,
      priority,
      title,
      message,
      related_entity_type,
      related_entity_id,
      action_url,
      action_label,
      metadata,
      created_by_system
    ) VALUES (
      'order_new',
      'high',
      'Nuevo Pedido Recibido',
      'Pedido #' || NEW.order_number || ' - $' || NEW.total_amount::TEXT,
      'order',
      NEW.id,
      '/admin/orders',
      'Ver Pedido',
      jsonb_build_object(
        'order_number', NEW.order_number,
        'customer_email', NEW.email,
        'total_amount', NEW.total_amount,
        'status', NEW.status
      ),
      true
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new orders
DROP TRIGGER IF EXISTS trigger_notify_admin_new_order ON public.orders;
CREATE TRIGGER trigger_notify_admin_new_order
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_new_order();

-- Create function to notify about low stock
CREATE OR REPLACE FUNCTION public.notify_admin_low_stock()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if product went from above threshold to below
  IF (OLD.inventory_quantity > 5 AND NEW.inventory_quantity <= 5) 
     OR (OLD.inventory_quantity > 0 AND NEW.inventory_quantity = 0) THEN
    
    INSERT INTO public.admin_notifications (
      type,
      priority,
      title,
      message,
      related_entity_type,
      related_entity_id,
      action_url,
      action_label,
      metadata,
      created_by_system
    ) VALUES (
      CASE 
        WHEN NEW.inventory_quantity = 0 THEN 'out_of_stock'
        ELSE 'low_stock'
      END,
      CASE 
        WHEN NEW.inventory_quantity = 0 THEN 'urgent'
        ELSE 'high'
      END,
      CASE 
        WHEN NEW.inventory_quantity = 0 THEN 'Producto Agotado'
        ELSE 'Stock Bajo'
      END,
      NEW.name || ' - ' || CASE 
        WHEN NEW.inventory_quantity = 0 THEN 'Sin Stock'
        ELSE NEW.inventory_quantity::TEXT || ' unidades restantes'
      END,
      'product',
      NEW.id,
      '/admin/products',
      'Ver Producto',
      jsonb_build_object(
        'product_name', NEW.name,
        'current_stock', NEW.inventory_quantity,
        'product_slug', NEW.slug
      ),
      true
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for low stock
DROP TRIGGER IF EXISTS trigger_notify_admin_low_stock ON public.products;
CREATE TRIGGER trigger_notify_admin_low_stock
  AFTER UPDATE OF inventory_quantity ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_low_stock();

-- Create function to notify about new reviews
CREATE OR REPLACE FUNCTION public.notify_admin_new_review()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.admin_notifications (
    type,
    priority,
    title,
    message,
    related_entity_type,
    related_entity_id,
    action_url,
    action_label,
    metadata,
    created_by_system
  ) VALUES (
    'review_pending',
    'medium',
    'Nueva Reseña Pendiente',
    'Reseña de ' || COALESCE(NEW.reviewer_name, 'Cliente') || ' - ' || NEW.rating::TEXT || ' estrellas',
    'review',
    NEW.id,
    '/admin/reviews',
    'Moderar Reseña',
    jsonb_build_object(
      'product_id', NEW.product_id,
      'rating', NEW.rating,
      'reviewer_name', NEW.reviewer_name,
      'status', NEW.status
    ),
    true
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new reviews (only if table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'product_reviews'
  ) THEN
    DROP TRIGGER IF EXISTS trigger_notify_admin_new_review ON public.product_reviews;
    CREATE TRIGGER trigger_notify_admin_new_review
      AFTER INSERT ON public.product_reviews
      FOR EACH ROW
      WHEN (NEW.status = 'pending')
      EXECUTE FUNCTION public.notify_admin_new_review();
  END IF;
END $$;

-- Create function to clean up old notifications
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  -- Delete notifications older than their expiration date
  DELETE FROM public.admin_notifications
  WHERE expires_at IS NOT NULL 
    AND expires_at < NOW();
  
  -- Archive read notifications older than 90 days
  UPDATE public.admin_notifications
  SET is_archived = true
  WHERE is_read = true
    AND read_at < NOW() - INTERVAL '90 days'
    AND is_archived = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to mark notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_read(notification_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.admin_notifications
  SET 
    is_read = true,
    read_at = NOW(),
    updated_at = NOW()
  WHERE id = notification_id
    AND (target_admin_id = auth.uid() OR target_admin_id IS NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to mark all notifications as read
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS void AS $$
BEGIN
  UPDATE public.admin_notifications
  SET 
    is_read = true,
    read_at = NOW(),
    updated_at = NOW()
  WHERE is_read = false
    AND (target_admin_id = auth.uid() OR target_admin_id IS NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get unread notification count
CREATE OR REPLACE FUNCTION public.get_unread_notification_count(admin_user_id UUID DEFAULT auth.uid())
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM public.admin_notifications
    WHERE is_read = false
      AND is_archived = false
      AND (target_admin_id = admin_user_id OR target_admin_id IS NULL)
      AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.admin_notifications TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON public.admin_notifications TO authenticated;

-- Add comment
COMMENT ON TABLE public.admin_notifications IS 'Admin notification system for real-time alerts about orders, stock, reviews, and system events';


-- === End of 20250118000000_create_admin_notifications.sql ===

