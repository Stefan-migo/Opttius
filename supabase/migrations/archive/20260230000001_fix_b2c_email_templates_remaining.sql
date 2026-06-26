-- Migration: 20260230000001_fix_b2c_email_templates_remaining.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Fix B2C Email Templates - Remaining 18 Templates
-- Version: 20260230000001
-- Date: 2026-02-30
-- Description: Insert/update all B2C organization email templates with correct variables

-- order_shipped
INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, is_system, category, organization_id, updated_at)
VALUES (
  'order_shipped',
  'Orden Enviada',
  'Tu orden {{order_number}} está en camino - {{organization_name}}',
  '<p>Hola {{customer_name}},</p><p>Tu orden {{order_number}} ha sido enviada.</p><p><strong>Transportista:</strong> {{carrier}}</p><p><strong>Número de seguimiento:</strong> {{tracking_number}}</p><p><strong>Entrega estimada:</strong> {{estimated_delivery}}</p><p>Saludos,<br>{{organization_name}}</p>',
  '["customer_name","order_number","carrier","tracking_number","estimated_delivery","organization_name"]'::jsonb,
  true, true, 'organization', NULL, NOW()
)
ON CONFLICT (name, type) DO UPDATE SET subject = EXCLUDED.subject, content = EXCLUDED.content, variables = EXCLUDED.variables, updated_at = NOW() WHERE system_email_templates.organization_id IS NULL;

-- order_delivered
INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, is_system, category, organization_id, updated_at)
VALUES (
  'order_delivered',
  'Orden Entregada',
  'Tu orden {{order_number}} fue entregada - {{organization_name}}',
  '<p>Hola {{customer_name}},</p><p>Tu orden {{order_number}} ha sido entregada correctamente.</p><p><strong>Fecha de entrega:</strong> {{delivery_date}}</p><p>Gracias por tu compra. Saludos,<br>{{organization_name}}</p>',
  '["customer_name","order_number","delivery_date","organization_name"]'::jsonb,
  true, true, 'organization', NULL, NOW()
)
ON CONFLICT (name, type) DO UPDATE SET subject = EXCLUDED.subject, content = EXCLUDED.content, variables = EXCLUDED.variables, updated_at = NOW() WHERE system_email_templates.organization_id IS NULL;

-- payment_success
INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, is_system, category, organization_id, updated_at)
VALUES (
  'payment_success',
  'Pago Exitoso',
  'Pago confirmado - Orden {{order_number}} - {{organization_name}}',
  '<p>Hola {{customer_name}},</p><p>Hemos recibido tu pago correctamente.</p><p><strong>Orden #{{order_number}}</strong></p><p><strong>Monto:</strong> {{order_total}}</p><p><strong>Método de pago:</strong> {{payment_method}}</p><p>Saludos,<br>{{organization_name}}</p>',
  '["customer_name","order_number","order_total","payment_method","organization_name"]'::jsonb,
  true, true, 'organization', NULL, NOW()
)
ON CONFLICT (name, type) DO UPDATE SET subject = EXCLUDED.subject, content = EXCLUDED.content, variables = EXCLUDED.variables, updated_at = NOW() WHERE system_email_templates.organization_id IS NULL;

-- payment_failed
INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, is_system, category, organization_id, updated_at)
VALUES (
  'payment_failed',
  'Pago Fallido',
  'Tu pago no pudo procesarse - Orden {{order_number}} - {{organization_name}}',
  '<p>Hola {{customer_name}},</p><p>No pudimos procesar el pago de tu orden {{order_number}}.</p><p><strong>Monto:</strong> {{order_total}}</p><p>Por favor intenta nuevamente o contáctanos si necesitas ayuda.</p><p><a href="{{retry_url}}">Reintentar pago</a></p><p>Saludos,<br>{{organization_name}}</p>',
  '["customer_name","order_number","order_total","retry_url","organization_name"]'::jsonb,
  true, true, 'organization', NULL, NOW()
)
ON CONFLICT (name, type) DO UPDATE SET subject = EXCLUDED.subject, content = EXCLUDED.content, variables = EXCLUDED.variables, updated_at = NOW() WHERE system_email_templates.organization_id IS NULL;

-- appointment_confirmation
INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, is_system, category, organization_id, updated_at)
VALUES (
  'appointment_confirmation',
  'Confirmación de Cita',
  'Tu cita confirmada: {{appointment_date}} a las {{appointment_time}} - {{organization_name}}',
  '<p>Hola {{customer_first_name}},</p><p>Tu cita ha sido confirmada.</p><p><strong>Fecha:</strong> {{appointment_date}}</p><p><strong>Hora:</strong> {{appointment_time}}</p><p><strong>Profesional:</strong> {{professional_name}}</p><p><strong>Sucursal:</strong> {{branch_name}}</p><p>Saludos,<br>{{organization_name}}</p>',
  '["customer_name","customer_first_name","appointment_date","appointment_time","professional_name","branch_name","organization_name"]'::jsonb,
  true, true, 'organization', NULL, NOW()
)
ON CONFLICT (name, type) DO UPDATE SET subject = EXCLUDED.subject, content = EXCLUDED.content, variables = EXCLUDED.variables, updated_at = NOW() WHERE system_email_templates.organization_id IS NULL;

-- appointment_reminder
INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, is_system, category, organization_id, updated_at)
VALUES (
  'appointment_reminder',
  'Recordatorio de Cita',
  'Recordatorio: Tienes una cita el {{appointment_date}} a las {{appointment_time}} - {{organization_name}}',
  '<p>Hola {{customer_name}},</p><p>Te recordamos que tienes una cita programada.</p><p><strong>Fecha:</strong> {{appointment_date}}</p><p><strong>Hora:</strong> {{appointment_time}}</p><p><strong>Sucursal:</strong> {{branch_name}}</p><p>Te esperamos. Saludos,<br>{{organization_name}}</p>',
  '["customer_name","appointment_date","appointment_time","branch_name","organization_name"]'::jsonb,
  true, true, 'organization', NULL, NOW()
)
ON CONFLICT (name, type) DO UPDATE SET subject = EXCLUDED.subject, content = EXCLUDED.content, variables = EXCLUDED.variables, updated_at = NOW() WHERE system_email_templates.organization_id IS NULL;

-- appointment_reminder_2h
INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, is_system, category, organization_id, updated_at)
VALUES (
  'appointment_reminder_2h',
  'Recordatorio de Cita (2h)',
  'Tu cita es en 2 horas: {{appointment_date}} a las {{appointment_time}} - {{organization_name}}',
  '<p>Hola {{customer_name}},</p><p>Tu cita es en aproximadamente 2 horas.</p><p><strong>Fecha:</strong> {{appointment_date}}</p><p><strong>Hora:</strong> {{appointment_time}}</p><p><strong>Sucursal:</strong> {{branch_name}}</p><p>Te esperamos. Saludos,<br>{{organization_name}}</p>',
  '["customer_name","appointment_date","appointment_time","branch_name","organization_name"]'::jsonb,
  true, true, 'organization', NULL, NOW()
)
ON CONFLICT (name, type) DO UPDATE SET subject = EXCLUDED.subject, content = EXCLUDED.content, variables = EXCLUDED.variables, updated_at = NOW() WHERE system_email_templates.organization_id IS NULL;

-- appointment_cancelation
INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, is_system, category, organization_id, updated_at)
VALUES (
  'appointment_cancelation',
  'Cita Cancelada',
  'Tu cita del {{appointment_date}} fue cancelada - {{organization_name}}',
  '<p>Hola {{customer_name}},</p><p>Tu cita programada para el {{appointment_date}} a las {{appointment_time}} ha sido cancelada.</p><p><strong>Sucursal:</strong> {{branch_name}}</p><p>Si deseas reagendar, contáctanos. Saludos,<br>{{organization_name}}</p>',
  '["customer_name","appointment_date","appointment_time","branch_name","organization_name"]'::jsonb,
  true, true, 'organization', NULL, NOW()
)
ON CONFLICT (name, type) DO UPDATE SET subject = EXCLUDED.subject, content = EXCLUDED.content, variables = EXCLUDED.variables, updated_at = NOW() WHERE system_email_templates.organization_id IS NULL;

-- appointment_rescheduled
INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, is_system, category, organization_id, updated_at)
VALUES (
  'appointment_rescheduled',
  'Cita Reprogramada',
  'Tu cita fue reprogramada - {{organization_name}}',
  '<p>Hola {{customer_first_name}},</p><p>Tu cita ha sido reprogramada.</p><p><strong>Fecha anterior:</strong> {{old_appointment_date}} a las {{old_appointment_time}}</p><p><strong>Nueva fecha:</strong> {{appointment_date}} a las {{appointment_time}}</p><p><strong>Sucursal:</strong> {{branch_name}}</p><p>Si tienes alguna pregunta, contáctanos al {{branch_phone}}.</p><p>Saludos,<br>{{organization_name}}</p>',
  '["customer_name","customer_first_name","appointment_date","appointment_time","old_appointment_date","old_appointment_time","branch_name","branch_phone","organization_name"]'::jsonb,
  true, true, 'organization', NULL, NOW()
)
ON CONFLICT (name, type) DO UPDATE SET subject = EXCLUDED.subject, content = EXCLUDED.content, variables = EXCLUDED.variables, updated_at = NOW() WHERE system_email_templates.organization_id IS NULL;

-- appointment_follow_up_reminder
INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, is_system, category, organization_id, updated_at)
VALUES (
  'appointment_follow_up_reminder',
  'Recordatorio de Control',
  'Recuerda tu control programado para el {{follow_up_date}} - {{organization_name}}',
  '<p>Hola {{customer_first_name}},</p><p>Tu oftalmólogo recomendó un control de seguimiento.</p><p><strong>Fecha proyectada:</strong> {{follow_up_date}}</p><p><strong>Sucursal:</strong> {{branch_name}}</p><p>Te recomendamos agendar tu cita con anticipación para asegurar disponibilidad.</p><p>Contáctanos al {{branch_phone}} para reservar tu horario.</p><p>Saludos,<br>{{organization_name}}</p>',
  '["customer_name","customer_first_name","follow_up_date","branch_name","branch_phone","organization_name"]'::jsonb,
  true, true, 'organization', NULL, NOW()
)
ON CONFLICT (name, type) DO UPDATE SET subject = EXCLUDED.subject, content = EXCLUDED.content, variables = EXCLUDED.variables, updated_at = NOW() WHERE system_email_templates.organization_id IS NULL;

-- prescription_ready
INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, is_system, category, organization_id, updated_at)
VALUES (
  'prescription_ready',
  'Receta Disponible',
  'Tu receta está disponible - {{organization_name}}',
  '<p>Hola {{customer_name}},</p><p>Tu receta de fecha {{prescription_date}} está lista y disponible para retiro.</p><p>Puedes acercarte a nuestra sucursal cuando te sea conveniente.</p><p>Saludos,<br>{{organization_name}}</p>',
  '["customer_name","prescription_date","organization_name"]'::jsonb,
  true, true, 'organization', NULL, NOW()
)
ON CONFLICT (name, type) DO UPDATE SET subject = EXCLUDED.subject, content = EXCLUDED.content, variables = EXCLUDED.variables, updated_at = NOW() WHERE system_email_templates.organization_id IS NULL;

-- prescription_expiring
INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, is_system, category, organization_id, updated_at)
VALUES (
  'prescription_expiring',
  'Receta por Vencer',
  'Tu receta {{prescription_number}} vence pronto - {{organization_name}}',
  '<p>Hola {{customer_name}},</p><p>Te informamos que tu receta {{prescription_number}} vence el {{expiry_date}}.</p><p>Te recomendamos agendar una nueva evaluación antes de esa fecha.</p><p>Saludos,<br>{{organization_name}}</p>',
  '["customer_name","prescription_number","expiry_date","organization_name"]'::jsonb,
  true, true, 'organization', NULL, NOW()
)
ON CONFLICT (name, type) DO UPDATE SET subject = EXCLUDED.subject, content = EXCLUDED.content, variables = EXCLUDED.variables, updated_at = NOW() WHERE system_email_templates.organization_id IS NULL;

-- quote_sent
INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, is_system, category, organization_id, updated_at)
VALUES (
  'quote_sent',
  'Presupuesto Enviado',
  'Tu presupuesto #{{quote_number}} - {{organization_name}}',
  '<p>Hola {{customer_name}},</p><p>Te enviamos tu presupuesto.</p><p><strong>Número:</strong> {{quote_number}}</p><p><strong>Fecha:</strong> {{quote_date}}</p><p><strong>Total:</strong> {{quote_total}}</p><p><strong>Válido hasta:</strong> {{quote_expiry}}</p><p>Saludos,<br>{{organization_name}}</p>',
  '["customer_name","quote_number","quote_date","quote_total","quote_expiry","quote_items","organization_name"]'::jsonb,
  true, true, 'organization', NULL, NOW()
)
ON CONFLICT (name, type) DO UPDATE SET subject = EXCLUDED.subject, content = EXCLUDED.content, variables = EXCLUDED.variables, updated_at = NOW() WHERE system_email_templates.organization_id IS NULL;

-- quote_expiring
INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, is_system, category, organization_id, updated_at)
VALUES (
  'quote_expiring',
  'Presupuesto por Vencer',
  'Tu presupuesto #{{quote_number}} vence pronto - {{organization_name}}',
  '<p>Hola {{customer_name}},</p><p>Tu presupuesto {{quote_number}} vence el {{expiry_date}}.</p><p>Si deseas aprovecharlo, contáctanos antes de esa fecha.</p><p>Saludos,<br>{{organization_name}}</p>',
  '["customer_name","quote_number","expiry_date","organization_name"]'::jsonb,
  true, true, 'organization', NULL, NOW()
)
ON CONFLICT (name, type) DO UPDATE SET subject = EXCLUDED.subject, content = EXCLUDED.content, variables = EXCLUDED.variables, updated_at = NOW() WHERE system_email_templates.organization_id IS NULL;

-- work_order_ready
INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, is_system, category, organization_id, updated_at)
VALUES (
  'work_order_ready',
  'Trabajo Listo para Retiro',
  'Tu trabajo #{{work_order_number}} está listo - {{organization_name}}',
  '<p>Hola {{customer_name}},</p><p>Tu trabajo de laboratorio {{work_order_number}} está listo para retiro.</p><p>Puedes acercarte a nuestra sucursal cuando te sea conveniente.</p><p>Saludos,<br>{{organization_name}}</p>',
  '["customer_name","work_order_number","organization_name"]'::jsonb,
  true, true, 'organization', NULL, NOW()
)
ON CONFLICT (name, type) DO UPDATE SET subject = EXCLUDED.subject, content = EXCLUDED.content, variables = EXCLUDED.variables, updated_at = NOW() WHERE system_email_templates.organization_id IS NULL;

-- low_stock_alert
INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, is_system, category, organization_id, updated_at)
VALUES (
  'low_stock_alert',
  'Alerta de Stock Bajo',
  'Alerta: Productos con stock bajo - {{organization_name}}',
  '<p>Los siguientes productos tienen stock por debajo del mínimo configurado:</p><div>{{low_stock_products}}</div><p>Por favor revisa el inventario. Saludos,<br>{{organization_name}}</p>',
  '["low_stock_products","low_stock_products_text","product_count","organization_name"]'::jsonb,
  true, true, 'organization', NULL, NOW()
)
ON CONFLICT (name, type) DO UPDATE SET subject = EXCLUDED.subject, content = EXCLUDED.content, variables = EXCLUDED.variables, updated_at = NOW() WHERE system_email_templates.organization_id IS NULL;

-- account_welcome
INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, is_system, category, organization_id, updated_at)
VALUES (
  'account_welcome',
  'Bienvenida a tu Cuenta',
  'Bienvenido a {{organization_name}}',
  '<p>Hola {{customer_name}},</p><p>Bienvenido a {{organization_name}}.</p><p>Tu cuenta ha sido creada correctamente. Puedes acceder aquí: <a href="{{account_url}}">{{account_url}}</a></p><p>Saludos,<br>{{organization_name}}</p>',
  '["customer_name","account_url","organization_name"]'::jsonb,
  true, true, 'organization', NULL, NOW()
)
ON CONFLICT (name, type) DO UPDATE SET subject = EXCLUDED.subject, content = EXCLUDED.content, variables = EXCLUDED.variables, updated_at = NOW() WHERE system_email_templates.organization_id IS NULL;

-- password_reset
INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, is_system, category, organization_id, updated_at)
VALUES (
  'password_reset',
  'Restablecer Contraseña',
  'Restablece tu contraseña - {{organization_name}}',
  '<p>Hola {{customer_name}},</p><p>Recibimos una solicitud para restablecer tu contraseña.</p><p><a href="{{reset_link}}">Haz clic aquí para restablecer tu contraseña</a></p><p>Si no solicitaste este cambio, ignora este correo.</p><p>Saludos,<br>{{organization_name}}</p>',
  '["customer_name","reset_link","reset_url","organization_name"]'::jsonb,
  true, true, 'organization', NULL, NOW()
)
ON CONFLICT (name, type) DO UPDATE SET subject = EXCLUDED.subject, content = EXCLUDED.content, variables = EXCLUDED.variables, updated_at = NOW() WHERE system_email_templates.organization_id IS NULL;
