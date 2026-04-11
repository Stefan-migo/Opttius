---
name: agreements-optical-supabase
description: Expert guide for building and maintaining a high-quality agreement management (gestión de convenios) system for optical shops with Supabase. Use when working on convenios, acuerdos empresariales, instituciones, sindicatos, descuento por planilla, órdenes de compra OC, cobranza institucional, facturación especial, copago, saldo institucional, analítica por convenio, or optical B2B agreement workflows. Covers multi-tenant architecture, RLS, billing rules engine, purchase order linking, DTE references, and optical-specific institutional sales patterns.
---

# Gestión de Convenios para Ópticas con Supabase

Guía para desarrollar y mantener un módulo de gestión de convenios de alta gama para ópticas usando Supabase y Next.js. Permite competir con grandes cadenas mediante alianzas locales personalizadas, automatizando la burocracia que estas alianzas suelen generar.

## Cuándo Usar Este Skill

- Configuración de convenios con empresas e instituciones
- Perfil institucional (RUT, representante, vigencia)
- Motor de reglas de facturación especial (copago + saldo institucional)
- Descuento por planilla (exportación para RR.HH.)
- Órdenes de compra (OC) y vinculación con DTE
- Módulo de cobranza pendiente institucional
- Analítica y rentabilidad por convenio
- Integración POS con ventas bajo convenio

## Arquitectura Core

### Flujo de Datos

```
Convenio (agreement) → Venta POS (order) → Segmentación: copago (POS) + saldo institucional
                                              ↓
                                    order_payments (copago en caja)
                                    agreement_institutional_balances (saldo pendiente)
                                              ↓
                                    OC vinculada → DTE con referencia
                                              ↓
                                    Export planilla → RR.HH. empresa
                                              ↓
                                    Cobranza masiva cuando paga institución
```

### Tablas Principales (Propuestas)

| Tabla                              | Propósito                                                            |
| ---------------------------------- | -------------------------------------------------------------------- |
| `agreements`                       | Convenios con instituciones (empresa, sindicato)                     |
| `agreement_billing_rules`          | Reglas de facturación por convenio (copago %, descuentos)            |
| `agreement_purchase_orders`        | Órdenes de compra emitidas por la institución                        |
| `agreement_institutional_balances` | Saldos pendientes por institución (cobranza)                         |
| `agreement_customers`              | Trazabilidad cliente-convenio (sincronizada por trigger en orders)   |
| `orders` (extendido)               | agreement_id, purchase_order_id, copago_amount, institutional_amount |

### Reglas Críticas

1. **Perfil institucional**: Nombre, RUT institucional, representante, vigencia (valid_from, valid_until).
2. **Segmentación de cobro**: Total = copago (trabajador en POS) + saldo institucional (paga empresa).
3. **OC obligatoria**: Cada venta bajo convenio debe vincularse a un número de OC emitido por la empresa.
4. **DTE con referencia**: Factura/boleta debe incluir referencia a OC para trazabilidad SII.
5. **Cobranza pendiente**: Panel que agrupa ventas institucionales no pagadas; conciliación masiva al recibir pago.

## Óptica-Específico

### Tipos de Convenio

| Tipo      | Descripción                            | Ejemplo                    |
| --------- | -------------------------------------- | -------------------------- |
| empresa   | Convenio con empresa (RR.HH.)          | Minera, retail, servicios  |
| sindicato | Convenio con sindicato de trabajadores | Sindicato Minera Escondida |
| mutual    | Convenio con mutualidad                | Mutual de seguridad        |

### Cuotas por Producto (Referencia Chile)

| Producto           | Cuotas típicas |
| ------------------ | -------------- |
| Cristales          | 1-3            |
| Armazones          | 1-5            |
| Anteojo completo   | 1-5            |
| Lentes de contacto | 1-8            |
| Anteojos de sol    | 1-5            |

### Motor de Reglas

- **Porcentaje copago**: Ej. 20% trabajador, 80% institución.
- **Descuento convenio**: % sobre precio lista (ej. 20% descuento).
- **Máximo cuotas**: Por tipo de producto.
- **Límite mensual**: Máximo a descontar por planilla por trabajador.

## Multi-Tenant y RLS

### Filtrado Obligatorio

1. **organization_id**: Siempre filtrar por organización del admin.
2. **branch_id**: Si usuario tiene sucursal, filtrar por branch_id (convenios pueden ser org-wide o por sucursal).
3. **Super admin**: Puede ver todos los convenios de la organización.

### Políticas RLS

- Admin: SELECT/INSERT/UPDATE en agreements de su organización.
- Solo super_admin o admin con permiso: DELETE (soft-delete preferido).

## Integración con Otros Módulos

### POS (process-sale)

- Si `agreement_id` presente: aplicar reglas de copago.
- Registrar `copago_amount` y `institutional_amount` en order.
- Crear/actualizar `agreement_institutional_balances`.
- Trigger sincroniza `agreement_customers` al insertar order con agreement_id y customer_id.
- **Sugerencia de convenio**: Al seleccionar cliente con `is_convenio_client`, pre-seleccionar el último convenio usado (agreement_usage ordenado por last_order_at).
- Validar `purchase_order_id` (OC) obligatorio.

### CRM (customers)

- **Tabla `agreement_customers`**: Trazabilidad cliente-convenio. Sincronizada por trigger al crear órdenes con agreement_id y customer_id. Campos: order_count, last_order_at, total_copago, total_institutional.
- **Filtro**: `GET /api/admin/customers?agreement_id=...` devuelve solo clientes del convenio.
- **Badge "Cliente convenio"**: En listado y detalle cuando `is_convenio_client` (existe en agreement_customers).
- **Detalle cliente**: Campo `agreement_usage` con convenios usados, última compra, órdenes, totales.
- **Endpoint**: `GET /api/admin/agreements/[id]/customers` lista clientes del convenio (paginado).

### Facturación (BillingAdapter)

- Incluir referencia OC en DTE (ReferenciaDoc: TipoDoc 801, Folio OC).
- Emitir factura a institución para saldo institucional (no boleta al trabajador por ese monto).

### Work Orders

- Work order hereda agreement_id de order.
- Entrega: validar que copago esté pagado (saldo institucional puede estar pendiente).

## API Endpoints (Propuestos)

| Método | Ruta                                              | Descripción                                           |
| ------ | ------------------------------------------------- | ----------------------------------------------------- |
| GET    | /api/admin/agreements                             | Lista convenios (filtros: status, branch)             |
| POST   | /api/admin/agreements                             | Crear convenio                                        |
| GET    | /api/admin/agreements/[id]                        | Detalle con reglas, OC, balances                      |
| PUT    | /api/admin/agreements/[id]                        | Actualizar                                            |
| GET    | /api/admin/agreements/[id]/institutional-balances | Cobranza pendiente                                    |
| POST   | /api/admin/agreements/[id]/reconcile              | Conciliación masiva (marcar pagado)                   |
| GET    | /api/admin/agreements/[id]/export-planilla        | Export CSV/Excel para RR.HH.                          |
| GET    | /api/admin/agreements/[id]/analytics              | Rentabilidad, volumen, descuentos, unique_customers   |
| GET    | /api/admin/agreements/[id]/customers              | Clientes que han comprado bajo el convenio (paginado) |
| GET    | /api/admin/agreements/purchase-orders             | Lista OC (filtros)                                    |
| POST   | /api/admin/agreements/purchase-orders             | Registrar OC                                          |

## Validación Zod

- **createAgreementSchema**: name, institution_rut, representative_name, valid_from, valid_until, agreement_type, billing_rules (JSONB).
- **createPurchaseOrderSchema**: agreement_id, oc_number, issued_at, valid_until, max_amount (opcional).
- **reconcileSchema**: balance_ids[], paid_at, payment_reference.

## Checklist de Calidad

- [ ] organization_id y branch_id en todas las queries
- [ ] Validación Zod en POST/PUT
- [ ] RUT institucional validado (normalizeRUT)
- [ ] Vigencia del convenio verificada antes de aplicar en POS
- [ ] OC válida y no utilizada en exceso
- [ ] DTE con ReferenciaDoc para OC
- [ ] Export planilla con formato compatible (CSV, columnas estándar)
- [ ] Analítica: volumen vs descuentos, ROI por convenio
- [ ] Respuestas API estandarizadas (createPaginatedResponse, createApiSuccessResponse)
- [ ] Rate limiting en endpoints sensibles

## Referencias

- Documentación detallada: `docs/AGREEMENTS_SYSTEM.md`
- POS: `.cursor/skills/pos-optical-supabase/SKILL.md`
- Payment: `.cursor/skills/payment-workflow-optical-supabase/SKILL.md`
- CRM: `.cursor/skills/crm-optical-supabase/SKILL.md`
- Work Orders: `.cursor/skills/work-orders-optical-supabase/SKILL.md`
