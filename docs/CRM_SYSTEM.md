# Sistema CRM - Gestión de Clientes (Opttius)

Documentación detallada del módulo CRM para ópticas. Base de la estructura de documentación del programa.

---

## 1. Introducción

El CRM de Opttius es un sistema de gestión de relaciones con clientes diseñado específicamente para ópticas y laboratorios ópticos. Gestiona el ciclo de vida completo del cliente: registro, recetas, citas, presupuestos y compras.

### Alcance

- **Clientes**: Perfiles con datos personales, médicos y de contacto.
- **Recetas**: Prescripciones oftalmológicas (OD/OS).
- **Citas**: Agendas por sucursal.
- **Presupuestos**: Cotizaciones vinculadas a clientes y recetas.
- **Compras**: Historial de pedidos y lentes.

### Principios de Diseño

1. **Multi-tenant**: Aislamiento por organización y sucursal.
2. **Clientes sin auth**: Los clientes no tienen cuenta; se crean solo desde el panel.
3. **Óptica-first**: Campos específicos (recetas, exámenes, condiciones médicas).
4. **Escalable**: Índices, RLS, validación Zod, respuestas API estandarizadas.

---

## 2. Arquitectura de Datos

### 2.1 Tabla `customers`

| Columna                  | Tipo        | Nullable | Descripción                            |
| ------------------------ | ----------- | -------- | -------------------------------------- |
| id                       | UUID        | NO       | PK, gen_random_uuid()                  |
| branch_id                | UUID        | NO       | FK branches, sucursal del cliente      |
| organization_id          | UUID        | YES      | FK organizations, multi-tenant         |
| first_name               | TEXT        | NO       | Nombre                                 |
| last_name                | TEXT        | NO       | Apellido                               |
| email                    | TEXT        | YES      | Email (opcional)                       |
| phone                    | TEXT        | YES      | Teléfono                               |
| rut                      | TEXT        | YES      | RUT chileno                            |
| date_of_birth            | DATE        | YES      | Fecha nacimiento                       |
| gender                   | TEXT        | YES      | male, female, other, prefer_not_to_say |
| address_line_1           | TEXT        | YES      | Dirección                              |
| address_line_2           | TEXT        | YES      | Complemento                            |
| city                     | TEXT        | YES      | Ciudad                                 |
| state                    | TEXT        | YES      | Región/Estado                          |
| postal_code              | TEXT        | YES      | Código postal                          |
| country                  | TEXT        | YES      | País (default Chile)                   |
| medical_conditions       | TEXT[]      | YES      | Condiciones médicas                    |
| allergies                | TEXT[]      | YES      | Alergias                               |
| medications              | TEXT[]      | YES      | Medicamentos                           |
| medical_notes            | TEXT        | YES      | Notas médicas                          |
| last_eye_exam_date       | DATE        | YES      | Último examen de vista                 |
| next_eye_exam_due        | DATE        | YES      | Próximo examen recomendado             |
| preferred_contact_method | TEXT        | YES      | email, phone, sms, whatsapp            |
| emergency_contact_name   | TEXT        | YES      | Contacto emergencia                    |
| emergency_contact_phone  | TEXT        | YES      | Teléfono emergencia                    |
| insurance_provider       | TEXT        | YES      | Prestador de seguro                    |
| insurance_policy_number  | TEXT        | YES      | Número de póliza                       |
| is_active                | BOOLEAN     | YES      | Activo (default true)                  |
| notes                    | TEXT        | YES      | Notas generales                        |
| tags                     | TEXT[]      | YES      | Etiquetas para segmentación            |
| created_at               | TIMESTAMPTZ | NO       | Creación                               |
| updated_at               | TIMESTAMPTZ | NO       | Última actualización                   |
| created_by               | UUID        | YES      | FK auth.users                          |
| updated_by               | UUID        | YES      | FK auth.users                          |

### 2.2 Índices

- `idx_customers_branch_id`
- `idx_customers_email` (WHERE email IS NOT NULL)
- `idx_customers_phone` (WHERE phone IS NOT NULL)
- `idx_customers_rut` (WHERE rut IS NOT NULL)
- `idx_customers_name` (first_name, last_name)
- `idx_customers_is_active` (WHERE is_active = TRUE)
- `idx_customers_created_at` (DESC)

### 2.3 Relaciones

```
organizations 1──* branches
branches 1──* customers
customers 1──* prescriptions
customers 1──* appointments
customers 1──* quotes
customers 1──* customer_lens_purchases
orders (vinculados por email/customer_name, sin FK customer_id)
```

---

## 3. Seguridad (RLS)

### 3.1 Políticas en `customers`

| Política                                      | Operación | Condición                                           |
| --------------------------------------------- | --------- | --------------------------------------------------- |
| Super admins can view all customers           | SELECT    | is_super_admin(auth.uid())                          |
| Admins can view customers in their branches   | SELECT    | admin_branch_access.branch_id = customers.branch_id |
| Super admins can insert customers             | INSERT    | is_super_admin(auth.uid())                          |
| Admins can insert customers in their branches | INSERT    | admin_branch_access.branch_id = customers.branch_id |
| Super admins can update customers             | UPDATE    | is_super_admin(auth.uid())                          |
| Admins can update customers in their branches | UPDATE    | admin_branch_access.branch_id = customers.branch_id |
| Super admins can delete customers             | DELETE    | is_super_admin(auth.uid())                          |
| Admins can delete customers in their branches | DELETE    | admin_branch_access.branch_id = customers.branch_id |

### 3.2 Filtrado en API

La API aplica filtros adicionales antes de ejecutar queries:

1. **organization_id**: Del admin (`admin_users.organization_id`).
2. **branch_id**: Si el header `x-branch-id` indica sucursal.
3. **Super admin en vista global**: Sin filtro (ve todo).
4. **Super admin con sucursal**: Filtro por branch_id.

---

## 4. API Reference

### 4.1 GET /api/admin/customers

Lista clientes con paginación y filtros.

**Query params:**

- `page`, `limit`: Paginación
- `q` o `search`: Búsqueda (nombre, email, teléfono, RUT)
- `is_active`: true/false para filtrar por estado

**Headers:**

- `x-branch-id`: Sucursal seleccionada (opcional)
- `x-branch-id: global`: Vista global (super admin)

**Respuesta:** `createPaginatedResponse(data, { page, limit, total })`

### 4.2 POST /api/admin/customers

**Crear cliente:** Body con campos de `createCustomerSchema`.

**Obtener stats:** Body vacío → devuelve `{ summary: { totalCustomers, activeCustomers, newCustomersThisMonth } }`.

**Validaciones:**

- Zod: createCustomerSchema
- Límite tier: validateTierLimit(orgId, "customers")
- Duplicados: email y RUT por branch

### 4.3 GET /api/admin/customers/[id]

Detalle de cliente con:

- Datos base
- orders (por email)
- prescriptions
- appointments
- lensPurchases
- quotes
- analytics (totalSpent, orderCount, segment, favoriteProducts, monthlySpending)

### 4.4 PUT /api/admin/customers/[id]

Actualizar cliente. Body parcial con campos permitidos.

### 4.5 GET /api/admin/customers/search?q=...

Búsqueda rápida (máx. 20 resultados).

- RUT: usa `search_customers_by_rut` RPC + ilike
- Otros: ilike en first_name, last_name, email, phone, rut

---

## 5. Flujos de Negocio

### 5.1 Registro de Cliente

1. Admin navega a Clientes → Nuevo Cliente
2. Completa formulario (nombre, apellido obligatorios; email/teléfono recomendados)
3. Sistema valida con Zod
4. API verifica límite tier, duplicados (email, RUT por branch)
5. Inserta en `customers` con organization_id, branch_id, created_by
6. Notificación asíncrona (notifyNewCustomer)

### 5.2 Búsqueda en POS / Presupuestos

1. Usuario escribe en campo de búsqueda (mín. 1 carácter para POS, 2 para search API)
2. Debounce 300ms
3. Llama `/api/admin/customers/search?q=...`
4. Muestra resultados (nombre, email, teléfono, RUT)
5. Al seleccionar, carga cliente y recetas para presupuesto/venta

### 5.3 Ciclo Receta → Presupuesto → Orden

1. Cliente tiene receta(s) en `prescriptions`
2. Se crea presupuesto (`quotes`) vinculado a customer_id y prescription_id
3. Si acepta, presupuesto se convierte en orden de trabajo o venta POS
4. Orden se asocia por email (orders.email) para historial en perfil de cliente

### 5.4 Clientes No Registrados

- Las citas pueden crearse sin cliente previo (guest_customer en appointments)
- Al asistir, se registra como cliente formal
- Flujo: Cita sin customer_id → Registro en recepción → customer_id asignado

---

## 6. Analíticas de Cliente

### 6.1 Segmentación

| Segmento   | Criterio                                                   |
| ---------- | ---------------------------------------------------------- |
| new        | Sin pedidos                                                |
| first-time | 1-3 pedidos                                                |
| regular    | 4-10 pedidos                                               |
| vip        | 11+ pedidos                                                |
| at-risk    | (Reservado para lógica futura: inactividad, cancelaciones) |

### 6.2 Métricas

- **totalSpent**: Suma de orders.total_amount
- **orderCount**: Cantidad de pedidos
- **avgOrderValue**: totalSpent / orderCount
- **lastOrderDate**: Fecha del último pedido
- **lifetimeValue**: Igual a totalSpent
- **favoriteProducts**: Top 5 productos por cantidad comprada
- **monthlySpending**: Gastos por mes (últimos 12)

---

## 7. Mejores Prácticas

### 7.1 Código

- Usar `customerService` del frontend; no llamar API directamente.
- Validar con Zod en API; no confiar en datos del cliente.
- Usar `createClientFromRequest` para soporte Bearer (tests, apps móviles).
- Rate limit en creación y búsqueda.

### 7.2 Base de Datos

- Mantener índices en columnas de filtrado frecuente.
- RLS habilitado en todas las tablas CRM.
- Triggers `update_updated_at` en tablas con updated_at.

### 7.3 UX

- Búsqueda con debounce para no saturar API.
- Mostrar segmento y métricas en detalle de cliente.
- Permitir crear receta/cita/presupuesto desde perfil de cliente.

---

## 8. Limitaciones Conocidas y Mejoras Futuras

### Limitaciones Actuales

1. **Orders sin customer_id**: Los pedidos se vinculan por email. Un `customer_id` en orders mejoraría la integridad.
2. **Analytics en listado**: La lista de clientes devuelve analytics con valores 0 (TODO en API).
3. **Search API**: Usa `createClient` en lugar de `createClientFromRequest`; no soporta Bearer consistente.
4. **organization_id en RLS**: Las políticas usan `admin_branch_access`; no hay política explícita por organization_id en customers (el filtro se aplica en API).

### Mejoras Recomendadas

1. Añadir `customer_id` a `orders` y migrar datos existentes.
2. Calcular analytics en el endpoint GET /customers (o vista materializada).
3. Estandarizar search con createClientFromRequest.
4. Añadir RLS por organization_id si se expone acceso directo a Supabase desde cliente.
5. Implementar soft delete (deleted_at) en lugar de borrado físico.
6. Historial de cambios (audit log) en actualizaciones de cliente.

---

## 9. Archivos Clave

| Ruta                                                                 | Descripción                 |
| -------------------------------------------------------------------- | --------------------------- |
| src/app/admin/customers/page.tsx                                     | Lista de clientes           |
| src/app/admin/customers/new/page.tsx                                 | Formulario nuevo cliente    |
| src/app/admin/customers/[id]/page.tsx                                | Detalle de cliente          |
| src/app/admin/customers/[id]/edit/page.tsx                           | Editar cliente              |
| src/app/api/admin/customers/route.ts                                 | GET lista, POST crear/stats |
| src/app/api/admin/customers/[id]/route.ts                            | GET detalle, PUT actualizar |
| src/app/api/admin/customers/search/route.ts                          | Búsqueda                    |
| src/lib/api/services/customerService.ts                              | Servicio frontend           |
| src/lib/api/validation/zod-schemas.ts                                | createCustomerSchema, etc.  |
| src/lib/utils/rut.ts                                                 | normalizeRUT, formatRUT     |
| supabase/migrations/20251218000000_separate_customers_from_users.sql | Migración base              |

---

## 10. Changelog de Documentación

- **2026-02-18**: Creación inicial del documento CRM_SYSTEM.md como base de la documentación del programa.
