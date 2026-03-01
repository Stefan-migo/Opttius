-- Migration: Fix B2C Email Templates - Correct Variables (AI Agent Source of Truth)
-- Version: 20260303000000
-- Date: 2026-03-03
-- Description: Update all default B2C (Óptica a Cliente) email templates to use correct
--              variables from ai-template-variables.ts and optica.ts. Fixes issues like
--              wrong customer name (use customer_first_name), wrong variable names
--              (prescription_expiry_date not expiry_date, quote_expiry_date not expiry_date),
--              and appointment_reminder_2h (no appointment_date - only appointment_time).

-- appointment_confirmation: customer_first_name for greeting (agent fix)
UPDATE system_email_templates
SET
  subject = '✅ Tu cita confirmada: {{appointment_date}} a las {{appointment_time}} - {{organization_name}}',
  content = '<p>Hola {{customer_first_name}},</p><p>Tu cita ha sido confirmada.</p><p><strong>Fecha:</strong> {{appointment_date}}</p><p><strong>Hora:</strong> {{appointment_time}}</p><p><strong>Profesional:</strong> {{professional_name}}</p><p><strong>Tipo:</strong> {{appointment_type}}</p><p><strong>Sucursal:</strong> {{branch_name}}</p><p>Te esperamos. Saludos,<br>{{organization_name}}</p>',
  variables = '["customer_name","customer_first_name","appointment_date","appointment_time","professional_name","appointment_type","branch_name","organization_name"]'::jsonb,
  updated_at = NOW()
WHERE type = 'appointment_confirmation' AND organization_id IS NULL;

-- appointment_reminder: customer_name (optica passes both)
UPDATE system_email_templates
SET
  subject = 'Recordatorio: Tienes una cita el {{appointment_date}} a las {{appointment_time}} - {{organization_name}}',
  content = '<p>Hola {{customer_name}},</p><p>Te recordamos que tienes una cita programada.</p><p><strong>Fecha:</strong> {{appointment_date}}</p><p><strong>Hora:</strong> {{appointment_time}}</p><p><strong>Sucursal:</strong> {{branch_name}}</p><p>Te esperamos. Saludos,<br>{{organization_name}}</p>',
  variables = '["customer_name","appointment_date","appointment_time","branch_name","organization_name"]'::jsonb,
  updated_at = NOW()
WHERE type = 'appointment_reminder' AND organization_id IS NULL;

-- appointment_reminder_2h: NO appointment_date (optica only passes appointment_time for 2h reminder)
UPDATE system_email_templates
SET
  subject = 'Tu cita es en 2 horas: {{appointment_time}} - {{organization_name}}',
  content = '<p>Hola {{customer_first_name}},</p><p>Tu cita es en aproximadamente 2 horas.</p><p><strong>Hora:</strong> {{appointment_time}}</p><p><strong>Profesional:</strong> {{professional_name}}</p><p><strong>Sucursal:</strong> {{branch_name}}</p><p><strong>Dirección:</strong> {{branch_address}}</p><p><strong>Teléfono:</strong> {{branch_phone}}</p><p>Te esperamos. Saludos,<br>{{organization_name}}</p>',
  variables = '["customer_name","customer_first_name","appointment_time","professional_name","branch_name","branch_address","branch_phone","organization_name"]'::jsonb,
  updated_at = NOW()
WHERE type = 'appointment_reminder_2h' AND organization_id IS NULL;

-- appointment_cancelation: add customer_first_name, branch_phone, branch_email, booking_url
UPDATE system_email_templates
SET
  subject = 'Tu cita del {{appointment_date}} fue cancelada - {{organization_name}}',
  content = '<p>Hola {{customer_first_name}},</p><p>Tu cita programada para el {{appointment_date}} a las {{appointment_time}} ha sido cancelada.</p><p><strong>Sucursal:</strong> {{branch_name}}</p><p><strong>Teléfono:</strong> {{branch_phone}}</p><p><strong>Email:</strong> {{branch_email}}</p><p>Si deseas reagendar, puedes hacerlo aquí: <a href="{{booking_url}}">Agendar nueva cita</a></p><p>Saludos,<br>{{organization_name}}</p>',
  variables = '["customer_name","customer_first_name","appointment_date","appointment_time","branch_name","branch_phone","branch_email","booking_url","organization_name"]'::jsonb,
  updated_at = NOW()
WHERE type = 'appointment_cancelation' AND organization_id IS NULL;

-- appointment_rescheduled: already correct
UPDATE system_email_templates
SET
  subject = 'Tu cita fue reprogramada - {{organization_name}}',
  content = '<p>Hola {{customer_first_name}},</p><p>Tu cita ha sido reprogramada.</p><p><strong>Fecha anterior:</strong> {{old_appointment_date}} a las {{old_appointment_time}}</p><p><strong>Nueva fecha:</strong> {{appointment_date}} a las {{appointment_time}}</p><p><strong>Sucursal:</strong> {{branch_name}}</p><p>Si tienes alguna pregunta, contáctanos al {{branch_phone}}.</p><p>Saludos,<br>{{organization_name}}</p>',
  variables = '["customer_name","customer_first_name","appointment_date","appointment_time","old_appointment_date","old_appointment_time","branch_name","branch_phone","organization_name"]'::jsonb,
  updated_at = NOW()
WHERE type = 'appointment_rescheduled' AND organization_id IS NULL;

-- appointment_follow_up_reminder: add booking_url
UPDATE system_email_templates
SET
  subject = 'Recuerda tu control programado para el {{follow_up_date}} - {{organization_name}}',
  content = '<p>Hola {{customer_first_name}},</p><p>Tu oftalmólogo recomendó un control de seguimiento.</p><p><strong>Fecha proyectada:</strong> {{follow_up_date}}</p><p><strong>Sucursal:</strong> {{branch_name}}</p><p>Te recomendamos agendar tu cita con anticipación para asegurar disponibilidad.</p><p>Contáctanos al {{branch_phone}} o agenda aquí: <a href="{{booking_url}}">Agendar cita</a></p><p>Saludos,<br>{{organization_name}}</p>',
  variables = '["customer_name","customer_first_name","follow_up_date","branch_name","branch_phone","booking_url","organization_name"]'::jsonb,
  updated_at = NOW()
WHERE type = 'appointment_follow_up_reminder' AND organization_id IS NULL;

-- prescription_ready: use customer_first_name, prescription_date, prescription_expiry_date, prescription_number, doctor_name, branch_name, branch_phone, prescription_url
UPDATE system_email_templates
SET
  subject = 'Tu receta está disponible - {{organization_name}}',
  content = '<p>Hola {{customer_first_name}},</p><p>Tu receta de fecha {{prescription_date}} está lista y disponible para retiro.</p><p><strong>Número de receta:</strong> {{prescription_number}}</p><p><strong>Profesional:</strong> {{doctor_name}}</p><p><strong>Sucursal:</strong> {{branch_name}}</p><p><strong>Teléfono:</strong> {{branch_phone}}</p><p><strong>Válida hasta:</strong> {{prescription_expiry_date}}</p><p>Puedes acercarte a nuestra sucursal cuando te sea conveniente.</p><p>Saludos,<br>{{organization_name}}</p>',
  variables = '["customer_name","customer_first_name","prescription_date","prescription_expiry_date","prescription_number","doctor_name","branch_name","branch_phone","prescription_url","organization_name"]'::jsonb,
  updated_at = NOW()
WHERE type = 'prescription_ready' AND organization_id IS NULL;

-- prescription_expiring: FIX expiry_date -> prescription_expiry_date
UPDATE system_email_templates
SET
  subject = 'Tu receta {{prescription_number}} vence pronto - {{organization_name}}',
  content = '<p>Hola {{customer_first_name}},</p><p>Te informamos que tu receta {{prescription_number}} vence el {{prescription_expiry_date}}.</p><p><strong>Sucursal:</strong> {{branch_name}}</p><p><strong>Dirección:</strong> {{branch_address}}</p><p><strong>Teléfono:</strong> {{branch_phone}}</p><p><strong>Email:</strong> {{branch_email}}</p><p>Te recomendamos agendar una nueva evaluación antes de esa fecha.</p><p>Puedes agendar aquí: <a href="{{booking_url}}">Agendar cita</a></p><p>Saludos,<br>{{organization_name}}</p>',
  variables = '["customer_name","customer_first_name","prescription_expiry_date","prescription_number","branch_name","branch_address","branch_phone","branch_email","booking_url","organization_name"]'::jsonb,
  updated_at = NOW()
WHERE type = 'prescription_expiring' AND organization_id IS NULL;

-- quote_sent: use quote_expiry (optica sends quote_expiry_date - VARIABLES_BY_TYPE has quote_expiry; optica sends expiry_date as quote_expiry_date)
UPDATE system_email_templates
SET
  subject = 'Tu presupuesto #{{quote_number}} - {{organization_name}}',
  content = '<p>Hola {{customer_name}},</p><p>Te enviamos tu presupuesto.</p><p><strong>Número:</strong> {{quote_number}}</p><p><strong>Fecha:</strong> {{quote_date}}</p><p><strong>Total:</strong> {{quote_total}}</p><p><strong>Válido hasta:</strong> {{quote_expiry}}</p><div>{{quote_items}}</div><p>Saludos,<br>{{organization_name}}</p>',
  variables = '["customer_name","quote_number","quote_date","quote_total","quote_expiry","quote_items","organization_name"]'::jsonb,
  updated_at = NOW()
WHERE type = 'quote_sent' AND organization_id IS NULL;

-- quote_expiring: FIX expiry_date -> quote_expiry_date
UPDATE system_email_templates
SET
  subject = 'Tu presupuesto #{{quote_number}} vence pronto - {{organization_name}}',
  content = '<p>Hola {{customer_first_name}},</p><p>Tu presupuesto {{quote_number}} vence el {{quote_expiry_date}}.</p><p><strong>Total:</strong> {{total}}</p><p>Si deseas aprovecharlo, contáctanos antes de esa fecha.</p><p><a href="{{accept_url}}">Aceptar presupuesto</a> | <a href="{{quote_url}}">Ver presupuesto</a></p><p><strong>Teléfono:</strong> {{branch_phone}}</p><p><strong>Email:</strong> {{branch_email}}</p><p>Saludos,<br>{{organization_name}}</p>',
  variables = '["customer_name","customer_first_name","quote_number","quote_expiry_date","total","accept_url","quote_url","branch_phone","branch_email","organization_name"]'::jsonb,
  updated_at = NOW()
WHERE type = 'quote_expiring' AND organization_id IS NULL;

-- work_order_ready: add customer_first_name optional
UPDATE system_email_templates
SET
  subject = 'Tu trabajo #{{work_order_number}} está listo - {{organization_name}}',
  content = '<p>Hola {{customer_first_name}},</p><p>Tu trabajo de laboratorio {{work_order_number}} está listo para retiro.</p><p>Puedes acercarte a nuestra sucursal cuando te sea conveniente.</p><p>Saludos,<br>{{organization_name}}</p>',
  variables = '["customer_name","customer_first_name","work_order_number","organization_name"]'::jsonb,
  updated_at = NOW()
WHERE type = 'work_order_ready' AND organization_id IS NULL;

-- account_welcome: account_url (optica sends account_url)
UPDATE system_email_templates
SET
  subject = 'Bienvenido a {{organization_name}}',
  content = '<p>Hola {{customer_name}},</p><p>Bienvenido a nuestra óptica.</p><p>Puedes acceder a tu cuenta aquí: <a href="{{account_url}}">Mi cuenta</a></p><p>Saludos,<br>{{organization_name}}</p>',
  variables = '["customer_name","account_url","organization_name"]'::jsonb,
  updated_at = NOW()
WHERE type = 'account_welcome' AND organization_id IS NULL;

-- payment_failed: support_email from getDefaultVariables (notifications.ts)
UPDATE system_email_templates
SET
  subject = 'Tu pago no pudo procesarse - Orden {{order_number}} - {{organization_name}}',
  content = '<p>Hola {{customer_name}},</p><p>No pudimos procesar el pago de tu orden {{order_number}}.</p><p><strong>Monto:</strong> {{amount}}</p><p><strong>Método de pago:</strong> {{payment_method}}</p><p>Por favor intenta nuevamente o contáctanos si necesitas ayuda: {{support_email}}</p><p>Saludos,<br>{{organization_name}}</p>',
  variables = '["customer_name","order_number","amount","payment_method","organization_name","support_email"]'::jsonb,
  updated_at = NOW()
WHERE type = 'payment_failed' AND organization_id IS NULL;

-- payment_success: use amount (VARIABLES_BY_TYPE) - optica/notifications may use order_total
UPDATE system_email_templates
SET
  subject = 'Pago confirmado - Orden {{order_number}} - {{organization_name}}',
  content = '<p>Hola {{customer_name}},</p><p>Hemos recibido tu pago correctamente.</p><p><strong>Orden #{{order_number}}</strong></p><p><strong>Monto:</strong> {{amount}}</p><p><strong>Método de pago:</strong> {{payment_method}}</p><p><strong>ID de transacción:</strong> {{transaction_id}}</p><p>Saludos,<br>{{organization_name}}</p>',
  variables = '["customer_name","order_number","amount","payment_method","transaction_id","organization_name"]'::jsonb,
  updated_at = NOW()
WHERE type = 'payment_success' AND organization_id IS NULL;
