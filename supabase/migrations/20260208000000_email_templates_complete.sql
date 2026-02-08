-- ============================================================================
-- Email Templates Migration - Complete Email System (CORRECTED)
-- ============================================================================
-- This migration adds all email templates for:
-- 1. Optica (Optical Business) - 12 templates
-- 2. SaaS (Opttius Platform) - 11 templates
-- ============================================================================
-- Note: Removed 'description' column to match system_email_templates table schema
-- ============================================================================

-- ============================================================================
-- 1. PLANTILLAS DE ÓPTICA (12 templates)
-- ============================================================================

-- Confirmación de Cita
INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, category, created_at, updated_at)
VALUES (
  'appointment_confirmation',
  'Confirmación de Cita',
  '✅ Tu cita confirmada: {{appointment_date}} a las {{appointment_time}} - {{organization_name}}',
  '
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmación de Tu Cita</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f7fa;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
    <tr>
      <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 35px 30px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 10px;">📅</div>
        <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 600;">¡Tu Cita Confirmada!</h1>
        <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Te esperamos pronto</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 35px 30px;">
        <p style="font-size: 18px; color: #1e3a5f; margin-bottom: 25px;">Hola <strong>{{customer_first_name}}</strong>,</p>
        <p style="font-size: 15px; color: #4a5568; line-height: 1.7; margin-bottom: 25px;">Tu cita ha sido confirmada exitosamente. A continuación encontrarás todos los detalles:</p>
        <table width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%); border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 25px;">
          <tr>
            <td style="padding: 20px;">
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr><td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;"><span style="color: #94a3b8; font-size: 13px; text-transform: uppercase;">📆 Fecha</span><br><strong style="color: #1e3a5f; font-size: 17px;">{{appointment_date}}</strong></td></tr>
                <tr><td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;"><span style="color: #94a3b8; font-size: 13px; text-transform: uppercase;">🕐 Hora</span><br><strong style="color: #1e3a5f; font-size: 17px;">{{appointment_time}}</strong></td></tr>
                <tr><td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;"><span style="color: #94a3b8; font-size: 13px; text-transform: uppercase;">👨‍⚕️ Profesional</span><br><strong style="color: #1e3a5f; font-size: 17px;">{{professional_name}}</strong></td></tr>
                <tr><td style="padding: 12px 0;"><span style="color: #94a3b8; font-size: 13px; text-transform: uppercase;">📍 Sucursal</span><br><strong style="color: #1e3a5f; font-size: 17px;">{{branch_name}}</strong></td></tr>
              </table>
            </td>
          </tr>
        </table>
        <table width="100%" cellspacing="0" cellpadding="0">
          <tr><td style="text-align: center; padding: 0 10px;"><a href="{{confirmation_url}}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; margin-bottom: 10px;">📋 Guardar en Calendario</a></td></tr>
          <tr><td style="text-align: center; padding: 0 10px;"><a href="{{reschedule_url}}" style="color: #64748b; font-size: 14px; text-decoration: none;">¿Necesitas reprogramar? Haz clic aquí</a></td></tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="background: #1e3a5f; padding: 25px 30px; text-align: center;">
        <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 18px; font-weight: 600;">{{organization_name}}</p>
        <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 13px;">Tu salud visual es nuestra prioridad</p>
      </td>
    </tr>
  </table>
</body>
</html>
',
  '["customer_first_name", "appointment_date", "appointment_time", "professional_name", "professional_title", "branch_name", "branch_address", "branch_phone", "branch_email", "appointment_type", "preparation_instructions", "confirmation_url", "reschedule_url", "organization_name", "customer_email"]',
  true,
  'optica',
  NOW(),
  NOW()
);

-- Recordatorio de Cita (24h)
INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, category, created_at, updated_at)
VALUES (
  'appointment_reminder',
  'Recordatorio de Cita (24h)',
  '⏰ Recordatorio: Tu cita es mañana {{appointment_date}} a las {{appointment_time}}',
  '
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recordatorio de Tu Cita</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f7fa;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
    <tr>
      <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 35px 30px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 10px;">⏰</div>
        <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 600;">¡Tienes una Cita Mañana!</h1>
        <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">No olvides tu visita</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 35px 30px;">
        <p style="font-size: 18px; color: #1e3a5f; margin-bottom: 25px;">Hola <strong>{{customer_first_name}}</strong>,</p>
        <p style="font-size: 15px; color: #4a5568; line-height: 1.7; margin-bottom: 25px;">Te recordamos que tienes una cita programada para mañana. ¡No la olvides!</p>
        <table width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 10px; border: 1px solid #fcd34d; margin-bottom: 25px;">
          <tr>
            <td style="padding: 20px;">
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr><td style="padding: 12px 0; border-bottom: 1px solid #fcd34d;"><span style="color: #92400e; font-size: 13px; text-transform: uppercase;">📆 Fecha</span><br><strong style="color: #1e3a5f; font-size: 17px;">{{appointment_date}}</strong></td></tr>
                <tr><td style="padding: 12px 0; border-bottom: 1px solid #fcd34d;"><span style="color: #92400e; font-size: 13px; text-transform: uppercase;">🕐 Hora</span><br><strong style="color: #1e3a5f; font-size: 17px;">{{appointment_time}}</strong></td></tr>
                <tr><td style="padding: 12px 0; border-bottom: 1px solid #fcd34d;"><span style="color: #92400e; font-size: 13px; text-transform: uppercase;">👨‍⚕️ Profesional</span><br><strong style="color: #1e3a5f; font-size: 17px;">{{professional_name}}</strong></td></tr>
                <tr><td style="padding: 12px 0;"><span style="color: #92400e; font-size: 13px; text-transform: uppercase;">📍 Sucursal</span><br><strong style="color: #1e3a5f; font-size: 17px;">{{branch_name}}</strong></td></tr>
              </table>
            </td>
          </tr>
        </table>
        <p style="font-size: 14px; color: #64748b; margin-bottom: 20px;">{{preparation_instructions}}</p>
        <table width="100%" cellspacing="0" cellpadding="0">
          <tr><td style="text-align: center; padding: 0 10px;"><a href="{{reschedule_url}}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; margin-bottom: 10px;">📅 Reprogramar Cita</a></td></tr>
          <tr><td style="text-align: center; padding: 0 10px;"><a href="{{cancel_url}}" style="color: #ef4444; font-size: 14px; text-decoration: none;">¿Necesitas cancelar? Haz clic aquí</a></td></tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="background: #1e3a5f; padding: 25px 30px; text-align: center;">
        <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 18px; font-weight: 600;">{{organization_name}}</p>
        <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 13px;">Tu salud visual es nuestra prioridad</p>
      </td>
    </tr>
  </table>
</body>
</html>
',
  '["customer_first_name", "appointment_date", "appointment_time", "professional_name", "branch_name", "branch_address", "branch_phone", "branch_email", "appointment_type", "preparation_instructions", "reschedule_url", "cancel_url", "organization_name"]',
  true,
  'optica',
  NOW(),
  NOW()
);

-- Recordatorio de Cita (2h antes)
INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, category, created_at, updated_at)
VALUES (
  'appointment_reminder_2h',
  'Recordatorio de Cita (2h antes)',
  '🕐 Tu cita es en 2 horas: {{appointment_time}} en {{organization_name}}',
  '
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tu Cita es Pronto</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f7fa;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
    <tr>
      <td style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 35px 30px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 10px;">🕐</div>
        <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 600;">¡Tu Cita es en 2 Horas!</h1>
        <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Te esperamos muy pronto</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 35px 30px;">
        <p style="font-size: 18px; color: #1e3a5f; margin-bottom: 25px;">Hola <strong>{{customer_first_name}}</strong>,</p>
        <p style="font-size: 15px; color: #4a5568; line-height: 1.7; margin-bottom: 25px;">Solo un recordatorio amistoso: tu cita está muy cerca. ¡No llegues tarde!</p>
        <table width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); border-radius: 10px; border: 1px solid #fca5a5; margin-bottom: 25px;">
          <tr>
            <td style="padding: 20px;">
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr><td style="padding: 12px 0; border-bottom: 1px solid #fca5a5;"><span style="color: #991b1b; font-size: 13px; text-transform: uppercase;">📆 Fecha</span><br><strong style="color: #1e3a5f; font-size: 17px;">{{appointment_date}}</strong></td></tr>
                <tr><td style="padding: 12px 0; border-bottom: 1px solid #fca5a5;"><span style="color: #991b1b; font-size: 13px; text-transform: uppercase;">🕐 Hora</span><br><strong style="color: #1e3a5f; font-size: 17px;">{{appointment_time}}</strong></td></tr>
                <tr><td style="padding: 12px 0; border-bottom: 1px solid #fca5a5;"><span style="color: #991b1b; font-size: 13px; text-transform: uppercase;">👨‍⚕️ Profesional</span><br><strong style="color: #1e3a5f; font-size: 17px;">{{professional_name}}</strong></td></tr>
                <tr><td style="padding: 12px 0;"><span style="color: #991b1b; font-size: 13px; text-transform: uppercase;">📍 Sucursal</span><br><strong style="color: #1e3a5f; font-size: 17px;">{{branch_name}}</strong></td></tr>
              </table>
            </td>
          </tr>
        </table>
        <table width="100%" cellspacing="0" cellpadding="0">
          <tr><td style="padding: 20px; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0; font-size: 14px; color: #166534;"><strong>📍 Cómo llegar:</strong><br>{{branch_address}}</p>
          </td></tr>
          <tr><td style="text-align: center; padding: 0 10px;"><a href="{{branch_map_url}}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">🗺️ Ver en Mapa</a></td></tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="background: #1e3a5f; padding: 25px 30px; text-align: center;">
        <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 18px; font-weight: 600;">{{organization_name}}</p>
        <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 13px;">Tu salud visual es nuestra prioridad</p>
      </td>
    </tr>
  </table>
</body>
</html>
',
  '["customer_first_name", "appointment_date", "appointment_time", "professional_name", "branch_name", "branch_address", "branch_phone", "branch_email", "branch_map_url", "organization_name"]',
  true,
  'optica',
  NOW(),
  NOW()
);

-- Cancelación de Cita
INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, category, created_at, updated_at)
VALUES (
  'appointment_cancelation',
  'Cancelación de Cita',
  '❌ Tu cita ha sido cancelada: {{appointment_date}} a las {{appointment_time}}',
  '
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cancelación de Tu Cita</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f7fa;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
    <tr>
      <td style="background: linear-gradient(135deg, #64748b 0%, #475569 100%); padding: 35px 30px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 10px;">❌</div>
        <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 600;">Cita Cancelada</h1>
        <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Lamentamos que no puedas asistir</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 35px 30px;">
        <p style="font-size: 18px; color: #1e3a5f; margin-bottom: 25px;">Hola <strong>{{customer_first_name}}</strong>,</p>
        <p style="font-size: 15px; color: #4a5568; line-height: 1.7; margin-bottom: 25px;">Te informamos que tu cita ha sido cancelada. Si fue un error o deseas reprogramar, estamos a tu disposición.</p>
        <table width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); border-radius: 10px; border: 1px solid #cbd5e1; margin-bottom: 25px;">
          <tr>
            <td style="padding: 20px;">
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr><td style="padding: 12px 0; border-bottom: 1px solid #cbd5e1;"><span style="color: #64748b; font-size: 13px; text-transform: uppercase;">📆 Fecha</span><br><strong style="color: #1e3a5f; font-size: 17px;">{{appointment_date}}</strong></td></tr>
                <tr><td style="padding: 12px 0; border-bottom: 1px solid #cbd5e1;"><span style="color: #64748b; font-size: 13px; text-transform: uppercase;">🕐 Hora</span><br><strong style="color: #1e3a5f; font-size: 17px;">{{appointment_time}}</strong></td></tr>
                <tr><td style="padding: 12px 0;"><span style="color: #64748b; font-size: 13px; text-transform: uppercase;">👨‍⚕️ Profesional</span><br><strong style="color: #1e3a5f; font-size: 17px;">{{professional_name}}</strong></td></tr>
              </table>
            </td>
          </tr>
        </table>
        <p style="font-size: 14px; color: #64748b; margin-bottom: 20px;"><strong>Motivo de cancelación:</strong> {{cancellation_reason}}</p>
        <table width="100%" cellspacing="0" cellpadding="0">
          <tr><td style="text-align: center; padding: 0 10px;"><a href="{{booking_url}}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">📅 Reservar Nueva Cita</a></td></tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="background: #1e3a5f; padding: 25px 30px; text-align: center;">
        <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 18px; font-weight: 600;">{{organization_name}}</p>
        <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 13px;">Tu salud visual es nuestra prioridad</p>
      </td>
    </tr>
  </table>
</body>
</html>
',
  '["customer_first_name", "appointment_date", "appointment_time", "professional_name", "cancellation_reason", "booking_url", "organization_name"]',
  true,
  'optica',
  NOW(),
  NOW()
);

-- Receta Lista para Recoger
INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, category, created_at, updated_at)
VALUES (
  'prescription_ready',
  'Receta Lista para Recoger',
  '👓 Tu receta está lista para recoger - {{organization_name}}',
  '
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tu Receta Está Lista</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f7fa;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
    <tr>
      <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 35px 30px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 10px;">👓</div>
        <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 600;">¡Tu Receta Está Lista!</h1>
        <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Ya puedes pasar a recogerla</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 35px 30px;">
        <p style="font-size: 18px; color: #1e3a5f; margin-bottom: 25px;">Hola <strong>{{customer_first_name}}</strong>,</p>
        <p style="font-size: 15px; color: #4a5568; line-height: 1.7; margin-bottom: 25px;">¡Excelentes noticias! Tu receta ha sido preparada y está lista para que la recojas en nuestra sucursal.</p>
        <table width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 10px; border: 1px solid #6ee7b7; margin-bottom: 25px;">
          <tr>
            <td style="padding: 20px;">
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr><td style="padding: 12px 0; border-bottom: 1px solid #6ee7b7;"><span style="color: #065f46; font-size: 13px; text-transform: uppercase;">📦 Pedido #</span><br><strong style="color: #1e3a5f; font-size: 17px;">{{order_number}}</strong></td></tr>
                <tr><td style="padding: 12px 0; border-bottom: 1px solid #6ee7b7;"><span style="color: #065f46; font-size: 13px; text-transform: uppercase;">👁️ Tipo</span><br><strong style="color: #1e3a5f; font-size: 17px;">{{product_type}}</strong></td></tr>
                <tr><td style="padding: 12px 0; border-bottom: 1px solid #6ee7b7;"><span style="color: #065f46; font-size: 13px; text-transform: uppercase;">📅 Disponible desde</span><br><strong style="color: #1e3a5f; font-size: 17px;">{{available_date}}</strong></td></tr>
                <tr><td style="padding: 12px 0;"><span style="color: #065f46; font-size: 13px; text-transform: uppercase;">📍 Sucursal</span><br><strong style="color: #1e3a5f; font-size: 17px;">{{branch_name}}</strong></td></tr>
              </table>
            </td>
          </tr>
        </table>
        <p style="font-size: 14px; color: #64748b; margin-bottom: 20px;">{{product_details}}</p>
        <table width="100%" cellspacing="0" cellpadding="0">
          <tr><td style="text-align: center; padding: 0 10px;"><a href="{{branch_contact_url}}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">📞 Contactar Sucursal</a></td></tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="background: #1e3a5f; padding: 25px 30px; text-align: center;">
        <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 18px; font-weight: 600;">{{organization_name}}</p>
        <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 13px;">Tu salud visual es nuestra prioridad</p>
      </td>
    </tr>
  </table>
</body>
</html>
',
  '["customer_first_name", "order_number", "product_type", "product_details", "available_date", "branch_name", "branch_contact_url", "organization_name"]',
  true,
  'optica',
  NOW(),
  NOW()
);

-- Recordatorio de Vencimiento de Receta
INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, category, created_at, updated_at)
VALUES (
  'prescription_expiring',
  'Recordatorio de Vencimiento de Receta',
  '⏰ Tu receta vence pronto: {{expiry_date}} - {{organization_name}}',
  '
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tu Receta Próxima a Vencer</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f7fa;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
    <tr>
      <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 35px 30px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 10px;">⏰</div>
        <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 600;">¡Tu Receta Próxima a Vencer!</h1>
        <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Agenda tu revisión visual</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 35px 30px;">
        <p style="font-size: 18px; color: #1e3a5f; margin-bottom: 25px;">Hola <strong>{{customer_first_name}}</strong>,</p>
        <p style="font-size: 15px; color: #4a5568; line-height: 1.7; margin-bottom: 25px;">Queremos recordarte que tu receta médica visual está próxima a vencer. Es importante que agendes una revisión para mantener tu salud ocular en óptimas condiciones.</p>
        <table width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 10px; border: 1px solid #fcd34d; margin-bottom: 25px;">
          <tr>
            <td style="padding: 20px;">
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr><td style="padding: 12px 0; border-bottom: 1px solid #fcd34d;"><span style="color: #92400e; font-size: 13px; text-transform: uppercase;">📅 Vence</span><br><strong style="color: #1e3a5f; font-size: 17px;">{{expiry_date}}</strong></td></tr>
                <tr><td style="padding: 12px 0; border-bottom: 1px solid #fcd34d;"><span style="color: #92400e; font-size: 13px; text-transform: uppercase;">📄 Receta</span><br><strong style="color: #1e3a5f; font-size: 17px;">{{prescription_id}}</strong></td></tr>
                <tr><td style="padding: 12px 0;"><span style="color: #92400e; font-size: 13px; text-transform: uppercase;">🔄 Lentes Actuales</span><br><strong style="color: #1e3a5f; font-size: 17px;">{{current_lenses}}</strong></td></tr>
              </table>
            </td>
          </tr>
        </table>
        <p style="font-size: 14px; color: #64748b; margin-bottom: 20px;">{{doctor_recommendation}}</p>
        <table width="100%" cellspacing="0" cellpadding="0">
          <tr><td style="text-align: center; padding: 0 10px;"><a href="{{booking_url}}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">📅 Agendar Revisión Visual</a></td></tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="background: #1e3a5f; padding: 25px 30px; text-align: center;">
        <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 18px; font-weight: 600;">{{organization_name}}</p>
        <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 13px;">Tu salud visual es nuestra prioridad</p>
      </td>
    </tr>
  </table>
</body>
</html>
',
  '["customer_first_name", "expiry_date", "prescription_id", "current_lenses", "doctor_recommendation", "booking_url", "organization_name"]',
  true,
  'optica',
  NOW(),
  NOW()
);

-- Orden de Trabajo Lista
INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, category, created_at, updated_at)
VALUES (
  'work_order_ready',
  'Orden de Trabajo Lista',
  '🔧 Tu orden de trabajo está lista - {{organization_name}}',
  '
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tu Orden de Trabajo Está Lista</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f7fa;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
    <tr>
      <td style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 35px 30px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 10px;">🔧</div>
        <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 600;">¡Tu Trabajo Está Listo!</h1>
        <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Puedes pasar a recogerlo</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 35px 30px;">
        <p style="font-size: 18px; color: #1e3a5f; margin-bottom: 25px;">Hola <strong>{{customer_first_name}}</strong>,</p>
        <p style="font-size: 15px; color: #4a5568; line-height: 1.7; margin-bottom: 25px;">¡Tu orden de trabajo ha sido completada! Nuestros técnicos han terminado el ajuste/reparación de tus lentes.</p>
        <table width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%); border-radius: 10px; border: 1px solid #c4b5fd; margin-bottom: 25px;">
          <tr>
            <td style="padding: 20px;">
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr><td style="padding: 12px 0; border-bottom: 1px solid #c4b5fd;"><span style="color: #5b21b6; font-size: 13px; text-transform: uppercase;">🔢 Orden #</span><br><strong style="color: #1e3a5f; font-size: 17px;">{{work_order_number}}</strong></td></tr>
                <tr><td style="padding: 12px 0; border-bottom: 1px solid #c4b5fd;"><span style="color: #5b21b6; font-size: 13px; text-transform: uppercase;">📦 Servicio</span><br><strong style="color: #1e3a5f; font-size: 17px;">{{service_type}}</strong></td></tr>
                <tr><td style="padding: 12px 0; border-bottom: 1px solid #c4b5fd;"><span style="color: #5b21b6; font-size: 13px; text-transform: uppercase;">📅 Listo desde</span><br><strong style="color: #1e3a5f; font-size: 17px;">{{ready_date}}</strong></td></tr>
                <tr><td style="padding: 12px 0;"><span style="color: #5b21b6; font-size: 13px; text-transform: uppercase;">📍 Sucursal</span><br><strong style="color: #1e3a5f; font-size: 17px;">{{branch_name}}</strong></td></tr>
              </table>
            </td>
          </tr>
        </table>
        <p style="font-size: 14px; color: #64748b; margin-bottom: 20px;">{{service_notes}}</p>
        <table width="100%" cellspacing="0" cellpadding="0">
          <tr><td style="text-align: center; padding: 0 10px;"><a href="{{branch_contact_url}}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">📞 Contactar Sucursal</a></td></tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="background: #1e3a5f; padding: 25px 30px; text-align: center;">
        <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 18px; font-weight: 600;">{{organization_name}}</p>
        <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 13px;">Tu salud visual es nuestra prioridad</p>
      </td>
    </tr>
  </table>
</body>
</html>
',
  '["customer_first_name", "work_order_number", "service_type", "service_notes", "ready_date", "branch_name", "branch_contact_url", "organization_name"]',
  true,
  'optica',
  NOW(),
  NOW()
);

-- Cotización Enviada
INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, category, created_at, updated_at)
VALUES (
  'quote_sent',
  'Cotización Enviada',
  '📋 Tu cotización #{{quote_number}} de {{organization_name}}',
  '
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tu Cotización</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f7fa;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
    <tr>
      <td style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 35px 30px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 10px;">📋</div>
        <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 600;">Tu Cotización</h1>
        <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Revisa los detalles de tu propuesta</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 35px 30px;">
        <p style="font-size: 18px; color: #1e3a5f; margin-bottom: 25px;">Hola <strong>{{customer_first_name}}</strong>,</p>
        <p style="font-size: 15px; color: #4a5568; line-height: 1.7; margin-bottom: 25px;">Gracias por interesate en nuestros productos. Adjuntamos la cotización solicitada con todos los detalles y precios.</p>
        <table width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-radius: 10px; border: 1px solid #93c5fd; margin-bottom: 25px;">
          <tr>
            <td style="padding: 20px;">
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr><td style="padding: 12px 0; border-bottom: 1px solid #93c5fd;"><span style="color: #1e40af; font-size: 13px; text-transform: uppercase;">📄 Cotización #</span><br><strong style="color: #1e3a5f; font-size: 17px;">{{quote_number}}</strong></td></tr>
                <tr><td style="padding: 12px 0; border-bottom: 1px solid #93c5fd;"><span style="color: #1e40af; font-size: 13px; text-transform: uppercase;">📅 Fecha</span><br><strong style="color: #1e3a5f; font-size: 17px;">{{quote_date}}</strong></td></tr>
                <tr><td style="padding: 12px 0; border-bottom: 1px solid #93c5fd;"><span style="color: #1e40af; font-size: 13px; text-transform: uppercase;">💰 Total</span><br><strong style="color: #1e3a5f; font-size: 17px;">{{total_amount}}</strong></td></tr>
                <tr><td style="padding: 12px 0;"><span style="color: #1e40af; font-size: 13px; text-transform: uppercase;">⏰ Válida hasta</span><br><strong style="color: #1e3a5f; font-size: 17px;">{{expiry_date}}</strong></td></tr>
              </table>
            </td>
          </tr>
        </table>
        <p style="font-size: 14px; color: #64748b; margin-bottom: 20px;">{{quote_notes}}</p>
        <table width="100%" cellspacing="0" cellpadding="0">
          <tr><td style="text-align: center; padding: 0 10px;"><a href="{{quote_details_url}}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; margin-bottom: 10px;">👁️ Ver Cotización Completa</a></td></tr>
          <tr><td style="text-align: center; padding: 0 10px;"><a href="{{accept_quote_url}}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">✅ Aceptar Cotización</a></td></tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="background: #1e3a5f; padding: 25px 30px; text-align: center;">
        <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 18px; font-weight: 600;">{{organization_name}}</p>
        <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 13px;">Tu salud visual es nuestra prioridad</p>
      </td>
    </tr>
  </table>
</body>
</html>
',
  '["customer_first_name", "quote_number", "quote_date", "total_amount", "expiry_date", "quote_notes", "quote_details_url", "accept_quote_url", "organization_name"]',
  true,
  'optica',
  NOW(),
  NOW()
);

-- Cotización Por Vencer
INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, category, created_at, updated_at)
VALUES (
  'quote_expiring',
  'Cotización Por Vencer',
  '⏰ Tu cotización #{{quote_number}} vence pronto',
  '
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tu Cotización Próxima a Vencer</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f7fa;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
    <tr>
      <td style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 35px 30px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 10px;">⏰</div>
        <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 600;">¡Tu Cotización Próxima a Vencer!</h1>
        <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">No dejes pasar esta oferta</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 35px 30px;">
        <p style="font-size: 18px; color: #1e3a5f; margin-bottom: 25px;">Hola <strong>{{customer_first_name}}</strong>,</p>
        <p style="font-size: 15px; color: #4a5568; line-height: 1.7; margin-bottom: 25px;">Te recordamos que tu cotización está próxima a vencer. ¡Aún tienes tiempo para aprovecharla!</p>
        <table width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); border-radius: 10px; border: 1px solid #fdba74; margin-bottom: 25px;">
          <tr>
            <td style="padding: 20px;">
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr><td style="padding: 12px 0; border-bottom: 1px solid #fdba74;"><span style="color: #9a3412; font-size: 13px; text-transform: uppercase;">📄 Cotización #</span><br><strong style="color: #1e3a5f; font-size: 17px;">{{quote_number}}</strong></td></tr>
                <tr><td style="padding: 12px 0; border-bottom: 1px solid #fdba74;"><span style="color: #9a3412; font-size: 13px; text-transform: uppercase;">💰 Total</span><br><strong style="color: #1e3a5f; font-size: 17px;">{{total_amount}}</strong></td></tr>
                <tr><td style="padding: 12px 0;"><span style="color: #9a3412; font-size: 13px; text-transform: uppercase;">⏰ Vence</span><br><strong style="color: #dc2626; font-size: 17px;">{{expiry_date}}</strong></td></tr>
              </table>
            </td>
          </tr>
        </table>
        <p style="font-size: 14px; color: #64748b; margin-bottom: 20px;">{{special_offer}}</p>
        <table width="100%" cellspacing="0" cellpadding="0">
          <tr><td style="text-align: center; padding: 0 10px;"><a href="{{accept_quote_url}}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">🔥 Aprovecha Ahora</a></td></tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="background: #1e3a5f; padding: 25px 30px; text-align: center;">
        <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 18px; font-weight: 600;">{{organization_name}}</p>
        <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 13px;">Tu salud visual es nuestra prioridad</p>
      </td>
    </tr>
  </table>
</body>
</html>
',
  '["customer_first_name", "quote_number", "total_amount", "expiry_date", "special_offer", "accept_quote_url", "organization_name"]',
  true,
  'optica',
  NOW(),
  NOW()
);

-- Bienvenida de Cliente
INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, category, created_at, updated_at)
VALUES (
  'account_welcome',
  'Bienvenida de Cliente',
  '👋 Bienvenido a {{organization_name}} - Tu Salud Visual en Buenas Manos',
  '
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenido</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f7fa;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
    <tr>
      <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 35px 30px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 10px;">👋</div>
        <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 600;">¡Bienvenido a Nuestra Familia!</h1>
        <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Tu salud visual es nuestra prioridad</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 35px 30px;">
        <p style="font-size: 18px; color: #1e3a5f; margin-bottom: 25px;">Hola <strong>{{customer_first_name}}</strong>,</p>
        <p style="font-size: 15px; color: #4a5568; line-height: 1.7; margin-bottom: 25px;">¡Gracias por unirte a nuestra comunidad! Estamos encantados de tenerte con nosotros. Tu salud visual está en las mejores manos.</p>
        <table width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 10px; border: 1px solid #6ee7b7; margin-bottom: 25px;">
          <tr>
            <td style="padding: 20px;">
              <p style="margin: 0 0 15px 0; font-size: 15px; color: #1e3a5f; font-weight: 600;">¿Qué puedes hacer ahora?</p>
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr><td style="padding: 10px 0;"><span style="color: #059669; margin-right: 10px;">✓</span> <span style="color: #4a5568;">Agendar tu primera cita</span></td></tr>
                <tr><td style="padding: 10px 0;"><span style="color: #059669; margin-right: 10px;">✓</span> <span style="color: #4a5568;">Explorar nuestra selección de lentes</span></td></tr>
                <tr><td style="padding: 10px 0;"><span style="color: #059669; margin-right: 10px;">✓</span> <span style="color: #4a5568;">Ver tu historial de recetas</span></td></tr>
                <tr><td style="padding: 10px 0;"><span style="color: #059669; margin-right: 10px;">✓</span> <span style="color: #4a5568;">Recibir ofertas especiales</span></td></tr>
              </table>
            </td>
          </tr>
        </table>
        <table width="100%" cellspacing="0" cellpadding="0">
          <tr><td style="text-align: center; padding: 0 10px;"><a href="{{booking_url}}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; margin-bottom: 10px;">📅 Agendar Cita</a></td></tr>
          <tr><td style="text-align: center; padding: 0 10px;"><a href="{{portal_url}}" style="color: #64748b; font-size: 14px; text-decoration: none;">🔐 Acceder a Mi Portal</a></td></tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="background: #1e3a5f; padding: 25px 30px; text-align: center;">
        <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 18px; font-weight: 600;">{{organization_name}}</p>
        <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 13px;">Tu salud visual es nuestra prioridad</p>
      </td>
    </tr>
  </table>
</body>
</html>
',
  '["customer_first_name", "organization_name", "booking_url", "portal_url", "branch_name", "branch_phone", "branch_email"]',
  true,
  'optica',
  NOW(),
  NOW()
);

-- Formulario de Contacto
INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, category, created_at, updated_at)
VALUES (
  'contact_form',
  'Confirmación de Formulario de Contacto',
  '📬 Hemos recibido tu mensaje - {{organization_name}}',
  '
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mensaje Recibido</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f7fa;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
    <tr>
      <td style="background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); padding: 35px 30px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 10px;">📬</div>
        <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 600;">¡Mensaje Recibido!</h1>
        <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Gracias por contactarnos</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 35px 30px;">
        <p style="font-size: 18px; color: #1e3a5f; margin-bottom: 25px;">Hola <strong>{{customer_first_name}}</strong>,</p>
        <p style="font-size: 15px; color: #4a5568; line-height: 1.7; margin-bottom: 25px;">Hemos recibido tu mensaje correctamente. Nuestro equipo lo revisará y te responderá a la brevedad posible.</p>
        <table width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #ecfeff 0%, #cffafe 100%); border-radius: 10px; border: 1px solid #67e8f9; margin-bottom: 25px;">
          <tr>
            <td style="padding: 20px;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #155e75;"><strong>📝 Tu mensaje:</strong></p>
              <p style="margin: 0; font-size: 14px; color: #4a5568; font-style: italic;">"{{message_preview}}..."</p>
            </td>
          </tr>
        </table>
        <table width="100%" cellspacing="0" cellpadding="0" style="background: #f8fafc; border-radius: 8px; margin-bottom: 20px;">
          <tr><td style="padding: 15px; text-align: center;"><p style="margin: 0; font-size: 14px; color: #64748b;">Tiempo estimado de respuesta: <strong style="color: #1e3a5f;">{{response_time}}</strong></p></td></tr>
        </table>
        <table width="100%" cellspacing="0" cellpadding="0">
          <tr><td style="text-align: center; padding: 0 10px;"><a href="{{organization_phone}}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">📞 Llamar Ahora</a></td></tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="background: #1e3a5f; padding: 25px 30px; text-align: center;">
        <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 18px; font-weight: 600;">{{organization_name}}</p>
        <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 13px;">Tu salud visual es nuestra prioridad</p>
      </td>
    </tr>
  </table>
</body>
</html>
',
  '["customer_first_name", "message_preview", "response_time", "organization_phone", "organization_name", "support_email"]',
  true,
  'optica',
  NOW(),
  NOW()
);

-- Cumpleaños
INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, category, created_at, updated_at)
VALUES (
  'birthday',
  'Cumpleaños',
  '🎂 ¡Feliz Cumpleaños, {{customer_first_name}}! - {{organization_name}}',
  '
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>¡Feliz Cumpleaños!</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f7fa;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
    <tr>
      <td style="background: linear-gradient(135deg, #ec4899 0%, #db2777 100%); padding: 35px 30px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 10px;">🎂</div>
        <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 600;">¡Feliz Cumpleaños!</h1>
        <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Te deseamos un día maravilloso</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 35px 30px;">
        <p style="font-size: 18px; color: #1e3a5f; margin-bottom: 25px;">Hola <strong>{{customer_first_name}}</strong>,</p>
        <p style="font-size: 15px; color: #4a5568; line-height: 1.7; margin-bottom: 25px;">¡Feliz cumpleaños! En este día tan especial, queremos agradecerte por ser parte de nuestra familia. Tu salud visual nos importa, y queremos ayudarte a ver el mundo con claridad en este nuevo año de vida.</p>
        <table width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%); border-radius: 10px; border: 1px solid #f9a8d4; margin-bottom: 25px;">
          <tr>
            <td style="padding: 20px; text-align: center;">
              <p style="margin: 0 0 15px 0; font-size: 16px; color: #9d174d; font-weight: 600;">🎁 Tu regalo de cumpleaños</p>
              <p style="margin: 0 0 20px 0; font-size: 14px; color: #4a5568;">{{birthday_offer}}</p>
              <a href="{{offer_url}}" style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #ec4899 0%, #db2777 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">🎉 Obtener Mi Regalo</a>
            </td>
          </tr>
        </table>
        <table width="100%" cellspacing="0" cellpadding="0">
          <tr><td style="text-align: center; padding: 0 10px;"><a href="{{booking_url}}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">📅 Agendar Revisión Visual</a></td></tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="background: #1e3a5f; padding: 25px 30px; text-align: center;">
        <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 18px; font-weight: 600;">{{organization_name}}</p>
        <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 13px;">Tu salud visual es nuestra prioridad</p>
      </td>
    </tr>
  </table>
</body>
</html>
',
  '["customer_first_name", "birthday_offer", "offer_url", "booking_url", "organization_name", "branch_name"]',
  true,
  'optica',
  NOW(),
  NOW()
);

-- ============================================================================
-- 2. PLANTILLAS DE SAAS (11 templates)
-- ============================================================================

-- Bienvenida al SaaS
INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, category, created_at, updated_at)
VALUES (
  'saas_welcome',
  'Bienvenida al SaaS',
  '🎉 ¡Bienvenido a Opttius! Tu plataforma de gestión óptica',
  '
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenido a Opttius</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Helvetica Neue'', Arial, sans-serif; background-color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto;">
    <tr>
      <td style="padding: 40px 0; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 20px;">🎉</div>
        <h1 style="margin: 0 0 20px 0; color: #ffffff; font-size: 32px; font-weight: 700;">¡Bienvenido a Opttius!</h1>
        <p style="margin: 0 0 30px 0; color: #94a3b8; font-size: 18px;">Tu plataforma de gestión integral para ópticas</p>
      </td>
    </tr>
    <tr>
      <td style="background: #1e293b; border-radius: 16px; overflow: hidden;">
        <tr>
          <td style="padding: 40px 30px;">
            <p style="font-size: 18px; color: #e2e8f0; margin-bottom: 25px;">Hola <strong>{{admin_first_name}}</strong>,</p>
            <p style="font-size: 15px; color: #94a3b8; line-height: 1.7; margin-bottom: 25px;">¡Felicitaciones! Tu cuenta en Opttius ha sido creada exitosamente. Ahora tienes acceso a todas las herramientas para gestionar tu óptica de manera eficiente.</p>
            <table width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); border-radius: 12px; padding: 25px; margin-bottom: 25px;">
              <tr><td style="padding: 12px 0;"><span style="color: #10b981; margin-right: 12px;">✓</span> <span style="color: #ffffff;">Gestión de pacientes y recetas</span></td></tr>
              <tr><td style="padding: 12px 0;"><span style="color: #10b981; margin-right: 12px;">✓</span> <span style="color: #ffffff;">Control de inventario</span></td></tr>
              <tr><td style="padding: 12px 0;"><span style="color: #10b981; margin-right: 12px;">✓</span> <span style="color: #ffffff;">Citas y agenda</span></td></tr>
              <tr><td style="padding: 12px 0;"><span style="color: #10b981; margin-right: 12px;">✓</span> <span style="color: #ffffff;">Reportes y analytics</span></td></tr>
              <tr><td style="padding: 12px 0;"><span style="color: #10b981; margin-right: 12px;">✓</span> <span style="color: #ffffff;">Automatización de comunicaciones</span></td></tr>
            </table>
            <table width="100%" cellspacing="0" cellpadding="0">
              <tr><td style="text-align: center; padding: 0 10px;"><a href="{{dashboard_url}}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px;">🚀 Ir al Dashboard</a></td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background: #0f172a; padding: 30px; text-align: center;">
            <p style="margin: 0 0 15px 0; color: #ffffff; font-size: 16px; font-weight: 600;">¿Necesitas ayuda?</p>
            <a href="{{support_url}}" style="color: #3b82f6; font-size: 14px; text-decoration: none;">📧 Contactar Soporte</a>
            <p style="margin: 20px 0 0 0; color: #64748b; font-size: 12px;">© 2024 Opttius. Todos los derechos reservados.</p>
          </td>
        </tr>
      </td>
    </tr>
  </table>
</body>
</html>
',
  '["admin_first_name", "organization_name", "dashboard_url", "support_url", "trial_end_date"]',
  true,
  'saas',
  NOW(),
  NOW()
);

-- Trial Por Terminar
INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, category, created_at, updated_at)
VALUES (
  'saas_trial_ending',
  'Trial Por Terminar',
  '⚠️ Tu período de prueba termina pronto - {{days_remaining}} días restantes',
  '
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tu Trial está por Terminar</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Helvetica Neue'', Arial, sans-serif; background-color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto;">
    <tr>
      <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 35px 30px; text-align: center; border-radius: 16px 16px 0 0;">
        <div style="font-size: 48px; margin-bottom: 10px;">⏰</div>
        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">¡Tu Trial Está por Terminar!</h1>
        <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Tienes {{days_remaining}} días para aprovechar al máximo</p>
      </td>
    </tr>
    <tr>
      <td style="background: #1e293b; padding: 40px 30px;">
        <p style="font-size: 18px; color: #e2e8f0; margin-bottom: 25px;">Hola <strong>{{admin_first_name}}</strong>,</p>
        <p style="font-size: 15px; color: #94a3b8; line-height: 1.7; margin-bottom: 25px;">¿Quieres seguir disfrutando de todas las funcionalidades de Opttius? Tu período de prueba gratuitá está por terminar.</p>
        <table width="100%" cellspacing="0" cellpadding="0" style="background: #334155; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
          <tr><td style="text-align: center; padding-bottom: 20px;"><p style="margin: 0; font-size: 14px; color: #94a3b8;">Tu trial termina el</p><p style="margin: 5px 0 0 0; font-size: 20px; color: #ffffff; font-weight: 600;">{{trial_end_date}}</p></td></tr>
        </table>
        <p style="font-size: 14px; color: #94a3b8; margin-bottom: 20px; text-align: center;">🎁 <strong>Oferta especial:</strong> {{discount_offer}}</p>
        <table width="100%" cellspacing="0" cellpadding="0">
          <tr><td style="text-align: center; padding: 0 10px;"><a href="{{upgrade_url}}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; margin-bottom: 10px;">🔥 Actualizar Ahora</a></td></tr>
          <tr><td style="text-align: center; padding: 0 10px;"><a href="{{demo_url}}" style="color: #94a3b8; font-size: 14px; text-decoration: none;">📅 Agendar Demo Personalizada</a></td></tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="background: #0f172a; padding: 30px; text-align: center; border-radius: 0 0 16px 16px;">
        <p style="margin: 0 0 15px 0; color: #64748b; font-size: 13px;">¿No quieres continuar? <a href="{{cancel_url}}" style="color: #64748b; text-decoration: underline;">Cancelar suscripción</a></p>
        <p style="margin: 0; color: #475569; font-size: 11px;">© 2024 Opttius.</p>
      </td>
    </tr>
  </table>
</body>
</html>
',
  '["admin_first_name", "organization_name", "days_remaining", "trial_end_date", "discount_offer", "upgrade_url", "demo_url", "cancel_url"]',
  true,
  'saas',
  NOW(),
  NOW()
);

-- Suscripción Exitosa
INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, category, created_at, updated_at)
VALUES (
  'saas_subscription_success',
  'Suscripción Exitosa',
  '✅ ¡Suscripción activada! Bienvenido a {{plan_name}}',
  '
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Suscripción Activada</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Helvetica Neue'', Arial, sans-serif; background-color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto;">
    <tr>
      <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 35px 30px; text-align: center; border-radius: 16px 16px 0 0;">
        <div style="font-size: 48px; margin-bottom: 10px;">✅</div>
        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">¡Suscripción Activada!</h1>
        <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Bienvenido a {{plan_name}}</p>
      </td>
    </tr>
    <tr>
      <td style="background: #1e293b; padding: 40px 30px;">
        <p style="font-size: 18px; color: #e2e8f0; margin-bottom: 25px;">Hola <strong>{{admin_first_name}}</strong>,</p>
        <p style="font-size: 15px; color: #94a3b8; line-height: 1.7; margin-bottom: 25px;">¡Excelentes noticias! Tu suscripción ha sido procesada exitosamente. Ahora tienes acceso completo a todas las funcionalidades de tu plan.</p>
        <table width="100%" cellspacing="0" cellpadding="0" style="background: #334155; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
          <tr><td style="padding: 12px 0; border-bottom: 1px solid #475569;"><span style="color: #94a3b8;">Plan:</span> <strong style="color: #ffffff;">{{plan_name}}</strong></td></tr>
          <tr><td style="padding: 12px 0; border-bottom: 1px solid #475569;"><span style="color: #94a3b8;">Monto:</span> <strong style="color: #ffffff;">{{amount}}</strong></td></tr>
          <tr><td style="padding: 12px 0;"><span style="color: #94a3b8;">Próxima facturación:</span> <strong style="color: #ffffff;">{{next_billing_date}}</strong></td></tr>
        </table>
        <table width="100%" cellspacing="0" cellpadding="0">
          <tr><td style="text-align: center; padding: 0 10px;"><a href="{{dashboard_url}}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px;">🚀 Acceder al Dashboard</a></td></tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="background: #0f172a; padding: 30px; text-align: center; border-radius: 0 0 16px 16px;">
        <p style="margin: 0; color: #475569; font-size: 11px;">© 2024 Opttius. Tu factura está disponible en <a href="{{invoice_url}}" style="color: #3b82f6;">tu cuenta</a></p>
      </td>
    </tr>
  </table>
</body>
</html>
',
  '["admin_first_name", "organization_name", "plan_name", "amount", "next_billing_date", "dashboard_url", "invoice_url"]',
  true,
  'saas',
  NOW(),
  NOW()
);

-- Pago Fallido
INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, category, created_at, updated_at)
VALUES (
  'saas_payment_failed',
  'Pago Fallido',
  '⚠️ Problema con tu pago - {{organization_name}}',
  '
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Problema con tu Pago</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Helvetica Neue'', Arial, sans-serif; background-color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto;">
    <tr>
      <td style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 35px 30px; text-align: center; border-radius: 16px 16px 0 0;">
        <div style="font-size: 48px; margin-bottom: 10px;">⚠️</div>
        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Problema con tu Pago</h1>
        <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Necesitamos actualizar tu información de pago</p>
      </td>
    </tr>
    <tr>
      <td style="background: #1e293b; padding: 40px 30px;">
        <p style="font-size: 18px; color: #e2e8f0; margin-bottom: 25px;">Hola <strong>{{admin_first_name}}</strong>,</p>
        <p style="font-size: 15px; color: #94a3b8; line-height: 1.7; margin-bottom: 25px;">Lamentamos informarte que hubo un problema al procesar el pago de tu suscripción. Para evitar interrupciones en el servicio, por favor actualiza tu información de pago.</p>
        <table width="100%" cellspacing="0" cellpadding="0" style="background: #dc2626; background-opacity: 0.1; border: 1px solid #ef4444; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
          <tr><td style="padding: 10px 0;"><p style="margin: 0; font-size: 14px; color: #fca5a5;"><strong>📄 Referencia:</strong> {{invoice_reference}}</p></td></tr>
          <tr><td style="padding: 10px 0;"><p style="margin: 0; font-size: 14px; color: #fca5a5;"><strong>💰 Monto:</strong> {{amount}}</p></td></tr>
          <tr><td style="padding: 10px 0;"><p style="margin: 0; font-size: 14px; color: #fca5a5;"><strong>❌ Error:</strong> {{error_message}}</p></td></tr>
        </table>
        <table width="100%" cellspacing="0" cellpadding="0">
          <tr><td style="text-align: center; padding: 0 10px;"><a href="{{update_payment_url}}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; margin-bottom: 10px;">💳 Actualizar Pago</a></td></tr>
          <tr><td style="text-align: center; padding: 0 10px;"><p style="margin: 0; font-size: 13px; color: #64748b;">Tu servicio continuará activo hasta {{service_suspend_date}}</p></td></tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="background: #0f172a; padding: 30px; text-align: center; border-radius: 0 0 16px 16px;">
        <p style="margin: 0; color: #475569; font-size: 11px;">© 2024 Opttius. ¿Necesitas ayuda? <a href="{{support_url}}" style="color: #3b82f6;">Contáctanos</a></p>
      </td>
    </tr>
  </table>
</body>
</html>
',
  '["admin_first_name", "organization_name", "invoice_reference", "amount", "error_message", "update_payment_url", "service_suspend_date", "support_url"]',
  true,
  'saas',
  NOW(),
  NOW()
);

-- Recordatorio de Pago
INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, category, created_at, updated_at)
VALUES (
  'saas_payment_reminder',
  'Recordatorio de Pago',
  '💳 Recordatorio: Tu pago de suscripción vence pronto',
  '
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recordatorio de Pago</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Helvetica Neue'', Arial, sans-serif; background-color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto;">
    <tr>
      <td style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 35px 30px; text-align: center; border-radius: 16px 16px 0 0;">
        <div style="font-size: 48px; margin-bottom: 10px;">💳</div>
        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Recordatorio de Pago</h1>
        <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Tu suscripción se renovará pronto</p>
      </td>
    </tr>
    <tr>
      <td style="background: #1e293b; padding: 40px 30px;">
        <p style="font-size: 18px; color: #e2e8f0; margin-bottom: 25px;">Hola <strong>{{admin_first_name}}</strong>,</p>
        <p style="font-size: 15px; color: #94a3b8; line-height: 1.7; margin-bottom: 25px;">Te recordamos que el pago de tu suscripción a Opttius se procesará pronto. Asegúrate de que tu método de pago esté actualizado.</p>
        <table width="100%" cellspacing="0" cellpadding="0" style="background: #334155; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
          <tr><td style="padding: 12px 0; border-bottom: 1px solid #475569;"><span style="color: #94a3b8;">Plan actual:</span> <strong style="color: #ffffff;">{{plan_name}}</strong></td></tr>
          <tr><td style="padding: 12px 0; border-bottom: 1px solid #475569;"><span style="color: #94a3b8;">Monto a pagar:</span> <strong style="color: #ffffff;">{{amount}}</strong></td></tr>
          <tr><td style="padding: 12px 0;"><span style="color: #94a3b8;">Fecha de débito:</span> <strong style="color: #fbbf24;">{{payment_date}}</strong></td></tr>
        </table>
        <table width="100%" cellspacing="0" cellpadding="0">
          <tr><td style="text-align: center; padding: 0 10px;"><a href="{{update_payment_url}}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; margin-bottom: 10px;">📝 Actualizar Método de Pago</a></td></tr>
          <tr><td style="text-align: center; padding: 0 10px;"><a href="{{invoice_url}}" style="color: #94a3b8; font-size: 14px; text-decoration: none;">📄 Ver Factura</a></td></tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="background: #0f172a; padding: 30px; text-align: center; border-radius: 0 0 16px 16px;">
        <p style="margin: 0; color: #475569; font-size: 11px;">© 2024 Opttius. <a href="{{cancel_url}}" style="color: #64748b;">Cancelar suscripción</a></p>
      </td>
    </tr>
  </table>
</body>
</html>
',
  '["admin_first_name", "organization_name", "plan_name", "amount", "payment_date", "update_payment_url", "invoice_url", "cancel_url"]',
  true,
  'saas',
  NOW(),
  NOW()
);

-- Alerta de Seguridad
INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, category, created_at, updated_at)
VALUES (
  'saas_security_alert',
  'Alerta de Seguridad',
  '🔒 Actividad inusual detectada en tu cuenta',
  '
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alerta de Seguridad</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Helvetica Neue'', Arial, sans-serif; background-color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto;">
    <tr>
      <td style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 35px 30px; text-align: center; border-radius: 16px 16px 0 0;">
        <div style="font-size: 48px; margin-bottom: 10px;">🔒</div>
        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Alerta de Seguridad</h1>
        <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Actividad inusual detectada</p>
      </td>
    </tr>
    <tr>
      <td style="background: #1e293b; padding: 40px 30px;">
        <p style="font-size: 18px; color: #e2e8f0; margin-bottom: 25px;">Hola <strong>{{admin_first_name}}</strong>,</p>
        <p style="font-size: 15px; color: #94a3b8; line-height: 1.7; margin-bottom: 25px;">Hemos detectado una actividad inusual en tu cuenta de Opttius. Por favor, revisa esta información.</p>
        <table width="100%" cellspacing="0" cellpadding="0" style="background: #7f1d1d; border: 1px solid #ef4444; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
          <tr><td style="padding: 10px 0;"><p style="margin: 0; font-size: 14px; color: #fecaca;"><strong>📍 IP:</strong> {{suspicious_ip}}</p></td></tr>
          <tr><td style="padding: 10px 0;"><p style="margin: 0; font-size: 14px; color: #fecaca;"><strong>🌍 Ubicación:</strong> {{suspicious_location}}</p></td></tr>
          <tr><td style="padding: 10px 0;"><p style="margin: 0; font-size: 14px; color: #fecaca;"><strong>🕐 Hora:</strong> {{suspicious_time}}</p></td></tr>
          <tr><td style="padding: 10px 0;"><p style="margin: 0; font-size: 14px; color: #fecaca;"><strong>🔧 Acción:</strong> {{suspicious_action}}</p></td></tr>
        </table>
        <p style="font-size: 14px; color: #94a3b8; margin-bottom: 20px;">¿Fuiste tú? Si no reconoces esta actividad, te recomendamos cambiar tu contraseña inmediatamente.</p>
        <table width="100%" cellspacing="0" cellpadding="0">
          <tr><td style="text-align: center; padding: 0 10px;"><a href="{{secure_account_url}}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; margin-bottom: 10px;">🔐 Proteger Mi Cuenta</a></td></tr>
          <tr><td style="text-align: center; padding: 0 10px;"><a href="{{report_url}}" style="color: #94a3b8; font-size: 14px; text-decoration: none;">❌ No fui yo, reportar actividad</a></td></tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="background: #0f172a; padding: 30px; text-align: center; border-radius: 0 0 16px 16px;">
        <p style="margin: 0 0 15px 0; color: #64748b; font-size: 12px;">Si realizaste esta acción, puedes ignorar este correo.</p>
        <p style="margin: 0; color: #475569; font-size: 11px;">© 2024 Opttius. <a href="{{support_url}}" style="color: #3b82f6;">Soporte</a></p>
      </td>
    </tr>
  </table>
</body>
</html>
',
  '["admin_first_name", "organization_name", "suspicious_ip", "suspicious_location", "suspicious_time", "suspicious_action", "secure_account_url", "report_url", "support_url"]',
  true,
  'saas',
  NOW(),
  NOW()
);

-- Onboarding
INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, category, created_at, updated_at)
VALUES (
  'saas_onboarding',
  'Onboarding',
  '🚀 ¡Comienza a usar Opttius! - Paso {{step_number}} de {{total_steps}}',
  '
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Comenzando con Opttius</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Helvetica Neue'', Arial, sans-serif; background-color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto;">
    <tr>
      <td style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 35px 30px; text-align: center; border-radius: 16px 16px 0 0;">
        <div style="font-size: 48px; margin-bottom: 10px;">🚀</div>
        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">¡Vamos a Configurar tu Óptica!</h1>
        <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Paso {{step_number}} de {{total_steps}}</p>
      </td>
    </tr>
    <tr>
      <td style="background: #1e293b; padding: 40px 30px;">
        <p style="font-size: 18px; color: #e2e8f0; margin-bottom: 25px;">Hola <strong>{{admin_first_name}}</strong>,</p>
        <p style="font-size: 15px; color: #94a3b8; line-height: 1.7; margin-bottom: 25px;">{{step_description}}</p>
        <table width="100%" cellspacing="0" cellpadding="0" style="background: #334155; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
          <tr><td style="text-align: center;"><p style="margin: 0 0 20px 0; font-size: 16px; color: #ffffff; font-weight: 600;">{{step_title}}</p></td></tr>
          <tr><td style="text-align: center;"><a href="{{step_url}}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">▶️Comenzar Este Paso</a></td></tr>
        </table>
        <table width="100%" cellspacing="0" cellpadding="0" style="background: #0f172a; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
          <tr>
            <td style="text-align: center; padding: 10px;">
              <p style="margin: 0; font-size: 12px; color: #64748b;">Progreso</p>
              <div style="background: #334155; border-radius: 10px; height: 8px; margin-top: 10px;">
                <div style="background: #10b981; border-radius: 10px; height: 8px; width: {{progress_percentage}}%;"></div>
              </div>
              <p style="margin: 10px 0 0 0; font-size: 12px; color: #94a3b8;">{{progress_percentage}}% completado</p>
            </td>
          </tr>
        </table>
        <table width="100%" cellspacing="0" cellpadding="0">
          <tr><td style="text-align: center; padding: 0 10px;"><a href="{{skip_url}}" style="color: #64748b; font-size: 13px; text-decoration: none;">⏭️ Saltar por ahora</a></td></tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="background: #0f172a; padding: 30px; text-align: center; border-radius: 0 0 16px 16px;">
        <p style="margin: 0; color: #475569; font-size: 11px;">© 2024 Opttius. ¿Necesitas ayuda? <a href="{{support_url}}" style="color: #3b82f6;">Guía de inicio</a></p>
      </td>
    </tr>
  </table>
</body>
</html>
',
  '["admin_first_name", "organization_name", "step_number", "total_steps", "step_description", "step_title", "step_url", "progress_percentage", "skip_url", "support_url"]',
  true,
  'saas',
  NOW(),
  NOW()
);

-- Actualización de Términos
INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, category, created_at, updated_at)
VALUES (
  'saas_terms_update',
  'Actualización de Términos',
  '📋 Actualización de Términos y Condiciones - Opttius',
  '
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nuevos Términos</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Helvetica Neue'', Arial, sans-serif; background-color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto;">
    <tr>
      <td style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 35px 30px; text-align: center; border-radius: 16px 16px 0 0;">
        <div style="font-size: 48px; margin-bottom: 10px;">📋</div>
        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Términos Actualizados</h1>
        <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Nuevos términos y condiciones</p>
      </td>
    </tr>
    <tr>
      <td style="background: #1e293b; padding: 40px 30px;">
        <p style="font-size: 18px; color: #e2e8f0; margin-bottom: 25px;">Hola <strong>{{admin_first_name}}</strong>,</p>
        <p style="font-size: 15px; color: #94a3b8; line-height: 1.7; margin-bottom: 25px;">Hemos actualizado nuestros Términos de Servicio y Política de Privacidad. Estos cambios entrarán en vigor a partir del <strong>{{effective_date}}</strong>.</p>
        <p style="font-size: 15px; color: #94a3b8; line-height: 1.7; margin-bottom: 25px;">{{changes_summary}}</p>
        <table width="100%" cellspacing="0" cellpadding="0">
          <tr><td style="text-align: center; padding: 0 10px;"><a href="{{terms_url}}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; margin-bottom: 10px;">📖 Leer los Nuevos Términos</a></td></tr>
          <tr><td style="text-align: center; padding: 0 10px;"><a href="{{accept_url}}" style="display: inline-block; padding: 14px 28px; background: #334155; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">✓ Aceptar Términos</a></td></tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="background: #0f172a; padding: 30px; text-align: center; border-radius: 0 0 16px 16px;">
        <p style="margin: 0 0 15px 0; color: #64748b; font-size: 12px;">Si no aceptas los nuevos términos, puedes <a href="{{cancel_url}}" style="color: #ef4444;">cancelar tu suscripción</a></p>
        <p style="margin: 0; color: #475569; font-size: 11px;">© 2024 Opttius.</p>
      </td>
    </tr>
  </table>
</body>
</html>
',
  '["admin_first_name", "organization_name", "effective_date", "changes_summary", "terms_url", "accept_url", "cancel_url"]',
  true,
  'saas',
  NOW(),
  NOW()
);

-- Mantenimiento Programado
INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, category, created_at, updated_at)
VALUES (
  'saas_maintenance',
  'Mantenimiento Programado',
  '🔧 Mantenimiento programado - {{maintenance_date}}',
  '
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mantenimiento Programado</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Helvetica Neue'', Arial, sans-serif; background-color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto;">
    <tr>
      <td style="background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%); padding: 35px 30px; text-align: center; border-radius: 16px 16px 0 0;">
        <div style="font-size: 48px; margin-bottom: 10px;">🔧</div>
        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Mantenimiento Programado</h1>
        <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Mejoras en tu plataforma</p>
      </td>
    </tr>
    <tr>
      <td style="background: #1e293b; padding: 40px 30px;">
        <p style="font-size: 18px; color: #e2e8f0; margin-bottom: 25px;">Hola <strong>{{admin_first_name}}</strong>,</p>
        <p style="font-size: 15px; color: #94a3b8; line-height: 1.7; margin-bottom: 25px;">Te informamos que realizaremos mantenimiento programado en la plataforma. Durante este tiempo, algunos servicios podrían estar temporalmente no disponibles.</p>
        <table width="100%" cellspacing="0" cellpadding="0" style="background: #334155; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
          <tr><td style="padding: 12px 0; border-bottom: 1px solid #475569;"><span style="color: #94a3b8;">📅 Fecha:</span> <strong style="color: #ffffff;">{{maintenance_date}}</strong></td></tr>
          <tr><td style="padding: 12px 0; border-bottom: 1px solid #475569;"><span style="color: #94a3b8;">🕐 Horario:</span> <strong style="color: #ffffff;">{{maintenance_window}}</strong></td></tr>
          <tr><td style="padding: 12px 0;"><span style="color: #94a3b8;">🔧 Mejoras:</span> <strong style="color: #ffffff;">{{improvements}}</strong></td></tr>
        </table>
        <p style="font-size: 14px; color: #94a3b8; margin-bottom: 20px;">{{additional_info}}</p>
        <table width="100%" cellspacing="0" cellpadding="0">
          <tr><td style="text-align: center; padding: 0 10px;"><a href="{{status_url}}" style="color: #3b82f6; font-size: 14px; text-decoration: none;">📊 Ver Estado del Sistema</a></td></tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="background: #0f172a; padding: 30px; text-align: center; border-radius: 0 0 16px 16px;">
        <p style="margin: 0 0 15px 0; color: #64748b; font-size: 12px;">Disculpa las molestias. ¡Las mejoras beneficiarán tu experiencia!</p>
        <p style="margin: 0; color: #475569; font-size: 11px;">© 2024 Opttius.</p>
      </td>
    </tr>
  </table>
</body>
</html>
',
  '["admin_first_name", "organization_name", "maintenance_date", "maintenance_window", "improvements", "additional_info", "status_url"]',
  true,
  'saas',
  NOW(),
  NOW()
);

-- Alerta de Uso
INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, category, created_at, updated_at)
VALUES (
  'saas_usage_alert',
  'Alerta de Uso',
  '📊 {{usage_percentage}}% de tu límite - {{organization_name}}',
  '
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alerta de Uso</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Helvetica Neue'', Arial, sans-serif; background-color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto;">
    <tr>
      <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 35px 30px; text-align: center; border-radius: 16px 16px 0 0;">
        <div style="font-size: 48px; margin-bottom: 10px;">📊</div>
        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">¡Casi llegas al Límite!</h1>
        <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Has usado el {{usage_percentage}}% de tu plan</p>
      </td>
    </tr>
    <tr>
      <td style="background: #1e293b; padding: 40px 30px;">
        <p style="font-size: 18px; color: #e2e8f0; margin-bottom: 25px;">Hola <strong>{{admin_first_name}}</strong>,</p>
        <p style="font-size: 15px; color: #94a3b8; line-height: 1.7; margin-bottom: 25px;">¡Excelente! Tu óptica está creciendo. Has alcanzado el {{usage_percentage}}% de tu límite actual. Considere actualizar tu plan para seguir creciendo sin límites.</p>
        <div style="background: #334155; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
          <p style="margin: 0 0 20px 0; font-size: 16px; color: #ffffff; font-weight: 600;">{{resource_type}}</p>
          <div style="background: #0f172a; border-radius: 10px; height: 12px; margin-bottom: 10px;">
            <div style="background: linear-gradient(90deg, #10b981 0%, #f59e0b 50%, #ef4444 100%); border-radius: 10px; height: 12px; width: {{usage_percentage}}%;"></div>
          </div>
          <p style="margin: 0; font-size: 13px; color: #94a3b8;">{{used_resources}} de {{total_resources}}</p>
        </div>
        <table width="100%" cellspacing="0" cellpadding="0">
          <tr><td style="text-align: center; padding: 0 10px;"><a href="{{upgrade_url}}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; margin-bottom: 10px;">📈 Ver Planes</a></td></tr>
          <tr><td style="text-align: center; padding: 0 10px;"><a href="{{usage_url}}" style="color: #94a3b8; font-size: 14px; text-decoration: none;">📊 Ver Detalles de Uso</a></td></tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="background: #0f172a; padding: 30px; text-align: center; border-radius: 0 0 16px 16px;">
        <p style="margin: 0 0 15px 0; color: #64748b; font-size: 12px;">Tu servicio no se verá afectado hasta que alcances el 100%.</p>
        <p style="margin: 0; color: #475569; font-size: 11px;">© 2024 Opttius.</p>
      </td>
    </tr>
  </table>
</body>
</html>
',
  '["admin_first_name", "organization_name", "usage_percentage", "resource_type", "used_resources", "total_resources", "upgrade_url", "usage_url"]',
  true,
  'saas',
  NOW(),
  NOW()
);

-- Anuncio de Nueva Funcionalidad
INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, category, created_at, updated_at)
VALUES (
  'saas_feature_announcement',
  'Anuncio de Nueva Funcionalidad',
  '✨ {{feature_name}} ya está disponible en Opttius',
  '
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nueva Funcionalidad</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Helvetica Neue'', Arial, sans-serif; background-color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto;">
    <tr>
      <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 35px 30px; text-align: center; border-radius: 16px 16px 0 0;">
        <div style="font-size: 48px; margin-bottom: 10px;">✨</div>
        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">¡Nueva Funcionalidad!</h1>
        <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">{{feature_name}}</p>
      </td>
    </tr>
    <tr>
      <td style="background: #1e293b; padding: 40px 30px;">
        <p style="font-size: 18px; color: #e2e8f0; margin-bottom: 25px;">Hola <strong>{{admin_first_name}}</strong>,</p>
        <p style="font-size: 15px; color: #94a3b8; line-height: 1.7; margin-bottom: 25px;">¡Tenemos excelentes noticias! {{feature_intro}}</p>
        <table width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); border-radius: 12px; padding: 25px; margin-bottom: 25px;">
          <tr><td style="padding: 12px 0;"><span style="color: #10b981; margin-right: 12px;">✓</span> <span style="color: #ffffff;">{{benefit_1}}</span></td></tr>
          <tr><td style="padding: 12px 0;"><span style="color: #10b981; margin-right: 12px;">✓</span> <span style="color: #ffffff;">{{benefit_2}}</span></td></tr>
          <tr><td style="padding: 12px 0;"><span style="color: #10b981; margin-right: 12px;">✓</span> <span style="color: #ffffff;">{{benefit_3}}</span></td></tr>
        </table>
        <table width="100%" cellspacing="0" cellpadding="0">
          <tr><td style="text-align: center; padding: 0 10px;"><a href="{{feature_url}}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; margin-bottom: 10px;">🚀 Probar {{feature_name}}</a></td></tr>
          <tr><td style="text-align: center; padding: 0 10px;"><a href="{{docs_url}}" style="color: #94a3b8; font-size: 14px; text-decoration: none;">📖 Ver Documentación</a></td></tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="background: #0f172a; padding: 30px; text-align: center; border-radius: 0 0 16px 16px;">
        <p style="margin: 0 0 15px 0; color: #64748b; font-size: 12px;">{{additional_info}}</p>
        <p style="margin: 0; color: #475569; font-size: 11px;">© 2024 Opttius.</p>
      </td>
    </tr>
  </table>
</body>
</html>
',
  '["admin_first_name", "organization_name", "feature_name", "feature_intro", "benefit_1", "benefit_2", "benefit_3", "feature_url", "docs_url", "additional_info"]',
  true,
  'saas',
  NOW(),
  NOW()
);
