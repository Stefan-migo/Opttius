-- Migration: Fix B2C Email Templates - Correct Variables & Create Missing
-- Version: 20260230000000
-- Date: 2026-02-30

DO $$
BEGIN
  INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, is_system, category, organization_id, updated_at)
  VALUES ('order_confirmation', 'Confirmación de Orden', 'Confirmación de tu orden {{order_number}} - {{organization_name}}', '<p>Hola {{customer_name}},</p><p>Hemos recibido tu orden.</p><p><strong>Orden #{{order_number}}</strong></p><p><strong>Fecha:</strong> {{order_date}}</p><p><strong>Total:</strong> {{order_total}}</p><p><strong>Método de pago:</strong> {{payment_method}}</p><div>{{order_items}}</div><p>Saludos,<br>{{organization_name}}</p>', '["customer_name","order_number","order_date","order_total","order_items","payment_method","order_items_text","organization_name"]'::jsonb, true, true, 'organization', NULL, NOW())
  ON CONFLICT (name, type) DO UPDATE SET subject = EXCLUDED.subject, content = EXCLUDED.content, variables = EXCLUDED.variables, updated_at = NOW() WHERE system_email_templates.organization_id IS NULL;
END $$;
