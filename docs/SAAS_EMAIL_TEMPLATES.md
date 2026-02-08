# Plantillas Funcionales SaaS - Comunicación con Administradores de Ópticas

Este documento especifica las plantillas de email que el SaaS utiliza para comunicarse con los administradores de las ópticas (organizaciones).

---

## Índice

1. [Bienvenida SaaS](#1-bienvenida-saas)
2. [Fin de Período de Prueba](#2-fin-de-período-de-prueba)
3. [Suscripción Exitosa](#3-suscripción-exitosa)
4. [Error de Suscripción](#4-error-de-suscripción)
5. [Recordatorio de Pago](#5-recordatorio-de-pago)
6. [Onboarding - Paso 1](#6-onboarding---paso-1)
7. [Actualización de Términos](#7-actualización-de-términos)
8. [Mantenimiento Programado](#8-mantenimiento-programado)
9. [Alerta de Uso](#9-alerta-de-uso)
10. [Nueva Funcionalidad](#10-nueva-funcionalidad)

---

## Variables Comunes

Todas las plantillas SaaS pueden usar las siguientes variables:

| Variable                   | Descripción               | Ejemplo                                  |
| -------------------------- | ------------------------- | ---------------------------------------- |
| `{{admin_name}}`           | Nombre del administrador  | "Juan Pérez"                             |
| `{{admin_email}}`          | Email del administrador   | "juan@vision.com"                        |
| `{{organization_name}}`    | Nombre de la organización | "Óptica Vision"                          |
| `{{organization_slug}}`    | Slug de la organización   | "vision"                                 |
| `{{company_name}}`         | Nombre del SaaS           | "OPTTIUS"                                |
| `{{support_email}}`        | Email de soporte          | "soporte@opttius.com"                    |
| `{{website_url}}`          | URL del sitio             | "https://opttius.com"                    |
| `{{admin_dashboard_url}}`  | URL del dashboard         | "https://opttius.com/admin"              |
| `{{current_date}}`         | Fecha actual              | "15 de enero de 2025"                    |
| `{{trial_days_remaining}}` | Días restantes de prueba  | "7"                                      |
| `{{subscription_plan}}`    | Plan de suscripción       | "Profesional"                            |
| `{{subscription_amount}}`  | Monto de suscripción      | "$299/mes"                               |
| `{{payment_due_date}}`     | Fecha de vencimiento      | "20 de enero de 2025"                    |
| `{{invoice_url}}`          | URL de la factura         | "https://opttius.com/admin/invoices/123" |
| `{{update_payment_url}}`   | URL para actualizar pago  | "https://opttius.com/admin/billing"      |

---

## 1. Bienvenida SaaS

**Tipo**: `saas_welcome`
**Asunto predeterminado**: `¡Bienvenido a Opttius, {{admin_name}}! Tu óptica está lista`

### Descripción

Email de bienvenida cuando un nuevo administrador de óptica se registra en el SaaS.

### Template HTML

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Bienvenido a Opttius</title>
  </head>
  <body
    style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4;"
  >
    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      style="background-color: #f4f4f4; padding: 20px 0;"
    >
      <tr>
        <td align="center">
          <table
            width="600"
            cellpadding="0"
            cellspacing="0"
            style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
          >
            <!-- Header -->
            <tr>
              <td
                style="background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%); padding: 40px 30px; text-align: center;"
              >
                <h1
                  style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;"
                >
                  OPTTIUS
                </h1>
                <p style="margin: 10px 0 0 0; color: #E0E7FF; font-size: 16px;">
                  Tu Sistema de Gestión Óptico Integral
                </p>
              </td>
            </tr>

            <!-- Content -->
            <tr>
              <td style="padding: 40px 30px;">
                <h2
                  style="margin: 0 0 20px 0; color: #1E40AF; font-size: 28px; font-weight: 600;"
                >
                  ¡Bienvenido a Opttius, {{admin_name}}! 🎉
                </h2>

                <p
                  style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;"
                >
                  Estamos emocionados de que {{organization_name}} se haya unido
                  a nuestra comunidad de ópticas líderes.
                </p>

                <p
                  style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;"
                >
                  Con Opttius, tendrás todas las herramientas que necesitas para
                  gestionar tu óptica de manera eficiente:
                </p>

                <!-- Features List -->
                <table
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  style="margin: 20px 0;"
                >
                  <tr>
                    <td
                      style="padding: 15px; background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid #3B82F6;"
                    >
                      <p
                        style="margin: 0 0 8px 0; color: #1E40AF; font-weight: 600; font-size: 16px;"
                      >
                        📊 Dashboard Centralizado
                      </p>
                      <p style="margin: 0; color: #666666; font-size: 14px;">
                        Gestiona inventario, ventas y clientes desde un solo
                        lugar
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="height: 10px;"></td>
                  </tr>
                  <tr>
                    <td
                      style="padding: 15px; background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid #3B82F6;"
                    >
                      <p
                        style="margin: 0 0 8px 0; color: #1E40AF; font-weight: 600; font-size: 16px;"
                      >
                        👥 Gestión de Clientes
                      </p>
                      <p style="margin: 0; color: #666666; font-size: 14px;">
                        Historial de compras, recetas y citas personalizadas
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="height: 10px;"></td>
                  </tr>
                  <tr>
                    <td
                      style="padding: 15px; background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid #3B82F6;"
                    >
                      <p
                        style="margin: 0 0 8px 0; color: #1E40AF; font-weight: 600; font-size: 16px;"
                      >
                        📈 Análisis y Reportes
                      </p>
                      <p style="margin: 0; color: #666666; font-size: 14px;">
                        Insights powered by AI para optimizar tu negocio
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="height: 10px;"></td>
                  </tr>
                  <tr>
                    <td
                      style="padding: 15px; background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid #3B82F6;"
                    >
                      <p
                        style="margin: 0 0 8px 0; color: #1E40AF; font-weight: 600; font-size: 16px;"
                      >
                        💳 Puntos de Venta Integrados
                      </p>
                      <p style="margin: 0; color: #666666; font-size: 14px;">
                        Procesa ventas con múltiples métodos de pago
                      </p>
                    </td>
                  </tr>
                </table>

                <!-- CTA Button -->
                <table
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  style="margin: 30px 0;"
                >
                  <tr>
                    <td align="center">
                      <a
                        href="{{admin_dashboard_url}}"
                        style="display: inline-block; background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;"
                      >
                        Ir a mi Dashboard
                      </a>
                    </td>
                  </tr>
                </table>

                <!-- Quick Start Tips -->
                <div
                  style="background-color: #EFF6FF; border-radius: 8px; padding: 20px; margin: 20px 0;"
                >
                  <p
                    style="margin: 0 0 10px 0; color: #1E40AF; font-weight: 600; font-size: 16px;"
                  >
                    💡 Primeros Pasos:
                  </p>
                  <ol
                    style="margin: 0; padding-left: 20px; color: #666666; font-size: 14px; line-height: 1.8;"
                  >
                    <li>Completa el perfil de tu óptica</li>
                    <li>Configura tus métodos de pago</li>
                    <li>Agrega tus productos al inventario</li>
                    <li>Invita a tu equipo</li>
                  </ol>
                </div>

                <p
                  style="margin: 20px 0; color: #666666; font-size: 16px; line-height: 1.6;"
                >
                  Si tienes alguna pregunta, nuestro equipo de soporte está aquí
                  para ayudarte.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td
                style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;"
              >
                <p
                  style="margin: 0 0 10px 0; color: #1E40AF; font-size: 18px; font-weight: 600;"
                >
                  OPTTIUS
                </p>
                <p style="margin: 0 0 10px 0; color: #999999; font-size: 14px;">
                  ¿Necesitas ayuda? Contáctanos en
                </p>
                <p
                  style="margin: 0 0 15px 0; color: #3B82F6; font-size: 14px; font-weight: 600;"
                >
                  soporte@opttius.com
                </p>
                <p style="margin: 0; color: #999999; font-size: 12px;">
                  © {{current_date}} OPTTIUS. Todos los derechos reservados.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

### Template Texto

```
OPTTIUS - ¡Bienvenido!

Hola {{admin_name}},

¡Bienvenido a Opttius! Estamos emocionados de que {{organization_name}} se haya unido a nuestra comunidad.

CON OPTTIUS PODRÁS:

✓ Dashboard Centralizado
  Gestiona inventario, ventas y clientes desde un solo lugar

✓ Gestión de Clientes
  Historial de compras, recetas y citas personalizadas

✓ Análisis y Reportes
  Insights powered by AI para optimizar tu negocio

✓ Puntos de Venta Integrados
  Procesa ventas con múltiples métodos de pago

PRIMEROS PASOS:

1. Completa el perfil de tu óptica
2. Configura tus métodos de pago
3. Agrega tus productos al inventario
4. Invita a tu equipo

Accede a tu dashboard: {{admin_dashboard_url}}

Si tienes alguna pregunta, nuestro equipo de soporte está aquí para ayudarte.

Contacto: soporte@opttius.com

© {{current_date}} OPTTIUS
```

---

## 2. Fin de Período de Prueba

**Tipo**: `saas_trial_ending`
**Asunto predeterminado**: `⚠️ Tu período de prueba en Opttius termina pronto`

### Descripción

Recordatorio de que el período de prueba está por terminar.

### Template HTML

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Período de Prueba</title>
  </head>
  <body
    style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4;"
  >
    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      style="background-color: #f4f4f4; padding: 20px 0;"
    >
      <tr>
        <td align="center">
          <table
            width="600"
            cellpadding="0"
            cellspacing="0"
            style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
          >
            <!-- Header -->
            <tr>
              <td
                style="background: linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%); padding: 40px 30px; text-align: center;"
              >
                <h1
                  style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;"
                >
                  OPTTIUS
                </h1>
                <p style="margin: 10px 0 0 0; color: #FEF3C7; font-size: 16px;">
                  Tu Sistema de Gestión Óptico Integral
                </p>
              </td>
            </tr>

            <!-- Content -->
            <tr>
              <td style="padding: 40px 30px;">
                <h2
                  style="margin: 0 0 20px 0; color: #1E40AF; font-size: 28px; font-weight: 600;"
                >
                  ⚠️ Tu período de prueba está por terminar
                </h2>

                <p
                  style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;"
                >
                  Hola {{admin_name}},
                </p>

                <p
                  style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;"
                >
                  ¡Excelentes noticias! Tu período de prueba de Opttius ha
                  estado corriendo y has tenido la oportunidad de explorar todas
                  las funcionalidades que tenemos para ofrecer.
                </p>

                <!-- Alert Box -->
                <div
                  style="background-color: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;"
                >
                  <p
                    style="margin: 0 0 10px 0; color: #92400E; font-size: 24px; font-weight: 700;"
                  >
                    {{trial_days_remaining}} días restantes
                  </p>
                  <p style="margin: 0; color: #92400E; font-size: 14px;">
                    Tu prueba expira el {{payment_due_date}}
                  </p>
                </div>

                <p
                  style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;"
                >
                  Para seguir utilizando Opttius sin interrupciones, te
                  recomendamos actualizar a uno de nuestros planes de
                  suscripción.
                </p>

                <!-- Plans Comparison -->
                <table
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  style="margin: 20px 0; border-collapse: collapse;"
                >
                  <tr>
                    <td
                      width="50%"
                      style="padding: 15px; background-color: #f8f9fa; border-radius: 8px 0 0 8px; border: 1px solid #e0e0e0;"
                    >
                      <p
                        style="margin: 0 0 10px 0; color: #1E40AF; font-weight: 600; font-size: 18px;"
                      >
                        Básico
                      </p>
                      <p
                        style="margin: 0 0 10px 0; color: #666666; font-size: 14px;"
                      >
                        Ideal para iniciar
                      </p>
                      <p
                        style="margin: 0; color: #1E40AF; font-size: 24px; font-weight: 700;"
                      >
                        $99/mes
                      </p>
                    </td>
                    <td
                      width="50%"
                      style="padding: 15px; background-color: #EFF6FF; border-radius: 0 8px 8px 0; border: 2px solid #3B82F6;"
                    >
                      <p
                        style="margin: 0 0 10px 0; color: #1E40AF; font-weight: 600; font-size: 18px;"
                      >
                        Profesional
                      </p>
                      <p
                        style="margin: 0 0 10px 0; color: #666666; font-size: 14px;"
                      >
                        Para crecer
                      </p>
                      <p
                        style="margin: 0; color: #1E40AF; font-size: 24px; font-weight: 700;"
                      >
                        $199/mes
                      </p>
                    </td>
                  </tr>
                </table>

                <!-- CTA Button -->
                <table
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  style="margin: 30px 0;"
                >
                  <tr>
                    <td align="center">
                      <a
                        href="{{admin_dashboard_url}}/billing"
                        style="display: inline-block; background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;"
                      >
                        Actualizar mi Plan
                      </a>
                    </td>
                  </tr>
                </table>

                <p
                  style="margin: 20px 0; color: #666666; font-size: 14px; line-height: 1.6; text-align: center;"
                >
                  ¿Tienes preguntas sobre los planes? Nuestro equipo está listo
                  para ayudarte a elegir el mejor plan para tu óptica.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td
                style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;"
              >
                <p
                  style="margin: 0 0 10px 0; color: #1E40AF; font-size: 18px; font-weight: 600;"
                >
                  OPTTIUS
                </p>
                <p style="margin: 0 0 10px 0; color: #999999; font-size: 14px;">
                  ¿Preguntas? Contáctanos en soporte@opttius.com
                </p>
                <p style="margin: 0; color: #999999; font-size: 12px;">
                  © {{current_date}} OPTTIUS
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

---

## 3. Suscripción Exitosa

**Tipo**: `saas_subscription_success`
**Asunto predeterminado**: `✅ Tu suscripción a Opttius está activa`

### Descripción

Confirmación de que la suscripción ha sido procesada exitosamente.

### Template HTML

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Suscripción Activa</title>
  </head>
  <body
    style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4;"
  >
    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      style="background-color: #f4f4f4; padding: 20px 0;"
    >
      <tr>
        <td align="center">
          <table
            width="600"
            cellpadding="0"
            cellspacing="0"
            style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
          >
            <!-- Header -->
            <tr>
              <td
                style="background: linear-gradient(135deg, #059669 0%, #10B981 100%); padding: 40px 30px; text-align: center;"
              >
                <h1
                  style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;"
                >
                  OPTTIUS
                </h1>
                <p style="margin: 10px 0 0 0; color: #D1FAE5; font-size: 16px;">
                  Tu Sistema de Gestión Óptico Integral
                </p>
              </td>
            </tr>

            <!-- Content -->
            <tr>
              <td style="padding: 40px 30px;">
                <div style="text-align: center; margin-bottom: 30px;">
                  <span style="font-size: 64px;">✅</span>
                </div>

                <h2
                  style="margin: 0 0 20px 0; color: #1E40AF; font-size: 28px; font-weight: 600; text-align: center;"
                >
                  ¡Tu suscripción está activa!
                </h2>

                <p
                  style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6; text-align: center;"
                >
                  Hola {{admin_name}},<br />
                  Tu suscripción a Opttius ha sido procesada exitosamente.
                </p>

                <!-- Subscription Details -->
                <div
                  style="background-color: #f8f9fa; border-radius: 8px; padding: 25px; margin: 30px 0; border: 1px solid #e0e0e0;"
                >
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td
                        style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;"
                      >
                        <p style="margin: 0; color: #999999; font-size: 14px;">
                          Organización
                        </p>
                        <p
                          style="margin: 5px 0 0 0; color: #1E40AF; font-weight: 600; font-size: 16px;"
                        >
                          {{organization_name}}
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td
                        style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;"
                      >
                        <p style="margin: 0; color: #999999; font-size: 14px;">
                          Plan
                        </p>
                        <p
                          style="margin: 5px 0 0 0; color: #1E40AF; font-weight: 600; font-size: 16px;"
                        >
                          {{subscription_plan}}
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td
                        style="padding: 10px 0; border-bottom: 1px solid #e0e0e0;"
                      >
                        <p style="margin: 0; color: #999999; font-size: 14px;">
                          Monto
                        </p>
                        <p
                          style="margin: 5px 0 0 0; color: #1E40AF; font-weight: 600; font-size: 16px;"
                        >
                          {{subscription_amount}}
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 0;">
                        <p style="margin: 0; color: #999999; font-size: 14px;">
                          Próximo cobro
                        </p>
                        <p
                          style="margin: 5px 0 0 0; color: #1E40AF; font-weight: 600; font-size: 16px;"
                        >
                          {{payment_due_date}}
                        </p>
                      </td>
                    </tr>
                  </table>
                </div>

                <!-- CTA Button -->
                <table
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  style="margin: 30px 0;"
                >
                  <tr>
                    <td align="center">
                      <a
                        href="{{admin_dashboard_url}}"
                        style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #10B981 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;"
                      >
                        Acceder a mi Dashboard
                      </a>
                    </td>
                  </tr>
                </table>

                <p
                  style="margin: 20px 0; color: #666666; font-size: 14px; line-height: 1.6; text-align: center;"
                >
                  Gracias por confiar en Opttius para gestionar tu óptica.<br />
                  Estamos comprometidos con tu éxito.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td
                style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;"
              >
                <p
                  style="margin: 0 0 10px 0; color: #1E40AF; font-size: 18px; font-weight: 600;"
                >
                  OPTTIUS
                </p>
                <p style="margin: 0 0 10px 0; color: #999999; font-size: 14px;">
                  ¿Necesitas ayuda? soporte@opttius.com
                </p>
                <p style="margin: 0; color: #999999; font-size: 12px;">
                  © {{current_date}} OPTTIUS
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

---

## 4. Error de Suscripción

**Tipo**: `saas_subscription_failed`
**Asunto predeterminado**: `⚠️ Hubo un problema con tu suscripción a Opttius`

### Descripción

Notificación de que el pago de suscripción no pudo ser procesado.

### Template HTML

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Error de Suscripción</title>
  </head>
  <body
    style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4;"
  >
    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      style="background-color: #f4f4f4; padding: 20px 0;"
    >
      <tr>
        <td align="center">
          <table
            width="600"
            cellpadding="0"
            cellspacing="0"
            style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
          >
            <!-- Header -->
            <tr>
              <td
                style="background: linear-gradient(135deg, #DC2626 0%, #EF4444 100%); padding: 40px 30px; text-align: center;"
              >
                <h1
                  style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;"
                >
                  OPTTIUS
                </h1>
                <p style="margin: 10px 0 0 0; color: #FEE2E2; font-size: 16px;">
                  Tu Sistema de Gestión Óptico Integral
                </p>
              </td>
            </tr>

            <!-- Content -->
            <tr>
              <td style="padding: 40px 30px;">
                <div style="text-align: center; margin-bottom: 30px;">
                  <span style="font-size: 64px;">⚠️</span>
                </div>

                <h2
                  style="margin: 0 0 20px 0; color: #DC2626; font-size: 28px; font-weight: 600; text-align: center;"
                >
                  Hubo un problema con tu suscripción
                </h2>

                <p
                  style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6; text-align: center;"
                >
                  Hola {{admin_name}},<br />
                  Lamentamos informarte que no pudimos procesar el pago de tu
                  suscripción.
                </p>

                <!-- Alert Box -->
                <div
                  style="background-color: #FEE2E2; border: 1px solid #DC2626; border-radius: 8px; padding: 20px; margin: 30px 0;"
                >
                  <p
                    style="margin: 0 0 10px 0; color: #991B1B; font-weight: 600; font-size: 16px;"
                  >
                    Tu plan {{subscription_plan}} puede ser suspendido si el
                    pago no se completa.
                  </p>
                  <p style="margin: 0; color: #991B1B; font-size: 14px;">
                    Por favor, actualiza tu información de pago para evitar
                    interrupciones en el servicio.
                  </p>
                </div>

                <p
                  style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;"
                >
                  Esto puede haber ocurrido por:
                </p>

                <ul
                  style="margin: 0 0 30px 20px; padding: 0; color: #666666; font-size: 14px; line-height: 2;"
                >
                  <li>Tarjeta vencida o expirada</li>
                  <li>Fondos insuficientes</li>
                  <li>Información de tarjeta incorrecta</li>
                  <li>Restricciones del banco emisor</li>
                </ul>

                <!-- CTA Button -->
                <table
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  style="margin: 30px 0;"
                >
                  <tr>
                    <td align="center">
                      <a
                        href="{{update_payment_url}}"
                        style="display: inline-block; background: linear-gradient(135deg, #DC2626 0%, #EF4444 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;"
                      >
                        Actualizar Método de Pago
                      </a>
                    </td>
                  </tr>
                </table>

                <p
                  style="margin: 20px 0; color: #666666; font-size: 14px; line-height: 1.6; text-align: center;"
                >
                  Si necesitas ayuda, nuestro equipo de soporte está listo para
                  asistirte.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td
                style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;"
              >
                <p
                  style="margin: 0 0 10px 0; color: #1E40AF; font-size: 18px; font-weight: 600;"
                >
                  OPTTIUS
                </p>
                <p style="margin: 0 0 10px 0; color: #999999; font-size: 14px;">
                  Contáctanos: soporte@opttius.com
                </p>
                <p style="margin: 0; color: #999999; font-size: 12px;">
                  © {{current_date}} OPTTIUS
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

---

## 5. Recordatorio de Pago

**Tipo**: `saas_payment_reminder`
**Asunto predeterminado**: `📅 Recordatorio: Tu pago de Opttius vence pronto`

### Descripción

Recordatorio amistoso de que el pago está por vencer.

### Template HTML

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Recordatorio de Pago</title>
  </head>
  <body
    style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4;"
  >
    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      style="background-color: #f4f4f4; padding: 20px 0;"
    >
      <tr>
        <td align="center">
          <table
            width="600"
            cellpadding="0"
            cellspacing="0"
            style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
          >
            <!-- Header -->
            <tr>
              <td
                style="background: linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%); padding: 40px 30px; text-align: center;"
              >
                <h1
                  style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;"
                >
                  OPTTIUS
                </h1>
                <p style="margin: 10px 0 0 0; color: #DBEAFE; font-size: 16px;">
                  Recordatorio de Pago
                </p>
              </td>
            </tr>

            <!-- Content -->
            <tr>
              <td style="padding: 40px 30px;">
                <h2
                  style="margin: 0 0 20px 0; color: #1E40AF; font-size: 28px; font-weight: 600;"
                >
                  ¡Hola {{admin_name}}! 👋
                </h2>

                <p
                  style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;"
                >
                  Te recordamos amablemente que tu próximo pago de Opttius está
                  por vencer.
                </p>

                <!-- Payment Details -->
                <div
                  style="background-color: #EFF6FF; border-radius: 8px; padding: 25px; margin: 30px 0; text-align: center;"
                >
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td
                        width="50%"
                        style="padding: 15px; border-right: 1px solid #BFDBFE;"
                      >
                        <p style="margin: 0; color: #60A5FA; font-size: 14px;">
                          Monto a pagar
                        </p>
                        <p
                          style="margin: 5px 0 0 0; color: #1E40AF; font-size: 28px; font-weight: 700;"
                        >
                          {{subscription_amount}}
                        </p>
                      </td>
                      <td width="50%" style="padding: 15px;">
                        <p style="margin: 0; color: #60A5FA; font-size: 14px;">
                          Fecha límite
                        </p>
                        <p
                          style="margin: 5px 0 0 0; color: #1E40AF; font-size: 28px; font-weight: 700;"
                        >
                          {{payment_due_date}}
                        </p>
                      </td>
                    </tr>
                  </table>
                </div>

                <p
                  style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;"
                >
                  Asegúrate de que tu método de pago esté actualizado para
                  evitar interrupciones en tu servicio.
                </p>

                <!-- CTA Button -->
                <table
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  style="margin: 30px 0;"
                >
                  <tr>
                    <td align="center">
                      <a
                        href="{{invoice_url}}"
                        style="display: inline-block; background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;"
                      >
                        Ver Factura
                      </a>
                    </td>
                  </tr>
                </table>

                <p
                  style="margin: 20px 0; color: #666666; font-size: 14px; line-height: 1.6; text-align: center;"
                >
                  ¿Ya realizaste el pago? Puedes ignorar este mensaje.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td
                style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;"
              >
                <p
                  style="margin: 0 0 10px 0; color: #1E40AF; font-size: 18px; font-weight: 600;"
                >
                  OPTTIUS
                </p>
                <p style="margin: 0 0 10px 0; color: #999999; font-size: 14px;">
                  ¿Preguntas? soporte@opttius.com
                </p>
                <p style="margin: 0; color: #999999; font-size: 12px;">
                  © {{current_date}} OPTTIUS
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

---

## 6. Onboarding - Paso 1

**Tipo**: `saas_onboarding_step_1`
**Asunto predeterminado**: `🚀 Empezando con Opttius: Configura tu óptica`

### Descripción

Guía para que los nuevos admins configuren su óptica.

### Template HTML

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Onboarding Opttius</title>
  </head>
  <body
    style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4;"
  >
    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      style="background-color: #f4f4f4; padding: 20px 0;"
    >
      <tr>
        <td align="center">
          <table
            width="600"
            cellpadding="0"
            cellspacing="0"
            style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
          >
            <!-- Header -->
            <tr>
              <td
                style="background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%); padding: 40px 30px; text-align: center;"
              >
                <h1
                  style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;"
                >
                  OPTTIUS
                </h1>
                <p style="margin: 10px 0 0 0; color: #E0E7FF; font-size: 16px;">
                  Guía de Inicio Rápido
                </p>
              </td>
            </tr>

            <!-- Content -->
            <tr>
              <td style="padding: 40px 30px;">
                <h2
                  style="margin: 0 0 20px 0; color: #1E40AF; font-size: 28px; font-weight: 600;"
                >
                  🚀 ¡Vamos a configurar tu óptica!
                </h2>

                <p
                  style="margin: 0 0 30px 0; color: #666666; font-size: 16px; line-height: 1.6;"
                >
                  Hola {{admin_name}}, gracias por elegir Opttius. Esta guía te
                  ayudará a configurar tu óptica en pocos minutos.
                </p>

                <!-- Steps -->
                <table
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  style="margin: 20px 0;"
                >
                  <!-- Step 1 -->
                  <tr>
                    <td width="40" style="vertical-align: top;">
                      <div
                        style="width: 32px; height: 32px; background-color: #3B82F6; border-radius: 50%; display: flex; align-items: center; justify-content: center;"
                      >
                        <span
                          style="color: #ffffff; font-weight: 700; font-size: 16px;"
                          >1</span
                        >
                      </div>
                    </td>
                    <td style="padding-bottom: 25px;">
                      <p
                        style="margin: 0 0 5px 0; color: #1E40AF; font-weight: 600; font-size: 16px;"
                      >
                        Perfil de tu Óptica
                      </p>
                      <p
                        style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;"
                      >
                        Completa la información de tu negocio: nombre,
                        dirección, datos de contacto y horarios de atención.
                      </p>
                    </td>
                  </tr>
                  <!-- Step 2 -->
                  <tr>
                    <td width="40" style="vertical-align: top;">
                      <div
                        style="width: 32px; height: 32px; background-color: #3B82F6; border-radius: 50%; display: flex; align-items: center; justify-content: center;"
                      >
                        <span
                          style="color: #ffffff; font-weight: 700; font-size: 16px;"
                          >2</span
                        >
                      </div>
                    </td>
                    <td style="padding-bottom: 25px;">
                      <p
                        style="margin: 0 0 5px 0; color: #1E40AF; font-weight: 600; font-size: 16px;"
                      >
                        Métodos de Pago
                      </p>
                      <p
                        style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;"
                      >
                        Configura cómo quieres recibir pagos de tus clientes:
                        tarjetas, efectivo, transferencias y más.
                      </p>
                    </td>
                  </tr>
                  <!-- Step 3 -->
                  <tr>
                    <td width="40" style="vertical-align: top;">
                      <div
                        style="width: 32px; height: 32px; background-color: #3B82F6; border-radius: 50%; display: flex; align-items: center; justify-content: center;"
                      >
                        <span
                          style="color: #ffffff; font-weight: 700; font-size: 16px;"
                          >3</span
                        >
                      </div>
                    </td>
                    <td style="padding-bottom: 25px;">
                      <p
                        style="margin: 0 0 5px 0; color: #1E40AF; font-weight: 600; font-size: 16px;"
                      >
                        Productos e Inventario
                      </p>
                      <p
                        style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;"
                      >
                        Agrega tus productos: armazones, lentes de contacto,
                        líquidos y más. Sube fotos y precios.
                      </p>
                    </td>
                  </tr>
                  <!-- Step 4 -->
                  <tr>
                    <td width="40" style="vertical-align: top;">
                      <div
                        style="width: 32px; height: 32px; background-color: #3B82F6; border-radius: 50%; display: flex; align-items: center; justify-content: center;"
                      >
                        <span
                          style="color: #ffffff; font-weight: 700; font-size: 16px;"
                          >4</span
                        >
                      </div>
                    </td>
                    <td>
                      <p
                        style="margin: 0 0 5px 0; color: #1E40AF; font-weight: 600; font-size: 16px;"
                      >
                        Tu Equipo
                      </p>
                      <p
                        style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;"
                      >
                        Invita a tus empleados y configura sus permisos para
                        acceder al sistema.
                      </p>
                    </td>
                  </tr>
                </table>

                <!-- CTA Button -->
                <table
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  style="margin: 30px 0;"
                >
                  <tr>
                    <td align="center">
                      <a
                        href="{{admin_dashboard_url}}/settings"
                        style="display: inline-block; background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;"
                      >
                        Comenzar Configuración
                      </a>
                    </td>
                  </tr>
                </table>

                <p
                  style="margin: 20px 0; color: #666666; font-size: 14px; line-height: 1.6; text-align: center;"
                >
                  ¿Prefieres que te guíemos paso a paso?<br />
                  <a href="mailto:soporte@opttius.com" style="color: #3B82F6;"
                    >Agenda una videollamada con nuestro equipo</a
                  >
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td
                style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;"
              >
                <p
                  style="margin: 0 0 10px 0; color: #1E40AF; font-size: 18px; font-weight: 600;"
                >
                  OPTTIUS
                </p>
                <p style="margin: 0 0 10px 0; color: #999999; font-size: 14px;">
                  Tu éxito es nuestro éxito
                </p>
                <p style="margin: 0 0 10px 0; color: #999999; font-size: 14px;">
                  soporte@opttius.com
                </p>
                <p style="margin: 0; color: #999999; font-size: 12px;">
                  © {{current_date}} OPTTIUS
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

---

## 7. Actualización de Términos

**Tipo**: `saas_terms_update`
**Asunto predeterminado**: `📋 Actualización de Términos de Servicio - Opttius`

### Descripción

Notificación de cambios en los términos de servicio.

### Template HTML

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Actualización de Términos</title>
  </head>
  <body
    style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4;"
  >
    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      style="background-color: #f4f4f4; padding: 20px 0;"
    >
      <tr>
        <td align="center">
          <table
            width="600"
            cellpadding="0"
            cellspacing="0"
            style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
          >
            <!-- Header -->
            <tr>
              <td
                style="background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%); padding: 40px 30px; text-align: center;"
              >
                <h1
                  style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;"
                >
                  OPTTIUS
                </h1>
                <p style="margin: 10px 0 0 0; color: #E0E7FF; font-size: 16px;">
                  Actualización Importante
                </p>
              </td>
            </tr>

            <!-- Content -->
            <tr>
              <td style="padding: 40px 30px;">
                <h2
                  style="margin: 0 0 20px 0; color: #1E40AF; font-size: 28px; font-weight: 600;"
                >
                  📋 Actualización de Términos de Servicio
                </h2>

                <p
                  style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;"
                >
                  Hola {{admin_name}},
                </p>

                <p
                  style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;"
                >
                  Queremos informarte que hemos actualizado nuestros Términos de
                  Servicio y Política de Privacidad. Estos cambios entrarán en
                  vigor el <strong>{{effective_date}}</strong>.
                </p>

                <!-- Highlight Box -->
                <div
                  style="background-color: #EFF6FF; border-left: 4px solid #3B82F6; padding: 20px; margin: 30px 0;"
                >
                  <p
                    style="margin: 0 0 10px 0; color: #1E40AF; font-weight: 600; font-size: 16px;"
                  >
                    ¿Qué ha cambiado?
                  </p>
                  <ul
                    style="margin: 0; padding-left: 20px; color: #666666; font-size: 14px; line-height: 1.8;"
                  >
                    <li>{{change_1}}</li>
                    <li>{{change_2}}</li>
                    <li>{{change_3}}</li>
                  </ul>
                </div>

                <p
                  style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;"
                >
                  Te recomendamos revisar los documentos completos antes de la
                  fecha de vigencia.
                </p>

                <!-- CTA Buttons -->
                <table
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  style="margin: 30px 0;"
                >
                  <tr>
                    <td align="center">
                      <a
                        href="{{terms_url}}"
                        style="display: inline-block; background: #1E40AF; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 600; font-size: 14px; margin-right: 10px;"
                      >
                        Ver Términos
                      </a>
                      <a
                        href="{{privacy_url}}"
                        style="display: inline-block; background: #ffffff; color: #1E40AF; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 600; font-size: 14px; border: 2px solid #1E40AF;"
                      >
                        Ver Privacidad
                      </a>
                    </td>
                  </tr>
                </table>

                <p
                  style="margin: 20px 0; color: #666666; font-size: 14px; line-height: 1.6; text-align: center;"
                >
                  Si tienes preguntas sobre estos cambios, no dudes en
                  contactarnos.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td
                style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;"
              >
                <p
                  style="margin: 0 0 10px 0; color: #1E40AF; font-size: 18px; font-weight: 600;"
                >
                  OPTTIUS
                </p>
                <p style="margin: 0 0 10px 0; color: #999999; font-size: 14px;">
                  soporte@opttius.com
                </p>
                <p style="margin: 0; color: #999999; font-size: 12px;">
                  © {{current_date}} OPTTIUS
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

---

## 8. Mantenimiento Programado

**Tipo**: `saas_maintenance`
**Asunto predeterminado**: `🔧 Mantenimiento Programado - Opttius`

### Descripción

Notificación de mantenimiento programado del sistema.

### Template HTML

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Mantenimiento Programado</title>
  </head>
  <body
    style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4;"
  >
    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      style="background-color: #f4f4f4; padding: 20px 0;"
    >
      <tr>
        <td align="center">
          <table
            width="600"
            cellpadding="0"
            cellspacing="0"
            style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
          >
            <!-- Header -->
            <tr>
              <td
                style="background: linear-gradient(135deg, #7C3AED 0%, #8B5CF6 100%); padding: 40px 30px; text-align: center;"
              >
                <h1
                  style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;"
                >
                  OPTTIUS
                </h1>
                <p style="margin: 10px 0 0 0; color: #EDE9FE; font-size: 16px;">
                  Mantenimiento Programado
                </p>
              </td>
            </tr>

            <!-- Content -->
            <tr>
              <td style="padding: 40px 30px;">
                <h2
                  style="margin: 0 0 20px 0; color: #7C3AED; font-size: 28px; font-weight: 600;"
                >
                  🔧 Mejorando Opttius para ti
                </h2>

                <p
                  style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;"
                >
                  Hola {{admin_name}},
                </p>

                <p
                  style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;"
                >
                  Queremos informarte que realizaremos un mantenimiento
                  programado en nuestros sistemas.
                </p>

                <!-- Maintenance Details -->
                <div
                  style="background-color: #F5F3FF; border: 1px solid #8B5CF6; border-radius: 8px; padding: 25px; margin: 30px 0;"
                >
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td
                        style="padding: 10px 0; border-bottom: 1px solid #EDE9FE;"
                      >
                        <p
                          style="margin: 0; color: #7C3AED; font-weight: 600; font-size: 14px;"
                        >
                          📅 Fecha
                        </p>
                        <p
                          style="margin: 5px 0 0 0; color: #333333; font-size: 16px;"
                        >
                          {{maintenance_date}}
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td
                        style="padding: 10px 0; border-bottom: 1px solid #EDE9FE;"
                      >
                        <p
                          style="margin: 0; color: #7C3AED; font-weight: 600; font-size: 14px;"
                        >
                          🕐 Hora
                        </p>
                        <p
                          style="margin: 5px 0 0 0; color: #333333; font-size: 16px;"
                        >
                          {{maintenance_time}}
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 0;">
                        <p
                          style="margin: 0; color: #7C3AED; font-weight: 600; font-size: 14px;"
                        >
                          ⏱️ Duración estimada
                        </p>
                        <p
                          style="margin: 5px 0 0 0; color: #333333; font-size: 16px;"
                        >
                          {{maintenance_duration}}
                        </p>
                      </td>
                    </tr>
                  </table>
                </div>

                <p
                  style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;"
                >
                  <strong>¿Qué significa esto para ti?</strong><br />
                  Durante este período, el acceso a Opttius puede estar
                  temporalmente interrumpido. Te recomendamos planificar tus
                  actividades accordingly.
                </p>

                <p
                  style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;"
                >
                  <strong>¿Qué mejoramos?</strong><br />
                  {{maintenance_description}}
                </p>

                <p
                  style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6; text-align: center;"
                >
                  Disculpa las molestias. Este mantenimiento nos ayudará a
                  ofrecerte un mejor servicio.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td
                style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;"
              >
                <p
                  style="margin: 0 0 10px 0; color: #7C3AED; font-size: 18px; font-weight: 600;"
                >
                  OPTTIUS
                </p>
                <p style="margin: 0 0 10px 0; color: #999999; font-size: 14px;">
                  soporte@opttius.com
                </p>
                <p style="margin: 0; color: #999999; font-size: 12px;">
                  © {{current_date}} OPTTIUS
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

---

## 9. Alerta de Uso

**Tipo**: `saas_usage_alert`
**Asunto predeterminado**: `📊 Notificación de uso - Opttius`

### Descripción

Alerta cuando el uso de recursos se acerca al límite.

### Template HTML

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Alerta de Uso</title>
  </head>
  <body
    style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4;"
  >
    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      style="background-color: #f4f4f4; padding: 20px 0;"
    >
      <tr>
        <td align="center">
          <table
            width="600"
            cellpadding="0"
            cellspacing="0"
            style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
          >
            <!-- Header -->
            <tr>
              <td
                style="background: linear-gradient(135deg, #059669 0%, #10B981 100%); padding: 40px 30px; text-align: center;"
              >
                <h1
                  style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;"
                >
                  OPTTIUS
                </h1>
                <p style="margin: 10px 0 0 0; color: #D1FAE5; font-size: 16px;">
                  📊 Reporte de Uso
                </p>
              </td>
            </tr>

            <!-- Content -->
            <tr>
              <td style="padding: 40px 30px;">
                <h2
                  style="margin: 0 0 20px 0; color: #1E40AF; font-size: 28px; font-weight: 600;"
                >
                  ¡Hola {{admin_name}}! 👋
                </h2>

                <p
                  style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;"
                >
                  Queremos mantenerte informado sobre el uso de tu suscripción a
                  Opttius.
                </p>

                <!-- Usage Stats -->
                <div
                  style="background-color: #f8f9fa; border-radius: 8px; padding: 25px; margin: 30px 0;"
                >
                  <p
                    style="margin: 0 0 20px 0; color: #1E40AF; font-weight: 600; font-size: 18px; text-align: center;"
                  >
                    {{usage_metric_name}}
                  </p>

                  <!-- Progress Bar -->
                  <div
                    style="background-color: #E5E7EB; border-radius: 10px; height: 20px; overflow: hidden; margin-bottom: 10px;"
                  >
                    <div
                      style="width: {{usage_percentage}}%; background: linear-gradient(90deg, #3B82F6 0%, #1E40AF 100%); height: 100%;"
                    ></div>
                  </div>

                  <p
                    style="margin: 0; color: #666666; font-size: 14px; text-align: center;"
                  >
                    {{usage_current}} de {{usage_limit}} utilizados
                    ({{usage_percentage}}%)
                  </p>
                </div>

                <p
                  style="margin: 0 0 20px 0; color: #666666; font-size: 16px; line-height: 1.6;"
                >
                  Te quedan aproximadamente
                  <strong>{{usage_days_remaining}} días</strong> antes de
                  alcanzar el límite de tu plan actual.
                </p>

                <!-- CTA Button -->
                <table
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  style="margin: 30px 0;"
                >
                  <tr>
                    <td align="center">
                      <a
                        href="{{admin_dashboard_url}}/billing"
                        style="display: inline-block; background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;"
                      >
                        Actualizar mi Plan
                      </a>
                    </td>
                  </tr>
                </table>

                <p
                  style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6; text-align: center;"
                >
                  ¿Necesitas ayuda para optimizar tu uso?<br />
                  <a href="mailto:soporte@opttius.com" style="color: #3B82F6;"
                    >Contáctanos</a
                  >
                  y te ayudaremos.
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td
                style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;"
              >
                <p
                  style="margin: 0 0 10px 0; color: #1E40AF; font-size: 18px; font-weight: 600;"
                >
                  OPTTIUS
                </p>
                <p style="margin: 0 0 10px 0; color: #999999; font-size: 14px;">
                  soporte@opttius.com
                </p>
                <p style="margin: 0; color: #999999; font-size: 12px;">
                  © {{current_date}} OPTTIUS
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

---

## 10. Nueva Funcionalidad

**Tipo**: `saas_feature_announcement`
**Asunto predeterminado**: `✨ Nueva función en Opttius: {{feature_name}}`

### Descripción

Anuncio de nuevas funcionalidades disponibles.

### Template HTML

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Nueva Funcionalidad</title>
  </head>
  <body
    style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f4f4;"
  >
    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      style="background-color: #f4f4f4; padding: 20px 0;"
    >
      <tr>
        <td align="center">
          <table
            width="600"
            cellpadding="0"
            cellspacing="0"
            style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
          >
            <!-- Header -->
            <tr>
              <td
                style="background: linear-gradient(135deg, #1E40AF 0%, #8B5CF6 100%); padding: 40px 30px; text-align: center;"
              >
                <h1
                  style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;"
                >
                  OPTTIUS
                </h1>
                <p style="margin: 10px 0 0 0; color: #E0E7FF; font-size: 16px;">
                  ✨ Nueva Funcionalidad
                </p>
              </td>
            </tr>

            <!-- Content -->
            <tr>
              <td style="padding: 40px 30px;">
                <div style="text-align: center; margin-bottom: 20px;">
                  <span style="font-size: 48px;">{{feature_icon}}</span>
                </div>

                <h2
                  style="margin: 0 0 10px 0; color: #1E40AF; font-size: 28px; font-weight: 600; text-align: center;"
                >
                  {{feature_name}}
                </h2>

                <p
                  style="margin: 0 0 30px 0; color: #666666; font-size: 16px; line-height: 1.6; text-align: center;"
                >
                  {{feature_tagline}}
                </p>

                <!-- Feature Image -->
                <div
                  style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;"
                >
                  <img
                    src="{{feature_image_url}}"
                    alt="{{feature_name}}"
                    style="max-width: 100%; height: auto; border-radius: 6px;"
                  />
                </div>

                <!-- Benefits -->
                <div
                  style="background-color: #EFF6FF; border-radius: 8px; padding: 25px; margin: 30px 0;"
                >
                  <p
                    style="margin: 0 0 15px 0; color: #1E40AF; font-weight: 600; font-size: 18px; text-align: center;"
                  >
                    Lo que puedes hacer ahora:
                  </p>
                  <ul
                    style="margin: 0; padding-left: 20px; color: #666666; font-size: 14px; line-height: 2;"
                  >
                    {{feature_benefits}}
                  </ul>
                </div>

                <!-- CTA Button -->
                <table
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  style="margin: 30px 0;"
                >
                  <tr>
                    <td align="center">
                      <a
                        href="{{feature_url}}"
                        style="display: inline-block; background: linear-gradient(135deg, #1E40AF 0%, #8B5CF6 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;"
                      >
                        Probar {{feature_name}}
                      </a>
                    </td>
                  </tr>
                </table>

                <p
                  style="margin: 20px 0; color: #666666; font-size: 14px; line-height: 1.6; text-align: center;"
                >
                  ¿Tienes preguntas sobre esta nueva función?<br />
                  <a href="mailto:soporte@opttius.com" style="color: #8B5CF6;"
                    >Escríbenos y te ayudaremos</a
                  >
                </p>

                <p
                  style="margin: 30px 0 0 0; color: #666666; font-size: 14px; line-height: 1.6; text-align: center;"
                >
                  Equipo Opttius<br />
                  <em style="color: #999999;">"Innovando para tu éxito"</em>
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td
                style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;"
              >
                <p
                  style="margin: 0 0 10px 0; color: #1E40AF; font-size: 18px; font-weight: 600;"
                >
                  OPTTIUS
                </p>
                <p style="margin: 0 0 10px 0; color: #999999; font-size: 14px;">
                  soporte@opttius.com
                </p>
                <p style="margin: 0; color: #999999; font-size: 12px;">
                  © {{current_date}} OPTTIUS
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

---

## Resumen de Plantillas

| #   | Tipo de Email               | Asunto                                                      | Estado                      |
| --- | --------------------------- | ----------------------------------------------------------- | --------------------------- |
| 1   | `saas_welcome`              | ¡Bienvenido a Opttius, {{admin_name}}! Tu óptica está lista | ⏳ Pendiente implementación |
| 2   | `saas_trial_ending`         | ⚠️ Tu período de prueba en Opttius termina pronto           | ⏳ Pendiente implementación |
| 3   | `saas_subscription_success` | ✅ Tu suscripción a Opttius está activa                     | ⏳ Pendiente implementación |
| 4   | `saas_subscription_failed`  | ⚠️ Hubo un problema con tu suscripción a Opttius            | ⏳ Pendiente implementación |
| 5   | `saas_payment_reminder`     | 📅 Recordatorio: Tu pago de Opttius vence pronto            | ⏳ Pendiente implementación |
| 6   | `saas_onboarding_step_1`    | 🚀 Empezando con Opttius: Configura tu óptica               | ⏳ Pendiente implementación |
| 7   | `saas_terms_update`         | 📋 Actualización de Términos de Servicio - Opttius          | ⏳ Pendiente implementación |
| 8   | `saas_maintenance`          | 🔧 Mantenimiento Programado - Opttius                       | ⏳ Pendiente implementación |
| 9   | `saas_usage_alert`          | 📊 Notificación de uso - Opttius                            | ⏳ Pendiente implementación |
| 10  | `saas_feature_announcement` | ✨ Nueva función en Opttius: {{feature_name}}               | ⏳ Pendiente implementación |

---

**Documento creado**: 2025-02-06
**Versión**: 1.0
**Autor**: Especificaciones del Sistema Opttius
