---
name: quotes-optical-supabase
description: Expert guide for building and maintaining a high-quality quotes (presupuestos) system for optical shops with Supabase. Use when working on quotes, cotizaciones, presupuestos, quote-to-POS, quote-to-work-order, lens pricing matrices, presbyopia solutions, or optical quote workflows. Covers multi-tenant architecture, RLS, prescription integration, and optical-specific data models.
---

# Sistema de Presupuestos para Ópticas con Supabase

Guía para desarrollar y mantener un sistema de presupuestos (quotes) de alta gama para ópticas usando Supabase y Next.js.

## Cuándo Usar Este Skill

- Creación y gestión de presupuestos (quotes, cotizaciones)
- Formulario de presupuesto (CreateQuoteForm)
- Conversión presupuesto → orden de trabajo
- Carga de presupuesto al POS
- Matrices de precios de lentes
- Soluciones de presbicia (dos lentes, bifocales, progresivos)
- Lentes de contacto en presupuestos
- Configuración de presupuestos (quote_settings)
- Expiración automática de presupuestos
- Envío de presupuestos por email

## Arquitectura Core

### Ciclo de Vida del Presupuesto

```
draft → sent → accepted → converted_to_work
         ↘ rejected
         ↘ expired (automático)
```

| Estado            | Descripción           | Acciones permitidas                      |
| ----------------- | --------------------- | ---------------------------------------- |
| draft             | Borrador, editable    | Editar, enviar, cargar al POS, convertir |
| sent              | Enviado al cliente    | Cargar al POS, convertir, reenviar       |
| accepted          | Aceptado por cliente  | Convertir a orden de trabajo             |
| rejected          | Rechazado             | Solo visualización                       |
| expired           | Expirado (automático) | Solo visualización                       |
| converted_to_work | Convertido a trabajo  | Solo visualización                       |

### Tablas Principales

| Tabla                   | Propósito                                                         |
| ----------------------- | ----------------------------------------------------------------- |
| `quotes`                | Presupuestos (encabezado + items ópticos)                         |
| `quote_settings`        | Configuración por sucursal (labor, IVA, expiración, tratamientos) |
| `lens_families`         | Familias de lentes para matrices de precio                        |
| `lens_matrices`         | Precios por esfera/cilindro/adición                               |
| `contact_lens_families` | Familias de lentes de contacto                                    |
| `contact_lens_matrices` | Precios de lentes de contacto                                     |

### Relaciones Críticas

```
customers 1──* quotes (customer_id)
prescriptions 1──* quotes (prescription_id) — la receta debe ser del mismo cliente
products ──* quotes (frame_product_id, near_frame_product_id)
quotes 1──1 lab_work_orders (converted_to_work_order_id)
branches 1──* quotes (branch_id)
organizations 1──* quotes (organization_id)
```

## Multi-Tenant y RLS

### Filtrado Obligatorio

1. **organization_id**: Siempre filtrar por organización del admin para aislamiento multi-tenant.
2. **branch_id**: Si el usuario tiene sucursal seleccionada, filtrar por branch_id.
3. **Excepción POS**: Al listar por customer_id/customer_rut/customer_email, incluir quotes de toda la organización (cualquier sucursal) para que el cliente vea todos sus presupuestos.

### Creación de Presupuesto

- **branch_id**: Obligatorio para admins no super. Prioridad: body > branchContext > customer.branch_id.
- **organization_id**: Debe poblarse desde branch.organization_id o admin_users.organization_id al crear.
- **Validar acceso**: Admin debe tener acceso a la sucursal (admin_branch_access).

## Reglas Óptica-Específicas

### 1. Vinculación Clínica

- **Prescripción obligatoria** para lentes graduados (ópticos). Sin receta válida no emitir presupuesto de lentes.
- **Consistencia customer-prescription**: Si prescription_id existe, debe pertenecer al mismo customer_id. Usar trigger o validación en API.
- **Lentes de contacto**: Pueden requerir receta (base curve, diameter) o ser de venta libre.

### 2. Soluciones de Presbicia

| Solución     | Campos usados                                          | Descripción                   |
| ------------ | ------------------------------------------------------ | ----------------------------- |
| none         | lens_family_id, lens_type                              | Un solo par de lentes         |
| two_separate | far*lens_family_id, near_lens_family_id, near_frame*\* | Lejos + cerca (dos armazones) |
| bifocal      | lens_family_id, lens_type: bifocal                     | Bifocales                     |
| trifocal     | lens_family_id, lens_type: trifocal                    | Trifocales                    |
| progressive  | lens_family_id, lens_type: progressive                 | Progresivos                   |

### 3. Marco del Cliente

- **customer_own_frame**: true → frame_price = 0, no reducir stock. Importante para work order.
- **Marco de inventario**: frame_product_id apunta a products; usar frame_price del quote o product.price.

### 4. Cálculo de Precios

- **Lentes ópticos**: Usar `lens_matrices` o `calculate_lens_price` RPC según esfera, cilindro, adición, lens_family_id.
- **Tratamientos**: Precios desde quote_settings.treatment_prices (JSONB).
- **Labor**: quote_settings.default_labor_cost o override manual.
- **IVA**: quote_settings.default_tax_percentage; respetar tax_inclusion flags (lens, treatments, labor).

### 5. Número de Presupuesto

- Formato: `COT-YYYY-NNNN` (ej: COT-2025-0001).
- Generado por RPC `generate_quote_number()`.
- Único por año.

## API Endpoints

| Método | Ruta                               | Descripción                                                           |
| ------ | ---------------------------------- | --------------------------------------------------------------------- |
| GET    | /api/admin/quotes                  | Lista con filtros (status, customer_id, customer_rut, customer_email) |
| POST   | /api/admin/quotes                  | Crear presupuesto (createQuoteSchema)                                 |
| GET    | /api/admin/quotes/[id]             | Detalle con customer, prescription, frame_product                     |
| PUT    | /api/admin/quotes/[id]             | Actualizar                                                            |
| DELETE | /api/admin/quotes/[id]             | Eliminar                                                              |
| PATCH  | /api/admin/quotes/[id]/status      | Cambiar estado                                                        |
| POST   | /api/admin/quotes/[id]/send        | Enviar por email                                                      |
| POST   | /api/admin/quotes/[id]/load-to-pos | Cargar al carrito POS                                                 |
| POST   | /api/admin/quotes/[id]/convert     | Convertir a lab_work_order                                            |

## Validación Zod (createQuoteSchema)

- **customer_id**: UUID obligatorio.
- **prescription_id**: Opcional (obligatorio para lentes graduados en lógica de negocio).
- **frame_product_id**, frame_name, frame_brand, etc.: Opcionales.
- **lens_family_id**, lens_type, lens_material, lens_index\*\*: Opcionales.
- **presbyopia_solution**: enum none | two_separate | bifocal | trifocal | progressive.
- **far_lens_family_id**, near_lens_family_id\*\*: Para two_separate.
- **contact*lens*\***: Para lentes de contacto.
- **subtotal, tax_amount, discount_amount, total_amount**: Números no negativos.
- **status**: draft | sent | accepted | rejected | expired (sin converted_to_work en creación).

## Conversión a Orden de Trabajo

1. Validar: quote no aceptado ni convertido.
2. Generar work_order_number (TRB-YYYY-NNNN).
3. Crear lab_work_order con datos del quote (frame, lens, prescription_snapshot, costs).
4. Actualizar quote: status = accepted, original_status = anterior, converted_to_work_order_id = newWorkOrder.id.
5. Notificar: notifyQuoteConverted, notifyNewWorkOrder.

## Carga al POS

1. Validar: quote no aceptado ni convertido.
2. Construir items[]:
   - Marco: type product o frame-customer-own (price 0).
   - Lente óptico: type lens_complete con prescription_id, lens_family_id, treatments, labor.
   - Lente contacto: type contact_lens con contact_lens_family_id, quantity.
3. Retornar: quoteId, customer, prescription, items, totals, notes.

## Expiración Automática

- RPC `check_and_expire_quotes` ejecutada al listar (GET quotes).
- Usa quote_settings.default_expiration_days por sucursal.
- Cambia status a 'expired' si expiration_date < CURRENT_DATE.

## Checklist de Calidad

- [ ] organization_id poblado al crear quote (desde branch o admin)
- [ ] Filtro organization_id en todas las queries
- [ ] Validación Zod en POST/PUT
- [ ] Prescription-customer consistency (trigger o API)
- [ ] branch_id obligatorio para admins no super
- [ ] generate_quote_number antes de insert
- [ ] check_and_expire_quotes al listar
- [ ] Respuestas API estandarizadas (createPaginatedResponse, createApiSuccessResponse)
- [ ] load-to-pos: no permitir si accepted/converted
- [ ] convert: copiar todos los campos ópticos (presbyopia, near frame, contact lens)

## Referencias

- Documentación detallada: `docs/QUOTES_SYSTEM.md`
- API quotes: `src/app/api/admin/quotes/`
- Servicio: `src/lib/api/services/quoteService.ts`
- Formulario: `src/components/admin/CreateQuoteForm/`
- CRM (clientes): `.cursor/skills/crm-optical-supabase/SKILL.md`
- POS (carga presupuesto): `.cursor/skills/pos-optical-supabase/SKILL.md`
