# Guía Completa de Testing Manual — Opttius

**Versión:** 1.0  
**Fecha:** 2026-02-24  
**Propósito:** Testing manual organizado + base para videotutoriales

---

## Resumen ejecutivo

Esta guía consolida toda la documentación de testing existente en un flujo ordenado para validar el sistema Opttius de extremo a extremo. Incluye:

1. **Orden de ejecución recomendado** — secuencia lógica según dependencias
2. **Checklists por módulo** — referencias a documentos detallados
3. **Flujos críticos** — escenarios end-to-end de alto impacto
4. **Mapa de videotutoriales** — qué grabar y para quién

---

## 0. Preparación previa

### Entorno

- [ ] Supabase local o staging con migraciones aplicadas
- [ ] `.env` con `NEXT_PUBLIC_DEMO_ORG_ID=00000000-0000-0000-0000-000000000001`
- [ ] Usuario admin asignado a la org demo (Óptica Mirada Clara)
- [ ] Acceso a ambas sucursales: Casa Matriz y Providencia

### Credenciales demo

| Entidad                  | UUID                                   |
| ------------------------ | -------------------------------------- |
| Organización             | `00000000-0000-0000-0000-000000000001` |
| Sucursal 1 (Casa Matriz) | `00000000-0000-0000-0000-000000000002` |
| Sucursal 2 (Providencia) | `00000000-0000-0000-0000-000000000003` |

Ver `docs/DEMO_OPTICA_README.md` para detalles.

---

## 1. Orden de ejecución recomendado

Sigue este orden para minimizar dependencias y maximizar cobertura:

```
FASE 1: Onboarding y acceso
    └── 1.1 Onboarding y Auth
    └── 1.2 Admin Users (roles, permisos, sucursales)

FASE 2: Datos base
    └── 2.1 CRM (clientes, prescripciones)
    └── 2.2 Inventario (productos, stock por sucursal)
    └── 2.3 Configuración (citas, presupuestos, POS)

FASE 3: Flujos operativos
    └── 3.1 Citas (con cliente, guest)
    └── 3.2 Presupuestos (crear, enviar, convertir)
    └── 3.3 POS (caja, ventas, pagos)
    └── 3.4 Órdenes de trabajo (ciclo de vida, Cash-First)

FASE 4: Integración y sistema
    └── 4.1 Flujos críticos end-to-end
    └── 4.2 Soporte
    └── 4.3 Sistema y backups
```

---

## 2. Checklists por módulo

### 2.1 Onboarding y Auth

| #   | Caso                    | Verificación                                 |
| --- | ----------------------- | -------------------------------------------- |
| 1   | Registro nuevo usuario  | Perfil creado, redirect a onboarding         |
| 2   | Probar Demo             | Usuario asignado a org demo, acceso a /admin |
| 3   | Crear Organización      | Org nueva creada, super_admin asignado       |
| 4   | Login con org existente | Redirect directo a /admin                    |
| 5   | Sin organization_id     | Muestra opciones en /onboarding/choice       |

### 2.2 Admin Users

**Documento:** `docs/ADMIN_USERS_TEST_CHECKLIST.md`

- Paginación, búsqueda server-side
- Validación organization_id (403 al editar usuario de otra org)
- Lógica "último admin" en DELETE
- PermissionsEditor, BranchAccessManager
- Roles: root, super_admin, admin, employee, vendedor

### 2.3 CRM (Clientes)

**Documento:** `docs/TESTING_CHECKLISTS/CLIENTES_TEST_CHECKLIST.md`

- Listado, búsqueda (nombre, RUT, email, teléfono)
- Crear cliente (RUT chileno válido, validaciones)
- Prescripciones (crear, editar, asociar)
- Multi-sucursal (filtro por branch)

### 2.4 Citas (Appointments)

**Documento:** `docs/TESTING_CHECKLISTS/CITAS_TEST_CHECKLIST.md`

- Cita con cliente existente
- Cita guest (sin cliente) — guest_first_name, guest_last_name, guest_rut
- Disponibilidad (slots según schedule_settings)
- Tipos: eye_exam, consultation, fitting, delivery, repair, follow_up
- Estados: scheduled → confirmed → completed
- Configuración (horarios, almuerzo, slot_duration, blocked_dates)

### 2.5 Presupuestos (Quotes)

**Documento:** `docs/TESTING_CHECKLISTS/PRESUPUESTOS_TEST_CHECKLIST.md`

- Crear presupuesto (cliente, prescripción, marco, lente, presbicia)
- Estados: draft, sent, accepted, rejected, expired, converted_to_work
- Enviar por email
- Cargar al POS
- Convertir a orden de trabajo

### 2.6 Órdenes de trabajo (Lab Work Orders)

**Documento:** `docs/TESTING_CHECKLISTS/TRABAJOS_TEST_CHECKLIST.md`

- Creación desde presupuesto y desde POS
- Cash-First (on_hold_payment vs ordered)
- Ciclo de vida: ordered → sent_to_lab → ... → delivered
- Entrega (validar saldo si pos_order_id)

### 2.7 POS

**Documento:** `docs/TESTING_CHECKLISTS/POS_TEST_CHECKLIST.md`

- Caja: abrir, cerrar, una sesión por branch
- Ventas: producto físico, servicio, stock
- Pagos: único, split, saldo pendiente
- Presupuesto → POS
- Work order: marco+lentes, Cash-First, marco cliente

### 2.8 Inventario

**Documento:** `docs/TESTING_GUIDE.md` § 2.8

- Productos por sucursal (product_branch_stock)
- Ajuste de stock
- Alertas bajo stock
- Categorías: marcos, lentes-de-sol, accesorios, servicios

### 2.9 Pagos (Payment Workflow)

**Documento:** `docs/PAYMENT_WORKFLOW_TEST_CHECKLIST.md`

- pending-balance/pay (Zod, pago exitoso)
- process-sale (split payments)
- Checkout SaaS (MercadoPago Bricks)
- POS Payment Dialog, Pending Balance Dialog

### 2.10 Soporte

**Documento:** `docs/SUPPORT_SYSTEM_TEST_CHECKLIST.md`

- Crear ticket, listar, filtrar
- response_time_minutes, resolution_time_minutes
- Tab Incidentes en analytics

### 2.11 Sistema y Backups

- Generar backup org
- Restaurar backup
- Full backup (pg_dump)
- Mantenimiento: `/admin/system` → pestaña Mantenimiento

---

## 3. Flujos críticos a verificar (end-to-end)

### 3.1 Onboarding completo

1. Registrar usuario nuevo
2. Elegir "Probar Demo"
3. Verificar acceso a Dashboard con datos demo
4. Cambiar sucursal (Casa Matriz ↔ Providencia)
5. Verificar que CRM, Citas, POS filtran por sucursal

### 3.2 Cita guest → entrega

1. Crear cita sin cliente (guest_first_name, guest_last_name, guest_rut)
2. Confirmar cita
3. Completar cita
4. (Opcional) Crear presupuesto para el guest

### 3.3 Presupuesto → POS → pago split

1. Crear presupuesto con items
2. Enviar presupuesto
3. Aceptar y cargar al POS
4. Procesar venta con efectivo + tarjeta (split)
5. Verificar order_payments con métodos correctos

### 3.4 Saldo pendiente

1. Crear orden con pago parcial (depósito < total)
2. Abrir diálogo "Saldo pendiente"
3. Registrar pago restante con método válido
4. Verificar order.payment_status actualizado

### 3.5 Reset Demo (solo dev)

1. Ir a `/admin/saas-management/dashboard`
2. Ejecutar "Restaurar la base de datos de la Óptica Demo"
3. Verificar que datos demo se restauran

---

## 4. Referencias rápidas

| Documento                              | Contenido                        |
| -------------------------------------- | -------------------------------- |
| `docs/TESTING_GUIDE.md`                | Guía base, mapa mental           |
| `docs/PLAN_TESTING_IMPLEMENTATION.md`  | Plan de implementación           |
| `docs/DEMO_OPTICA_MASTER_CHECKLIST.md` | Criterios de coherencia demo     |
| `docs/DEMO_OPTICA_README.md`           | Credenciales y datos demo        |
| `docs/TESTING_CHECKLISTS/*.md`         | Checklists detallados por módulo |

---

## 5. Mapa de videotutoriales

Ver `docs/VIDEOTUTORIALES_MAP.md` para la lista completa de videos sugeridos por rol y prioridad.
