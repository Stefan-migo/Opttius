-- ============================================================================
-- Email Templates Insert - CORRECTED (category = 'organization')
-- ============================================================================

-- Optica Templates (category = 'organization')

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
  'organization',
  NOW(),
  NOW()
);

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
  'organization',
  NOW(),
  NOW()
);

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
  'organization',
  NOW(),
  NOW()
);

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
  'organization',
  NOW(),
  NOW()
);

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
  'organization',
  NOW(),
  NOW()
);

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
  'organization',
  NOW(),
  NOW()
);

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
  'organization',
  NOW(),
  NOW()
);

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
  'organization',
  NOW(),
  NOW()
);

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
  'organization',
  NOW(),
  NOW()
);

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
  'organization',
  NOW(),
  NOW()
);

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
  'organization',
  NOW(),
  NOW()
);

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
  'organization',
  NOW(),
  NOW()
);
