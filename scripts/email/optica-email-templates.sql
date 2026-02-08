-- ============================================================================
-- PLANTILLAS DE EMAIL PARA ÓPTICA - 12 PLANTILLAS COMPLETAS
-- ============================================================================
-- Estas plantillas reemplazan las plantillas de e-commerce obsoletas
-- y cubren todas las necesidades de comunicación de una óptica con sus clientes
-- ============================================================================

-- Verificar templates existentes antes de insertar
-- SELECT * FROM system_email_templates WHERE type IN ('appointment_confirmation', 'appointment_reminder', 'appointment_reminder_2h', 'appointment_cancelation', 'prescription_ready', 'prescription_expiring', 'work_order_ready', 'quote_sent', 'quote_expiring', 'account_welcome', 'contact_form', 'birthday');

-- ============================================================================
-- 1. CONFIRMACIÓN DE CITA
-- ============================================================================

INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, category, description, created_at, updated_at)
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
    <!-- Header con gradiente -->
    <tr>
      <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 35px 30px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 10px;">📅</div>
        <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 600;">¡Tu Cita Confirmada!</h1>
        <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Te esperamos pronto</p>
      </td>
    </tr>

    <!-- Contenido Principal -->
    <tr>
      <td style="padding: 35px 30px;">
        <!-- Saludo Personalizado -->
        <p style="font-size: 18px; color: #1e3a5f; margin-bottom: 25px;">
          Hola <strong>{{customer_first_name}}</strong>,
        </p>

        <p style="font-size: 15px; color: #4a5568; line-height: 1.7; margin-bottom: 25px;">
          Tu cita ha sido confirmada exitosamente. A continuación encontrarás todos los detalles:
        </p>

        <!-- Box de Información de la Cita -->
        <table width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%); border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 25px;">
          <tr>
            <td style="padding: 20px;">
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #94a3b8; font-size: 13px; text-transform: uppercase;">📆 Fecha</span><br>
                    <strong style="color: #1e3a5f; font-size: 17px;">{{appointment_date}}</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #94a3b8; font-size: 13px; text-transform: uppercase;">🕐 Hora</span><br>
                    <strong style="color: #1e3a5f; font-size: 17px;">{{appointment_time}}</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #94a3b8; font-size: 13px; text-transform: uppercase;">👨‍⚕️ Profesional</span><br>
                    <strong style="color: #1e3a5f; font-size: 17px;">{{professional_name}}</strong>
                    {{#if professional_title}}
                    <br><span style="color: #64748b; font-size: 14px;">{{professional_title}}</span>
                    {{/if}}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #94a3b8; font-size: 13px; text-transform: uppercase;">📍 Sucursal</span><br>
                    <strong style="color: #1e3a5f; font-size: 17px;">{{branch_name}}</strong>
                    {{#if branch_address}}
                    <br><span style="color: #64748b; font-size: 14px;">{{branch_address}}</span>
                    {{/if}}
                  </td>
                </tr>
                {{#if appointment_type}}
                <tr>
                  <td style="padding: 12px 0;">
                    <span style="color: #94a3b8; font-size: 13px; text-transform: uppercase;">🔍 Tipo de Cita</span><br>
                    <strong style="color: #1e3a5f; font-size: 17px;">{{appointment_type}}</strong>
                  </td>
                </tr>
                {{/if}}
              </table>
            </td>
          </tr>
        </table>

        {{#if preparation_instructions}}
        <!-- Instrucciones de Preparación -->
        <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px 20px; border-radius: 0 8px 8px 0; margin-bottom: 25px;">
          <p style="margin: 0 0 8px 0; color: #92400e; font-weight: 600; font-size: 14px;">⚠️ Instrucciones importantes:</p>
          <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.6;">{{preparation_instructions}}</p>
        </div>
        {{/if}}

        <!-- Botones de Acción -->
        <table width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 25px;">
          <tr>
            <td style="text-align: center; padding: 0 10px;">
              <a href="{{confirmation_url}}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; margin-bottom: 10px;">
                📋 Guardar en Calendario
              </a>
            </td>
          </tr>
          <tr>
            <td style="text-align: center; padding: 0 10px;">
              <a href="{{reschedule_url}}" style="color: #64748b; font-size: 14px; text-decoration: none;">
                ¿Necesitas reprogramar? Haz clic aquí
              </a>
            </td>
          </tr>
        </table>

        <!-- Información de Contacto -->
        <div style="background: #f1f5f9; border-radius: 10px; padding: 20px; text-align: center;">
          <p style="margin: 0 0 12px 0; color: #475569; font-size: 14px;">
            <strong>¿Tienes alguna pregunta?</strong> Contáctanos:
          </p>
          <p style="margin: 0;">
            {{#if branch_phone}}
            <a href="tel:{{branch_phone}}" style="color: #1e3a5f; text-decoration: none; margin-right: 15px;">📞 {{branch_phone}}</a>
            {{/if}}
            {{#if branch_email}}
            <a href="mailto:{{branch_email}}" style="color: #1e3a5f; text-decoration: none;">✉️ {{branch_email}}</a>
            {{/if}}
          </p>
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background: #1e3a5f; padding: 25px 30px; text-align: center;">
        <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 18px; font-weight: 600;">{{organization_name}}</p>
        <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 13px;">
          Tu salud visual es nuestra prioridad
        </p>
      </td>
    </tr>
  </table>

  <!-- Mensaje de derechos -->
  <p style="text-align: center; color: #94a3b8; font-size: 12px; margin-top: 20px;">
    Este mensaje fue enviado a {{customer_email}}<br>
    © {{current_year}} {{organization_name}}. Todos los derechos reservados.
  </p>
</body>
</html>
',
  '["customer_first_name", "appointment_date", "appointment_time", "professional_name", "professional_title", "branch_name", "branch_address", "branch_phone", "branch_email", "appointment_type", "preparation_instructions", "confirmation_url", "reschedule_url", "organization_name", "customer_email"]',
  true,
  'optica',
  'Email de confirmación cuando se agenda una cita en la óptica',
  NOW(),
  NOW()
);

-- ============================================================================
-- 2. RECORDATORIO DE CITA - 24 HORAS
-- ============================================================================

INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, category, description, created_at, updated_at)
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
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 35px 30px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 10px;">⏰</div>
        <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 600;">¡Tienes una Cita Mañana!</h1>
        <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">No olvides tu visita</p>
      </td>
    </tr>

    <!-- Contenido -->
    <tr>
      <td style="padding: 35px 30px;">
        <p style="font-size: 18px; color: #1e3a5f; margin-bottom: 25px;">
          Hola <strong>{{customer_first_name}}</strong>,
        </p>

        <p style="font-size: 15px; color: #4a5568; line-height: 1.7; margin-bottom: 25px;">
          Te recordamos que tienes una cita programada para <strong>mañana</strong>. Queremos asegurarnos de que estés preparado.
        </p>

        <!-- Resumen de la Cita -->
        <table width="100%" cellspacing="0" cellpadding="0" style="background: #fef3c7; border-radius: 10px; margin-bottom: 25px;">
          <tr>
            <td style="padding: 25px; text-align: center;">
              <p style="margin: 0 0 15px 0; color: #92400e; font-size: 14px; text-transform: uppercase; font-weight: 600;">Tu cita es</p>
              <p style="margin: 0 0 5px 0; color: #1e3a5f; font-size: 28px; font-weight: 700;">{{appointment_date}}</p>
              <p style="margin: 0 0 15px 0; color: #1e3a5f; font-size: 24px; font-weight: 600;">a las {{appointment_time}}</p>
              <hr style="border: none; border-top: 1px solid #fbbf24; margin: 15px 0;">
              <p style="margin: 0; color: #78350f; font-size: 15px;">
                📍 {{branch_name}}<br>
                👨‍⚕️ {{professional_name}}
              </p>
            </td>
          </tr>
        </table>

        {{#if preparation_instructions}}
        <!-- Lista de recordatorios -->
        <div style="background: #ffffff; border: 2px dashed #e2e8f0; border-radius: 10px; padding: 20px; margin-bottom: 25px;">
          <p style="margin: 0 0 15px 0; color: #1e3a5f; font-weight: 600; font-size: 16px;">📝 Para tu visita:</p>
          <ul style="margin: 0; padding-left: 20px; color: #4a5568; line-height: 2;">
            <li>{{preparation_instructions}}</li>
            <li>Llegar 10 minutos antes</li>
            <li>Traer tu identificación</li>
          </ul>
        </div>
        {{/if}}

        <!-- Botones -->
        <table width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
          <tr>
            <td style="text-align: center; padding: 0 10px;">
              <a href="{{reschedule_url}}" style="display: inline-block; padding: 12px 24px; background: #f1f5f9; color: #475569; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
                🔄 Necesito reprogramar
              </a>
            </td>
          </tr>
        </table>

        <p style="text-align: center; color: #64748b; font-size: 14px; margin-bottom: 0;">
          Si necesitas cancelar, te pedimos que lo hagas con al menos 24 horas de anticipación.
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background: #1e3a5f; padding: 25px 30px; text-align: center;">
        <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 18px; font-weight: 600;">{{organization_name}}</p>
        <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 13px;">
          Tu salud visual es nuestra prioridad
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
',
  '["customer_first_name", "appointment_date", "appointment_time", "professional_name", "branch_name", "branch_address", "branch_phone", "preparation_instructions", "reschedule_url", "organization_name"]',
  true,
  'optica',
  'Email recordatorio 24 horas antes de la cita',
  NOW(),
  NOW()
);

-- ============================================================================
-- 3. RECORDATORIO DE CITA - 2 HORAS
-- ============================================================================

INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, category, description, created_at, updated_at)
VALUES (
  'appointment_reminder_2h',
  'Recordatorio de Cita (2h)',
  '🕐 En 2 horas: Tu cita a las {{appointment_time}} en {{branch_name}}',
  '
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tu Cita Está Cerca</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f7fa;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 35px 30px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 10px;">🕐</div>
        <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 600;">¡Tu Cita Está Cerca!</h1>
        <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Te esperamos en breve</p>
      </td>
    </tr>

    <!-- Contenido -->
    <tr>
      <td style="padding: 35px 30px; text-align: center;">
        <p style="font-size: 18px; color: #1e3a5f; margin-bottom: 25px;">
          Hola <strong>{{customer_first_name}}</strong>,
        </p>

        <p style="font-size: 15px; color: #4a5568; line-height: 1.7; margin-bottom: 30px;">
          Solo faltan <strong>2 horas</strong> para tu cita. ¡Nos vemos pronto!
        </p>

        <!-- Información clara y grande -->
        <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 12px; padding: 30px; margin-bottom: 25px;">
          <p style="margin: 0 0 10px 0; color: #065f46; font-size: 16px;">🕐 <strong>{{appointment_time}}</strong></p>
          <p style="margin: 0 0 5px 0; color: #1e3a5f; font-size: 20px; font-weight: 600;">{{branch_name}}</p>
          {{#if branch_address}}
          <p style="margin: 0; color: #64748b; font-size: 14px;">{{branch_address}}</p>
          {{/if}}
          {{#if branch_phone}}
          <p style="margin: 15px 0 0 0; color: #059669; font-size: 14px;">
            📞 <a href="tel:{{branch_phone}}" style="color: #059669; text-decoration: none;">{{branch_phone}}</a>
          </p>
          {{/if}}
        </div>

        <!-- Recordatorio breve -->
        <div style="background: #fef3c7; border-radius: 8px; padding: 15px 20px; display: inline-block;">
          <p style="margin: 0; color: #92400e; font-size: 14px;">
            💡 No olvides traer tu DNI y llegar 10 minutos antes
          </p>
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background: #1e3a5f; padding: 25px 30px; text-align: center;">
        <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 18px; font-weight: 600;">{{organization_name}}</p>
        <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 13px;">
          Tu salud visual es nuestra prioridad
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
',
  '["customer_first_name", "appointment_time", "professional_name", "branch_name", "branch_address", "branch_phone", "organization_name"]',
  true,
  'optica',
  'Email recordatorio 2 horas antes de la cita',
  NOW(),
  NOW()
);

-- ============================================================================
-- 4. CANCELACIÓN DE CITA
-- ============================================================================

INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, category, description, created_at, updated_at)
VALUES (
  'appointment_cancelation',
  'Cancelación de Cita',
  '📅 Tu cita del {{appointment_date}} ha sido cancelada',
  '
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cancelación de Cita</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f7fa;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 35px 30px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 10px;">📅</div>
        <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 600;">Cita Cancelada</h1>
        <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">{{appointment_date}} a las {{appointment_time}}</p>
      </td>
    </tr>

    <!-- Contenido -->
    <tr>
      <td style="padding: 35px 30px;">
        <p style="font-size: 18px; color: #1e3a5f; margin-bottom: 25px;">
          Hola <strong>{{customer_first_name}}</strong>,
        </p>

        <p style="font-size: 15px; color: #4a5568; line-height: 1.7; margin-bottom: 25px;">
          Tu cita programada para el <strong>{{appointment_date}}</strong> a las <strong>{{appointment_time}}</strong> ha sido cancelada.
        </p>

        {{#if cancellation_reason}}
        <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px 20px; border-radius: 0 8px 8px 0; margin-bottom: 25px;">
          <p style="margin: 0; color: #991b1b; font-size: 14px;">
            <strong>Motivo:</strong> {{cancellation_reason}}
          </p>
        </div>
        {{/if}}

        <!-- Botón para agendar nueva cita -->
        <div style="text-align: center; padding: 20px 0;">
          <p style="margin: 0 0 15px 0; color: #4a5568; font-size: 15px;">
            ¿Te gustaría agendar una nueva cita?
          </p>
          <a href="{{booking_url}}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
            📅 Agendar Nueva Cita
          </a>
        </div>

        <!-- Información de contacto -->
        <div style="background: #f1f5f9; border-radius: 10px; padding: 20px; text-align: center;">
          <p style="margin: 0 0 10px 0; color: #475569; font-size: 14px;">
            <strong>¿Necesitas ayuda?</strong>
          </p>
          <p style="margin: 0;">
            {{#if branch_phone}}
            <a href="tel:{{branch_phone}}" style="color: #1e3a5f; text-decoration: none; margin-right: 15px;">📞 {{branch_phone}}</a>
            {{/if}}
            {{#if branch_email}}
            <a href="mailto:{{branch_email}}" style="color: #1e3a5f; text-decoration: none;">✉️ {{branch_email}}</a>
            {{/if}}
          </p>
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background: #1e3a5f; padding: 25px 30px; text-align: center;">
        <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 18px; font-weight: 600;">{{organization_name}}</p>
        <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 13px;">
          Tu salud visual es nuestra prioridad
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
',
  '["customer_first_name", "appointment_date", "appointment_time", "branch_name", "branch_phone", "branch_email", "booking_url", "cancellation_reason", "organization_name"]',
  true,
  'optica',
  'Email de notificación cuando se cancela una cita',
  NOW(),
  NOW()
);

-- ============================================================================
-- 5. RECETA LISTA PARA RETIRAR
-- ============================================================================

INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, category, description, created_at, updated_at)
VALUES (
  'prescription_ready',
  'Receta Lista para Retirar',
  '✅ ¡Tu receta está lista! Recógela en {{branch_name}}',
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
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 35px 30px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 10px;">👓</div>
        <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 600;">¡Tu Receta Está Lista!</h1>
        <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Ya puedes pasar a retirarla</p>
      </td>
    </tr>

    <!-- Contenido -->
    <tr>
      <td style="padding: 35px 30px;">
        <p style="font-size: 18px; color: #1e3a5f; margin-bottom: 25px;">
          Hola <strong>{{customer_first_name}}</strong>,
        </p>

        <p style="font-size: 15px; color: #4a5568; line-height: 1.7; margin-bottom: 25px;">
          🎉 ¡Excelentes noticias! Tu receta oftalmológica ya está lista para retirar. Pasa por nuestra sucursal cuando quieras.
        </p>

        <!-- Información de la Sucursal -->
        <table width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%); border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 25px;">
          <tr>
            <td style="padding: 20px;">
              <p style="margin: 0 0 15px 0; color: #1e3a5f; font-size: 18px; font-weight: 600;">
                📍 {{branch_name}}
              </p>
              {{#if branch_address}}
              <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">
                📌 {{branch_address}}
              </p>
              {{/if}}
              {{#if branch_hours}}
              <p style="margin: 0; color: #64748b; font-size: 14px;">
                🕐 {{branch_hours}}
              </p>
              {{/if}}
            </td>
          </tr>
        </table>

        <!-- Detalles de la Graduación (opcional) -->
        {{#if show_graduation}}
        <div style="background: #ffffff; border: 2px solid #e2e8f0; border-radius: 10px; padding: 20px; margin-bottom: 25px;">
          <p style="margin: 0 0 15px 0; color: #1e3a5f; font-size: 16px; font-weight: 600;">📋 Resumen de tu Receta</p>
          <table width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                <span style="color: #64748b;">Ojo Derecho (OD)</span><br>
                <strong style="color: #1e3a5f;">{{sphere_right}}</strong>
                {{#if cylinder_right}}<br><span style="color: #94a3b8; font-size: 13px;">Cil: {{cylinder_right}} | Eje: {{axis_right}}</span>{{/if}}
              </td>
              <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
                <span style="color: #64748b;">Ojo Izquierdo (OI)</span><br>
                <strong style="color: #1e3a5f;">{{sphere_left}}</strong>
                {{#if cylinder_left}}<br><span style="color: #94a3b8; font-size: 13px;">Cil: {{cylinder_left}} | Eje: {{axis_left}}</span>{{/if}}
              </td>
            </tr>
            {{#if add_right}}
            <tr>
              <td style="padding: 8px 0;" colspan="2">
                <span style="color: #64748b;">Adición</span><br>
                <strong style="color: #1e3a5f;">{{add_right}} (OD) | {{add_left}} (OI)</strong>
              </td>
            </tr>
            {{/if}}
          </table>
        </div>
        {{/if}}

        {{#if products_recommended}}
        <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 15px 20px; border-radius: 0 8px 8px 0; margin-bottom: 25px;">
          <p style="margin: 0 0 8px 0; color: #065f46; font-weight: 600; font-size: 14px;">💡 Productos Recomendados:</p>
          <p style="margin: 0; color: #047857; font-size: 14px; line-height: 1.6;">{{products_recommended}}</p>
        </div>
        {{/if}}

        <!-- Información de Contacto -->
        <div style="background: #f1f5f9; border-radius: 10px; padding: 20px; text-align: center;">
          <p style="margin: 0 0 10px 0; color: #475569; font-size: 14px;">
            <strong>¿Tienes preguntas sobre tu receta?</strong>
          </p>
          <p style="margin: 0;">
            {{#if branch_phone}}
            <a href="tel:{{branch_phone}}" style="color: #1e3a5f; text-decoration: none; margin-right: 15px;">📞 {{branch_phone}}</a>
            {{/if}}
            <a href="mailto:{{support_email}}" style="color: #1e3a5f; text-decoration: none;">✉️ Contáctanos</a>
          </p>
        </div>

        <p style="margin-top: 25px; font-size: 14px; color: #64748b; text-align: center;">
          <strong>Nota:</strong> Tu receta tiene validez hasta el <strong>{{prescription_expiry_date}}</strong>.
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background: #1e3a5f; padding: 25px 30px; text-align: center;">
        <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 18px; font-weight: 600;">{{organization_name}}</p>
        <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 13px;">
          Tu salud visual es nuestra prioridad
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
',
  '["customer_first_name", "prescription_date", "prescription_expiry_date", "prescription_number", "doctor_name", "doctor_title", "sphere_right", "sphere_left", "cylinder_right", "cylinder_left", "axis_right", "axis_left", "add_right", "add_left", "pd", "products_recommended", "next_checkup_date", "branch_name", "branch_address", "branch_hours", "branch_phone", "branch_email", "support_email", "prescription_url", "show_graduation", "organization_name"]',
  true,
  'optica',
  'Email notificando que la receta oftálmica está lista para retirar',
  NOW(),
  NOW()
);

-- ============================================================================
-- 6. RECETA PRÓXIMA A VENCER
-- ============================================================================

INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, category, description, created_at, updated_at)
VALUES (
  'prescription_expiring',
  'Receta Próxima a Vencer',
  '⚠️ Tu receta vence el {{prescription_expiry_date}} - Agenda tu control',
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
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 35px 30px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 10px;">⏰</div>
        <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 600;">¡Tu Receta Está por Vencer!</h1>
        <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">No dejes tu salud visual para después</p>
      </td>
    </tr>

    <!-- Contenido -->
    <tr>
      <td style="padding: 35px 30px;">
        <p style="font-size: 18px; color: #1e3a5f; margin-bottom: 25px;">
          Hola <strong>{{customer_first_name}}</strong>,
        </p>

        <p style="font-size: 15px; color: #4a5568; line-height: 1.7; margin-bottom: 25px;">
          Queremos recordarte que tu receta oftalmológica <strong>vence el {{prescription_expiry_date}}</strong>.
        </p>

        <!-- Alerta -->
        <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 10px; padding: 25px; text-align: center; margin-bottom: 25px;">
          <p style="margin: 0 0 10px 0; color: #92400e; font-size: 20px; font-weight: 700;">
            📅 Vence: {{prescription_expiry_date}}
          </p>
          <p style="margin: 0; color: #78350f; font-size: 14px;">
            Receta #: {{prescription_number}}
          </p>
        </div>

        <p style="font-size: 15px; color: #4a5568; line-height: 1.7; margin-bottom: 25px;">
          Es importante que agendes tu próximo control visual para obtener una nueva receta y asegurar que tu graduación sigue siendo la adecuada para vos.
        </p>

        <!-- Botón de acción -->
        <div style="text-align: center; padding: 20px 0;">
          <a href="{{booking_url}}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
            📅 Agendar Mi Control
          </a>
        </div>

        <!-- Información de contacto -->
        <div style="background: #f1f5f9; border-radius: 10px; padding: 20px; text-align: center;">
          <p style="margin: 0 0 10px 0; color: #475569; font-size: 14px;">
            <strong>¿Prefieres llamar directamente?</strong>
          </p>
          <p style="margin: 0;">
            {{#if branch_phone}}
            <a href="tel:{{branch_phone}}" style="color: #1e3a5f; text-decoration: none; margin-right: 15px;">📞 {{branch_phone}}</a>
            {{/if}}
            {{#if branch_email}}
            <a href="mailto:{{branch_email}}" style="color: #1e3a5f; text-decoration: none;">✉️ {{branch_email}}</a>
            {{/if}}
          </p>
        </div>

        <p style="margin-top: 25px; font-size: 14px; color: #64748b; text-align: center;">
          💡 <strong>Tip:</strong> Es recomendable realizar un control visual al menos una vez al año.
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background: #1e3a5f; padding: 25px 30px; text-align: center;">
        <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 18px; font-weight: 600;">{{organization_name}}</p>
        <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 13px;">
          Tu salud visual es nuestra prioridad
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
',
  '["customer_first_name", "prescription_expiry_date", "prescription_number", "branch_name", "branch_address", "branch_phone", "branch_email", "booking_url", "organization_name"]',
  true,
  'optica',
  'Email recordatorio de que la receta está por vencer',
  NOW(),
  NOW()
);

-- ============================================================================
-- 7. ORDEN DE TRABAJO LISTA
-- ============================================================================

INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, category, description, created_at, updated_at)
VALUES (
  'work_order_ready',
  'Orden de Trabajo Lista',
  '✅ ¡Tu trabajo está listo! Recógelo en {{branch_name}}',
  '
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tu Trabajo Está Listo</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f7fa;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 35px 30px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 10px;">🔧</div>
        <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 600;">¡Tu Trabajo Está Listo!</h1>
        <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Ya puedes pasar a retirar</p>
      </td>
    </tr>

    <!-- Contenido -->
    <tr>
      <td style="padding: 35px 30px;">
        <p style="font-size: 18px; color: #1e3a5f; margin-bottom: 25px;">
          Hola <strong>{{customer_first_name}}</strong>,
        </p>

        <p style="font-size: 15px; color: #4a5568; line-height: 1.7; margin-bottom: 25px;">
          🎉 ¡Excelentes noticias! Tu {{product_type}} ya está terminada y lista para retirar.
        </p>

        <!-- Detalles de la Orden -->
        <table width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%); border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 25px;">
          <tr>
            <td style="padding: 20px;">
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #94a3b8; font-size: 12px; text-transform: uppercase;">Orden N°</span><br>
                    <strong style="color: #1e3a5f; font-size: 18px;">{{work_order_number}}</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #94a3b8; font-size: 12px; text-transform: uppercase;">Producto</span><br>
                    <strong style="color: #1e3a5f; font-size: 16px;">{{product_type}}</strong>
                    {{#if product_description}}
                    <br><span style="color: #64748b; font-size: 14px;">{{product_description}}</span>
                    {{/if}}
                  </td>
                </tr>
                {{#if delivery_date}}
                <tr>
                  <td style="padding: 10px 0;">
                    <span style="color: #94a3b8; font-size: 12px; text-transform: uppercase;">Listo desde</span><br>
                    <strong style="color: #10b981; font-size: 16px;">{{delivery_date}}</strong>
                  </td>
                </tr>
                {{/if}}
              </table>
            </td>
          </tr>
        </table>

        <!-- Información de la Sucursal -->
        <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 15px 20px; border-radius: 0 8px 8px 0; margin-bottom: 25px;">
          <p style="margin: 0 0 10px 0; color: #065f46; font-weight: 600;">📍 Puedes retirarlo en:</p>
          <p style="margin: 0 0 5px 0; color: #047857; font-size: 16px;"><strong>{{branch_name}}</strong></p>
          {{#if branch_address}}
          <p style="margin: 0 0 5px 0; color: #065f46; font-size: 14px;">{{branch_address}}</p>
          {{/if}}
          {{#if branch_hours}}
          <p style="margin: 0; color: #065f46; font-size: 14px;">🕐 {{branch_hours}}</p>
          {{/if}}
        </div>

        {{#if balance_due}}
        <!-- Información de Pago Pendiente -->
        <div style="background: #fef3c7; border-radius: 8px; padding: 15px 20px; margin-bottom: 25px;">
          <p style="margin: 0 0 10px 0; color: #92400e; font-weight: 600;">💰 Saldo a Pagar:</p>
          <p style="margin: 0; color: #1e3a5f; font-size: 24px; font-weight: 700;">{{balance_due}}</p>
          {{#if payment_url}}
          <p style="margin: 10px 0 0 0; text-align: center;">
            <a href="{{payment_url}}" style="display: inline-block; padding: 10px 20px; background: #1e3a5f; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">
              💳 Pagar Ahora
            </a>
          </p>
          {{/if}}
        </div>
        {{/if}}

        <!-- Contacto -->
        <div style="background: #f1f5f9; border-radius: 10px; padding: 20px; text-align: center;">
          <p style="margin: 0 0 10px 0; color: #475569; font-size: 14px;">
            <strong>¿Tienes alguna pregunta?</strong>
          </p>
          <p style="margin: 0;">
            {{#if branch_phone}}
            <a href="tel:{{branch_phone}}" style="color: #1e3a5f; text-decoration: none; margin-right: 15px;">📞 {{branch_phone}}</a>
            {{/if}}
            <a href="mailto:{{support_email}}" style="color: #1e3a5f; text-decoration: none;">✉️ Contáctanos</a>
          </p>
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background: #1e3a5f; padding: 25px 30px; text-align: center;">
        <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 18px; font-weight: 600;">{{organization_name}}</p>
        <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 13px;">
          Tu salud visual es nuestra prioridad
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
',
  '["customer_first_name", "work_order_number", "work_order_date", "delivery_date", "product_type", "product_description", "price", "deposit_paid", "balance_due", "branch_name", "branch_address", "branch_hours", "branch_phone", "branch_email", "support_email", "work_order_url", "payment_url", "organization_name"]',
  true,
  'optica',
  'Email notificando que la orden de trabajo (lentes, reparaciones) está lista',
  NOW(),
  NOW()
);

-- ============================================================================
-- 8. PRESUPUESTO ENVIADO
-- ============================================================================

INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, category, description, created_at, updated_at)
VALUES (
  'quote_sent',
  'Presupuesto Enviado',
  '📄 Tu presupuesto #{{quote_number}} de {{organization_name}}',
  '
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tu Presupuesto</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f7fa;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 35px 30px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 10px;">📄</div>
        <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 600;">Tu Presupuesto</h1>
        <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">{{organization_name}}</p>
      </td>
    </tr>

    <!-- Contenido -->
    <tr>
      <td style="padding: 35px 30px;">
        <p style="font-size: 18px; color: #1e3a5f; margin-bottom: 25px;">
          Hola <strong>{{customer_first_name}}</strong>,
        </p>

        <p style="font-size: 15px; color: #4a5568; line-height: 1.7; margin-bottom: 25px;">
          Hemos preparado un presupuesto especial para ti. Encuentra todos los detalles a continuación.
        </p>

        <!-- Información del Presupuesto -->
        <table width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%); border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 25px;">
          <tr>
            <td style="padding: 20px;">
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #94a3b8; font-size: 12px; text-transform: uppercase;">Presupuesto N°</span><br>
                    <strong style="color: #1e3a5f; font-size: 18px;">{{quote_number}}</strong>
                  </td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
                    <span style="color: #94a3b8; font-size: 12px; text-transform: uppercase;">Fecha</span><br>
                    <strong style="color: #1e3a5f; font-size: 16px;">{{quote_date}}</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;" colspan="2">
                    <span style="color: #94a3b8; font-size: 12px; text-transform: uppercase;">Válido hasta</span><br>
                    <strong style="color: #f59e0b; font-size: 16px;">{{quote_expiry_date}}</strong>
                    <span style="color: #64748b; font-size: 14px;"> ({{valid_days}} días)</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Items del Presupuesto -->
        {{#if items_table}}
        <table width="100%" cellspacing="0" cellpadding="0" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 25px; overflow: hidden;">
          <thead>
            <tr style="background: #1e3a5f;">
              <th style="padding: 12px; text-align: left; color: #ffffff; font-size: 14px;">Descripción</th>
              <th style="padding: 12px; text-align: right; color: #ffffff; font-size: 14px;">Monto</th>
            </tr>
          </thead>
          <tbody>
            {{items_table}}
          </tbody>
        </table>
        {{/if}}

        <!-- Totales -->
        <table width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 25px;">
          {{#if subtotal}}
          <tr>
            <td style="padding: 8px 0; text-align: right; color: #64748b; font-size: 14px;">Subtotal:</td>
            <td style="padding: 8px 0; text-align: right; color: #1e3a5f; font-size: 14px;">{{subtotal}}</td>
          </tr>
          {{/if}}
          {{#if discount}}
          <tr>
            <td style="padding: 8px 0; text-align: right; color: #10b981; font-size: 14px;">Descuento {{discount_percentage}}:</td>
            <td style="padding: 8px 0; text-align: right; color: #10b981; font-size: 14px;">-{{discount}}</td>
          </tr>
          {{/if}}
          {{#if iva}}
          <tr>
            <td style="padding: 8px 0; text-align: right; color: #64748b; font-size: 14px;">IVA:</td>
            <td style="padding: 8px 0; text-align: right; color: #1e3a5f; font-size: 14px;">{{iva}}</td>
          </tr>
          {{/if}}
          <tr>
            <td style="padding: 15px 0; text-align: right; color: #1e3a5f; font-size: 18px; font-weight: 700;">TOTAL:</td>
            <td style="padding: 15px 0; text-align: right; color: #1e3a5f; font-size: 24px; font-weight: 700;">{{total}}</td>
          </tr>
        </table>

        {{#if deposit_required}}
        <!-- Separador -->
        <div style="background: #e2e8f0; height: 1px; margin: 20px 0;"></div>
        <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px; text-align: right;">
          Seña requerida: <strong style="color: #1e3a5f;">{{deposit_required}}</strong>
        </p>
        {{/if}}

        <!-- Botones de Acción -->
        <table width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
          <tr>
            <td style="padding: 0 10px 10px 0; width: 50%;">
              <a href="{{accept_url}}" style="display: block; padding: 14px 10px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; text-align: center;">
                ✅ Aceptar Presupuesto
              </a>
            </td>
            <td style="padding: 0 0 10px 10px; width: 50%;">
              <a href="{{payment_url}}" style="display: block; padding: 14px 10px; background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; text-align: center;">
                💳 Separar Ahora
              </a>
            </td>
          </tr>
        </table>

        {{#if reject_url}}
        <p style="text-align: center; margin-bottom: 25px;">
          <a href="{{reject_url}}" style="color: #94a3b8; font-size: 13px; text-decoration: none;">
            No me interesa este presupuesto
          </a>
        </p>
        {{/if}}

        <!-- Información de contacto -->
        <div style="background: #f1f5f9; border-radius: 10px; padding: 20px; text-align: center;">
          <p style="margin: 0 0 10px 0; color: #475569; font-size: 14px;">
            <strong>¿Tienes preguntas sobre tu presupuesto?</strong>
          </p>
          <p style="margin: 0;">
            {{#if branch_phone}}
            <a href="tel:{{branch_phone}}" style="color: #1e3a5f; text-decoration: none; margin-right: 15px;">📞 {{branch_phone}}</a>
            {{/if}}
            {{#if branch_email}}
            <a href="mailto:{{branch_email}}" style="color: #1e3a5f; text-decoration: none;">✉️ {{branch_email}}</a>
            {{/if}}
          </p>
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background: #1e3a5f; padding: 25px 30px; text-align: center;">
        <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 18px; font-weight: 600;">{{organization_name}}</p>
        <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 13px;">
          Tu salud visual es nuestra prioridad
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
',
  '["customer_first_name", "quote_number", "quote_date", "quote_expiry_date", "valid_days", "items_table", "subtotal", "discount", "discount_percentage", "iva", "total", "deposit_required", "products", "services", "branch_name", "branch_address", "branch_phone", "branch_email", "quote_url", "accept_url", "reject_url", "payment_url", "organization_name"]',
  true,
  'optica',
  'Email enviado cuando se crea y envía un presupuesto al cliente',
  NOW(),
  NOW()
);

-- ============================================================================
-- 9. PRESUPUESTO PRÓXIMO A VENCER
-- ============================================================================

INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, category, description, created_at, updated_at)
VALUES (
  'quote_expiring',
  'Presupuesto Próximo a Vencer',
  '⚠️ Tu presupuesto #{{quote_number}} vence pronto - {{quote_expiry_date}}',
  '
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tu Presupuesto Próximo a Vencer</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f7fa;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 35px 30px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 10px;">⏰</div>
        <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 600;">¡Tu Presupuesto Vence Pronto!</h1>
        <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">No dejes pasar esta oportunidad</p>
      </td>
    </tr>

    <!-- Contenido -->
    <tr>
      <td style="padding: 35px 30px;">
        <p style="font-size: 18px; color: #1e3a5f; margin-bottom: 25px;">
          Hola <strong>{{customer_first_name}}</strong>,
        </p>

        <p style="font-size: 15px; color: #4a5568; line-height: 1.7; margin-bottom: 25px;">
          Te recordamos que tu presupuesto #{{quote_number}} <strong>vence el {{quote_expiry_date}}</strong>.
        </p>

        <!-- Alerta de Vencimiento -->
        <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 10px; padding: 25px; text-align: center; margin-bottom: 25px;">
          <p style="margin: 0 0 10px 0; color: #92400e; font-size: 16px; font-weight: 600;">Presupuesto #{{quote_number}}</p>
          <p style="margin: 0 0 10px 0; color: #1e3a5f; font-size: 28px; font-weight: 700;">{{total}}</p>
          <p style="margin: 0; color: #d97706; font-size: 14px; font-weight: 600;">
            ⏰ Vence: {{quote_expiry_date}}
          </p>
        </div>

        <p style="font-size: 15px; color: #4a5568; line-height: 1.7; margin-bottom: 25px;">
          Este presupuesto incluye precios especiales y condiciones preferenciales. Te invitamos a confirmarlo antes de que venza para que puedas aprovechar estos beneficios.
        </p>

        <!-- Botones de Acción -->
        <table width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 25px;">
          <tr>
            <td style="padding: 0 10px 10px 0; width: 50%;">
              <a href="{{accept_url}}" style="display: block; padding: 14px 10px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; text-align: center;">
                ✅ ¡Lo Quiero!
              </a>
            </td>
            <td style="padding: 0 0 10px 10px; width: 50%;">
              <a href="{{quote_url}}" style="display: block; padding: 14px 10px; background: #f1f5f9; color: #475569; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; text-align: center;">
                📄 Ver Presupuesto
              </a>
            </td>
          </tr>
        </table>

        <!-- Información de contacto -->
        <div style="background: #f1f5f9; border-radius: 10px; padding: 20px; text-align: center;">
          <p style="margin: 0 0 10px 0; color: #475569; font-size: 14px;">
            <strong>¿Tienes alguna duda?</strong> Contáctanos:
          </p>
          <p style="margin: 0;">
            {{#if branch_phone}}
            <a href="tel:{{branch_phone}}" style="color: #1e3a5f; text-decoration: none; margin-right: 15px;">📞 {{branch_phone}}</a>
            {{/if}}
            {{#if branch_email}}
            <a href="mailto:{{branch_email}}" style="color: #1e3a5f; text-decoration: none;">✉️ {{branch_email}}</a>
            {{/if}}
          </p>
        </div>

        <p style="margin-top: 25px; font-size: 14px; color: #64748b; text-align: center;">
          💡 <strong>Nota:</strong> Si el presupuesto vence, los precios y condiciones podrían cambiar.
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background: #1e3a5f; padding: 25px 30px; text-align: center;">
        <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 18px; font-weight: 600;">{{organization_name}}</p>
        <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 13px;">
          Tu salud visual es nuestra prioridad
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
',
  '["customer_first_name", "quote_number", "quote_expiry_date", "total", "accept_url", "quote_url", "branch_phone", "branch_email", "organization_name"]',
  true,
  'optica',
  'Email recordatorio de que el presupuesto está por vencer',
  NOW(),
  NOW()
);

-- ============================================================================
-- 10. BIENVENIDA DE CLIENTE
-- ============================================================================

INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, category, description, created_at, updated_at)
VALUES (
  'account_welcome',
  'Bienvenida de Cliente',
  '🎉 ¡Bienvenido/a a {{organization_name}}!',
  '
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenido a {{organization_name}}</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f7fa;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 40px 30px; text-align: center;">
        <div style="font-size: 56px; margin-bottom: 15px;">🎉</div>
        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">¡Bienvenido/a!</h1>
        <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">A la familia {{organization_name}}</p>
      </td>
    </tr>

    <!-- Contenido -->
    <tr>
      <td style="padding: 35px 30px;">
        <p style="font-size: 18px; color: #1e3a5f; margin-bottom: 25px;">
          Hola <strong>{{customer_first_name}}</strong>,
        </p>

        <p style="font-size: 15px; color: #4a5568; line-height: 1.7; margin-bottom: 25px;">
          🎊 ¡Nos encanta que estés aquí! Tu cuenta ha sido creada exitosamente y ya eres parte de nuestra familia.
        </p>

        <!-- Beneficios -->
        <div style="background: linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%); border-radius: 10px; padding: 25px; margin-bottom: 25px;">
          <p style="margin: 0 0 20px 0; color: #1e3a5f; font-size: 18px; font-weight: 600; text-align: center;">
            🌟 Como cliente registrado puedes:
          </p>
          <table width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 8px 0; vertical-align: top;">
                <span style="font-size: 18px; margin-right: 10px;">📅</span>
              </td>
              <td style="padding: 8px 0; color: #4a5568; font-size: 14px;">
                Agendar citas de forma online
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; vertical-align: top;">
                <span style="font-size: 18px; margin-right: 10px;">📋</span>
              </td>
              <td style="padding: 8px 0; color: #4a5568; font-size: 14px;">
                Ver tu historial de recetas y prescripciones
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; vertical-align: top;">
                <span style="font-size: 18px; margin-right: 10px;">📊</span>
              </td>
              <td style="padding: 8px 0; color: #4a5568; font-size: 14px;">
                Acceder a presupuestos personalizados
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; vertical-align: top;">
                <span style="font-size: 18px; margin-right: 10px;">🎁</span>
              </td>
              <td style="padding: 8px 0; color: #4a5568; font-size: 14px;">
                Recibir ofertas especiales y cumpleaños
              </td>
            </tr>
          </table>
        </div>

        <!-- Botón al dashboard -->
        <div style="text-align: center; padding: 20px 0;">
          <a href="{{dashboard_url}}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
            🚀 Ir a Mi Cuenta
          </a>
        </div>

        <!-- Información de contacto -->
        <div style="background: #f1f5f9; border-radius: 10px; padding: 20px; text-align: center;">
          <p style="margin: 0 0 10px 0; color: #475569; font-size: 14px;">
            <strong>¿Necesitas ayuda?</strong> Estamos para servirte:
          </p>
          <p style="margin: 0;">
            {{#if branch_phone}}
            <a href="tel:{{branch_phone}}" style="color: #1e3a5f; text-decoration: none; margin-right: 15px;">📞 {{branch_phone}}</a>
            {{/if}}
            {{#if branch_email}}
            <a href="mailto:{{branch_email}}" style="color: #1e3a5f; text-decoration: none;">✉️ {{branch_email}}</a>
            {{/if}}
          </p>
        </div>

        <p style="margin-top: 25px; font-size: 14px; color: #64748b; text-align: center;">
          💡 <strong>Tip:</strong> Completa tu perfil con tu fecha de nacimiento para recibir sorpresas especiales. 🎂
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background: #1e3a5f; padding: 25px 30px; text-align: center;">
        <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 18px; font-weight: 600;">{{organization_name}}</p>
        <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 13px;">
          Tu salud visual es nuestra prioridad
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
',
  '["customer_first_name", "dashboard_url", "branch_phone", "branch_email", "organization_name"]',
  true,
  'optica',
  'Email de bienvenida cuando un cliente crea su cuenta',
  NOW(),
  NOW()
);

-- ============================================================================
-- 11. FORMULARIO DE CONTACTO
-- ============================================================================

INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, category, description, created_at, updated_at)
VALUES (
  'contact_form',
  'Formulario de Contacto',
  '📬 Nuevo mensaje de: {{customer_name}} - {{subject}}',
  '
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nuevo Mensaje de Contacto</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f7fa;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 35px 30px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 10px;">📬</div>
        <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 600;">Nuevo Mensaje de Contacto</h1>
      </td>
    </tr>

    <!-- Contenido -->
    <tr>
      <td style="padding: 35px 30px;">
        <p style="font-size: 18px; color: #1e3a5f; margin-bottom: 25px;">
          Has recibido un nuevo mensaje desde tu formulario de contacto:
        </p>

        <!-- Info del remitente -->
        <table width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%); border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 25px;">
          <tr>
            <td style="padding: 20px;">
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #94a3b8; font-size: 12px; text-transform: uppercase;">👤 Nombre</span><br>
                    <strong style="color: #1e3a5f; font-size: 16px;">{{customer_name}}</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #94a3b8; font-size: 12px; text-transform: uppercase;">📧 Email</span><br>
                    <strong style="color: #1e3a5f; font-size: 16px;">{{customer_email}}</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0;">
                    <span style="color: #94a3b8; font-size: 12px; text-transform: uppercase;">📝 Asunto</span><br>
                    <strong style="color: #1e3a5f; font-size: 16px;">{{subject}}</strong>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Mensaje -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px;">
          <p style="margin: 0 0 10px 0; color: #1e3a5f; font-weight: 600; font-size: 14px;">💬 Mensaje:</p>
          <p style="margin: 0; color: #4a5568; font-size: 14px; line-height: 1.7; white-space: pre-wrap;">{{message}}</p>
        </div>

        <!-- Botón de responder -->
        <div style="text-align: center; padding: 25px 0;">
          <a href="mailto:{{customer_email}}?subject=Re: {{subject}}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
            ↩️ Responder al Cliente
          </a>
        </div>

        <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-bottom: 0;">
          Este mensaje fue enviado desde el formulario de contacto de {{organization_name}}
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background: #1e3a5f; padding: 25px 30px; text-align: center;">
        <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 18px; font-weight: 600;">{{organization_name}}</p>
        <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 13px;">
          Tu salud visual es nuestra prioridad
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
',
  '["customer_name", "customer_email", "subject", "message", "organization_name"]',
  true,
  'optica',
  'Email enviado al negocio cuando un cliente completa el formulario de contacto',
  NOW(),
  NOW()
);

-- ============================================================================
-- 12. FELIZ CUMPLEAÑOS
-- ============================================================================

INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, category, description, created_at, updated_at)
VALUES (
  'birthday',
  'Feliz Cumpleaños',
  '🎂 ¡Feliz Cumpleaños, {{customer_first_name}}! 🎁',
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
    <!-- Header con celebración -->
    <tr>
      <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #ec4899 100%); padding: 40px 30px; text-align: center;">
        <div style="font-size: 56px; margin-bottom: 15px;">🎂</div>
        <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;">¡Feliz Cumpleaños!</h1>
        <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.95); font-size: 18px;">
          {{current_date}}
        </p>
      </td>
    </tr>

    <!-- Contenido -->
    <tr>
      <td style="padding: 35px 30px;">
        <p style="font-size: 20px; color: #1e3a5f; margin-bottom: 25px; text-align: center;">
          Hola <strong>{{customer_first_name}}</strong>! 🎉
        </p>

        <p style="font-size: 15px; color: #4a5568; line-height: 1.7; margin-bottom: 25px; text-align: center;">
          En este día tan especial, toda la familia de {{organization_name}} te desea un hermoso cumpleaños lleno de alegría, salud y momentos felices.
        </p>

        {{#if birthday_promo_code}}
        <!-- Premio Especial -->
        <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 25px; border: 2px dashed #f59e0b;">
          <p style="margin: 0 0 15px 0; color: #92400e; font-size: 18px; font-weight: 700;">
            🎁 ¡Tienes un regalo de nosotros!
          </p>
          <p style="margin: 0 0 15px 0; color: #4a5568; font-size: 14px;">
            {{birthday_promo_description}}
          </p>
          <div style="background: #ffffff; border-radius: 8px; padding: 15px 25px; display: inline-block;">
            <p style="margin: 0 0 5px 0; color: #94a3b8; font-size: 12px; text-transform: uppercase;">Código promocional</p>
            <p style="margin: 0; color: #1e3a5f; font-size: 24px; font-weight: 700; letter-spacing: 2px;">{{birthday_promo_code}}</p>
          </div>
        </div>
        {{/if}}

        <!-- Botón de acción -->
        {{#if promo_url}}
        <div style="text-align: center; padding: 20px 0;">
          <a href="{{promo_url}}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #ec4899 0%, #db2777 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
            🛍️ Ver Ofertas Especiales
          </a>
        </div>
        {{/if}}

        {{#if booking_url}}
        <div style="text-align: center; padding: 10px 0 20px 0;">
          <a href="{{booking_url}}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
            📅 Agendar Mi Control Visual
          </a>
        </div>
        {{/if}}

        <!-- Información de contacto -->
        <div style="background: #f1f5f9; border-radius: 10px; padding: 20px; text-align: center;">
          <p style="margin: 0 0 10px 0; color: #475569; font-size: 14px;">
            <strong>¡Visítanos!</strong> Estamos para cuidar tu visión
          </p>
          <p style="margin: 0;">
            {{#if branch_phone}}
            <a href="tel:{{branch_phone}}" style="color: #1e3a5f; text-decoration: none; margin-right: 15px;">📞 {{branch_phone}}</a>
            {{/if}}
            <a href="mailto:{{support_email}}" style="color: #1e3a5f; text-decoration: none;">✉️ Contáctanos</a>
          </p>
        </div>

        <p style="margin-top: 25px; font-size: 14px; color: #64748b; text-align: center;">
          💝 <strong>Gracias</strong> por confiar en nosotros para cuidar tu salud visual. ¡Que tu día esté lleno de claridad y momentos brillantes! 👓✨
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 25px 30px; text-align: center;">
        <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 18px; font-weight: 600;">{{organization_name}}</p>
        <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 13px;">
          Tu salud visual es nuestra prioridad
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
',
  '["customer_first_name", "current_date", "birthday_promo_code", "birthday_promo_description", "promo_url", "booking_url", "branch_phone", "branch_email", "support_email", "organization_name"]',
  true,
  'optica',
  'Email de cumpleaños enviado a los clientes',
  NOW(),
  NOW()
);

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Verificar las plantillas insertadas
-- SELECT type, name, is_active, category, LEFT(content, 200) as preview FROM system_email_templates WHERE category = 'optica' ORDER BY type;
