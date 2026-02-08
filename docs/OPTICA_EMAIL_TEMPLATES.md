# Plantillas de Email Rediseñadas - Óptica

Este documento presenta las plantillas de email rediseñadas específicamente para una óptica, enfocadas en la salud visual y la experiencia del cliente.

---

## Índice

1. [Confirmación de Cita](#1-confirmación-de-cita)
2. [Recordatorio de Cita - 24h](#2-recordatorio-de-cita---24h)
3. [Recordatorio de Cita - 2h](#3-recordatorio-de-cita---2h)
4. [Cancelación de Cita](#4-cancelación-de-cita)
5. [Receta Lista para Retirar](#5-receta-lista-para-retirar)
6. [Receta Próxima a Vencer](#6-receta-próxima-a-vencer)
7. [Orden de Trabajo Lista](#7-orden-de-trabajo-lista)
8. [Presupuesto Enviado](#8-presupuesto-enviado)
9. [Presupuesto Próximo a Vencer](#9-presupuesto-próximo-a-vencer)
10. [Bienvenida de Cliente](#10-bienvenida-de-cliente)
11. [Formulario de Contacto](#11-formulario-de-contacto)
12. [Feliz Cumpleaños](#12-feliz-cumpleaños)

---

## Variables Comunes para Óptica

| Variable                    | Descripción            | Ejemplo               |
| --------------------------- | ---------------------- | --------------------- |
| `{{customer_name}}`         | Nombre completo        | "María González"      |
| `{{customer_first_name}}`   | Solo nombre            | "María"               |
| `{{organization_name}}`     | Nombre de la óptica    | "Óptica Vision"       |
| `{{organization_logo_url}}` | URL del logo           | "https://..."         |
| `{{branch_name}}`           | Nombre de sucursal     | "Sucursal Centro"     |
| `{{branch_address}}`        | Dirección              | "Av. Principal 123"   |
| `{{branch_phone}}`          | Teléfono               | "(011) 1234-5678"     |
| `{{branch_email}}`          | Email                  | "contacto@vision.com" |
| `{{branch_hours}}`          | Horario                | "Lun-Vie 9-18hs"      |
| `{{professional_name}}`     | Nombre del profesional | "Dr. Juan Pérez"      |
| `{{professional_title}}`    | Título profesional     | "Optómetra"           |
| `{{professional_license}}`  | Matrícula profesional  | "MP 12345"            |

---

## 1. Confirmación de Cita

**Tipo**: `appointment_confirmation`
**Asunto predeterminado**: `✅ Tu turno en {{organization_name}} está confirmado`

### Descripción

Email de confirmación cuando un cliente agenda un turno para examen visual o atención.

### Template HTML

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Confirmación de Turno</title>
  </head>
  <body
    style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f5f5f5;"
  >
    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      style="background-color: #f5f5f5; padding: 20px 0;"
    >
      <tr>
        <td align="center">
          <table
            width="600"
            cellpadding="0"
            cellspacing="0"
            style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);"
          >
            <!-- Header con Logo -->
            <tr>
              <td
                style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center;"
              >
                <p
                  style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;"
                >
                  {{organization_name}}
                </p>
              </td>
            </tr>

            <!-- Icono de Confirmación -->
            <tr>
              <td style="padding: 30px 0 10px 0; text-align: center;">
                <div
                  style="width: 80px; height: 80px; background-color: #dcfce7; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;"
                >
                  <span style="font-size: 40px;">✅</span>
                </div>
              </td>
            </tr>

            <!-- Título -->
            <tr>
              <td style="padding: 10px 30px 20px 30px; text-align: center;">
                <h1
                  style="margin: 0; color: #1e3a5f; font-size: 24px; font-weight: 600;"
                >
                  ¡Tu turno está confirmado!
                </h1>
                <p style="margin: 10px 0 0 0; color: #64748b; font-size: 16px;">
                  Hola {{customer_first_name}}, te esperamos
                </p>
              </td>
            </tr>

            <!-- Tarjeta de Turno -->
            <tr>
              <td style="padding: 0 30px;">
                <div
                  style="background-color: #f8fafc; border-radius: 12px; padding: 25px; border: 2px solid #e2e8f0;"
                >
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td
                        style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;"
                      >
                        <p
                          style="margin: 0; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;"
                        >
                          📅 Fecha
                        </p>
                        <p
                          style="margin: 5px 0 0 0; color: #1e3a5f; font-size: 20px; font-weight: 600;"
                        >
                          {{appointment_date}}
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td
                        style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;"
                      >
                        <p
                          style="margin: 0; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;"
                        >
                          🕐 Horario
                        </p>
                        <p
                          style="margin: 5px 0 0 0; color: #1e3a5f; font-size: 20px; font-weight: 600;"
                        >
                          {{appointment_time}}
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td
                        style="padding: 10px 0; border-bottom: 1px solid #e2e8f0;"
                      >
                        <p
                          style="margin: 0; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;"
                        >
                          👨‍⚕️ Profesional
                        </p>
                        <p
                          style="margin: 5px 0 0 0; color: #1e3a5f; font-size: 16px; font-weight: 500;"
                        >
                          {{professional_name}}
                        </p>
                        <p style="margin: 0; color: #64748b; font-size: 14px;">
                          {{professional_title}}
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 0;">
                        <p
                          style="margin: 0; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;"
                        >
                          📍 Sucursal
                        </p>
                        <p
                          style="margin: 5px 0 0 0; color: #1e3a5f; font-size: 16px; font-weight: 500;"
                        >
                          {{branch_name}}
                        </p>
                        <p style="margin: 0; color: #64748b; font-size: 14px;">
                          {{branch_address}}
                        </p>
                      </td>
                    </tr>
                  </table>
                </div>
              </td>
            </tr>

            <!-- Instrucciones -->
            {{#if preparation_instructions}}
            <tr>
              <td style="padding: 20px 30px 10px 30px;">
                <div
                  style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 0 8px 8px 0;"
                >
                  <p
                    style="margin: 0 0 5px 0; color: #92400e; font-weight: 600; font-size: 14px;"
                  >
                    💡 Preparación para tu turno
                  </p>
                  <p style="margin: 0; color: #78350f; font-size: 14px;">
                    {{preparation_instructions}}
                  </p>
                </div>
              </td>
            </tr>
            {{/if}}

            <!-- Información de Contacto -->
            <tr>
              <td style="padding: 20px 30px;">
                <p
                  style="margin: 0 0 10px 0; color: #64748b; font-size: 14px; text-align: center;"
                >
                  ¿Necesitas cambiar tu turno?
                </p>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center">
                      <a
                        href="{{reschedule_url}}"
                        style="display: inline-block; background-color: #1e3a5f; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; font-size: 14px; margin-right: 10px;"
                      >
                        Reprogramar
                      </a>
                      <a
                        href="{{cancellation_url}}"
                        style="display: inline-block; background-color: #ffffff; color: #1e3a5f; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; font-size: 14px; border: 2px solid #1e3a5f;"
                      >
                        Cancelar
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td
                style="background-color: #f8fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0;"
              >
                <p
                  style="margin: 0 0 10px 0; color: #1e3a5f; font-weight: 600; font-size: 16px;"
                >
                  {{organization_name}}
                </p>
                <p style="margin: 0 0 5px 0; color: #64748b; font-size: 14px;">
                  📞 {{branch_phone}} | ✉️ {{branch_email}}
                </p>
                <p style="margin: 0 0 15px 0; color: #64748b; font-size: 14px;">
                  🕐 {{branch_hours}}
                </p>
                <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                  Tu salud visual es nuestra prioridad
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

## 2. Recordatorio de Cita - 24h

**Tipo**: `appointment_reminder`
**Asunto predeterminado**: `⏰ Recordatorio: Tu turno es mañana {{appointment_time}}`

### Template HTML

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Recordatorio de Turno</title>
  </head>
  <body
    style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f5f5f5;"
  >
    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      style="background-color: #f5f5f5; padding: 20px 0;"
    >
      <tr>
        <td align="center">
          <table
            width="600"
            cellpadding="0"
            cellspacing="0"
            style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);"
          >
            <!-- Header -->
            <tr>
              <td
                style="background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); padding: 25px; text-align: center;"
              >
                <p
                  style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;"
                >
                  {{organization_name}}
                </p>
                <p style="margin: 5px 0 0 0; color: #fef3c7; font-size: 14px;">
                  Recordatorio de tu turno
                </p>
              </td>
            </tr>

            <!-- Título -->
            <tr>
              <td style="padding: 30px 30px 10px 30px; text-align: center;">
                <h1
                  style="margin: 0; color: #1e3a5f; font-size: 24px; font-weight: 600;"
                >
                  ¡Mañana te esperamos, {{customer_first_name}}! 👋
                </h1>
              </td>
            </tr>

            <!-- Resumen del Turno -->
            <tr>
              <td style="padding: 20px 30px;">
                <div
                  style="background-color: #fffbeb; border-radius: 12px; padding: 20px; text-align: center;"
                >
                  <p
                    style="margin: 0; color: #92400e; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;"
                  >
                    Tu turno es
                  </p>
                  <p
                    style="margin: 10px 0; color: #1e3a5f; font-size: 32px; font-weight: 700;"
                  >
                    {{appointment_date}}
                  </p>
                  <p
                    style="margin: 0; color: #1e3a5f; font-size: 24px; font-weight: 600;"
                  >
                    a las {{appointment_time}}
                  </p>
                </div>
              </td>
            </tr>

            <!-- Datos del Profesional -->
            <tr>
              <td style="padding: 0 30px 20px 30px;">
                <div
                  style="background-color: #f8fafc; border-radius: 12px; padding: 20px;"
                >
                  <p
                    style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;"
                  >
                    <strong style="color: #1e3a5f;"
                      >👨‍⚕️ {{professional_name}}</strong
                    ><br />
                    <span style="color: #64748b;">{{professional_title}}</span>
                  </p>
                  <p style="margin: 0; color: #64748b; font-size: 14px;">
                    📍 {{branch_name}} - {{branch_address}}
                  </p>
                </div>
              </td>
            </tr>

            <!-- Preparación -->
            {{#if preparation_instructions}}
            <tr>
              <td style="padding: 0 30px 20px 30px;">
                <div
                  style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 0 8px 8px 0;"
                >
                  <p
                    style="margin: 0 0 5px 0; color: #92400e; font-weight: 600; font-size: 14px;"
                  >
                    💡 No lo olvides
                  </p>
                  <p style="margin: 0; color: #78350f; font-size: 14px;">
                    {{preparation_instructions}}
                  </p>
                </div>
              </td>
            </tr>
            {{/if}}

            <!-- CTA -->
            <tr>
              <td style="padding: 0 30px 20px 30px; text-align: center;">
                <p style="margin: 0 0 15px 0; color: #64748b; font-size: 14px;">
                  ¿No podés asistir?
                </p>
                <a
                  href="{{reschedule_url}}"
                  style="display: inline-block; background-color: #1e3a5f; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;"
                >
                  Reprogramar Turno
                </a>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td
                style="background-color: #f8fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0;"
              >
                <p
                  style="margin: 0; color: #1e3a5f; font-weight: 600; font-size: 14px;"
                >
                  {{branch_phone}} | {{branch_email}}
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

## 3. Recordatorio de Cita - 2h

**Tipo**: `appointment_reminder_2h`
**Asunto predeterminado**: `🕐 Tu turno es en 2 horas - {{appointment_time}}`

### Template HTML

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Turno en 2 Horas</title>
  </head>
  <body
    style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f5f5f5;"
  >
    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      style="background-color: #f5f5f5; padding: 20px 0;"
    >
      <tr>
        <td align="center">
          <table
            width="600"
            cellpadding="0"
            cellspacing="0"
            style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);"
          >
            <!-- Header -->
            <tr>
              <td
                style="background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%); padding: 25px; text-align: center;"
              >
                <p
                  style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;"
                >
                  {{organization_name}}
                </p>
              </td>
            </tr>

            <!-- Contenido Principal -->
            <tr>
              <td style="padding: 30px 30px 20px 30px; text-align: center;">
                <div
                  style="width: 60px; height: 60px; background-color: #dbeafe; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;"
                >
                  <span style="font-size: 30px;">⏰</span>
                </div>
                <h1
                  style="margin: 0; color: #1e3a5f; font-size: 22px; font-weight: 600;"
                >
                  ¡Tu turno es en 2 horas!
                </h1>
                <p
                  style="margin: 15px 0 0 0; color: #64748b; font-size: 32px; font-weight: 700; color: #3b82f6;"
                >
                  {{appointment_time}}
                </p>
              </td>
            </tr>

            <!-- Información Rápida -->
            <tr>
              <td style="padding: 0 30px 20px 30px;">
                <div
                  style="background-color: #f8fafc; border-radius: 12px; padding: 15px 20px;"
                >
                  <p style="margin: 0; color: #64748b; font-size: 14px;">
                    📍 {{branch_name}}<br />
                    {{branch_address}}<br />
                    👨‍⚕️ {{professional_name}}
                  </p>
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td
                style="background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;"
              >
                <p
                  style="margin: 0; color: #1e3a5f; font-weight: 600; font-size: 14px;"
                >
                  {{organization_name}} - Tu salud visual
                </p>
                <p style="margin: 5px 0 0 0; color: #64748b; font-size: 12px;">
                  {{branch_phone}}
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

## 4. Cancelación de Cita

**Tipo**: `appointment_cancelation`
**Asunto predeterminado**: `Tu turno ha sido cancelado`

### Template HTML

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Turno Cancelado</title>
  </head>
  <body
    style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f5f5f5;"
  >
    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      style="background-color: #f5f5f5; padding: 20px 0;"
    >
      <tr>
        <td align="center">
          <table
            width="600"
            cellpadding="0"
            cellspacing="0"
            style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);"
          >
            <!-- Header -->
            <tr>
              <td
                style="background: linear-gradient(135deg, #64748b 0%, #94a3b8 100%); padding: 25px; text-align: center;"
              >
                <p
                  style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;"
                >
                  {{organization_name}}
                </p>
              </td>
            </tr>

            <!-- Contenido -->
            <tr>
              <td style="padding: 30px 30px 20px 30px; text-align: center;">
                <h1
                  style="margin: 0; color: #1e3a5f; font-size: 22px; font-weight: 600;"
                >
                  Tu turno ha sido cancelado
                </h1>
                <p style="margin: 15px 0 0 0; color: #64748b; font-size: 16px;">
                  Hola {{customer_first_name}}, lamentamos que no puedas
                  asistir.
                </p>
              </td>
            </tr>

            <!-- CTA para Reprogramar -->
            <tr>
              <td style="padding: 0 30px 20px 30px; text-align: center;">
                <p style="margin: 0 0 15px 0; color: #64748b; font-size: 14px;">
                  ¿Te gustaría agendar un nuevo turno?
                </p>
                <a
                  href="{{booking_url}}"
                  style="display: inline-block; background-color: #1e3a5f; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;"
                >
                  Agendar Nuevo Turno
                </a>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td
                style="background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;"
              >
                <p style="margin: 0; color: #64748b; font-size: 14px;">
                  {{branch_phone}} | {{branch_email}}
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

## 5. Receta Lista para Retirar

**Tipo**: `prescription_ready`
**Asunto predeterminado**: `👓 Tu receta está lista para retirar`

### Template HTML

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Receta Lista</title>
  </head>
  <body
    style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f5f5f5;"
  >
    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      style="background-color: #f5f5f5; padding: 20px 0;"
    >
      <tr>
        <td align="center">
          <table
            width="600"
            cellpadding="0"
            cellspacing="0"
            style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);"
          >
            <!-- Header -->
            <tr>
              <td
                style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center;"
              >
                <p
                  style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;"
                >
                  {{organization_name}}
                </p>
                <p style="margin: 5px 0 0 0; color: #bfdbfe; font-size: 14px;">
                  Tu Salud Visual
                </p>
              </td>
            </tr>

            <!-- Icono -->
            <tr>
              <td style="padding: 30px 0 10px 0; text-align: center;">
                <div
                  style="width: 80px; height: 80px; background-color: #dbeafe; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;"
                >
                  <span style="font-size: 40px;">👓</span>
                </div>
              </td>
            </tr>

            <!-- Título -->
            <tr>
              <td style="padding: 10px 30px 20px 30px; text-align: center;">
                <h1
                  style="margin: 0; color: #1e3a5f; font-size: 24px; font-weight: 600;"
                >
                  ¡Tu receta está lista!
                </h1>
                <p style="margin: 10px 0 0 0; color: #64748b; font-size: 16px;">
                  Hola {{customer_first_name}}, podés pasar a retirar tu nueva
                  receta
                </p>
              </td>
            </tr>

            <!-- Detalles de la Receta -->
            <tr>
              <td style="padding: 0 30px;">
                <div
                  style="background-color: #f8fafc; border-radius: 12px; padding: 20px; border: 2px solid #e2e8f0;"
                >
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td
                        style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"
                      >
                        <p
                          style="margin: 0; color: #94a3b8; font-size: 11px; text-transform: uppercase;"
                        >
                          📅 Fecha de emisión
                        </p>
                        <p
                          style="margin: 5px 0 0 0; color: #1e3a5f; font-size: 16px; font-weight: 500;"
                        >
                          {{prescription_date}}
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td
                        style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"
                      >
                        <p
                          style="margin: 0; color: #94a3b8; font-size: 11px; text-transform: uppercase;"
                        >
                          👨‍⚕️ Profesional
                        </p>
                        <p
                          style="margin: 5px 0 0 0; color: #1e3a5f; font-size: 16px; font-weight: 500;"
                        >
                          {{professional_name}}
                        </p>
                        <p style="margin: 0; color: #64748b; font-size: 12px;">
                          {{professional_license}}
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td
                        style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"
                      >
                        <p
                          style="margin: 0; color: #94a3b8; font-size: 11px; text-transform: uppercase;"
                        >
                          📆 Vence
                        </p>
                        <p
                          style="margin: 5px 0 0 0; color: #1e3a5f; font-size: 16px; font-weight: 500;"
                        >
                          {{prescription_expiry_date}}
                        </p>
                      </td>
                    </tr>
                    {{#if products_recommended}}
                    <tr>
                      <td style="padding: 8px 0;">
                        <p
                          style="margin: 0; color: #94a3b8; font-size: 11px; text-transform: uppercase;"
                        >
                          💡 Recomendado
                        </p>
                        <p
                          style="margin: 5px 0 0 0; color: #1e3a5f; font-size: 14px;"
                        >
                          {{products_recommended}}
                        </p>
                      </td>
                    </tr>
                    {{/if}}
                  </table>
                </div>
              </td>
            </tr>

            <!-- Graduación (Opcional) -->
            {{#if show_graduation}}
            <tr>
              <td style="padding: 20px 30px;">
                <div
                  style="background-color: #fffbeb; border-radius: 8px; padding: 15px;"
                >
                  <p
                    style="margin: 0 0 10px 0; color: #92400e; font-weight: 600; font-size: 12px; text-transform: uppercase;"
                  >
                    Graduación prescrita
                  </p>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td width="50%" style="padding-right: 10px;">
                        <p
                          style="margin: 0 0 5px 0; color: #64748b; font-size: 12px;"
                        >
                          Ojo Derecho
                        </p>
                        <p style="margin: 0; color: #1e3a5f; font-weight: 600;">
                          OD: {{sphere_right}} {{cylinder_right}}x{{axis_right}}
                        </p>
                      </td>
                      <td width="50%" style="padding-left: 10px;">
                        <p
                          style="margin: 0 0 5px 0; color: #64748b; font-size: 12px;"
                        >
                          Ojo Izquierdo
                        </p>
                        <p style="margin: 0; color: #1e3a5f; font-weight: 600;">
                          OI: {{sphere_left}} {{cylinder_left}}x{{axis_left}}
                        </p>
                      </td>
                    </tr>
                  </table>
                </div>
              </td>
            </tr>
            {{/if}}

            <!-- Información de Retiro -->
            <tr>
              <td style="padding: 0 30px 20px 30px; text-align: center;">
                <div
                  style="background-color: #dcfce7; border-radius: 12px; padding: 20px; margin-bottom: 20px;"
                >
                  <p
                    style="margin: 0 0 5px 0; color: #166534; font-weight: 600; font-size: 14px;"
                  >
                    📍 ¿Dónde retirar?
                  </p>
                  <p
                    style="margin: 0; color: #1e3a5f; font-size: 16px; font-weight: 500;"
                  >
                    {{branch_name}}
                  </p>
                  <p style="margin: 0; color: #64748b; font-size: 14px;">
                    {{branch_address}}
                  </p>
                  <p
                    style="margin: 10px 0 0 0; color: #166534; font-size: 14px;"
                  >
                    🕐 {{branch_hours}}
                  </p>
                </div>
                <a
                  href="{{prescription_url}}"
                  style="display: inline-block; background-color: #1e3a5f; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;"
                >
                  Ver Mi Receta
                </a>
              </td>
            </tr>

            <!-- Recordatorio de Próximo Control -->
            <tr>
              <td style="padding: 0 30px 20px 30px;">
                <div
                  style="background-color: #f8fafc; border-radius: 12px; padding: 15px; border-left: 4px solid #3b82f6;"
                >
                  <p
                    style="margin: 0 0 5px 0; color: #1e3a5f; font-weight: 600; font-size: 14px;"
                  >
                    💡 Próximo control
                  </p>
                  <p style="margin: 0; color: #64748b; font-size: 14px;">
                    Te recordamos que es recomendable realizar un control visual
                    anual. Tu próximo control debería ser aproximadamente el
                    <strong>{{next_checkup_date}}</strong>.
                  </p>
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td
                style="background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;"
              >
                <p style="margin: 0 0 5px 0; color: #1e3a5f; font-weight: 600;">
                  {{organization_name}}
                </p>
                <p style="margin: 0 0 5px 0; color: #64748b; font-size: 12px;">
                  {{branch_phone}} | {{branch_email}}
                </p>
                <p style="margin: 0; color: #94a3b8; font-size: 11px;">
                  Cuidando tu visión desde hace más de 20 años
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

## 6. Receta Próxima a Vencer

**Tipo**: `prescription_expiring`
**Asunto predeterminado**: `⚠️ Tu receta vence pronto - {{prescription_expiry_date}}`

### Template HTML

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Receta por Vencer</title>
  </head>
  <body
    style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f5f5f5;"
  >
    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      style="background-color: #f5f5f5; padding: 20px 0;"
    >
      <tr>
        <td align="center">
          <table
            width="600"
            cellpadding="0"
            cellspacing="0"
            style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);"
          >
            <!-- Header -->
            <tr>
              <td
                style="background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); padding: 25px; text-align: center;"
              >
                <p
                  style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;"
                >
                  {{organization_name}}
                </p>
                <p style="margin: 5px 0 0 0; color: #fef3c7; font-size: 14px;">
                  Tu Salud Visual
                </p>
              </td>
            </tr>

            <!-- Título -->
            <tr>
              <td style="padding: 30px 30px 20px 30px; text-align: center;">
                <div
                  style="width: 60px; height: 60px; background-color: #fef3c7; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;"
                >
                  <span style="font-size: 30px;">⚠️</span>
                </div>
                <h1
                  style="margin: 0; color: #1e3a5f; font-size: 22px; font-weight: 600;"
                >
                  Tu receta está por vencer
                </h1>
                <p style="margin: 15px 0 0 0; color: #64748b; font-size: 16px;">
                  Hola {{customer_first_name}}, tu receta vence el
                  <strong>{{prescription_expiry_date}}</strong>
                </p>
              </td>
            </tr>

            <!-- Mensaje de Salud Visual -->
            <tr>
              <td style="padding: 0 30px 20px 30px;">
                <div
                  style="background-color: #f0fdf4; border-radius: 12px; padding: 20px; text-align: center;"
                >
                  <p
                    style="margin: 0 0 10px 0; color: #166534; font-size: 14px;"
                  >
                    💡 <strong>¿Sabías que?</strong>
                  </p>
                  <p
                    style="margin: 0; color: #15803d; font-size: 14px; line-height: 1.6;"
                  >
                    Los controles visuales periódicos son esenciales para
                    mantener una buena salud ocular y detectar posibles
                    problemas a tiempo.
                  </p>
                </div>
              </td>
            </tr>

            <!-- CTA -->
            <tr>
              <td style="padding: 0 30px 20px 30px; text-align: center;">
                <a
                  href="{{booking_url}}"
                  style="display: inline-block; background-color: #1e3a5f; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;"
                >
                  Reservar Nuevo Turno
                </a>
              </td>
            </tr>

            <!-- Datos de Contacto -->
            <tr>
              <td style="padding: 0 30px 20px 30px;">
                <div
                  style="background-color: #f8fafc; border-radius: 12px; padding: 15px; text-align: center;"
                >
                  <p style="margin: 0; color: #64748b; font-size: 14px;">
                    📞 {{branch_phone}} | ✉️ {{branch_email}}<br />
                    📍 {{branch_address}}
                  </p>
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td
                style="background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;"
              >
                <p style="margin: 0; color: #1e3a5f; font-weight: 600;">
                  {{organization_name}}
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

## 7. Orden de Trabajo Lista

**Tipo**: `work_order_ready`
**Asunto predeterminado**: `✅ Tu trabajo está listo para retirar`

### Template HTML

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Trabajo Listo</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center;">
              <p style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">{{organization_name}}</p>
            </td>
          </tr>

          <!-- Icono -->
          <tr>
            <td style="padding: 30px 0 10px 0; text-align: center;">
              <div style="width: 80px; height: 80px; background-color: #dcfce7; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                <span style="font-size: 40px;">✅</span>
              </div>
            </td>
          </tr>

          <!-- Título -->
          <tr>
            <td style="padding: 10px 30px 20px 30px; text-align: center;">
              <h1 style="margin: 0; color: #1e3a5f; font-size: 24px; font-weight: 600;">
                ¡Tu trabajo está listo!
              </h1>
              <p style="margin: 10px 0 0 0; color: #64748b; font-size: 16px;">
                Hola {{customer_first_name}}, ya podés retirar tu {{product_type}}
              </p>
            </td>
          </tr>

          <!-- Detalles de la Orden -->
          <tr>
            <td style="padding: 0 30px;">
              <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; border: 2px solid #e2e8f0;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                      <p style="margin: 0; color: #94a3b8; font-size: 11px; text-transform: uppercase;">📋 Orden N°</p>
                      <p style="margin: 5px 0 0 0; color: #1e3a5f; font-size: 18px; font-weight: 600;">{{work_order_number}}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                      <p style="margin: 0; color: #94a3b8; font-size: 11px; text-transform: uppercase;">📅 Listo el</p>
                      <p style="margin: 5px 0 0 0; color: #1e3a5f; font-size: 16px; font-weight: 500;">{{delivery_date}}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0;">
                      <p style="margin: 0; color: #94a3b8; font-size: 11px; text-transform: uppercase;">👁️ Producto</p>
                      <p style="margin: 5px 0 0 0; color: #1e3a5f; font-size: 14px;">{{product_description}}</p>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- Saldo Pendiente (si aplica) -->
          {{#if balance_due}}
          <tr>
            <td style="padding: 20px 30px;">
              <div style="background-color: #fef3c7; border-radius: 12px; padding: 15px; text-align: center;">
="margin:                 <p style0 0 5px 0; color: #92400e; font-size: 14px;">Saldo pendiente</p>
                <p style="margin: 0; color: #1e3a5f; font-size: 24px; font-weight: 700;">{{balance_due}}</p>
                <p style="margin: 10px 0 0 0;">
                  <a href="{{payment_url}}" style="color: #1e3a5f; font-weight: 600;">Pagar ahora</a>
                </p>
              </div>
            </td>
          </tr>
          {{/if}}

          <!-- Información de Retiro -->
          <tr>
            <td style="padding: 0 30px 20px 30px; text-align: center;">
              <div style="background-color: #dcfce7; border-radius: 12px; padding: 20px;">
                <p style="margin: 0 0 10px 0; color: #166534; font-weight: 600; font-size: 14px;">📍 {{branch_name}}</p>
                <p style="margin: 0; color: #166534; font-size: 14px;">{{branch_address}}</p>
                <p style="margin: 10px 0 0 0; color: #166534; font-size: 14px;">🕐 {{branch_hours}}</p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 5px 0; color: #1e3a5f; font-weight: 600;">{{organization_name}}</p>
              <p style="margin: 0; color: #64748b; font-size: 12px;">{{branch_phone}} | {{branch_email}}</p>
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

## 8. Presupuesto Enviado

**Tipo**: `quote_sent`
**Asunto predeterminado**: `📄 Tu presupuesto está listo - {{quote_number}}`

### Template HTML

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Presupuesto</title>
  </head>
  <body
    style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f5f5f5;"
  >
    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      style="background-color: #f5f5f5; padding: 20px 0;"
    >
      <tr>
        <td align="center">
          <table
            width="600"
            cellpadding="0"
            cellspacing="0"
            style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);"
          >
            <!-- Header -->
            <tr>
              <td
                style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center;"
              >
                <p
                  style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;"
                >
                  {{organization_name}}
                </p>
                <p style="margin: 5px 0 0 0; color: #bfdbfe; font-size: 14px;">
                  Presupuesto Personalizado
                </p>
              </td>
            </tr>

            <!-- Título -->
            <tr>
              <td style="padding: 30px 30px 20px 30px; text-align: center;">
                <h1
                  style="margin: 0; color: #1e3a5f; font-size: 24px; font-weight: 600;"
                >
                  ¡Hola {{customer_first_name}}!
                </h1>
                <p style="margin: 10px 0 0 0; color: #64748b; font-size: 16px;">
                  Te hemos preparado un presupuesto especial para vos
                </p>
              </td>
            </tr>

            <!-- Número de Presupuesto -->
            <tr>
              <td style="padding: 0 30px 20px 30px; text-align: center;">
                <div
                  style="background-color: #f8fafc; border-radius: 12px; padding: 15px; display: inline-block;"
                >
                  <p
                    style="margin: 0; color: #94a3b8; font-size: 12px; text-transform: uppercase;"
                  >
                    Presupuesto N°
                  </p>
                  <p
                    style="margin: 5px 0 0 0; color: #1e3a5f; font-size: 24px; font-weight: 700;"
                  >
                    {{quote_number}}
                  </p>
                </div>
              </td>
            </tr>

            <!-- Tabla de Items -->
            <tr>
              <td style="padding: 0 30px;">
                <div
                  style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;"
                >
                  <table
                    width="100%"
                    cellpadding="0"
                    cellspacing="0"
                    style="background-color: #f8fafc;"
                  >
                    <tr>
                      <th
                        style="padding: 12px; text-align: left; color: #64748b; font-size: 12px; text-transform: uppercase; border-bottom: 1px solid #e2e8f0;"
                      >
                        Concepto
                      </th>
                      <th
                        style="padding: 12px; text-align: right; color: #64748b; font-size: 12px; text-transform: uppercase; border-bottom: 1px solid #e2e8f0;"
                      >
                        Monto
                      </th>
                    </tr>
                  </table>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    {{{items_table}}}
                  </table>
                  <table
                    width="100%"
                    cellpadding="0"
                    cellspacing="0"
                    style="background-color: #f8fafc;"
                  >
                    <tr>
                      <td
                        style="padding: 12px; text-align: right; color: #64748b; font-size: 12px;"
                      >
                        Subtotal
                      </td>
                      <td
                        style="padding: 12px; text-align: right; color: #1e3a5f; font-weight: 600;"
                      >
                        {{subtotal}}
                      </td>
                    </tr>
                    {{#if discount}}
                    <tr>
                      <td
                        style="padding: 12px; text-align: right; color: #64748b; font-size: 12px;"
                      >
                        Descuento ({{discount_percentage}})
                      </td>
                      <td
                        style="padding: 12px; text-align: right; color: #16a34a; font-weight: 600;"
                      >
                        -{{discount}}
                      </td>
                    </tr>
                    {{/if}}
                    <tr>
                      <td
                        style="padding: 12px; text-align: right; color: #64748b; font-size: 12px;"
                      >
                        IVA
                      </td>
                      <td
                        style="padding: 12px; text-align: right; color: #1e3a5f; font-weight: 600;"
                      >
                        {{iva}}
                      </td>
                    </tr>
                    <tr style="background-color: #1e3a5f;">
                      <td
                        style="padding: 15px; text-align: right; color: #ffffff; font-weight: 600;"
                      >
                        TOTAL
                      </td>
                      <td
                        style="padding: 15px; text-align: right; color: #ffffff; font-size: 20px; font-weight: 700;"
                      >
                        {{total}}
                      </td>
                    </tr>
                  </table>
                </div>
              </td>
            </tr>

            <!-- Vigencia -->
            <tr>
              <td style="padding: 20px 30px;">
                <div
                  style="background-color: #fef3c7; border-radius: 8px; padding: 15px; text-align: center;"
                >
                  <p style="margin: 0; color: #92400e; font-size: 14px;">
                    ⏰ Este presupuesto tiene una validez de
                    <strong>{{valid_days}} días</strong>.<br />
                    Vence el <strong>{{quote_expiry_date}}</strong>
                  </p>
                </div>
              </td>
            </tr>

            <!-- CTAs -->
            <tr>
              <td style="padding: 0 30px 20px 30px; text-align: center;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center">
                      <a
                        href="{{accept_url}}"
                        style="display: inline-block; background-color: #16a34a; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; margin-right: 10px;"
                      >
                        ✅ Aceptar Presupuesto
                      </a>
                      <a
                        href="{{quote_url}}"
                        style="display: inline-block; background-color: #1e3a5f; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;"
                      >
                        Ver Detalle Completo
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Información de Contacto -->
            <tr>
              <td style="padding: 0 30px 20px 30px;">
                <div
                  style="background-color: #f8fafc; border-radius: 12px; padding: 15px; text-align: center;"
                >
                  <p
                    style="margin: 0 0 5px 0; color: #1e3a5f; font-weight: 600; font-size: 14px;"
                  >
                    ¿Tenés alguna consulta?
                  </p>
                  <p style="margin: 0; color: #64748b; font-size: 14px;">
                    📞 {{branch_phone}} | ✉️ {{branch_email}}<br />
                    📍 {{branch_address}}
                  </p>
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td
                style="background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;"
              >
                <p style="margin: 0; color: #1e3a5f; font-weight: 600;">
                  {{organization_name}}
                </p>
                <p style="margin: 5px 0 0 0; color: #94a3b8; font-size: 12px;">
                  Tu salud visual, nuestra pasión
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

## 9. Presupuesto Próximo a Vencer

**Tipo**: `quote_expiring`
**Asunto predeterminado**: `⏰ Tu presupuesto vence pronto - {{quote_expiry_date}}`

### Template HTML

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Presupuesto por Vencer</title>
  </head>
  <body
    style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f5f5f5;"
  >
    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      style="background-color: #f5f5f5; padding: 20px 0;"
    >
      <tr>
        <td align="center">
          <table
            width="600"
            cellpadding="0"
            cellspacing="0"
            style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);"
          >
            <!-- Header -->
            <tr>
              <td
                style="background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); padding: 25px; text-align: center;"
              >
                <p
                  style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;"
                >
                  {{organization_name}}
                </p>
              </td>
            </tr>

            <!-- Título -->
            <tr>
              <td style="padding: 30px 30px 20px 30px; text-align: center;">
                <h1
                  style="margin: 0; color: #1e3a5f; font-size: 22px; font-weight: 600;"
                >
                  ¡Tu presupuesto está por vencer!
                </h1>
                <p style="margin: 15px 0 0 0; color: #64748b; font-size: 16px;">
                  Hola {{customer_first_name}}, recordá que tu presupuesto vence
                  el <strong>{{quote_expiry_date}}</strong>
                </p>
              </td>
            </tr>

            <!-- Resumen del Presupuesto -->
            <tr>
              <td style="padding: 0 30px 20px 30px;">
                <div
                  style="background-color: #f8fafc; border-radius: 12px; padding: 20px;"
                >
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td
                        style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"
                      >
                        <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                          Presupuesto N°
                        </p>
                        <p
                          style="margin: 5px 0 0 0; color: #1e3a5f; font-weight: 600;"
                        >
                          {{quote_number}}
                        </p>
                      </td>
                      <td
                        style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right;"
                      >
                        <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                          Monto
                        </p>
                        <p
                          style="margin: 5px 0 0 0; color: #1e3a5f; font-weight: 700; font-size: 18px;"
                        >
                          {{total}}
                        </p>
                      </td>
                    </tr>
                  </table>
                </div>
              </td>
            </tr>

            <!-- CTA -->
            <tr>
              <td style="padding: 0 30px 20px 30px; text-align: center;">
                <p style="margin: 0 0 15px 0; color: #64748b; font-size: 14px;">
                  ¿Te gustaría aceptarlo antes de que venza?
                </p>
                <a
                  href="{{accept_url}}"
                  style="display: inline-block; background-color: #16a34a; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;"
                >
                  Aceptar Ahora
                </a>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td
                style="background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;"
              >
                <p style="margin: 0; color: #64748b; font-size: 14px;">
                  {{branch_phone}} | {{branch_email}}
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

## 10. Bienvenida de Cliente

**Tipo**: `account_welcome`
**Asunto predeterminado**: `¡Bienvenido a {{organization_name}}! 👋`

### Template HTML

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Bienvenido</title>
  </head>
  <body
    style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f5f5f5;"
  >
    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      style="background-color: #f5f5f5; padding: 20px 0;"
    >
      <tr>
        <td align="center">
          <table
            width="600"
            cellpadding="0"
            cellspacing="0"
            style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);"
          >
            <!-- Header -->
            <tr>
              <td
                style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 40px 30px; text-align: center;"
              >
                <p
                  style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;"
                >
                  {{organization_name}}
                </p>
                <p style="margin: 10px 0 0 0; color: #bfdbfe; font-size: 16px;">
                  Tu Salud Visual
                </p>
              </td>
            </tr>

            <!-- Título -->
            <tr>
              <td style="padding: 40px 30px 20px 30px; text-align: center;">
                <h1
                  style="margin: 0; color: #1e3a5f; font-size: 28px; font-weight: 600;"
                >
                  ¡Bienvenido, {{customer_first_name}}! 🎉
                </h1>
                <p
                  style="margin: 15px 0 0 0; color: #64748b; font-size: 16px; line-height: 1.6;"
                >
                  Gracias por elegirnos para cuidar tu salud visual.<br />
                  Estamos encantados de tenerte con nosotros.
                </p>
              </td>
            </tr>

            <!-- Qué puedes hacer -->
            <tr>
              <td style="padding: 0 30px 20px 30px;">
                <div
                  style="background-color: #f8fafc; border-radius: 12px; padding: 25px;"
                >
                  <p
                    style="margin: 0 0 15px 0; color: #1e3a5f; font-weight: 600; font-size: 16px;"
                  >
                    Con tu cuenta podrás:
                  </p>
                  <ul
                    style="margin: 0; padding-left: 20px; color: #64748b; font-size: 14px; line-height: 2;"
                  >
                    <li>Agendar turnos para exámenes visuales</li>
                    <li>Ver tu historial de recetas</li>
                    <li>Acceder a tus presupuestos</li>
                    <li>Recibir recordatorios de tus controles</li>
                    <li>Ver el estado de tus órdenes de trabajo</li>
                  </ul>
                </div>
              </td>
            </tr>

            <!-- CTA -->
            <tr>
              <td style="padding: 0 30px 20px 30px; text-align: center;">
                <a
                  href="{{dashboard_url}}"
                  style="display: inline-block; background-color: #1e3a5f; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;"
                >
                  Ir a Mi Cuenta
                </a>
              </td>
            </tr>

            <!-- Información de Contacto -->
            <tr>
              <td style="padding: 0 30px 20px 30px;">
                <div
                  style="background-color: #dbeafe; border-radius: 12px; padding: 20px; text-align: center;"
                >
                  <p
                    style="margin: 0 0 10px 0; color: #1e3a5f; font-weight: 600;"
                  >
                    ¿Tenés alguna pregunta?
                  </p>
                  <p style="margin: 0; color: #1e3a5f; font-size: 14px;">
                    📞 {{branch_phone}} | ✉️ {{branch_email}}<br />
                    📍 {{branch_address}}
                  </p>
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td
                style="background-color: #f8fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0;"
              >
                <p style="margin: 0 0 5px 0; color: #1e3a5f; font-weight: 600;">
                  {{organization_name}}
                </p>
                <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                  Cuidando tu visión desde hace más de 20 años
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

## 11. Formulario de Contacto

**Tipo**: `contact_form`
**Asunto predeterminado**: `📬 Mensaje recibido - {{organization_name}}`

### Template HTML

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Mensaje Recibido</title>
  </head>
  <body
    style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f5f5f5;"
  >
    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      style="background-color: #f5f5f5; padding: 20px 0;"
    >
      <tr>
        <td align="center">
          <table
            width="600"
            cellpadding="0"
            cellspacing="0"
            style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);"
          >
            <!-- Header -->
            <tr>
              <td
                style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 25px; text-align: center;"
              >
                <p
                  style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;"
                >
                  {{organization_name}}
                </p>
              </td>
            </tr>

            <!-- Título -->
            <tr>
              <td style="padding: 30px 30px 20px 30px; text-align: center;">
                <div
                  style="width: 60px; height: 60px; background-color: #dbeafe; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;"
                >
                  <span style="font-size: 30px;">📬</span>
                </div>
                <h1
                  style="margin: 0; color: #1e3a5f; font-size: 22px; font-weight: 600;"
                >
                  ¡Mensaje recibido!
                </h1>
                <p style="margin: 15px 0 0 0; color: #64748b; font-size: 16px;">
                  Hola {{customer_first_name}}, gracias por contactarnos.
                </p>
              </td>
            </tr>

            <!-- Mensaje -->
            <tr>
              <td style="padding: 0 30px 20px 30px;">
                <div
                  style="background-color: #f8fafc; border-radius: 12px; padding: 20px;"
                >
                  <p
                    style="margin: 0 0 15px 0; color: #64748b; font-size: 14px;"
                  >
                    Hemos recibido tu mensaje y nuestro equipo lo está
                    revisando.<br />
                    Te responderemos a la brevedad.
                  </p>
                  <p style="margin: 0; color: #1e3a5f; font-weight: 600;">
                    {{organization_name}}
                  </p>
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td
                style="background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;"
              >
                <p style="margin: 0; color: #64748b; font-size: 14px;">
                  📞 {{branch_phone}} | ✉️ {{branch_email}}
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

## 12. Feliz Cumpleaños

**Tipo**: `birthday`
**Asunto predeterminado**: `🎂 ¡Feliz Cumpleaños, {{customer_first_name}}! 🎂`

### Template HTML

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Feliz Cumpleaños</title>
  </head>
  <body
    style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f5f5f5;"
  >
    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      style="background-color: #f5f5f5; padding: 20px 0;"
    >
      <tr>
        <td align="center">
          <table
            width="600"
            cellpadding="0"
            cellspacing="0"
            style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);"
          >
            <!-- Header Decorativo -->
            <tr>
              <td
                style="background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%); padding: 40px 30px; text-align: center;"
              >
                <p
                  style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700;"
                >
                  🎉 {{current_date}}
                </p>
              </td>
            </tr>

            <!-- Título -->
            <tr>
              <td style="padding: 40px 30px 20px 30px; text-align: center;">
                <h1
                  style="margin: 0; color: #1e3a5f; font-size: 28px; font-weight: 600;"
                >
                  ¡Feliz Cumpleaños, {{customer_first_name}}! 🎂
                </h1>
                <p style="margin: 15px 0 0 0; color: #64748b; font-size: 16px;">
                  Desde {{organization_name}} queremos desearte un día lleno de
                  alegría.
                </p>
              </td>
            </tr>

            <!-- Mensaje -->
            <tr>
              <td style="padding: 0 30px 20px 30px; text-align: center;">
                <div
                  style="background-color: #fdf2f8; border-radius: 12px; padding: 25px;"
                >
                  <p
                    style="margin: 0; color: #be185d; font-size: 16px; line-height: 1.6;"
                  >
                    Que este nuevo año te traiga mucha salud, felicidad y<br />
                    una visión clara para cumplir todos tus sueños. 👁️✨
                  </p>
                </div>
              </td>
            </tr>

            <!-- CTA Opcional -->
            <tr>
              <td style="padding: 0 30px 20px 30px; text-align: center;">
                {{#if birthday_promo_code}}
                <div
                  style="background-color: #dcfce7; border-radius: 12px; padding: 20px; margin-bottom: 15px;"
                >
                  <p
                    style="margin: 0 0 10px 0; color: #166534; font-weight: 600; font-size: 14px;"
                  >
                    🎁 Tu regalo de cumpleaños
                  </p>
                  <p
                    style="margin: 0 0 10px 0; color: #1e3a5f; font-size: 24px; font-weight: 700;"
                  >
                    {{birthday_promo_code}}
                  </p>
                  <p style="margin: 0; color: #64748b; font-size: 12px;">
                    {{birthday_promo_description}}
                  </p>
                </div>
                <a
                  href="{{promo_url}}"
                  style="display: inline-block; background-color: #ec4899; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;"
                >
                  Ver Oferta
                </a>
                {{else}}
                <a
                  href="{{booking_url}}"
                  style="display: inline-block; background-color: #1e3a5f; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px;"
                >
                  Agendar un Turno
                </a>
                {{/if}}
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td
                style="background-color: #fdf2f8; padding: 25px 30px; text-align: center; border-top: 1px solid #fce7f3;"
              >
                <p style="margin: 0 0 5px 0; color: #be185d; font-weight: 600;">
                  {{organization_name}}
                </p>
                <p style="margin: 0; color: #9d174d; font-size: 12px;">
                  Cuidando tu visión, cuidando de ti
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

## Resumen de Plantillas Óptica

| #   | Tipo de Email              | Descripción            | Prioridad |
| --- | -------------------------- | ---------------------- | --------- |
| 1   | `appointment_confirmation` | Confirmación de cita   | Alta      |
| 2   | `appointment_reminder`     | Recordatorio 24h       | Alta      |
| 3   | `appointment_reminder_2h`  | Recordatorio 2h        | Alta      |
| 4   | `appointment_cancelation`  | Cancelación de cita    | Alta      |
| 5   | `prescription_ready`       | Receta lista           | Media     |
| 6   | `prescription_expiring`    | Receta por vencer      | Media     |
| 7   | `work_order_ready`         | Orden lista            | Alta      |
| 8   | `quote_sent`               | Presupuesto enviado    | Alta      |
| 9   | `quote_expiring`           | Presupuesto por vencer | Media     |
| 10  | `account_welcome`          | Bienvenida cliente     | Alta      |
| 11  | `contact_form`             | Contacto recibido      | Alta      |
| 12  | `birthday`                 | Feliz cumpleaños       | Baja      |

---

**Documento creado**: 2025-02-06
**Versión**: 1.0
**Autor**: Plantillas Rediseñadas Opttius
