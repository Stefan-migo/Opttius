# Sistema de Presupuestos (Quotes) - Opttius

Documentación detallada del módulo de presupuestos para ópticas. Base de la estructura de documentación del programa.

---

## 1. Introducción

El sistema de presupuestos de Opttius es un pilar central del flujo de negocio óptico, diseñado para convertir el interés de un cliente en una orden de trabajo o una venta efectiva. Integra datos clínicos (recetas), inventario de marcos y lentes, matrices de precios, y el punto de venta (POS) bajo una arquitectura multi-tenant.

### Alcance

- **Presupuestos**: Cotizaciones vinculadas a clientes y recetas.
- **Configuración**: Labor, IVA, expiración, tratamientos por sucursal.
- **Precios**: Matrices de lentes (ópticos y contacto), presbicia.
- **Flujos**: Crear → Enviar → Aceptar → Convertir a trabajo o POS.

### Principios de Diseño

1. **Multi-tenant**: Aislamiento por organización y sucursal.
2. **Vinculación clínica**: Prescripción obligatoria para lentes graduados.
3. **Óptica-first**: Marcos, lentes, tratamientos, presbicia, lentes de contacto.
4. **Escalable**: Índices, RLS, validación Zod, respuestas API estandarizadas.

---

## 2. Arquitectura de Datos

### 2.1 Tabla `quotes`

| Columna                                                                  | Tipo        | Nullable | Descripción                                                              |
| ------------------------------------------------------------------------ | ----------- | -------- | ------------------------------------------------------------------------ |
| id                                                                       | UUID        | NO       | PK, gen_random_uuid()                                                    |
| customer_id                                                              | UUID        | NO       | FK customers                                                             |
| branch_id                                                                | UUID        | YES      | FK branches                                                              |
| organization_id                                                          | UUID        | YES      | FK organizations, multi-tenant                                           |
| quote_number                                                             | TEXT        | NO       | Único, formato COT-YYYY-NNNN                                             |
| quote_date                                                               | DATE        | NO       | Fecha de emisión                                                         |
| expiration_date                                                          | DATE        | YES      | Validez (típicamente 30 días)                                            |
| prescription_id                                                          | UUID        | YES      | FK prescriptions                                                         |
| frame_product_id                                                         | UUID        | YES      | FK products (marco)                                                      |
| frame_name, frame_brand, frame_model, frame_color, frame_size, frame_sku | TEXT        | YES      | Snapshot del marco                                                       |
| frame_price                                                              | DECIMAL     | YES      | Precio del marco                                                         |
| frame_cost                                                               | DECIMAL     | YES      | Costo del marco                                                          |
| customer_own_frame                                                       | BOOLEAN     | NO       | Marco del cliente (precio 0)                                             |
| lens_family_id                                                           | UUID        | YES      | FK lens_families                                                         |
| lens_type                                                                | TEXT        | YES      | single_vision, bifocal, trifocal, progressive, reading, computer, sports |
| lens_material                                                            | TEXT        | YES      | polycarbonate, high_index_1_67, etc.                                     |
| lens_index                                                               | DECIMAL     | YES      | Índice refractivo                                                        |
| lens_treatments                                                          | TEXT[]      | YES      | anti_reflective, blue_light_filter, etc.                                 |
| lens_tint_color                                                          | TEXT        | YES      | Color tinte                                                              |
| lens_tint_percentage                                                     | INTEGER     | YES      | 0-100                                                                    |
| lens_cost                                                                | DECIMAL     | YES      | Costo lente                                                              |
| treatments_cost                                                          | DECIMAL     | YES      | Costo tratamientos                                                       |
| labor_cost                                                               | DECIMAL     | YES      | Mano de obra montaje                                                     |
| presbyopia_solution                                                      | TEXT        | YES      | none, two_separate, bifocal, trifocal, progressive                       |
| far_lens_family_id, near_lens_family_id                                  | UUID        | YES      | Para two_separate                                                        |
| far_lens_cost, near_lens_cost                                            | DECIMAL     | YES      | Costos lejos/cerca                                                       |
| near*frame*\*                                                            | varios      | YES      | Marco de cerca (two_separate)                                            |
| customer_own_near_frame                                                  | BOOLEAN     | YES      | Marco de cerca del cliente                                               |
| contact_lens_family_id                                                   | UUID        | YES      | FK contact_lens_families                                                 |
| contact*lens_rx*\*                                                       | varios      | YES      | Rx lentes de contacto OD/OS                                              |
| contact_lens_quantity                                                    | INTEGER     | YES      | 1+                                                                       |
| contact_lens_cost, contact_lens_price                                    | DECIMAL     | YES      | Costo/precio                                                             |
| subtotal                                                                 | DECIMAL     | YES      | Subtotal antes de impuestos                                              |
| tax_amount                                                               | DECIMAL     | YES      | Monto IVA                                                                |
| discount_amount                                                          | DECIMAL     | YES      | Descuento                                                                |
| discount_percentage                                                      | DECIMAL     | YES      | % descuento                                                              |
| total_amount                                                             | DECIMAL     | NO       | Total final                                                              |
| currency                                                                 | TEXT        | YES      | CLP (default)                                                            |
| status                                                                   | TEXT        | YES      | draft, sent, accepted, rejected, expired, converted_to_work              |
| original_status                                                          | TEXT        | YES      | Estado antes de conversión                                               |
| converted_to_work_order_id                                               | UUID        | YES      | FK lab_work_orders si convertido                                         |
| notes                                                                    | TEXT        | YES      | Notas internas                                                           |
| customer_notes                                                           | TEXT        | YES      | Notas visibles al cliente                                                |
| terms_and_conditions                                                     | TEXT        | YES      | Términos                                                                 |
| created_by                                                               | UUID        | YES      | FK auth.users                                                            |
| sent_by                                                                  | UUID        | YES      | FK auth.users                                                            |
| sent_at                                                                  | TIMESTAMPTZ | YES      | Fecha envío                                                              |
| created_at                                                               | TIMESTAMPTZ | YES      | Creación                                                                 |
| updated_at                                                               | TIMESTAMPTZ | YES      | Última actualización                                                     |

### 2.2 Tabla `quote_settings`

| Columna                   | Tipo    | Descripción                                     |
| ------------------------- | ------- | ----------------------------------------------- |
| id                        | UUID    | PK                                              |
| branch_id                 | UUID    | FK branches (opcional, por sucursal)            |
| treatment_prices          | JSONB   | Precios por tratamiento (anti_reflective, etc.) |
| lens_type_base_costs      | JSONB   | Costos base por tipo de lente                   |
| lens_material_multipliers | JSONB   | Multiplicadores por material                    |
| default_labor_cost        | DECIMAL | Mano de obra por defecto                        |
| default_tax_percentage    | DECIMAL | IVA (19% Chile)                                 |
| default_expiration_days   | INTEGER | Días de validez (30 default)                    |
| tax*inclusion*\*          | BOOLEAN | Si incluye IVA en lens, treatments, labor       |
| volume_discounts          | JSONB   | Descuentos por volumen                          |
| terms_and_conditions      | TEXT    | Términos por defecto                            |
| notes_template            | TEXT    | Plantilla de notas                              |

### 2.3 Índices

- `idx_quotes_customer_id`
- `idx_quotes_status`
- `idx_quotes_quote_number`
- `idx_quotes_created_at`
- `idx_quotes_branch_id`
- `idx_quotes_org` (organization_id)

### 2.4 Relaciones

```
organizations 1──* branches
branches 1──* quotes
customers 1──* quotes
prescriptions 1──* quotes
products ──* quotes (frame, near_frame)
quotes 1──1 lab_work_orders (converted_to_work_order_id)
```

---

## 3. Seguridad (RLS)

### 3.1 Políticas en `quotes`

Las políticas actuales permiten a admins activos (admin_users) SELECT, INSERT, UPDATE, DELETE. No hay filtro por organization_id en RLS; el filtrado se aplica en la capa API.

### 3.2 Filtrado en API

1. **organization_id**: Del admin (`admin_users.organization_id`).
2. **branch_id**: Si el header `x-branch-id` indica sucursal.
3. **Super admin en vista global**: Sin filtro branch.
4. **Listado por cliente (POS)**: Incluir quotes de toda la organización (cualquier sucursal) para customer_id, customer_rut o customer_email.

---

## 4. API Reference

### 4.1 GET /api/admin/quotes

Lista presupuestos con paginación y filtros.

**Query params:**

- `page`, `limit`: Paginación
- `status`: draft, sent, accepted, rejected, expired, converted_to_work, all
- `customer_id`: Filtrar por cliente
- `customer_rut`: Filtrar por RUT (normalizado)
- `customer_email`: Filtrar por email

**Headers:**

- `x-branch-id`: Sucursal seleccionada (opcional)
- `x-branch-id: global`: Vista global (super admin)

**Comportamiento:**

- Antes de devolver, ejecuta `check_and_expire_quotes` para marcar expirados.
- Incluye customer, prescription, frame_product en cada quote.

**Respuesta:** `createPaginatedResponse(data, { page, limit, total })`

### 4.2 POST /api/admin/quotes

Crear presupuesto. Body con `createQuoteSchema`.

**Validaciones:**

- Zod: createQuoteSchema
- branch_id obligatorio para admins no super
- Acceso a sucursal (admin_branch_access)
- generate_quote_number antes de insert

**Campos críticos:**

- customer_id (obligatorio)
- prescription_id (opcional pero recomendado para lentes graduados)
- branch_id (o se infiere de customer)
- organization_id (debe poblarse desde branch o admin)

### 4.3 GET /api/admin/quotes/[id]

Detalle de presupuesto con customer, prescription, frame_product.

### 4.4 PUT /api/admin/quotes/[id]

Actualizar presupuesto. Validación de acceso por organization.

### 4.5 PATCH /api/admin/quotes/[id]/status

Cambiar estado (draft, sent, accepted, rejected, expired).

### 4.6 POST /api/admin/quotes/[id]/send

Enviar presupuesto por email al cliente.

### 4.7 POST /api/admin/quotes/[id]/load-to-pos

Cargar presupuesto al carrito del POS. Retorna items, totals, customer, prescription.

**Validación:** No permitir si status = accepted o converted_to_work.

### 4.8 POST /api/admin/quotes/[id]/convert

Convertir a orden de trabajo (lab_work_order). Genera work_order_number, crea lab_work_order, actualiza quote.

---

## 5. Flujos de Negocio

### 5.1 Creación de Presupuesto

1. Admin navega a Presupuestos → Nuevo Presupuesto
2. Busca y selecciona cliente
3. Selecciona receta (o crea una)
4. Selecciona marco (o marco del cliente)
5. Configura lentes: familia, tipo, material, tratamientos
6. Si presbicia: selecciona solución (two_separate, bifocal, etc.)
7. Sistema calcula precios (matrices, tratamientos, labor, IVA)
8. Aplica descuentos si corresponde
9. Guarda como draft o envía

### 5.2 Búsqueda de Cliente en Presupuesto

- Debounce 300ms
- `/api/admin/customers/search?q=...`
- Muestra nombre, email, teléfono, RUT

### 5.3 Ciclo Receta → Presupuesto → Orden

1. Cliente tiene receta(s) en `prescriptions`
2. Se crea presupuesto vinculado a customer_id y prescription_id
3. Si acepta, presupuesto se convierte en orden de trabajo o venta POS
4. Orden de trabajo se vincula por quote_id

### 5.4 Carga al POS

1. Usuario selecciona presupuesto en POS
2. POST /api/admin/quotes/[id]/load-to-pos
3. Carrito se llena con items (marco, lente(s), tratamientos, labor). Para presbicia two_separate: marco lejos, marco cerca, lente lejos, lente cerca.
4. Usuario puede ajustar antes de procesar venta
5. process-sale crea order y opcionalmente lab_work_order

---

## 6. Componentes Frontend

| Ruta                                   | Descripción                                         |
| -------------------------------------- | --------------------------------------------------- |
| src/app/admin/quotes/page.tsx          | Lista de presupuestos con filtros                   |
| src/app/admin/quotes/[id]/page.tsx     | Detalle, imprimir, enviar, cargar al POS, convertir |
| src/app/admin/quotes/settings/page.tsx | Configuración (labor, IVA, expiración)              |
| src/components/admin/CreateQuoteForm/  | Formulario de creación                              |
| src/hooks/useLensPriceCalculation.ts   | Cálculo de precios de lentes                        |
| src/lib/utils/tax.ts                   | Utilidades de IVA                                   |

---

## 7. Mejores Prácticas

### 7.1 Código

- Usar `quoteService` del frontend; no llamar API directamente.
- Validar con Zod en API; no confiar en datos del cliente.
- Poblar organization_id al crear quote.

### 7.2 Base de Datos

- Mantener índices en columnas de filtrado frecuente.
- RLS habilitado en quotes y quote_settings.
- Trigger `update_updated_at` en quotes.

### 7.3 UX

- Búsqueda con debounce para no saturar API.
- Mostrar estado y fecha de expiración en lista.
- Permitir crear presupuesto desde perfil de cliente.

---

## 8. Limitaciones Conocidas y Mejoras Futuras

### Limitaciones Actuales (resueltas en 2026-02)

- ~~organization_id en POST~~: Resuelto. Se inserta desde branch o admin.
- ~~quoteService accept/reject~~: Resuelto. Redirigen a updateQuote.
- ~~Convert no copia presbyopia/contact_lens~~: Resuelto. Copia presbyopia, contact_lens, organization_id.
- ~~Prescription-customer consistency~~: Resuelto. Validación en API POST y PUT.
- ~~Load-to-POS two_separate~~: Resuelto. Envía near_frame y near_lens como items.

### Mejoras Futuras

1. Historial de cambios (audit log) en actualizaciones de presupuesto.
2. Refactorizar CreateQuoteForm (muy grande) en subcomponentes más pequeños.
3. **lab_work_orders**: La tabla no tiene columnas near*frame*\*. Para two_separate completo en work orders, migración pendiente.

---

## 9. Archivos Clave

| Ruta                                                                 | Descripción            |
| -------------------------------------------------------------------- | ---------------------- |
| src/app/admin/quotes/page.tsx                                        | Lista de presupuestos  |
| src/app/admin/quotes/[id]/page.tsx                                   | Detalle de presupuesto |
| src/app/admin/quotes/settings/page.tsx                               | Configuración          |
| src/app/api/admin/quotes/route.ts                                    | GET lista, POST crear  |
| src/app/api/admin/quotes/[id]/route.ts                               | GET, PUT, DELETE       |
| src/app/api/admin/quotes/[id]/status/route.ts                        | PATCH status           |
| src/app/api/admin/quotes/[id]/send/route.ts                          | Enviar email           |
| src/app/api/admin/quotes/[id]/load-to-pos/route.ts                   | Cargar al POS          |
| src/app/api/admin/quotes/[id]/convert/route.ts                       | Convertir a trabajo    |
| src/lib/api/services/quoteService.ts                                 | Servicio frontend      |
| src/lib/api/validation/zod-schemas.ts                                | createQuoteSchema      |
| src/components/admin/CreateQuoteForm/                                | Formulario             |
| supabase/migrations/20250125000000_create_lab_work_orders_system.sql | Migración base         |
| supabase/migrations/20250128000000_create_quote_settings.sql         | Configuración          |

---

## 10. Changelog de Documentación

- **2026-02-18**: Creación inicial del documento QUOTES_SYSTEM.md como base de la documentación del sistema de presupuestos.
- **2026-02-18**: Mejoras implementadas: POST/PUT presbicia, convert completo, load-to-pos two_separate, validación prescription-customer, quoteService alineado.
