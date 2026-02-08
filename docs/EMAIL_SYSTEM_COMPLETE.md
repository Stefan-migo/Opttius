# Sistema de Emails - Opttius

## Resumen del Sistema

El sistema de emails de Opttius utiliza **Resend** como proveedor de correo electrónico, actualmente en modo desarrollo (onboarding) con dominio `resend.dev`. Esta configuración permite enviar hasta 50 emails/día de forma gratuita durante el desarrollo.

## Arquitectura del Sistema

### Componentes Principales

1. **Resend Client** (`src/lib/email/client.ts`)
   - Configuración del cliente Resend
   - API key desde variables de entorno (`RESEND_API_KEY`)
   - Modo dev: los emails se envían a `resend.dev` para testing

2. **Template Loader** (`src/lib/email/template-loader.ts`)
   - Carga plantillas desde la base de datos Supabase
   - Soporta fallback a plantillas por defecto
   - Gestión de variables dinámicas

3. **Template Utilities** (`src/lib/email/template-utils.ts`)
   - Reemplazo de variables en plantillas (`{{variable_name}}`)
   - Generación de contenido personalizado
   - Saneamiento de HTML

4. **Funciones de Notificaciones** (`src/lib/email/notifications.ts`)
   - Funciones existentes para envío de emails
   - Integración con el sistema de la aplicación

5. **Nuevas Funciones de Plantillas**:
   - `src/lib/email/templates/optica.ts` - 12 plantillas para emails de óptica
   - `src/lib/email/templates/saas.ts` - 11 plantillas para emails del SaaS

## Plantillas de Email

### Plantillas de Organización (Óptica) - 12 templates

| Tipo                       | Nombre                                 | Descripción                                     |
| -------------------------- | -------------------------------------- | ----------------------------------------------- |
| `appointment_confirmation` | Confirmación de Cita                   | Email de confirmación cuando se agenda una cita |
| `appointment_reminder`     | Recordatorio de Cita (24h)             | Recordatorio 24 horas antes de la cita          |
| `appointment_reminder_2h`  | Recordatorio de Cita (2h antes)        | Recordatorio 2 horas antes de la cita           |
| `appointment_cancelation`  | Cancelación de Cita                    | Notificación de cancelación de cita             |
| `prescription_ready`       | Receta Lista para Recoger              | Notificación cuando la receta está lista        |
| `prescription_expiring`    | Recordatorio de Vencimiento de Receta  | Alerta antes de que venza la receta             |
| `work_order_ready`         | Orden de Trabajo Lista                 | Notificación de orden de trabajo completada     |
| `quote_sent`               | Cotización Enviada                     | Envío de cotización al cliente                  |
| `quote_expiring`           | Cotización Por Vencer                  | Recordatorio de cotización próxima a vencer     |
| `account_welcome`          | Bienvenida de Cliente                  | Bienvenida a nuevo cliente                      |
| `contact_form`             | Confirmación de Formulario de Contacto | Confirmación de mensaje recibido                |
| `birthday`                 | Cumpleaños                             | Felicitación de cumpleaños con oferta           |

### Plantillas de SaaS - 11 templates

| Tipo                        | Nombre                         | Descripción                              |
| --------------------------- | ------------------------------ | ---------------------------------------- |
| `saas_welcome`              | Bienvenida al SaaS             | Bienvenida a nuevo administrador         |
| `saas_trial_ending`         | Trial Por Terminar             | Recordatorio de fin de período de prueba |
| `saas_subscription_success` | Suscripción Exitosa            | Confirmación de suscripción activada     |
| `saas_payment_failed`       | Pago Fallido                   | Alerta de problema con el pago           |
| `saas_payment_reminder`     | Recordatorio de Pago           | Recordatorio de pago próximo a vencer    |
| `saas_security_alert`       | Alerta de Seguridad            | Notificación de actividad inusual        |
| `saas_onboarding`           | Onboarding                     | Guía paso a paso de configuración        |
| `saas_terms_update`         | Actualización de Términos      | Notificación de nuevos términos          |
| `saas_maintenance`          | Mantenimiento Programado       | Aviso de mantenimiento                   |
| `saas_usage_alert`          | Alerta de Uso                  | Alerta de consumo de recursos            |
| `saas_feature_announcement` | Anuncio de Nueva Funcionalidad | Notificación de nueva feature            |

## Variables Disponibles

### Variables de Organización

```
{{customer_first_name}}     - Nombre del cliente
{{customer_email}}          - Email del cliente
{{appointment_date}}        - Fecha de la cita
{{appointment_time}}        - Hora de la cita
{{professional_name}}        - Nombre del profesional
{{professional_title}}       - Título del profesional
{{branch_name}}             - Nombre de la sucursal
{{branch_address}}          - Dirección de la sucursal
{{branch_phone}}            - Teléfono de la sucursal
{{branch_email}}            - Email de la sucursal
{{organization_name}}       - Nombre de la óptica
{{confirmation_url}}        - URL de confirmación
{{reschedule_url}}          - URL de reprogramación
{{cancel_url}}              - URL de cancelación
{{booking_url}}             - URL de reservas
{{portal_url}}              - URL del portal del cliente
```

### Variables de SaaS

```
{{admin_first_name}}        - Nombre del administrador
{{organization_name}}       - Nombre de la organización
{{dashboard_url}}           - URL del dashboard
{{support_url}}             - URL de soporte
{{trial_end_date}}          - Fecha de fin de trial
{{days_remaining}}          - Días restantes
{{discount_offer}}          - Oferta de descuento
{{upgrade_url}}             - URL de actualización
{{plan_name}}               - Nombre del plan
{{amount}}                  - Monto
{{next_billing_date}}       - Próxima fecha de facturación
{{invoice_url}}             - URL de factura
{{update_payment_url}}      - URL de actualización de pago
{{service_suspend_date}}    - Fecha de suspensión
{{suspicious_ip}}           - IP sospechosa
{{suspicious_location}}     - Ubicación sospechosa
{{suspicious_time}}         - Hora de la actividad
{{suspicious_action}}       - Acción detectada
{{step_number}}             - Paso actual
{{total_steps}}             - Total de pasos
{{progress_percentage}}     - Porcentaje de progreso
{{effective_date}}          - Fecha efectiva
{{maintenance_date}}        - Fecha de mantenimiento
{{maintenance_window}}      - Ventana de mantenimiento
{{usage_percentage}}        - Porcentaje de uso
{{resource_type}}           - Tipo de recurso
{{used_resources}}          - Recursos usados
{{total_resources}}         - Total de recursos
{{feature_name}}            - Nombre de la funcionalidad
```

## Uso de las Plantillas

### Envío de Email de Óptica

```typescript
import { sendAppointmentConfirmation } from "@/lib/email/templates/optica";

await sendAppointmentConfirmation({
  to: "cliente@email.com",
  variables: {
    customer_first_name: "Juan",
    appointment_date: "15 de Febrero",
    appointment_time: "10:00 AM",
    professional_name: "Dr. Pérez",
    branch_name: "Sucursal Centro",
    organization_name: "Óptica Vista Clara",
    confirmation_url: "https://...",
    reschedule_url: "https://...",
  },
});
```

### Envío de Email de SaaS

```typescript
import { sendSaaSWelcome } from "@/lib/email/templates/saas";

await sendSaaSWelcome({
  to: "admin@optica.com",
  variables: {
    admin_first_name: "María",
    organization_name: "Óptica Vista Clara",
    dashboard_url: "https://app.opttius.com/dashboard",
    support_url: "https://app.opttius.com/support",
    trial_end_date: "15 de Marzo",
  },
});
```

## Configuración de Resend

### Variables de Entorno

```env
RESEND_API_KEY=re_123456789
```

### Modo Desarrollo

En desarrollo, los emails se envían a través de Resend Dev con dominio `resend.dev`. Los destinatarios recibirán emails con remitente `@resend.dev`.

### Producción

Para producción, configurar un dominio verificado en Resend y actualizar los registros DNS correspondientes.

## Base de Datos

### Tabla: system_email_templates

| Campo           | Tipo    | Descripción                        |
| --------------- | ------- | ---------------------------------- |
| id              | uuid    | Identificador único                |
| type            | text    | Tipo de email (único por nombre)   |
| name            | text    | Nombre descriptivo                 |
| subject         | text    | Asunto del email                   |
| content         | text    | Contenido HTML                     |
| variables       | jsonb   | Variables esperadas                |
| is_active       | boolean | Si está activa                     |
| is_system       | boolean | Si es plantilla del sistema        |
| category        | text    | 'saas' u 'organization'            |
| is_default      | boolean | Si es plantilla por defecto        |
| organization_id | uuid    | Organización dueña (NULL = global) |

### Categorías

- **organization**: Plantillas para emails de la óptica a sus clientes
- **saas**: Plantillas para emails del SaaS a los administradores

## Migración de Base de Datos

Archivos de migración:

- `supabase/migrations/20260208000000_email_templates_complete.sql` - Migración completa
- `scripts/email/insert_templates.sql` - Plantillas de organización
- `scripts/email/insert_saas_templates.sql` - Plantillas de SaaS

## Siguientes Pasos

1. **Integración con lógica de negocio**
   - Conectar funciones de email con eventos de la aplicación
   - Configurar triggers automáticos (citas, recetas, etc.)

2. **Configuración de dominio**
   - Verificar dominio en Resend
   - Configurar registros DKIM, SPF, DMARC

3. **Analytics de emails**
   - Implementar tracking de aperturas
   - Tracking de clicks
   - Analytics de engagement

4. **Plantillas adicionales**
   - Email marketing
   - Notificaciones push
   - SMS templates

## Recursos

- [Documentación de Resend](https://resend.com/docs)
- [API de Resend](https://resend.com/docs/api-reference)
- [Guía de HTML email](https://www.mailtrap.io/blog/html-email-templates/)
