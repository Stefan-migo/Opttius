-- ============================================================================
-- SaaS Email Templates Insert
-- ============================================================================

-- Delete existing saas templates with conflicting names
DELETE FROM system_email_templates WHERE category = 'saas' AND type IN (
  'saas_welcome', 'saas_trial_ending', 'saas_subscription_success',
  'saas_payment_reminder'
);

-- SaaS Templates (category = 'saas')

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
          <tr><td style="text-align: center;"><a href="{{step_url}}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">▶️ Comenzar Este Paso</a></td></tr>
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
        <p style="font-size: 15px; color: #94a3b8; line-height: 1.7; margin-bottom: 25px;">¡Excelente! Tu óptica está creciendo. Has alcanzado el {{usage_percentage}}% de tu límite actual. Considera actualizar tu plan para seguir creciendo sin límites.</p>
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
