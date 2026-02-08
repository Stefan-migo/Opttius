-- ============================================================================
// PLANTILLAS DE EMAIL PARA SAAS - 11 PLANTILLAS PRINCIPALES
// ============================================================================
// Estas plantillas cubren las comunicaciones principales del SaaS Opttius
// con los administradores de ópticas (organizaciones)
// ============================================================================

-- ============================================================================
// 1. BIENVENIDA AL SAAS
-- ============================================================================

INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, category, description, created_at, updated_at)
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
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; overflow: hidden;">
    <!-- Header con Logo -->
    <tr>
      <td style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 40px 30px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 15px;">🔵</div>
        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">¡Bienvenido a Opttius!</h1>
        <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Tu plataforma de gestión integral para ópticas</p>
      </td>
    </tr>

    <!-- Contenido -->
    <tr>
      <td style="padding: 40px 30px;">
        <p style="font-size: 18px; color: #e2e8f0; margin-bottom: 25px;">
          Hola <strong>{{user_name}}</strong>,
        </p>

        <p style="font-size: 15px; color: #94a3b8; line-height: 1.7; margin-bottom: 30px;">
          🎊 ¡Felicitaciones! Tu cuenta en Opttius ha sido creada exitosamente. Ahora tienes acceso a todas las herramientas que necesitas para gestionar tu óptica de manera eficiente.
        </p>

        <!-- Features destacados -->
        <div style="background: #334155; border-radius: 10px; padding: 25px; margin-bottom: 30px;">
          <p style="margin: 0 0 20px 0; color: #ffffff; font-size: 16px; font-weight: 600;">✨ Lo que puedes hacer con Opttius:</p>
          <table width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 8px 0; vertical-align: top;">
                <span style="font-size: 18px; margin-right: 10px;">📅</span>
              </td>
              <td style="padding: 8px 0; color: #cbd5e1; font-size: 14px;">
                Gestionar citas y turnos de pacientes
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; vertical-align: top;">
                <span style="font-size: 18px; margin-right: 10px;">👥</span>
              </td>
              <td style="padding: 8px 0; color: #cbd5e1; font-size: 14px;">
                Administrar historial clínico y recetas
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; vertical-align: top;">
                <span style="font-size: 18px; margin-right: 10px;">🛒</span>
              </td>
              <td style="padding: 8px 0; color: #cbd5e1; font-size: 14px;">
                Control de inventario y productos
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; vertical-align: top;">
                <span style="font-size: 18px; margin-right: 10px;">💰</span>
              </td>
              <td style="padding: 8px 0; color: #cbd5e1; font-size: 14px;">
                Gestión de ventas y presupuestos
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; vertical-align: top;">
                <span style="font-size: 18px; margin-right: 10px;">📊</span>
              </td>
              <td style="padding: 8px 0; color: #cbd5e1; font-size: 14px;">
                Reportes y análisis de negocio
              </td>
            </tr>
          </table>
        </div>

        <!-- Botones -->
        <table width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 30px;">
          <tr>
            <td style="padding: 0 10px 10px 0; width: 50%;">
              <a href="{{login_url}}" style="display: block; padding: 14px 10px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; text-align: center;">
                🔐 Iniciar Sesión
              </a>
            </td>
            <td style="padding: 0 0 10px 10px; width: 50%;">
              <a href="{{dashboard_url}}" style="display: block; padding: 14px 10px; background: #334155; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; text-align: center;">
                📊 Ir al Dashboard
              </a>
            </td>
          </tr>
        </table>

        <!-- Información de soporte -->
        <div style="border-top: 1px solid #334155; padding-top: 25px;">
          <p style="margin: 0 0 15px 0; color: #94a3b8; font-size: 14px; text-align: center;">
            <strong>¿Necesitas ayuda?</strong> Nuestro equipo está listo para asistirte
          </p>
          <p style="margin: 0; text-align: center;">
            <a href="mailto:{{support_email}}" style="color: #3b82f6; text-decoration: none;">{{support_email}}</a>
          </p>
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background: #0f172a; padding: 25px 30px; text-align: center; border-top: 1px solid #334155;">
        <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 16px; font-weight: 600;">Opttius</p>
        <p style="margin: 0; color: #64748b; font-size: 12px;">
          La mejor gestión para tu óptica
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
',
  '["user_name", "user_email", "organization_name", "login_url", "dashboard_url", "support_email"]',
  true,
  'saas',
  'Email de bienvenida cuando un nuevo usuario se registra en el SaaS',
  NOW(),
  NOW()
);

-- ============================================================================
// 2. TRIAL POR FINALIZAR
-- ============================================================================

INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, category, description, created_at, updated_at)
VALUES (
  'saas_trial_ending',
  'Trial por Finalizar',
  '⚠️ Tu prueba gratuita de Opttius termina en {{days_remaining}} días',
  '
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tu Prueba Gratuita está por Terminar</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Helvetica Neue'', Arial, sans-serif; background-color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; overflow: hidden;">
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 30px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 15px;">⏰</div>
        <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 700;">¡Tu Prueba Gratuita Está por Terminar!</h1>
        <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">No pierdas acceso a Opttius</p>
      </td>
    </tr>

    <!-- Contenido -->
    <tr>
      <td style="padding: 40px 30px;">
        <p style="font-size: 18px; color: #e2e8f0; margin-bottom: 25px;">
          Hola de parte del equipo <strong>Opttius</strong>,
        </p>

        <p style="font-size: 15px; color: #94a3b8; line-height: 1.7; margin-bottom: 30px;">
          Queremos recordarte que tu período de prueba gratuita para <strong>{{organization_name}}</strong> termina el <strong>{{trial_end_date}}</strong>.
        </p>

        <!-- Cuenta regresiva -->
        <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 30px;">
          <p style="margin: 0 0 10px 0; color: #92400e; font-size: 14px; text-transform: uppercase; font-weight: 600;">Días restantes de tu prueba</p>
          <p style="margin: 0; color: #1e3a5f; font-size: 48px; font-weight: 700;">{{days_remaining}}</p>
        </div>

        <p style="font-size: 15px; color: #94a3b8; line-height: 1.7; margin-bottom: 30px;">
          Durante tu prueba, has tenido acceso a todas las funcionalidades del plan <strong>{{plan_name}}</strong>. Ahora puedes elegir continuar con nosotros y llevar tu óptica al siguiente nivel.
        </p>

        <!-- Beneficios de upgrade -->
        <div style="background: #334155; border-radius: 10px; padding: 20px; margin-bottom: 30px;">
          <p style="margin: 0 0 15px 0; color: #ffffff; font-size: 16px; font-weight: 600;">🎁 Al upgradear ahora obtienes:</p>
          <ul style="margin: 0; padding-left: 20px; color: #cbd5e1; font-size: 14px; line-height: 2;">
            <li>Acceso continuo a todas las funciones</li>
            <li>Soporte prioritario</li>
            <li>Respaldo automático de datos</li>
            <li>Actualizaciones exclusivas</li>
          </ul>
        </div>

        <!-- Botón -->
        <div style="text-align: center;">
          <a href="{{upgrade_url}}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            🚀 Upgradear Ahora
          </a>
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background: #0f172a; padding: 25px 30px; text-align: center; border-top: 1px solid #334155;">
        <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 16px; font-weight: 600;">Opttius</p>
        <p style="margin: 0; color: #64748b; font-size: 12px;">
          <a href="mailto:soporte@opttius.com" style="color: #3b82f6;">soporte@opttius.com</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
',
  '["organization_name", "trial_end_date", "days_remaining", "plan_name", "upgrade_url"]',
  true,
  'saas',
  'Email recordatorio de que el trial está por finalizar',
  NOW(),
  NOW()
);

-- ============================================================================
// 3. SUSCRIPCIÓN EXITOSA
-- ============================================================================

INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, category, description, created_at, updated_at)
VALUES (
  'saas_subscription_success',
  'Suscripción Exitosa',
  '✅ ¡Tu suscripción a Opttius está activa!',
  '
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Suscripción Activada</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Helvetica Neue'', Arial, sans-serif; background-color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; overflow: hidden;">
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 15px;">✅</div>
        <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 700;">¡Suscripción Activada!</h1>
        <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Bienvenido al plan {{plan_name}}</p>
      </td>
    </tr>

    <!-- Contenido -->
    <tr>
      <td style="padding: 40px 30px;">
        <p style="font-size: 18px; color: #e2e8f0; margin-bottom: 25px;">
          Felicitaciones, <strong>{{organization_name}}</strong>!
        </p>

        <p style="font-size: 15px; color: #94a3b8; line-height: 1.7; margin-bottom: 30px;">
          Tu suscripción a Opttius ha sido procesada exitosamente. Ahora tienes acceso completo a todas las funcionalidades del plan <strong>{{plan_name}}</strong>.
        </p>

        <!-- Detalles del plan -->
        <div style="background: #334155; border-radius: 10px; padding: 25px; margin-bottom: 30px;">
          <p style="margin: 0 0 20px 0; color: #ffffff; font-size: 16px; font-weight: 600;">📋 Detalles de tu suscripción</p>
          <table width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #475569; color: #94a3b8; font-size: 14px;">Plan</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #475569; color: #ffffff; font-size: 14px; text-align: right; font-weight: 600;">{{plan_name}}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #475569; color: #94a3b8; font-size: 14px;">Precio</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #475569; color: #ffffff; font-size: 14px; text-align: right;">{{plan_price}} / {{billing_cycle}}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #475569; color: #94a3b8; font-size: 14px;">Período</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #475569; color: #ffffff; font-size: 14px; text-align: right;">{{current_period_start}} - {{current_period_end}}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #10b981; font-size: 14px;">Estado</td>
              <td style="padding: 10px 0; color: #10b981; font-size: 14px; text-align: right; font-weight: 600;">✓ Activa</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 15px; color: #94a3b8; line-height: 1.7; margin-bottom: 20px;">
          Tu próxima facturación será el {{current_period_end}}. Puedes ver tus facturas y managejar tu suscripción en cualquier momento.
        </p>

        <!-- Botón -->
        <div style="text-align: center;">
          <a href="{{invoices_url}}" style="display: inline-block; padding: 14px 32px; background: #334155; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
            📄 Ver Facturas
          </a>
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background: #0f172a; padding: 25px 30px; text-align: center; border-top: 1px solid #334155;">
        <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 16px; font-weight: 600;">Opttius</p>
        <p style="margin: 0; color: #64748b; font-size: 12px;">
          La mejor gestión para tu óptica
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
',
  '["organization_name", "plan_name", "plan_price", "billing_cycle", "current_period_start", "current_period_end", "invoices_url"]',
  true,
  'saas',
  'Email de confirmación cuando se procesa un pago de suscripción',
  NOW(),
  NOW()
);

-- ============================================================================
// 4. PAGO FALLIDO
-- ============================================================================

INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, category, description, created_at, updated_at)
VALUES (
  'saas_payment_failed',
  'Pago Fallido',
  '⚠️ Hubo un problema con tu pago - Acción requerida',
  '
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pago No Procesado</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Helvetica Neue'', Arial, sans-serif; background-color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; overflow: hidden;">
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 30px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 15px;">⚠️</div>
        <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 700;">Hubo un Problema con tu Pago</h1>
        <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Acción requerida</p>
      </td>
    </tr>

    <!-- Contenido -->
    <tr>
      <td style="padding: 40px 30px;">
        <p style="font-size: 18px; color: #e2e8f0; margin-bottom: 25px;">
          Hola,
        </p>

        <p style="font-size: 15px; color: #94a3b8; line-height: 1.7; margin-bottom: 25px;">
          Lamentamos informarte que no pudimos procesar el pago para tu suscripción de <strong>{{organization_name}}</strong>.
        </p>

        <!-- Detalles -->
        <div style="background: #fee2e2; border: 1px solid #ef4444; border-radius: 10px; padding: 20px; margin-bottom: 30px;">
          <p style="margin: 0 0 15px 0; color: #991b1b; font-size: 14px; font-weight: 600;">📋 Detalles del intento de pago</p>
          <table width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 8px 0; color: #7f1d1d; font-size: 14px;">Monto</td>
              <td style="padding: 8px 0; color: #7f1d1d; font-size: 14px; text-align: right; font-weight: 600;">{{amount}} {{currency}}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #7f1d1d; font-size: 14px;">Factura</td>
              <td style="padding: 8px 0; color: #7f1d1d; font-size: 14px; text-align: right;">{{invoice_number}}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #7f1d1d; font-size: 14px;">Vence</td>
              <td style="padding: 8px 0; color: #7f1d1d; font-size: 14px; text-align: right;">{{due_date}}</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 15px; color: #94a3b8; line-height: 1.7; margin-bottom: 30px;">
          Por favor, actualiza tu método de pago para evitar cualquier interrupción en el servicio. Tu acceso a Opttius continuará normalmente mientras resolvemos esto.
        </p>

        <!-- Botón -->
        <div style="text-align: center;">
          <a href="{{payment_url}}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            💳 Actualizar Método de Pago
          </a>
        </div>

        <p style="margin-top: 25px; font-size: 13px; color: #64748b; text-align: center;">
          Si ya actualizaste tu método de pago, por favor ignora este mensaje.
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background: #0f172a; padding: 25px 30px; text-align: center; border-top: 1px solid #334155;">
        <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 16px; font-weight: 600;">Opttius</p>
        <p style="margin: 0; color: #64748b; font-size: 12px;">
          <a href="mailto:facturas@opttius.com" style="color: #3b82f6;">facturas@opttius.com</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
',
  '["organization_name", "amount", "currency", "invoice_number", "due_date", "payment_url"]',
  true,
  'saas',
  'Email cuando falla el pago de suscripción',
  NOW(),
  NOW()
);

-- ============================================================================
// 5. RECORDATORIO DE PAGO
// ============================================================================

INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, category, description, created_at, updated_at)
VALUES (
  'saas_payment_reminder',
  'Recordatorio de Pago',
  '📅 Recordatorio: Tu pago de {{amount}} {{currency}} vence pronto',
  '
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recordatorio de Pago</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Helvetica Neue'', Arial, sans-serif; background-color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; overflow: hidden;">
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 30px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 15px;">📅</div>
        <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 700;">Recordatorio de Pago</h1>
        <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Tu suscripción de Opttius</p>
      </td>
    </tr>

    <!-- Contenido -->
    <tr>
      <td style="padding: 40px 30px;">
        <p style="font-size: 18px; color: #e2e8f0; margin-bottom: 25px;">
          Hola,
        </p>

        <p style="font-size: 15px; color: #94a3b8; line-height: 1.7; margin-bottom: 30px;">
          Te enviamos un amable recordatorio de que el pago para tu suscripción de <strong>{{organization_name}}</strong> vence el <strong>{{due_date}}</strong>.
        </p>

        <!-- Monto destacado -->
        <div style="background: #334155; border-radius: 10px; padding: 30px; text-align: center; margin-bottom: 30px;">
          <p style="margin: 0 0 10px 0; color: #94a3b8; font-size: 14px;">Monto a pagar</p>
          <p style="margin: 0; color: #ffffff; font-size: 36px; font-weight: 700;">{{amount}} <span style="font-size: 18px; color: #94a3b8;">{{currency}}</span></p>
        </div>

        <p style="font-size: 15px; color: #94a3b8; line-height: 1.7; margin-bottom: 30px;">
          Para evitar cualquier interrupción en tu servicio, te invitamos a realizar el pago antes de la fecha de vencimiento.
        </p>

        <!-- Botón -->
        <div style="text-align: center;">
          <a href="{{payment_url}}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            💳 Pagar Ahora
          </a>
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background: #0f172a; padding: 25px 30px; text-align: center; border-top: 1px solid #334155;">
        <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 16px; font-weight: 600;">Opttius</p>
        <p style="margin: 0; color: #64748b; font-size: 12px;">
          La mejor gestión para tu óptica
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
',
  '["organization_name", "amount", "currency", "due_date", "payment_url"]',
  true,
  'saas',
  'Email recordatorio de pago pendiente',
  NOW(),
  NOW()
);

-- ============================================================================
// 6. ALERTA DE SEGURIDAD
-- ============================================================================

INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, category, description, created_at, updated_at)
VALUES (
  'saas_security_alert',
  'Alerta de Seguridad',
  '🔒 Actividad inusual en tu cuenta de Opttius',
  '
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alerta de Seguridad</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Helvetica Neue'', Arial, sans-serif; background-color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; overflow: hidden;">
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 40px 30px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 15px;">🔒</div>
        <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 700;">Alerta de Seguridad</h1>
        <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">actividad detectada en tu cuenta</p>
      </td>
    </tr>

    <!-- Contenido -->
    <tr>
      <td style="padding: 40px 30px;">
        <p style="font-size: 18px; color: #e2e8f0; margin-bottom: 25px;">
          Hola <strong>{{user_name}}</strong>,
        </p>

        <p style="font-size: 15px; color: #94a3b8; line-height: 1.7; margin-bottom: 30px;">
          Detectamos una actividad en tu cuenta de Opttius que queremos que verifiques.
        </p>

        <!-- Actividad detectada -->
        <div style="background: #334155; border-radius: 10px; padding: 25px; margin-bottom: 30px;">
          <p style="margin: 0 0 20px 0; color: #ffffff; font-size: 16px; font-weight: 600;">📋 Actividad detectada</p>
          <table width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #475569; color: #94a3b8; font-size: 14px;">Acción</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #475569; color: #ffffff; font-size: 14px; text-align: right;">{{action_type}}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #475569; color: #94a3b8; font-size: 14px;">Fecha y Hora</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #475569; color: #ffffff; font-size: 14px; text-align: right;">{{timestamp}}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #475569; color: #94a3b8; font-size: 14px;">Ubicación</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #475569; color: #ffffff; font-size: 14px; text-align: right;">{{location}}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #475569; color: #94a3b8; font-size: 14px;">IP</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #475569; color: #ffffff; font-size: 14px; text-align: right;">{{ip_address}}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #94a3b8; font-size: 14px;">Dispositivo</td>
              <td style="padding: 10px 0; color: #ffffff; font-size: 14px; text-align: right;">{{user_agent}}</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 15px; color: #94a3b8; line-height: 1.7; margin-bottom: 30px;">
          {{#if was_this_you}}
          Si fuiste tú, no necesitas hacer nada. Si no reconoces esta actividad, te recomendamos cambiar tu contraseña inmediatamente.
          {{else}}
          Si fuiste tú, no necesitas hacer nada. Sin embargo, si no reconoces esta actividad, te recomendamos:
          {{/if}}
        </p>

        {{#unless was_this_you}}
        <!-- Botones de acción -->
        <table width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 30px;">
          <tr>
            <td style="padding: 0 10px 10px 0; width: 50%;">
              <a href="{{security_url}}" style="display: block; padding: 14px 10px; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; text-align: center;">
                🔐 Proteger Mi Cuenta
              </a>
            </td>
            <td style="padding: 0 0 10px 10px; width: 50%;">
              <a href="mailto:seguridad@opttius.com" style="display: block; padding: 14px 10px; background: #334155; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; text-align: center;">
                📧 Reportar Problema
              </a>
            </td>
          </tr>
        </table>
        {{/unless}}
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background: #0f172a; padding: 25px 30px; text-align: center; border-top: 1px solid #334155;">
        <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 16px; font-weight: 600;">Opttius</p>
        <p style="margin: 0; color: #64748b; font-size: 12px;">
          Tu seguridad es nuestra prioridad
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
',
  '["user_name", "user_email", "organization_name", "action_type", "ip_address", "user_agent", "location", "timestamp", "security_url", "was_this_you"]',
  true,
  'saas',
  'Email de alerta de seguridad por actividad sospechosa',
  NOW(),
  NOW()
);

-- ============================================================================
// 7. ONBOARDING
-- ============================================================================

INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, category, description, created_at, updated_at)
VALUES (
  'saas_onboarding',
  'Onboarding SaaS',
  '🚀 Paso {{step_number}} de {{total_steps}}: {{current_step_name}}',
  '
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Continúa tu Onboarding</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Helvetica Neue'', Arial, sans-serif; background-color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; overflow: hidden;">
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 40px 30px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 15px;">🚀</div>
        <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 700;">¡Bienvenido a bordo!</h1>
        <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Configuremos tu óptica juntos</p>
      </td>
    </tr>

    <!-- Contenido -->
    <tr>
      <td style="padding: 40px 30px;">
        <p style="font-size: 18px; color: #e2e8f0; margin-bottom: 25px;">
          Hola <strong>{{user_name}}</strong>,
        </p>

        <p style="font-size: 15px; color: #94a3b8; line-height: 1.7; margin-bottom: 30px;">
          Vamos a ayudarte a configurar <strong>{{organization_name}}</strong> en Opttius. Estás en el paso <strong>{{step_number}}</strong> de <strong>{{total_steps}}</strong>.
        </p>

        <!-- Paso actual -->
        <div style="background: #334155; border-radius: 10px; padding: 25px; margin-bottom: 30px; border-left: 4px solid #3b82f6;">
          <p style="margin: 0 0 10px 0; color: #94a3b8; font-size: 12px; text-transform: uppercase;">Paso Actual</p>
          <p style="margin: 0 0 15px 0; color: #ffffff; font-size: 20px; font-weight: 700;">{{current_step_name}}</p>
          {{#if next_step_name}}
          <p style="margin: 0; color: #94a3b8; font-size: 14px;">Siguiente: <strong style="color: #3b82f6;">{{next_step_name}}</strong></p>
          {{/if}}
        </div>

        {{#if next_step_url}}
        <!-- Botón -->
        <div style="text-align: center; margin-bottom: 30px;">
          <a href="{{next_step_url}}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Continuar Configuración →
          </a>
        </div>
        {{/if}}

        <!-- Recursos -->
        <div style="background: #1e293b; border-radius: 10px; padding: 20px; text-align: center;">
          <p style="margin: 0 0 15px 0; color: #94a3b8; font-size: 14px;">
            <strong>¿Necesitas ayuda?</strong> Tenemos recursos para ti
          </p>
          <a href="{{resources_url}}" style="color: #3b82f6; text-decoration: none;">📚 Ver Documentación</a>
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background: #0f172a; padding: 25px 30px; text-align: center; border-top: 1px solid #334155;">
        <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 16px; font-weight: 600;">Opttius</p>
        <p style="margin: 0; color: #64748b; font-size: 12px;">
          <a href="mailto:soporte@opttius.com" style="color: #3b82f6;">soporte@opttius.com</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
',
  '["user_name", "organization_name", "step_number", "total_steps", "current_step_name", "next_step_name", "next_step_url", "resources_url"]',
  true,
  'saas',
  'Email guiado durante el proceso de onboarding',
  NOW(),
  NOW()
);

-- ============================================================================
// 8. ACTUALIZACIÓN DE TÉRMINOS
// ============================================================================

INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, category, description, created_at, updated_at)
VALUES (
  'saas_terms_update',
  'Actualización de Términos',
  '📜 Actualización de Términos y Condiciones de Opttius',
  '
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Actualización de Términos</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Helvetica Neue'', Arial, sans-serif; background-color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; overflow: hidden;">
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #64748b 0%, #475569 100%); padding: 40px 30px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 15px;">📜</div>
        <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 700;">Actualización de Términos</h1>
        <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Lee y acepta los nuevos términos</p>
      </td>
    </tr>

    <!-- Contenido -->
    <tr>
      <td style="padding: 40px 30px;">
        <p style="font-size: 18px; color: #e2e8f0; margin-bottom: 25px;">
          Hola,
        </p>

        <p style="font-size: 15px; color: #94a3b8; line-height: 1.7; margin-bottom: 30px;">
          Queremos informarte que hemos actualizado nuestros <strong>Términos y Condiciones</strong> y <strong>Política de Privacidad</strong>.
        </p>

        <p style="font-size: 15px; color: #94a3b8; line-height: 1.7; margin-bottom: 30px;">
          Estos cambios entrarán en vigor el <strong>próximo lunes</strong> y aplican para todos los usuarios de <strong>{{organization_name}}</strong>.
        </p>

        <!-- Cambios destacados -->
        <div style="background: #334155; border-radius: 10px; padding: 25px; margin-bottom: 30px;">
          <p style="margin: 0 0 15px 0; color: #ffffff; font-size: 16px; font-weight: 600;">📋 Principales cambios:</p>
          <ul style="margin: 0; padding-left: 20px; color: #cbd5e1; font-size: 14px; line-height: 2;">
            <li>Mejoras en la protección de datos</li>
            <li>Términos más claros sobre el uso del servicio</li>
            <li>Actualización de políticas de facturación</li>
          </ul>
        </div>

        <!-- Botones -->
        <table width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 30px;">
          <tr>
            <td style="padding: 0 10px 10px 0; width: 50%;">
              <a href="{{terms_url}}" style="display: block; padding: 14px 10px; background: #334155; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; text-align: center;">
                📄 Ver Términos
              </a>
            </td>
            <td style="padding: 0 0 10px 10px; width: 50%;">
              <a href="{{acceptance_url}}" style="display: block; padding: 14px 10px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; text-align: center;">
                ✓ Aceptar Términos
              </a>
            </td>
          </tr>
        </table>

        <p style="font-size: 13px; color: #64748b; text-align: center;">
          Si tienes preguntas sobre estos cambios, no dudes en contactarnos.
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background: #0f172a; padding: 25px 30px; text-align: center; border-top: 1px solid #334155;">
        <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 16px; font-weight: 600;">Opttius</p>
        <p style="margin: 0; color: #64748b; font-size: 12px;">
          <a href="mailto:{{support_email}}" style="color: #3b82f6;">{{support_email}}</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
',
  '["organization_name", "terms_url", "acceptance_url", "support_email"]',
  true,
  'saas',
  'Email notificando actualización de términos y condiciones',
  NOW(),
  NOW()
);

-- ============================================================================
// 9. MANTENIMIENTO PROGRAMADO
-- ============================================================================

INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, category, description, created_at, updated_at)
VALUES (
  'saas_maintenance',
  'Mantenimiento Programado',
  '🔧 Mantenimiento programado en Opttius',
  '
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mantenimiento Programado</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Helvetica Neue'', Arial, sans-serif; background-color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; overflow: hidden;">
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); padding: 40px 30px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 15px;">🔧</div>
        <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 700;">Mantenimiento Programado</h1>
        <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Mejoras para un mejor servicio</p>
      </td>
    </tr>

    <!-- Contenido -->
    <tr>
      <td style="padding: 40px 30px;">
        <p style="font-size: 18px; color: #e2e8f0; margin-bottom: 25px;">
          Hola de parte del equipo <strong>Opttius</strong>,
        </p>

        <p style="font-size: 15px; color: #94a3b8; line-height: 1.7; margin-bottom: 30px;">
          Te informamos que realizaremos un mantenimiento programado en nuestra plataforma para mejorar tu experiencia.
        </p>

        <!-- Detalles del mantenimiento -->
        <div style="background: #334155; border-radius: 10px; padding: 25px; margin-bottom: 30px;">
          <table width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #475569; color: #94a3b8; font-size: 14px;">📅 Fecha</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #475569; color: #ffffff; font-size: 14px; text-align: right;">{{maintenance_start}}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #475569; color: #94a3b8; font-size: 14px;">⏱️ Duración estimada</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #475569; color: #ffffff; font-size: 14px; text-align: right;">{{maintenance_end}}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #94a3b8; font-size: 14px;">🔧 Servicios afectados</td>
              <td style="padding: 10px 0; color: #ffffff; font-size: 14px; text-align: right;">{{affected_services}}</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 15px; color: #94a3b8; line-height: 1.7; margin-bottom: 30px;">
          Durante este período, algunos servicios podrían no estar disponibles. Te pedimos disculpas por las molestias y te agradecemos tu paciencia mientras mejoramos nuestra plataforma.
        </p>

        <!-- Estado -->
        <div style="text-align: center;">
          <a href="{{status_url}}" style="display: inline-block; padding: 14px 32px; background: #334155; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
            📊 Ver Estado del Sistema
          </a>
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background: #0f172a; padding: 25px 30px; text-align: center; border-top: 1px solid #334155;">
        <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 16px; font-weight: 600;">Opttius</p>
        <p style="margin: 0; color: #64748b; font-size: 12px;">
          La mejor gestión para tu óptica
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
',
  '["organization_name", "maintenance_start", "maintenance_end", "affected_services", "status_url"]',
  true,
  'saas',
  'Email notificando mantenimiento programado',
  NOW(),
  NOW()
);

-- ============================================================================
// 10. ALERTA DE USO
-- ============================================================================

INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, category, description, created_at, updated_at)
VALUES (
  'saas_usage_alert',
  'Alerta de Uso',
  '⚠️ Has alcanzado el {{percentage_used}}% de tu límite de {{resource_type}}',
  '
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alerta de Uso</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Helvetica Neue'', Arial, sans-serif; background-color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; overflow: hidden;">
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 30px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 15px;">⚠️</div>
        <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 700;">¡Casi llegas al límite!</h1>
        <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">{{percentage_used}}% de {{resource_type}} utilizado</p>
      </td>
    </tr>

    <!-- Contenido -->
    <tr>
      <td style="padding: 40px 30px;">
        <p style="font-size: 18px; color: #e2e8f0; margin-bottom: 25px;">
          Hola,
        </p>

        <p style="font-size: 15px; color: #94a3b8; line-height: 1.7; margin-bottom: 30px;">
          Queremos informarte que <strong>{{organization_name}}</strong> ha utilizado el <strong>{{percentage_used}}%</strong> de su límite de <strong>{{resource_type}}</strong>.
        </p>

        <!-- Progress bar visual -->
        <div style="background: #334155; border-radius: 10px; padding: 25px; margin-bottom: 30px;">
          <table width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding-bottom: 15px;">
                <div style="background: #1e293b; border-radius: 10px; height: 20px; overflow: hidden;">
                  <div style="background: linear-gradient(90deg, #f59e0b 0%, #ef4444 100%); width: {{percentage_used}}%; height: 100%;"></div>
                </div>
              </td>
            </tr>
            <tr>
              <td style="text-align: center;">
                <span style="color: #ffffff; font-size: 24px; font-weight: 700;">{{current_usage}}</span>
                <span style="color: #94a3b8; font-size: 14px;"> / {{limit_usage}}</span>
              </td>
            </tr>
          </table>
        </div>

        <p style="font-size: 15px; color: #94a3b8; line-height: 1.7; margin-bottom: 30px;">
          Para evitar interrupciones en tu servicio, te recomendamos actualizar tu plan si necesitas más capacidad.
        </p>

        <!-- Botón -->
        <div style="text-align: center;">
          <a href="{{upgrade_url}}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
            ↑ Upgradear Mi Plan
          </a>
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background: #0f172a; padding: 25px 30px; text-align: center; border-top: 1px solid #334155;">
        <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 16px; font-weight: 600;">Opttius</p>
        <p style="margin: 0; color: #64748b; font-size: 12px;">
          <a href="mailto:soporte@opttius.com" style="color: #3b82f6;">soporte@opttius.com</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
',
  '["organization_name", "resource_type", "current_usage", "limit_usage", "percentage_used", "upgrade_url"]',
  true,
  'saas',
  'Email de alerta cuando se acerca al límite del plan',
  NOW(),
  NOW()
);

-- ============================================================================
// 11. ANUNCIO DE NUEVA FUNCIÓN
// ============================================================================

INSERT INTO system_email_templates (type, name, subject, content, variables, is_active, category, description, created_at, updated_at)
VALUES (
  'saas_feature_announcement',
  'Nueva Función',
  '🚀 ¡Nueva función disponible: {{feature_name}}!',
  '
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nueva Función en Opttius</title>
</head>
<body style="margin: 0; padding: 0; font-family: ''Helvetica Neue'', Arial, sans-serif; background-color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; overflow: hidden;">
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 15px;">🚀</div>
        <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 700;">¡Nueva Función Disponible!</h1>
        <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">{{release_date}}</p>
      </td>
    </tr>

    <!-- Contenido -->
    <tr>
      <td style="padding: 40px 30px;">
        <p style="font-size: 18px; color: #e2e8f0; margin-bottom: 25px;">
          Hola <strong>{{organization_name}}</strong>!
        </p>

        <p style="font-size: 15px; color: #94a3b8; line-height: 1.7; margin-bottom: 30px;">
          🎉 ¡Tenemos noticias emocionantes! Acabamos de lanzar una nueva función que te ayudará a ser aún más productivo.
        </p>

        <!-- Feature destacada -->
        <div style="background: linear-gradient(135deg, #334155 0%, #1e293b 100%); border-radius: 12px; padding: 30px; margin-bottom: 30px; border: 2px solid #10b981;">
          <p style="margin: 0 0 20px 0; color: #10b981; font-size: 14px; text-transform: uppercase; font-weight: 600;">Nueva Función</p>
          <p style="margin: 0 0 20px 0; color: #ffffff; font-size: 28px; font-weight: 700;">{{feature_name}}</p>
          <p style="margin: 0; color: #cbd5e1; font-size: 15px; line-height: 1.7;">{{feature_description}}</p>
        </div>

        <!-- Beneficios -->
        <div style="background: #1e293b; border-radius: 10px; padding: 20px; margin-bottom: 30px;">
          <p style="margin: 0 0 15px 0; color: #ffffff; font-size: 16px; font-weight: 600;">✨ Beneficios:</p>
          <ul style="margin: 0; padding-left: 20px; color: #cbd5e1; font-size: 14px; line-height: 2;">
            <li>Ahorra tiempo en tu día a día</li>
            <li>Mejora la experiencia de tus clientes</li>
            <li>Integración automática con tu flujo actual</li>
          </ul>
        </div>

        <!-- Botones -->
        <table width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 30px;">
          <tr>
            <td style="padding: 0 10px 10px 0; width: 50%;">
              <a href="{{feature_url}}" style="display: block; padding: 14px 10px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; text-align: center;">
                🚀 Probar Ahora
              </a>
            </td>
            <td style="padding: 0 0 10px 10px; width: 50%;">
              <a href="{{docs_url}}" style="display: block; padding: 14px 10px; background: #334155; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; text-align: center;">
                📖 Ver Documentación
              </a>
            </td>
          </tr>
        </table>

        <p style="font-size: 13px; color: #64748b; text-align: center;">
          ¿Tienes preguntas sobre esta función? Nuestro equipo está listo para ayudarte.
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background: #0f172a; padding: 25px 30px; text-align: center; border-top: 1px solid #334155;">
        <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 16px; font-weight: 600;">Opttius</p>
        <p style="margin: 0; color: #64748b; font-size: 12px;">
          Siempre mejorando para ti
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
',
  '["organization_name", "feature_name", "feature_description", "feature_url", "release_date", "docs_url"]',
  true,
  'saas',
  'Email announcing new feature releases',
  NOW(),
  NOW()
);

-- ============================================================================
// VERIFICACIÓN
-- ============================================================================

-- Verificar las plantillas SaaS insertadas
-- SELECT type, name, is_active, category FROM system_email_templates WHERE category = 'saas' ORDER BY type;
