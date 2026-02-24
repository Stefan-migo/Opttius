# Guía de Testing Opttius

**Versión:** 1.0  
**Fecha:** 2026-02-22

Guía unificada para testing manual y automatizado del sistema SaaS multi-tenant para ópticas.

---

## 1. Esquema de flujo de uso (usuario recién registrado)

```
Registro (auth) → Perfil creado (trigger DB)
       ↓
/onboarding/choice (API: /api/admin/check-status)
       ↓
   ┌───┴───┐
   │       │
Probar Demo    Crear Organización
   │       │
assign-demo   activate-real-org
   │       │
   └───┬───┘
       ↓
admin_branch_access (branch_id=null → super_admin)
       ↓
refetchAdminStatus() → /admin
```

### Pasos críticos

1. **Registro:** Email + contraseña. Trigger crea `profiles`.
2. **Onboarding:** `/onboarding/choice` valida si ya tiene `organization_id`.
3. **Demo:** `assign-demo` asigna org demo (`00000000-0000-0000-0000-000000000001`).
4. **Real:** `activate-real-org` crea org nueva y asigna super_admin.
5. **Acceso:** `admin_branch_access` con `branch_id = null` = acceso total a la org.

---

## 2. Checklist por módulo

### 2.1 Onboarding y Auth

| #   | Caso                    | Verificación                                 |
| --- | ----------------------- | -------------------------------------------- |
| 1   | Registro nuevo usuario  | Perfil creado, redirect a onboarding         |
| 2   | Probar Demo             | Usuario asignado a org demo, acceso a /admin |
| 3   | Crear Organización      | Org nueva creada, super_admin asignado       |
| 4   | Login con org existente | Redirect directo a /admin                    |
| 5   | Sin organization_id     | Muestra opciones en /onboarding/choice       |

### 2.2 Admin Users (ver `docs/ADMIN_USERS_TEST_CHECKLIST.md`)

- Paginación, búsqueda server-side
- Validación organization_id (403 al editar usuario de otra org)
- Lógica "último admin" en DELETE
- PermissionsEditor, BranchAccessManager
- Roles: root, super_admin, admin, employee, vendedor

### 2.3 CRM

| #   | Caso           | Verificación                  |
| --- | -------------- | ----------------------------- |
| 1   | Crear cliente  | RUT válido, datos guardados   |
| 2   | Buscar cliente | Por nombre, RUT, email        |
| 3   | Prescripción   | Crear/editar receta asociada  |
| 4   | Multi-sucursal | Clientes filtrados por branch |

### 2.4 Citas (Appointments)

| #   | Caso                       | Verificación                                                 |
| --- | -------------------------- | ------------------------------------------------------------ |
| 1   | Cita con cliente existente | customer_id, appointment_type, status                        |
| 2   | Cita guest (sin cliente)   | guest_first_name, guest_last_name, guest_rut                 |
| 3   | Disponibilidad             | Slots según schedule_settings                                |
| 4   | Tipos                      | eye_exam, consultation, fitting, delivery, repair, follow_up |
| 5   | Estados                    | scheduled → confirmed → completed                            |

### 2.5 Presupuestos (Quotes)

| #   | Caso                         | Verificación                                                |
| --- | ---------------------------- | ----------------------------------------------------------- |
| 1   | Crear presupuesto            | quote_number único, items, total                            |
| 2   | Enviar por email             | Template, variables sustituidas                             |
| 3   | Convertir a orden de trabajo | quote → lab_work_order                                      |
| 4   | Convertir a POS              | quote → carrito POS                                         |
| 5   | Estados                      | draft, sent, accepted, converted_to_work, rejected, expired |

### 2.6 Órdenes de trabajo (Lab Work Orders)

| #   | Caso                    | Verificación                             |
| --- | ----------------------- | ---------------------------------------- |
| 1   | Crear desde presupuesto | Prescripción, marco, lentes              |
| 2   | Crear desde POS         | Venta con marco+lentes                   |
| 3   | Ciclo de vida           | ordered → sent_to_lab → ... → delivered  |
| 4   | Cash-First              | on_hold_payment si depósito insuficiente |

### 2.7 POS

| #   | Caso              | Verificación                            |
| --- | ----------------- | --------------------------------------- |
| 1   | Abrir caja        | pos_session creada                      |
| 2   | Venta simple      | order, order_items, order_payments      |
| 3   | Split payment     | Múltiples order_payments (cash + card)  |
| 4   | Presupuesto → POS | Cargar quote al carrito                 |
| 5   | Saldo pendiente   | Pago posterior vía PendingBalanceDialog |
| 6   | Cerrar caja       | cash_register_closure                   |

Ver `docs/PAYMENT_WORKFLOW_TEST_CHECKLIST.md` para detalles de pagos.

### 2.8 Inventario

| #   | Caso                   | Verificación                                 |
| --- | ---------------------- | -------------------------------------------- |
| 1   | Productos por sucursal | product_branch_stock                         |
| 2   | Ajuste de stock        | Movimientos registrados                      |
| 3   | Alertas bajo stock     | Notificaciones                               |
| 4   | Categorías             | marcos, lentes-de-sol, accesorios, servicios |

### 2.9 Soporte (ver `docs/SUPPORT_SYSTEM_TEST_CHECKLIST.md`)

- Crear ticket, listar, filtrar
- response_time_minutes, resolution_time_minutes
- Tab Incidentes en analytics
- Portal B2B `/support`

### 2.10 Sistema y Backups

| #   | Caso                  | Verificación                             |
| --- | --------------------- | ---------------------------------------- |
| 1   | Generar backup org    | BackupService.generateBackup(orgId)      |
| 2   | Restaurar backup      | BackupService.restoreBackup(orgId, data) |
| 3   | Full backup (pg_dump) | SaasBackupService, saas_backups          |
| 4   | Mantenimiento         | /admin/system → pestaña Mantenimiento    |

---

## 3. Flujos críticos a verificar

### 3.1 Onboarding completo

1. Registrar usuario nuevo.
2. Elegir "Probar Demo".
3. Verificar acceso a Dashboard con datos demo.
4. Cambiar sucursal (Casa Matriz ↔ Providencia).
5. Verificar que CRM, Citas, POS filtran por sucursal.

### 3.2 Cita guest → entrega

1. Crear cita sin cliente (guest_first_name, guest_last_name, guest_rut).
2. Confirmar cita.
3. Completar cita.
4. (Opcional) Crear presupuesto para el guest.

### 3.3 Presupuesto → POS → pago split

1. Crear presupuesto con items.
2. Enviar presupuesto.
3. Aceptar y cargar al POS.
4. Procesar venta con efectivo + tarjeta (split).
5. Verificar order_payments con métodos correctos.

### 3.4 Saldo pendiente

1. Crear orden con pago parcial (depósito < total).
2. Abrir diálogo "Saldo pendiente".
3. Registrar pago restante con método válido.
4. Verificar order.payment_status actualizado.

### 3.5 Reset Demo (solo dev)

1. Ir a `/admin/saas-management/dashboard`.
2. Ejecutar "Restaurar la base de datos de la Óptica Demo".
3. Verificar que datos demo se restauran.

---

## 4. Tests automatizados existentes

| Tipo        | Ubicación                        | Comando                    |
| ----------- | -------------------------------- | -------------------------- |
| Unit        | `src/__tests__/unit/`            | `npm run test:unit`        |
| Integration | `src/__tests__/integration/`     | `npm run test:integration` |
| API         | `src/__tests__/integration/api/` | `npm run test:api`         |
| Security    | `src/__tests__/security/`        | `npm run test:security`    |
| E2E         | (pendiente)                      | `npm run test:e2e`         |

### Plan E2E (Playwright)

- Configuración en `e2e/` y `playwright.config.ts`.
- Tests: onboarding, auth (login), redirects. Ver `docs/E2E_TESTING.md`.
- Requiere Supabase local y (opcional) usuario demo para tests con auth.

### Validación desde backup

- `scripts/test-backup-isolation.js` — verificación básica de customers y storage.
- `scripts/validate-backup-data.js` — conteos por `organization_id` en tablas clave.
- Tablas: organizations, branches, customers, orders, quotes, lab_work_orders, products.

---

## 5. Mapa mental / Overview

```
                    OPTTIUS TESTING
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
   Manual QA         Automatizado        NotebookLM
        │                 │                 │
   Checklists        Unit/Integration    Fuentes en
   por módulo        E2E (plan)         Extendido
   Flujos críticos   Backup validation  TESTING_GUIDE
                     Vitest + Playwright Skill testing
```

---

## 6. Tutoriales sugeridos para soporte

| Tutorial            | Audiencia     | Contenido                                              |
| ------------------- | ------------- | ------------------------------------------------------ |
| Primer acceso       | Usuario nuevo | Registro, onboarding, elegir Demo vs Org real          |
| Configurar sucursal | Admin         | schedule_settings, quote_settings, pos_settings        |
| Crear cita guest    | Recepcionista | Formulario sin cliente, campos guest\_\*               |
| Presupuesto a venta | Vendedor      | Crear quote, enviar, cargar al POS, procesar           |
| Cerrar caja         | Cajero        | Abrir sesión, ventas, cierre con cash_register_closure |
| Restaurar backup    | Super admin   | Sistema → Mantenimiento, seleccionar backup, confirmar |

---

## 7. Referencias

- `docs/E2E_TESTING.md` — Configuración y ejecución de tests E2E
- `docs/PLAN_TESTING_IMPLEMENTATION.md` — Plan de implementación
- `docs/TESTING_CHECKLISTS/` — Checklists manuales por módulo:
  - `POS_TEST_CHECKLIST.md`
  - `CITAS_TEST_CHECKLIST.md`
  - `CLIENTES_TEST_CHECKLIST.md`
  - `PRODUCTOS_TEST_CHECKLIST.md`
  - `PRESUPUESTOS_TEST_CHECKLIST.md`
  - `TRABAJOS_TEST_CHECKLIST.md`
- `docs/ADMIN_USERS_TEST_CHECKLIST.md`
- `docs/PAYMENT_WORKFLOW_TEST_CHECKLIST.md`
- `docs/SUPPORT_SYSTEM_TEST_CHECKLIST.md`
- `docs/DEMO_OPTICA_MASTER_CHECKLIST.md`
- `docs/DEMO_OPTICA_README.md`
- `.cursor/skills/testing-optical-supabase/SKILL.md` — Skill para agentes
