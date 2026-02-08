# Análisis de Necesidades de Comunicación por Email - Óptica

## 1. Análisis del Dominio de una Óptica

Una óptica es un establecimiento de salud visual que ofrece servicios profesionales y productos ópticos. Las comunicaciones por email deben reflejar la naturaleza profesional y de salud del negocio.

### 1.1 Tipos de Clientes de una Óptica

1. **Pacientes recurrentes** - Clientes con historial de compras y controles
2. **Pacientes nuevos** - Primera visita a la óptica
3. **Pacientes con recetas vigentes** - Necesitan recordar controles periódicos
4. **Clientes corporativos** - Empresas con convenios

### 1.2 Momentos de Contacto con el Cliente

| Fase                  | Momento de Contacto             | Tipo de Comunicación        |
| --------------------- | ------------------------------- | --------------------------- |
| **Primera Visita**    | Solicitud de turno/cita         | Confirmación, recordatorio  |
| **Durante la Visita** | Realización de examen/refacción | Recordatorio de productos   |
| **Post-Visita**       | Receta emitida                  | Disponibilidad de productos |
| **Seguimiento**       | Control periódico               | Recordatorio de control     |
| **Venta**             | Compra realizada                | Confirmación, seguimiento   |
| **Entrega**           | Producto listo                  | Notificación de retiro      |
| **Post-Venta**        | Satisfacción                    | Feedback, garantía          |
| **Retención**         | Comunicación periódica          | Newsletters, promociones    |

---

## 2. Emails que REALMENTE Necesita una Óptica

### 2.1 Eliminados (No Aplican)

| Template Eliminado         | Razón                                            |
| -------------------------- | ------------------------------------------------ |
| `sendOrderConfirmation`    | Pensado para e-commerce, no para óptica          |
| `sendShippingNotification` | La óptica no envía productos a domicilio         |
| `sendDeliveryConfirmation` | La óptica no entrega a domicilio                 |
| `sendPaymentSuccess`       | Redundante con confirmación de compra            |
| `sendPaymentFailed`        | Redundante con confirmación de compra            |
| `sendMembershipWelcome`    | La óptica no ofrece membresías                   |
| `sendMembershipReminder`   | La óptica no ofrece membresías                   |
| `sendPasswordReset`        | Esta es una función del sistema, no de la óptica |

### 2.2 Emails que SÍ Aplican a una Óptica

#### **Citas y Turnos**

1. ✅ `appointment_confirmation` - Confirmación de cita/turno
2. ✅ `appointment_reminder` - Recordatorio de cita (24h antes)
3. ✅ `appointment_reminder_2h` - Recordatorio de cita (2h antes)
4. ✅ `appointment_cancelation` - Cancelación de cita
5. ✅ `appointment_reschedule` - Reprogramación de cita

#### **Recetas y Exámenes Visuales**

6. ✅ `prescription_ready` - Receta lista para retirar
7. ✅ `prescription_expiring` - Receta próxima a vencer
8. ✅ `prescription_annual_checkup` - Recordatorio de control anual
9. ✅ `prescription_new` - Nueva receta emitida

#### **Órdenes de Trabajo y Laboratorios**

10. ✅ `work_order_received` - Orden de trabajo recibida
11. ✅ `work_order_in_progress` - Orden en proceso
12. ✅ `work_order_ready` - Trabajo listo para retirar
13. ✅ `work_order_delivered` - Trabajo entregado

#### **Presupuestos y Cotizaciones**

14. ✅ `quote_sent` - Presupuesto enviado
15. ✅ `quote_expiring` - Presupuesto próximo a vencer
16. ✅ `quote_accepted` - Presupuesto aceptado
17. ✅ `quote_rejected` - Presupuesto rechazado

#### **Comunicación General**

18. ✅ `account_welcome` - Bienvenida de cliente nuevo
19. ✅ `contact_form` - Formulario de contacto enviado
20. ✅ `general_announcement` - Anuncio general

#### **Marketing y Retención** (Opcional)

21. ✅ `promotion_seasonal` - Promoción saisonal
22. ✅ `birthday` - Feliz cumpleaños
23. ✅ `newsletter` - Newsletter mensual
24. ✅ `new_product` - Nuevo producto/servicio
25. ✅ `loyalty_reward` - Premio por fidelidad

---

## 3. Análisis Detallado de Necesidades

### 3.1 Citas y Turnos (EPS - Examen de Salud visual Periódica)

**Por qué son importantes:**

- La salud visual requiere controles periódicos
- Los clientes olvidan sus citas
- Reduce la tasa de no-show (no asistencia)
- Mejora la utilización del tiempo profesional

**Momentos de envío:**

- Inmediatamente después de agendar
- 24 horas antes
- 2 horas antes
- En caso de cancelación/reprogramación

### 3.2 Recetas y Control Visual

**Por qué son importantes:**

- Las recetas tienen vencimiento legal (generalmente 1 año)
- Los clientes deben retornar para nuevos controles
- Oportunidad de upselling de productos
- Cuidado de la salud visual

**Momentos de envío:**

- Cuando la receta está lista para retirar (si aplica)
- 1 mes antes del vencimiento
- Aniversario del último control

### 3.3 Órdenes de Trabajo (Laboratorio)

**Por qué son importantes:**

- Los clientes esperan sus armazones/lentes con ansieda
- Reducción de consultas "está lista mi orden?"
- Mejora la experiencia del cliente
- Optimiza el flujo de trabajo del mostrador

**Momentos de envío:**

- Al recibir la orden
- Cuando está en proceso
- Cuando está lista para retirar
- Después de retirar (feedback)

### 3.4 Presupuestos

**Por qué son importantes:**

- Los clientes comparan precios
- Tienen vigencia limitada
- Oportunidad de cierre
- Seguimiento comercial

**Momentos de envío:**

- Inmediatamente después de crear el presupuesto
- 7 días antes del vencimiento
- Cuando el presupuesto está por vencer
- Después de la fecha de vencimiento (recordatorio)

### 3.5 Comunicación de Retención

**Por qué son importantes:**

- Costo de adquirir cliente nuevo es 5x mayor que retener
- Genera lealtad
- Aumenta el LTV (Lifetime Value)
- Posiciona a la óptica como referente

**Momentos de envío:**

- Cumpleaños
- Aniversario de primera compra
- Temporada (día de la madre, padre, navidad)
- Nuevos productos
- Eventos especiales

---

## 4. Matriz de Comunicación

| Evento Trigger           | Email Enviado                 | Timing          | Prioridad |
| ------------------------ | ----------------------------- | --------------- | --------- |
| Cliente agenda turno     | `appointment_confirmation`    | Inmediato       | Alta      |
| 24h antes del turno      | `appointment_reminder`        | 24h antes       | Alta      |
| 2h antes del turno       | `appointment_reminder_2h`     | 2h antes        | Alta      |
| Turno cancelado          | `appointment_cancelation`     | Inmediato       | Alta      |
| Turno reprogramado       | `appointment_reschedule`      | Inmediato       | Alta      |
| Receta emitida           | `prescription_new`            | Inmediato       | Media     |
| Receta lista             | `prescription_ready`          | Inmediato       | Media     |
| 1 mes antes vencimiento  | `prescription_expiring`       | 1 mes antes     | Baja      |
| Aniversario control      | `prescription_annual_checkup` | 1 año después   | Baja      |
| Orden creada             | `work_order_received`         | Inmediato       | Media     |
| Orden en proceso         | `work_order_in_progress`      | Por milestone   | Baja      |
| Orden lista              | `work_order_ready`            | Inmediato       | Alta      |
| Orden entregada          | `work_order_delayed`          | Por milestone   | Baja      |
| Presupuesto creado       | `quote_sent`                  | Inmediato       | Alta      |
| 7 días antes vence       | `quote_expiring`              | 7 días antes    | Media     |
| Presupuesto aceptado     | `quote_accepted`              | Inmediato       | Alta      |
| Presupuesto rechazado    | `quote_rejected`              | Inmediato       | Media     |
| Cliente nuevo registrado | `account_welcome`             | Inmediato       | Alta      |
| Contacto enviado         | `contact_form`                | Inmediato       | Alta      |
| Feliz cumpleaños         | `birthday`                    | El día          | Baja      |
| Promoción saisonal       | `promotion_seasonal`          | Por campaña     | Baja      |
| Nuevo producto           | `new_product`                 | Por lanzamiento | Baja      |

---

## 5. Variables Específicas por Tipo de Email

### 5.1 Variables de Citas

```typescript
interface AppointmentVariables {
  customer_name: string; // "María González"
  customer_first_name: string; // "María"
  appointment_date: string; // "15 de febrero de 2025"
  appointment_time: string; // "10:30 hs"
  appointment_datetime: string; // "15/02/2025 10:30 hs"
  professional_name: string; // "Dr. Juan Pérez"
  professional_title: string; // "Optómetra"
  branch_name: string; // "Sucursal Centro"
  branch_address: string; // "Av. Principal 123"
  branch_phone: string; // "(011) 1234-5678"
  appointment_type: string; // "Examen visual completo"
  appointment_duration: string; // "45 minutos"
  preparation_instructions: string; // "Traer Anteojos actuales..."
  confirmation_url: string; // URL para confirmar
  cancellation_url: string; // URL para cancelar
  reschedule_url: string; // URL para reprogramar
}
```

### 5.2 Variables de Recetas

```typescript
interface PrescriptionVariables {
  customer_name: string; // "María González"
  customer_first_name: string; // "María"
  prescription_date: string; // "15 de enero de 2025"
  prescription_expiry_date: string; // "15 de enero de 2026"
  prescription_id: string; // "RX-2025-001234"
  doctor_name: string; // "Dr. Juan Pérez"
  doctor_license: string; // "MP 12345"
  sphere_right: string; // "-2.00"
  sphere_left: string; // "-1.75"
  cylinder_right: string; // "-0.50"
  cylinder_left: string; // "-0.75"
  axis_right: string; // "180"
  axis_left: string; // "090"
  add_right: string; // "+1.00"
  add_left: string; // "+1.00"
  pd: string; // "63 mm"
  products_recommended: string; // "Armazón + Lentes..."
  next_checkup_date: string; // "15 de enero de 2026"
  branch_name: string;
  branch_address: string;
  branch_phone: string;
  prescription_url: string; // URL para ver receta
}
```

### 5.3 Variables de Órdenes de Trabajo

```typescript
interface WorkOrderVariables {
  customer_name: string;
  customer_first_name: string;
  work_order_number: string; // "OT-2025-001234"
  work_order_date: string; // "15 de enero de 2025"
  estimated_delivery_date: string; // "25 de enero de 2025"
  delivery_date: string; // "24 de enero de 2025"
  product_type: string; // "Lentes de armazón"
  product_description: string; // "Armazón + Lentes Monofocales..."
  lens_details: string; // "CR-39, Antirreflejo..."
  frame_details: string; // "Metal, color dorado..."
  price: string; // "$15.000"
  deposit_paid: string; // "$5.000"
  balance_due: string; // "$10.000"
  status: string; // "En proceso", "Listo", etc.
  branch_name: string;
  branch_address: string;
  branch_phone: string;
  branch_hours: string; // "Lun-Vie 9-18hs"
  work_order_url: string; // URL para ver orden
  payment_url: string; // URL para pagar saldo
}
```

### 5.4 Variables de Presupuestos

```typescript
interface QuoteVariables {
  customer_name: string;
  customer_first_name: string;
  quote_number: string; // "COT-2025-001234"
  quote_date: string; // "15 de enero de 2025"
  quote_expiry_date: string; // "15 de febrero de 2025"
  valid_days: number; // 30
  items_table: string; // HTML con tabla de items
  subtotal: string; // "$12.000"
  discount: string; // "$1.000"
  discount_percentage: string; // "10%"
  iva: string; // "$2.310"
  total: string; // "$13.310"
  deposit_required: string; // "$5.000"
  products: string; // "Armazón Titania..."
  services: string; // "Control visual..."
  branch_name: string;
  branch_address: string;
  branch_phone: string;
  branch_email: string;
  quote_url: string; // URL para ver presupuesto
  accept_url: string; // URL para aceptar
  reject_url: string; // URL para rechazar
  payment_url: string; // URL para pagar seña
}
```

### 5.5 Variables de Comunicación General

```typescript
interface GeneralVariables {
  customer_name: string;
  customer_first_name: string;
  organization_name: string;
  organization_logo_url: string;
  organization_website: string;
  organization_phone: string;
  organization_email: string;
  organization_address: string;
  social_media_links: string;
  unsubscribe_url: string;
  preference_center_url: string;
}
```

---

## 6. Resumen: Emails Finales para Óptica

### 6.1 Matriz de Prioridades

| #   | Email Type                 | Prioridad | Complejidad | Estado       |
| --- | -------------------------- | --------- | ----------- | ------------ |
| 1   | `appointment_confirmation` | Alta      | Media       | ⏳ Rediseñar |
| 2   | `appointment_reminder`     | Alta      | Baja        | ⏳ Rediseñar |
| 3   | `appointment_cancelation`  | Alta      | Baja        | ⏳ Nuevo     |
| 4   | `prescription_ready`       | Media     | Media       | ⏳ Rediseñar |
| 5   | `prescription_expiring`    | Media     | Baja        | ⏳ Nuevo     |
| 6   | `work_order_ready`         | Alta      | Media       | ⏳ Rediseñar |
| 7   | `quote_sent`               | Alta      | Alta        | ⏳ Rediseñar |
| 8   | `quote_expiring`           | Media     | Baja        | ⏳ Nuevo     |
| 9   | `account_welcome`          | Alta      | Baja        | ⏳ Rediseñar |
| 10  | `contact_form`             | Alta      | Baja        | ⏳ Mantener  |
| 11  | `birthday`                 | Baja      | Baja        | ⏳ Nuevo     |
| 12  | `promotion_seasonal`       | Baja      | Media       | ⏳ Nuevo     |
| 13  | `newsletter`               | Baja      | Media       | ⏳ Nuevo     |
| 14  | `new_product`              | Baja      | Baja        | ⏳ Nuevo     |

### 6.2 Eliminados del Sistema Anterior

| #   | Email Type            | Razón                                |
| --- | --------------------- | ------------------------------------ |
| 1   | `order_confirmation`  | E-commerce, no aplica                |
| 2   | `order_shipped`       | No hay envío a domicilio             |
| 3   | `order_delivered`     | No hay envío a domicilio             |
| 4   | `payment_success`     | Redundante                           |
| 5   | `payment_failed`      | Redundante                           |
| 6   | `membership_welcome`  | No hay membresías                    |
| 7   | `membership_reminder` | No hay membresías                    |
| 8   | `password_reset`      | Función del sistema, no de la óptica |

---

## 7. Conclusiones

### 7.1 Reducción de Complejidad

**Antes:** 16 templates de email
**Después:** 14 templates funcionales
**Diferencia:** -2 eliminados (e-commerce) + 6 nuevos (óptica)

### 7.2 Enfoque en Salud Visual

Las plantillas rediseñadas se centran en:

- **Cuidado de la salud visual** (citas, recordatorios de control)
- **Profesionalismo** (órdenes de trabajo, recetas)
- **Experiencia del cliente** (seguimiento, presupuestos)
- **Retención** (comunicación personalizada)

### 7.3 Próximos Pasos

1. **Rediseñar** las 9 plantillas existentes que aplican
2. **Crear** las 5 plantillas nuevas identificadas
3. **Implementar** en el sistema con las nuevas variables
4. **Probar** cada template con datos reales
5. **Medir** tasas de apertura y conversión

---

**Documento creado**: 2025-02-06
**Versión**: 1.0
**Autor**: Análisis del Sistema Opttius
