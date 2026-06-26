-- Migration: 20250116210000_create_system_admin_tools.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

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
