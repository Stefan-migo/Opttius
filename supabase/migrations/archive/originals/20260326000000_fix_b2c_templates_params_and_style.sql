-- Migration: 20260326000000_fix_b2c_templates_params_and_style.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Fix B2C Email Templates - Correct Params (customer_name) + Improved Epoch Style
-- Version: 20260326000000
-- Date: 2026-03-26
-- Description: Replace customer_first_name with customer_name in 9 templates,
--              improve HTML structure with Epoch palette (#1A2B23, #C5A059, #f8fafc),
--              info blocks, and inline styles for email client compatibility.

-- appointment_confirmation: customer_name + Epoch style
UPDATE system_email_templates
SET
  subject = '✅ Tu cita confirmada: {{appointment_date}} a las {{appointment_time}} - {{organization_name}}',
  content = '<div style="margin-bottom: 24px;"><p style="font-size: 18px; font-weight: 600; color: #0f172a; margin: 0 0 8px 0;">Hola {{customer_name}},</p><p style="margin: 0; color: #475569;">Tu cita ha sido confirmada.</p></div><div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0; border-left: 4px solid #1A2B23;"><p style="margin: 0 0 8px 0;"><strong>Fecha:</strong> {{appointment_date}}</p><p style="margin: 0 0 8px 0;"><strong>Hora:</strong> {{appointment_time}}</p><p style="margin: 0 0 8px 0;"><strong>Profesional:</strong> {{professional_name}}</p><p style="margin: 0 0 8px 0;"><strong>Tipo:</strong> {{appointment_type}}</p><p style="margin: 0;"><strong>Sucursal:</strong> {{branch_name}}</p></div><p style="margin: 24px 0 0 0; color: #64748b;">Te esperamos. Saludos,<br>{{organization_name}}</p>',
  variables = '["customer_name","appointment_date","appointment_time","professional_name","appointment_type","branch_name","organization_name"]'::jsonb,
  updated_at = NOW()
WHERE type = 'appointment_confirmation' AND organization_id IS NULL;

-- appointment_reminder: Epoch style
UPDATE system_email_templates
SET
  subject = 'Recordatorio: Tienes una cita el {{appointment_date}} a las {{appointment_time}} - {{organization_name}}',
  content = '<div style="margin-bottom: 24px;"><p style="font-size: 18px; font-weight: 600; color: #0f172a; margin: 0 0 8px 0;">Hola {{customer_name}},</p><p style="margin: 0; color: #475569;">Te recordamos que tienes una cita programada.</p></div><div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0; border-left: 4px solid #1A2B23;"><p style="margin: 0 0 8px 0;"><strong>Fecha:</strong> {{appointment_date}}</p><p style="margin: 0 0 8px 0;"><strong>Hora:</strong> {{appointment_time}}</p><p style="margin: 0;"><strong>Sucursal:</strong> {{branch_name}}</p></div><p style="margin: 24px 0 0 0; color: #64748b;">Te esperamos. Saludos,<br>{{organization_name}}</p>',
  variables = '["customer_name","appointment_date","appointment_time","branch_name","organization_name"]'::jsonb,
  updated_at = NOW()
WHERE type = 'appointment_reminder' AND organization_id IS NULL;

-- appointment_reminder_2h: customer_name + Epoch style (no appointment_date for 2h)
UPDATE system_email_templates
SET
  subject = 'Tu cita es en 2 horas: {{appointment_time}} - {{organization_name}}',
  content = '<div style="margin-bottom: 24px;"><p style="font-size: 18px; font-weight: 600; color: #0f172a; margin: 0 0 8px 0;">Hola {{customer_name}},</p><p style="margin: 0; color: #475569;">Tu cita es en aproximadamente 2 horas.</p></div><div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0; border-left: 4px solid #1A2B23;"><p style="margin: 0 0 8px 0;"><strong>Hora:</strong> {{appointment_time}}</p><p style="margin: 0 0 8px 0;"><strong>Profesional:</strong> {{professional_name}}</p><p style="margin: 0 0 8px 0;"><strong>Sucursal:</strong> {{branch_name}}</p><p style="margin: 0 0 8px 0;"><strong>Dirección:</strong> {{branch_address}}</p><p style="margin: 0;"><strong>Teléfono:</strong> {{branch_phone}}</p></div><p style="margin: 24px 0 0 0; color: #64748b;">Te esperamos. Saludos,<br>{{organization_name}}</p>',
  variables = '["customer_name","appointment_time","professional_name","branch_name","branch_address","branch_phone","organization_name"]'::jsonb,
  updated_at = NOW()
WHERE type = 'appointment_reminder_2h' AND organization_id IS NULL;

-- appointment_cancelation: customer_name + Epoch style
UPDATE system_email_templates
SET
  subject = 'Tu cita del {{appointment_date}} fue cancelada - {{organization_name}}',
  content = '<div style="margin-bottom: 24px;"><p style="font-size: 18px; font-weight: 600; color: #0f172a; margin: 0 0 8px 0;">Hola {{customer_name}},</p><p style="margin: 0; color: #475569;">Tu cita programada para el {{appointment_date}} a las {{appointment_time}} ha sido cancelada.</p></div><div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0; border-left: 4px solid #1A2B23;"><p style="margin: 0 0 8px 0;"><strong>Sucursal:</strong> {{branch_name}}</p><p style="margin: 0 0 8px 0;"><strong>Teléfono:</strong> {{branch_phone}}</p><p style="margin: 0;"><strong>Email:</strong> {{branch_email}}</p></div><p style="margin: 24px 0 0 0;">Si deseas reagendar, puedes hacerlo aquí: <a href="{{booking_url}}" style="display: inline-block; padding: 12px 24px; background: #1A2B23; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Agendar nueva cita</a></p><p style="margin: 24px 0 0 0; color: #64748b;">Saludos,<br>{{organization_name}}</p>',
  variables = '["customer_name","appointment_date","appointment_time","branch_name","branch_phone","branch_email","booking_url","organization_name"]'::jsonb,
  updated_at = NOW()
WHERE type = 'appointment_cancelation' AND organization_id IS NULL;

-- appointment_rescheduled: customer_name + Epoch style
UPDATE system_email_templates
SET
  subject = 'Tu cita fue reprogramada - {{organization_name}}',
  content = '<div style="margin-bottom: 24px;"><p style="font-size: 18px; font-weight: 600; color: #0f172a; margin: 0 0 8px 0;">Hola {{customer_name}},</p><p style="margin: 0; color: #475569;">Tu cita ha sido reprogramada.</p></div><div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0; border-left: 4px solid #1A2B23;"><p style="margin: 0 0 8px 0;"><strong>Fecha anterior:</strong> {{old_appointment_date}} a las {{old_appointment_time}}</p><p style="margin: 0 0 8px 0;"><strong>Nueva fecha:</strong> {{appointment_date}} a las {{appointment_time}}</p><p style="margin: 0;"><strong>Sucursal:</strong> {{branch_name}}</p></div><p style="margin: 24px 0 0 0; color: #64748b;">Si tienes alguna pregunta, contáctanos al {{branch_phone}}. Saludos,<br>{{organization_name}}</p>',
  variables = '["customer_name","appointment_date","appointment_time","old_appointment_date","old_appointment_time","branch_name","branch_phone","organization_name"]'::jsonb,
  updated_at = NOW()
WHERE type = 'appointment_rescheduled' AND organization_id IS NULL;

-- appointment_follow_up_reminder: customer_name + Epoch style
UPDATE system_email_templates
SET
  subject = 'Recuerda tu control programado para el {{follow_up_date}} - {{organization_name}}',
  content = '<div style="margin-bottom: 24px;"><p style="font-size: 18px; font-weight: 600; color: #0f172a; margin: 0 0 8px 0;">Hola {{customer_name}},</p><p style="margin: 0; color: #475569;">Tu oftalmólogo recomendó un control de seguimiento.</p></div><div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0; border-left: 4px solid #1A2B23;"><p style="margin: 0 0 8px 0;"><strong>Fecha proyectada:</strong> {{follow_up_date}}</p><p style="margin: 0;"><strong>Sucursal:</strong> {{branch_name}}</p></div><p style="margin: 24px 0 0 0;">Te recomendamos agendar tu cita con anticipación. Contáctanos al {{branch_phone}} o <a href="{{booking_url}}" style="display: inline-block; padding: 12px 24px; background: #1A2B23; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Agendar cita</a></p><p style="margin: 24px 0 0 0; color: #64748b;">Saludos,<br>{{organization_name}}</p>',
  variables = '["customer_name","follow_up_date","branch_name","branch_phone","booking_url","organization_name"]'::jsonb,
  updated_at = NOW()
WHERE type = 'appointment_follow_up_reminder' AND organization_id IS NULL;

-- prescription_ready: customer_name + Epoch style
UPDATE system_email_templates
SET
  subject = 'Tu receta está disponible - {{organization_name}}',
  content = '<div style="margin-bottom: 24px;"><p style="font-size: 18px; font-weight: 600; color: #0f172a; margin: 0 0 8px 0;">Hola {{customer_name}},</p><p style="margin: 0; color: #475569;">Tu receta de fecha {{prescription_date}} está lista y disponible para retiro.</p></div><div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0; border-left: 4px solid #1A2B23;"><p style="margin: 0 0 8px 0;"><strong>Número de receta:</strong> {{prescription_number}}</p><p style="margin: 0 0 8px 0;"><strong>Profesional:</strong> {{doctor_name}}</p><p style="margin: 0 0 8px 0;"><strong>Sucursal:</strong> {{branch_name}}</p><p style="margin: 0 0 8px 0;"><strong>Teléfono:</strong> {{branch_phone}}</p><p style="margin: 0;"><strong>Válida hasta:</strong> {{prescription_expiry_date}}</p></div><p style="margin: 24px 0 0 0; color: #64748b;">Puedes acercarte a nuestra sucursal cuando te sea conveniente. Saludos,<br>{{organization_name}}</p>',
  variables = '["customer_name","prescription_date","prescription_expiry_date","prescription_number","doctor_name","branch_name","branch_phone","prescription_url","organization_name"]'::jsonb,
  updated_at = NOW()
WHERE type = 'prescription_ready' AND organization_id IS NULL;

-- prescription_expiring: customer_name + Epoch style
UPDATE system_email_templates
SET
  subject = 'Tu receta {{prescription_number}} vence pronto - {{organization_name}}',
  content = '<div style="margin-bottom: 24px;"><p style="font-size: 18px; font-weight: 600; color: #0f172a; margin: 0 0 8px 0;">Hola {{customer_name}},</p><p style="margin: 0; color: #475569;">Te informamos que tu receta {{prescription_number}} vence el {{prescription_expiry_date}}.</p></div><div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0; border-left: 4px solid #1A2B23;"><p style="margin: 0 0 8px 0;"><strong>Sucursal:</strong> {{branch_name}}</p><p style="margin: 0 0 8px 0;"><strong>Dirección:</strong> {{branch_address}}</p><p style="margin: 0 0 8px 0;"><strong>Teléfono:</strong> {{branch_phone}}</p><p style="margin: 0;"><strong>Email:</strong> {{branch_email}}</p></div><p style="margin: 24px 0 0 0;">Te recomendamos agendar una nueva evaluación antes de esa fecha. <a href="{{booking_url}}" style="display: inline-block; padding: 12px 24px; background: #1A2B23; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Agendar cita</a></p><p style="margin: 24px 0 0 0; color: #64748b;">Saludos,<br>{{organization_name}}</p>',
  variables = '["customer_name","prescription_expiry_date","prescription_number","branch_name","branch_address","branch_phone","branch_email","booking_url","organization_name"]'::jsonb,
  updated_at = NOW()
WHERE type = 'prescription_expiring' AND organization_id IS NULL;

-- quote_sent: Epoch style
UPDATE system_email_templates
SET
  subject = 'Tu presupuesto #{{quote_number}} - {{organization_name}}',
  content = '<div style="margin-bottom: 24px;"><p style="font-size: 18px; font-weight: 600; color: #0f172a; margin: 0 0 8px 0;">Hola {{customer_name}},</p><p style="margin: 0; color: #475569;">Te enviamos tu presupuesto.</p></div><div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0; border-left: 4px solid #1A2B23;"><p style="margin: 0 0 8px 0;"><strong>Número:</strong> {{quote_number}}</p><p style="margin: 0 0 8px 0;"><strong>Fecha:</strong> {{quote_date}}</p><p style="margin: 0 0 8px 0;"><strong>Total:</strong> {{quote_total}}</p><p style="margin: 0;"><strong>Válido hasta:</strong> {{quote_expiry}}</p></div><div style="margin: 24px 0;">{{quote_items}}</div><p style="margin: 24px 0 0 0; color: #64748b;">Saludos,<br>{{organization_name}}</p>',
  variables = '["customer_name","quote_number","quote_date","quote_total","quote_expiry","quote_items","organization_name"]'::jsonb,
  updated_at = NOW()
WHERE type = 'quote_sent' AND organization_id IS NULL;

-- quote_expiring: customer_name + Epoch style
UPDATE system_email_templates
SET
  subject = 'Tu presupuesto #{{quote_number}} vence pronto - {{organization_name}}',
  content = '<div style="margin-bottom: 24px;"><p style="font-size: 18px; font-weight: 600; color: #0f172a; margin: 0 0 8px 0;">Hola {{customer_name}},</p><p style="margin: 0; color: #475569;">Tu presupuesto {{quote_number}} vence el {{quote_expiry_date}}.</p></div><div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0; border-left: 4px solid #1A2B23;"><p style="margin: 0;"><strong>Total:</strong> {{total}}</p></div><p style="margin: 24px 0 0 0;">Si deseas aprovecharlo, contáctanos antes de esa fecha.</p><p style="margin: 16px 0 0 0;"><a href="{{accept_url}}" style="display: inline-block; padding: 12px 24px; background: #1A2B23; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Aceptar presupuesto</a> <a href="{{quote_url}}" style="display: inline-block; padding: 12px 24px; background: #f1f5f9; color: #1e293b; text-decoration: none; border-radius: 8px; font-weight: 600; margin-left: 8px;">Ver presupuesto</a></p><p style="margin: 24px 0 0 0;"><strong>Teléfono:</strong> {{branch_phone}} | <strong>Email:</strong> {{branch_email}}</p><p style="margin: 24px 0 0 0; color: #64748b;">Saludos,<br>{{organization_name}}</p>',
  variables = '["customer_name","quote_number","quote_expiry_date","total","accept_url","quote_url","branch_phone","branch_email","organization_name"]'::jsonb,
  updated_at = NOW()
WHERE type = 'quote_expiring' AND organization_id IS NULL;

-- work_order_ready: customer_name + Epoch style
UPDATE system_email_templates
SET
  subject = 'Tu trabajo #{{work_order_number}} está listo - {{organization_name}}',
  content = '<div style="margin-bottom: 24px;"><p style="font-size: 18px; font-weight: 600; color: #0f172a; margin: 0 0 8px 0;">Hola {{customer_name}},</p><p style="margin: 0; color: #475569;">Tu trabajo de laboratorio {{work_order_number}} está listo para retiro.</p></div><p style="margin: 24px 0 0 0; color: #64748b;">Puedes acercarte a nuestra sucursal cuando te sea conveniente. Saludos,<br>{{organization_name}}</p>',
  variables = '["customer_name","work_order_number","organization_name"]'::jsonb,
  updated_at = NOW()
WHERE type = 'work_order_ready' AND organization_id IS NULL;

-- account_welcome: Epoch style
UPDATE system_email_templates
SET
  subject = 'Bienvenido a {{organization_name}}',
  content = '<div style="margin-bottom: 24px;"><p style="font-size: 18px; font-weight: 600; color: #0f172a; margin: 0 0 8px 0;">Hola {{customer_name}},</p><p style="margin: 0; color: #475569;">Bienvenido a nuestra óptica.</p></div><p style="margin: 24px 0 0 0;">Puedes acceder a tu cuenta aquí: <a href="{{account_url}}" style="display: inline-block; padding: 12px 24px; background: #1A2B23; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Mi cuenta</a></p><p style="margin: 24px 0 0 0; color: #64748b;">Saludos,<br>{{organization_name}}</p>',
  variables = '["customer_name","account_url","organization_name"]'::jsonb,
  updated_at = NOW()
WHERE type = 'account_welcome' AND organization_id IS NULL;

-- payment_failed: Epoch style
UPDATE system_email_templates
SET
  subject = 'Tu pago no pudo procesarse - Orden {{order_number}} - {{organization_name}}',
  content = '<div style="margin-bottom: 24px;"><p style="font-size: 18px; font-weight: 600; color: #0f172a; margin: 0 0 8px 0;">Hola {{customer_name}},</p><p style="margin: 0; color: #475569;">No pudimos procesar el pago de tu orden {{order_number}}.</p></div><div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0; border-left: 4px solid #dc2626;"><p style="margin: 0 0 8px 0;"><strong>Monto:</strong> {{amount}}</p><p style="margin: 0;"><strong>Método de pago:</strong> {{payment_method}}</p></div><p style="margin: 24px 0 0 0;">Por favor intenta nuevamente o contáctanos si necesitas ayuda: {{support_email}}</p><p style="margin: 24px 0 0 0; color: #64748b;">Saludos,<br>{{organization_name}}</p>',
  variables = '["customer_name","order_number","amount","payment_method","organization_name","support_email"]'::jsonb,
  updated_at = NOW()
WHERE type = 'payment_failed' AND organization_id IS NULL;

-- payment_success: Epoch style
UPDATE system_email_templates
SET
  subject = 'Pago confirmado - Orden {{order_number}} - {{organization_name}}',
  content = '<div style="margin-bottom: 24px;"><p style="font-size: 18px; font-weight: 600; color: #0f172a; margin: 0 0 8px 0;">Hola {{customer_name}},</p><p style="margin: 0; color: #475569;">Hemos recibido tu pago correctamente.</p></div><div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0; border-left: 4px solid #16a34a;"><p style="margin: 0 0 8px 0;"><strong>Orden #{{order_number}}</strong></p><p style="margin: 0 0 8px 0;"><strong>Monto:</strong> {{amount}}</p><p style="margin: 0 0 8px 0;"><strong>Método de pago:</strong> {{payment_method}}</p><p style="margin: 0;"><strong>ID de transacción:</strong> {{transaction_id}}</p></div><p style="margin: 24px 0 0 0; color: #64748b;">Saludos,<br>{{organization_name}}</p>',
  variables = '["customer_name","order_number","amount","payment_method","transaction_id","organization_name"]'::jsonb,
  updated_at = NOW()
WHERE type = 'payment_success' AND organization_id IS NULL;

-- order_confirmation: Epoch style (from 20260230000000)
UPDATE system_email_templates
SET
  subject = 'Confirmación de tu orden {{order_number}} - {{organization_name}}',
  content = '<div style="margin-bottom: 24px;"><p style="font-size: 18px; font-weight: 600; color: #0f172a; margin: 0 0 8px 0;">Hola {{customer_name}},</p><p style="margin: 0; color: #475569;">Hemos recibido tu orden.</p></div><div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0; border-left: 4px solid #1A2B23;"><p style="margin: 0 0 8px 0;"><strong>Orden #{{order_number}}</strong></p><p style="margin: 0 0 8px 0;"><strong>Fecha:</strong> {{order_date}}</p><p style="margin: 0 0 8px 0;"><strong>Total:</strong> {{order_total}}</p><p style="margin: 0;"><strong>Método de pago:</strong> {{payment_method}}</p></div><div style="margin: 24px 0;">{{order_items}}</div><p style="margin: 24px 0 0 0; color: #64748b;">Saludos,<br>{{organization_name}}</p>',
  variables = '["customer_name","order_number","order_date","order_total","order_items","payment_method","order_items_text","organization_name"]'::jsonb,
  updated_at = NOW()
WHERE type = 'order_confirmation' AND organization_id IS NULL;

-- order_shipped: Epoch style
UPDATE system_email_templates
SET
  subject = 'Tu orden {{order_number}} está en camino - {{organization_name}}',
  content = '<div style="margin-bottom: 24px;"><p style="font-size: 18px; font-weight: 600; color: #0f172a; margin: 0 0 8px 0;">Hola {{customer_name}},</p><p style="margin: 0; color: #475569;">Tu orden {{order_number}} ha sido enviada.</p></div><div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0; border-left: 4px solid #1A2B23;"><p style="margin: 0 0 8px 0;"><strong>Transportista:</strong> {{carrier}}</p><p style="margin: 0 0 8px 0;"><strong>Número de seguimiento:</strong> {{tracking_number}}</p><p style="margin: 0;"><strong>Entrega estimada:</strong> {{estimated_delivery}}</p></div><p style="margin: 24px 0 0 0; color: #64748b;">Saludos,<br>{{organization_name}}</p>',
  variables = '["customer_name","order_number","carrier","tracking_number","estimated_delivery","organization_name"]'::jsonb,
  updated_at = NOW()
WHERE type = 'order_shipped' AND organization_id IS NULL;

-- order_delivered: Epoch style
UPDATE system_email_templates
SET
  subject = 'Tu orden {{order_number}} fue entregada - {{organization_name}}',
  content = '<div style="margin-bottom: 24px;"><p style="font-size: 18px; font-weight: 600; color: #0f172a; margin: 0 0 8px 0;">Hola {{customer_name}},</p><p style="margin: 0; color: #475569;">Tu orden {{order_number}} ha sido entregada correctamente.</p></div><div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0; border-left: 4px solid #16a34a;"><p style="margin: 0;"><strong>Fecha de entrega:</strong> {{delivery_date}}</p></div><p style="margin: 24px 0 0 0; color: #64748b;">Gracias por tu compra. Saludos,<br>{{organization_name}}</p>',
  variables = '["customer_name","order_number","delivery_date","organization_name"]'::jsonb,
  updated_at = NOW()
WHERE type = 'order_delivered' AND organization_id IS NULL;

-- low_stock_alert: Epoch style
UPDATE system_email_templates
SET
  subject = 'Alerta: Productos con stock bajo - {{organization_name}}',
  content = '<div style="margin-bottom: 24px;"><p style="font-size: 18px; font-weight: 600; color: #0f172a; margin: 0 0 8px 0;">Los siguientes productos tienen stock por debajo del mínimo configurado:</p></div><div style="background: #fef2f2; border-radius: 8px; padding: 20px; margin: 24px 0; border-left: 4px solid #dc2626;">{{low_stock_products}}</div><p style="margin: 24px 0 0 0; color: #64748b;">Por favor revisa el inventario. Saludos,<br>{{organization_name}}</p>',
  variables = '["low_stock_products","low_stock_products_text","product_count","organization_name"]'::jsonb,
  updated_at = NOW()
WHERE type = 'low_stock_alert' AND organization_id IS NULL;

-- password_reset: Epoch style
UPDATE system_email_templates
SET
  subject = 'Restablece tu contraseña - {{organization_name}}',
  content = '<div style="margin-bottom: 24px;"><p style="font-size: 18px; font-weight: 600; color: #0f172a; margin: 0 0 8px 0;">Hola {{customer_name}},</p><p style="margin: 0; color: #475569;">Recibimos una solicitud para restablecer tu contraseña.</p></div><p style="margin: 24px 0 0 0;"><a href="{{reset_link}}" style="display: inline-block; padding: 12px 24px; background: #1A2B23; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Restablecer contraseña</a></p><p style="margin: 24px 0 0 0; color: #64748b;">Si no solicitaste este cambio, ignora este correo. Saludos,<br>{{organization_name}}</p>',
  variables = '["customer_name","reset_link","reset_url","organization_name"]'::jsonb,
  updated_at = NOW()
WHERE type = 'password_reset' AND organization_id IS NULL;
