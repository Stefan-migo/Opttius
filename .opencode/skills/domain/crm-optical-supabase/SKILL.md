---
name: crm-optical-supabase
description: Expert guide for building and maintaining a high-quality CRM system for optical shops with Supabase. Use when working on customer management, clientes, CRM features, prescriptions, appointments, quotes, or optical retail workflows. Covers multi-tenant architecture, RLS, RUT validation, and optical-specific data models.
---

# CRM para Ópticas con Supabase

Guía para desarrollar y mantener un CRM de alta gama para ópticas usando Supabase y Next.js.

## Cuándo Usar Este Skill

- Gestión de clientes (clientes, customers)
- Formularios de registro/edición de clientes
- Búsqueda de clientes (RUT, nombre, email, teléfono)
- Recetas oftalmológicas (prescriptions)
- Citas y agendas (appointments)
- Presupuestos (quotes) vinculados a clientes
- Integración POS con clientes
- Multi-tenant y multi-sucursal

## Arquitectura Core

### Separación de Entidades

| Entidad      | Propósito                               |
| ------------ | --------------------------------------- |
| `auth.users` | Usuarios del software (admins, staff)   |
| `profiles`   | Perfil extendido de auth.users          |
| `customers`  | Clientes de la óptica (NO autenticados) |

**Regla crítica**: Los clientes (`customers`) se crean solo desde el panel admin. No tienen cuenta en auth. Son específicos por sucursal (`branch_id`) y organización (`organization_id`).

### Modelo de Datos `customers`

```
customers:
  id, branch_id, organization_id (multi-tenant)
  first_name, last_name (NOT NULL)
  email, phone (opcionales)
  rut (RUT chileno)
  date_of_birth, gender
  address_line_1, address_line_2, city, state, postal_code, country
  medical_conditions[], allergies[], medications[], medical_notes
  last_eye_exam_date, next_eye_exam_due
  preferred_contact_method (email|phone|sms|whatsapp)
  emergency_contact_name, emergency_contact_phone
  insurance_provider, insurance_policy_number
  is_active, notes, tags[]
  created_at, updated_at, created_by, updated_by
```

### Relaciones CRM

- `prescriptions` → `customer_id`
- `appointments` → `customer_id`, `branch_id`
- `quotes` → `customer_id`
- `orders` → vinculados por `email` o `customer_name` (no hay FK customer_id en orders actualmente)

## Multi-Tenant y RLS

### Filtrado Obligatorio

1. **organization_id**: Siempre filtrar por organización del admin para aislamiento multi-tenant.
2. **branch_id**: Si el usuario tiene sucursal seleccionada, filtrar también por branch_id.
3. **Super admin**: Puede ver todas las organizaciones; si selecciona sucursal, filtrar por branch_id.

### Políticas RLS (customers)

- Super admin: SELECT/INSERT/UPDATE/DELETE en todos los customers.
- Admin regular: Solo en branches donde tiene acceso (`admin_branch_access`).

### Headers de Branch

- `x-branch-id`: Sucursal seleccionada.
- `x-branch-id: global`: Vista global (super admin).

## Búsqueda de Clientes

### RUT Chileno

- Usar `normalizeRUT()` y `formatRUT()` de `@/lib/utils/rut`.
- RPC `search_customers_by_rut(rut_search_term)` para búsqueda parcial.
- Probar tanto término original como normalizado (con/sin puntos y guión).

### Campos de Búsqueda

- `first_name`, `last_name`, `email`, `phone`, `rut`
- Usar `ilike` con patrón `%term%`.
- Límite 20 resultados por búsqueda.

## Validación con Zod

- `createCustomerSchema`, `updateCustomerSchema`, `searchCustomerSchema` en `@/lib/api/validation/zod-schemas`.
- Validar siempre en API antes de insertar/actualizar.
- Usar `validateBody()` y `validationErrorResponse()` de zod-helpers.

## Creación de Clientes

1. Verificar admin con `is_admin` RPC.
2. Obtener `organization_id` de `admin_users`.
3. Determinar `branch_id`: contexto (header) > body > error si falta.
4. Validar límite de tier: `validateTierLimit(orgId, "customers")`.
5. Verificar duplicados: email y RUT por branch.
6. Insertar con `organization_id`, `branch_id`, `created_by`.
7. Notificar: `NotificationService.notifyNewCustomer()` (no bloqueante).

## Analíticas de Cliente

- **Segmentos**: new, first-time (1+ orden), regular (4+), vip (11+), at-risk.
- **Métricas**: totalSpent, orderCount, avgOrderValue, lastOrderDate, lifetimeValue.
- **Productos favoritos**: Top 5 por cantidad comprada.
- **Gasto mensual**: Últimos 12 meses.

## Óptica-Específico

- **Recetas**: OD/OS (esfera, cilindro, eje, ADD, PD).
- **Exámenes**: `last_eye_exam_date`, `next_eye_exam_due`.
- **Condiciones médicas**: Arrays para condiciones, alergias, medicamentos.
- **Seguro**: insurance_provider, insurance_policy_number.

## Checklist de Calidad CRM

- [ ] Filtro organization_id en todas las queries de customers
- [ ] Validación Zod en POST/PUT
- [ ] Duplicados (email, RUT) por branch antes de insert
- [ ] Límite de tier antes de crear cliente
- [ ] Búsqueda RUT con normalización
- [ ] Respuestas API estandarizadas (createPaginatedResponse, createApiSuccessResponse)
- [ ] Rate limiting en creación y búsqueda
- [ ] createClientFromRequest para soporte Bearer (tests, móvil)

## Referencias

- Documentación detallada: `docs/CRM_SYSTEM.md`
- API customers: `src/app/api/admin/customers/`
- Servicio: `src/lib/api/services/customerService.ts`
- Migración base: `supabase/migrations/20251218000000_separate_customers_from_users.sql`
