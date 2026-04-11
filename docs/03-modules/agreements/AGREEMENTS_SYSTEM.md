# Sistema de Gestión de Convenios (Opttius)

Documentación detallada del módulo de Gestión de Convenios para ópticas. Permite que la óptica independiente compita con las grandes cadenas mediante alianzas locales personalizadas, automatizando la burocracia que estas alianzas suelen generar.

> **Sincronización NotebookLM**: Ejecutar `npm run notebooklm:sync` (tras `nlm login`) para añadir esta documentación al cuaderno Extendido. Ver `docs/NOTEBOOKLM_CUADERNOS_GUIA.md`.

---

## 1. Introducción

### 1.1 Alcance

El módulo de Gestión de Convenios permite:

- **Registrar convenios** con empresas e instituciones (sindicatos, mutualidades).
- **Configurar reglas de facturación especial**: copago del trabajador vs saldo institucional.
- **Automatizar descuentos por planilla**: exportar archivos para que RR.HH. procese el descuento del sueldo.
- **Gestionar órdenes de compra (OC)**: vincular cada venta a un número de OC emitido por la empresa.
- **Cobranza pendiente**: panel de ventas institucionales no pagadas; conciliación masiva al recibir pago.
- **Analítica institucional**: rentabilidad por convenio, volumen vs descuentos, decisión de renovación.

### 1.2 Principios de Diseño

1. **Multi-tenant**: Aislamiento por organización y sucursal.
2. **Óptica-first**: Flujos específicos para convenios empresariales (Chile).
3. **Integración SII**: DTE con referencias a OC (TipoDoc 801).
4. **Código limpio**: Validación Zod, RLS, respuestas API estandarizadas.
5. **Escalable**: Motor de reglas extensible, analítica preparada para reporting.

### 1.3 Referencia de Mercado (Chile)

- **Optigral**: Convenio gratuito, cuotas sin interés (1-8 según producto), descuento por planilla.
- **Schilling**: Descuentos preferentes, hasta 12 cuotas, visitas en empresa.
- **Global Protesis**: 20% descuento valor lista.
- **Proceso típico**: Trabajador solicita OC a RR.HH. → Agendar en óptica → Compra → Descuento por planilla.

---

## 2. Arquitectura de Datos

### 2.1 Tabla `agreements`

| Columna                     | Tipo         | Nullable | Descripción                                            |
| --------------------------- | ------------ | -------- | ------------------------------------------------------ |
| id                          | UUID         | NO       | PK, gen_random_uuid()                                  |
| organization_id             | UUID         | NO       | FK organizations                                       |
| branch_id                   | UUID         | YES      | FK branches (opcional: convenio org-wide)              |
| name                        | TEXT         | NO       | Nombre del convenio (ej. "Minera X - Sucursal Centro") |
| agreement_type              | TEXT         | NO       | empresa, sindicato, mutual                             |
| institution_name            | TEXT         | NO       | Razón social (ej. "Minera Escondida Ltda.")            |
| institution_rut             | TEXT         | NO       | RUT institucional (normalizado)                        |
| representative_name         | TEXT         | YES      | Nombre del contacto (RR.HH., sindicato)                |
| representative_email        | TEXT         | YES      | Email contacto                                         |
| representative_phone        | TEXT         | YES      | Teléfono contacto                                      |
| valid_from                  | DATE         | NO       | Inicio vigencia                                        |
| valid_until                 | DATE         | YES      | Fin vigencia (NULL = indefinido)                       |
| status                      | TEXT         | NO       | active, suspended, expired, cancelled                  |
| billing_rules               | JSONB        | YES      | Reglas de facturación (ver 2.2)                        |
| max_installments_by_product | JSONB        | YES      | Ej. {"cristales": 3, "armazones": 5, "completo": 5}    |
| discount_percent            | DECIMAL(5,2) | YES      | % descuento sobre lista (ej. 20)                       |
| notes                       | TEXT         | YES      | Notas internas                                         |
| created_at                  | TIMESTAMPTZ  | NO       | Creación                                               |
| updated_at                  | TIMESTAMPTZ  | NO       | Última actualización                                   |
| created_by                  | UUID         | YES      | FK auth.users                                          |
| updated_by                  | UUID         | YES      | FK auth.users                                          |

### 2.2 Estructura `billing_rules` (JSONB)

```json
{
  "copago_percent": 20,
  "institutional_percent": 80,
  "copago_per_product": {
    "cristales": 30,
    "armazones": 25,
    "completo": 20,
    "contact_lens": 15
  },
  "max_monthly_deduction_per_worker": 150000,
  "require_oc": true
}
```

- `copago_percent`: Porcentaje que paga el trabajador en el POS.
- `institutional_percent`: Porcentaje que paga la institución.
- `copago_per_product`: Override por tipo de producto.
- `max_monthly_deduction_per_worker`: Límite mensual descuento por planilla (CLP).
- `require_oc`: Si true, OC obligatoria para cada venta.

### 2.3 Tabla `agreement_purchase_orders`

| Columna      | Tipo          | Nullable | Descripción                           |
| ------------ | ------------- | -------- | ------------------------------------- |
| id           | UUID          | NO       | PK                                    |
| agreement_id | UUID          | NO       | FK agreements                         |
| oc_number    | TEXT          | NO       | Número de OC (ej. "OC-2025-001234")   |
| issued_at    | DATE          | YES      | Fecha emisión                         |
| valid_until  | DATE          | YES      | Vigencia                              |
| max_amount   | DECIMAL(12,2) | YES      | Monto máximo autorizado (opcional)    |
| used_amount  | DECIMAL(12,2) | NO       | Monto ya utilizado (default 0)        |
| status       | TEXT          | NO       | active, exhausted, expired, cancelled |
| notes        | TEXT          | YES      | Notas                                 |
| created_at   | TIMESTAMPTZ   | NO       | Creación                              |
| updated_at   | TIMESTAMPTZ   | NO       | Actualización                         |

### 2.4 Tabla `agreement_institutional_balances`

| Columna           | Tipo          | Nullable | Descripción                               |
| ----------------- | ------------- | -------- | ----------------------------------------- |
| id                | UUID          | NO       | PK                                        |
| agreement_id      | UUID          | NO       | FK agreements                             |
| order_id          | UUID          | NO       | FK orders                                 |
| purchase_order_id | UUID          | YES      | FK agreement_purchase_orders              |
| amount            | DECIMAL(12,2) | NO       | Saldo institucional pendiente             |
| status            | TEXT          | NO       | pending, paid, cancelled                  |
| paid_at           | TIMESTAMPTZ   | YES      | Fecha de pago                             |
| payment_reference | TEXT          | YES      | Referencia del pago (transferencia, etc.) |
| created_at        | TIMESTAMPTZ   | NO       | Creación                                  |
| updated_at        | TIMESTAMPTZ   | NO       | Actualización                             |

### 2.5 Tabla `agreement_customers`

Trazabilidad cliente-convenio: clientes que han comprado bajo cada convenio. Sincronizada automáticamente por trigger al insertar órdenes con `agreement_id` y `customer_id`.

| Columna             | Tipo          | Nullable | Descripción                  |
| ------------------- | ------------- | -------- | ---------------------------- |
| id                  | UUID          | NO       | PK                           |
| agreement_id        | UUID          | NO       | FK agreements                |
| customer_id         | UUID          | NO       | FK customers                 |
| first_order_at      | TIMESTAMPTZ   | NO       | Primera compra bajo convenio |
| last_order_at       | TIMESTAMPTZ   | NO       | Última compra bajo convenio  |
| order_count         | INT           | NO       | Cantidad de órdenes          |
| total_copago        | DECIMAL(12,2) | NO       | Suma copagos del cliente     |
| total_institutional | DECIMAL(12,2) | NO       | Suma montos institucionales  |
| created_at          | TIMESTAMPTZ   | NO       | Creación                     |
| updated_at          | TIMESTAMPTZ   | NO       | Actualización                |

- UNIQUE(agreement_id, customer_id)
- Trigger `sync_agreement_customers_on_order` en INSERT de `orders`
- RLS heredado de agreements (acceso por organization_id vía agreement)

### 2.6 Extensión de `orders`

| Columna              | Tipo          | Nullable | Descripción                  |
| -------------------- | ------------- | -------- | ---------------------------- |
| agreement_id         | UUID          | YES      | FK agreements                |
| purchase_order_id    | UUID          | YES      | FK agreement_purchase_orders |
| copago_amount        | DECIMAL(12,2) | YES      | Monto pagado por trabajador  |
| institutional_amount | DECIMAL(12,2) | YES      | Monto a cargo de institución |

### 2.7 Índices Relevantes

- `idx_agreements_organization_id`
- `idx_agreements_branch_id`
- `idx_agreements_status`
- `idx_agreements_institution_rut`
- `idx_agreements_valid_until`
- `idx_agreement_purchase_orders_agreement_id`
- `idx_agreement_purchase_orders_oc_number` (UNIQUE por agreement)
- `idx_agreement_institutional_balances_agreement_id`
- `idx_agreement_institutional_balances_status`
- `idx_orders_agreement_id`
- `idx_agreement_customers_agreement_id`
- `idx_agreement_customers_customer_id`
- `idx_agreement_customers_last_order`

---

## 3. Flujos de Negocio

### 3.1 Configuración del Perfil Institucional

1. Admin crea convenio: nombre, tipo, RUT institucional, representante, vigencia.
2. Configura reglas de facturación: copago %, descuento %, máximos por producto.
3. Registra OC disponibles (o la empresa las envía por lotes).
4. Convenio activo → visible en POS al seleccionar "Venta bajo convenio".

### 3.2 Flujo de Venta con Convenio (POS)

1. Usuario selecciona convenio y OC (obligatorio).
2. Agrega items al carrito (productos, marcos, lentes).
3. Sistema aplica reglas: calcula `copago_amount` y `institutional_amount`.
4. Trabajador paga solo `copago_amount` en caja (efectivo, tarjeta, etc.).
5. Se crea `order` con `agreement_id`, `purchase_order_id`, `copago_amount`, `institutional_amount`.
6. Se crea `agreement_institutional_balances` con `amount = institutional_amount`, `status = pending`.
7. Se actualiza `agreement_purchase_orders.used_amount` += `institutional_amount`.
8. DTE (boleta/factura) incluye referencia a OC (ReferenciaDoc).

### 3.3 Exportación para Descuento por Planilla

1. Admin selecciona convenio y período (ej. mes actual).
2. Sistema genera archivo (CSV/Excel) con:
   - RUT trabajador
   - Nombre
   - Monto a descontar
   - Número de orden
   - Fecha de compra
3. RR.HH. procesa el archivo en su sistema de nómina.
4. Formato: compatible con Libro de Remuneraciones Electrónico (LRE) o plantillas bancarias (ej. Banco Chile).

### 3.4 Cobranza Pendiente y Conciliación

1. Panel lista todas las ventas con `agreement_institutional_balances.status = pending`.
2. Filtros: convenio, fecha, monto.
3. Cuando la institución paga (transferencia, cheque): admin marca como pagado.
4. Conciliación masiva: seleccionar múltiples balances, indicar pago, referencia.
5. Actualización: `status = paid`, `paid_at`, `payment_reference`.

### 3.5 Analítica Institucional

- **Volumen de pacientes**: Cantidad de trabajadores que compraron bajo convenio.
- **Descuentos otorgados**: Suma de descuentos aplicados.
- **Monto institucional cobrado vs pendiente**: Eficiencia de cobranza.
- **Rentabilidad por convenio**: Ingresos vs costos (descuentos, gestión).
- **Comparativa**: Volumen vs descuentos → decisión de renovar o ajustar.

---

## 4. Integración con Módulos Existentes

### 4.1 POS (process-sale)

- Nuevo parámetro opcional: `agreementId`, `purchaseOrderId`.
- Si `agreementId` presente: validar convenio activo, OC válida.
- Calcular `copago_amount` y `institutional_amount` según `billing_rules`.
- Crear `order_payments` solo por `copago_amount` (lo que paga el trabajador).
- Crear `agreement_institutional_balances`.
- BillingAdapter: incluir ReferenciaDoc con OC en DTE.

### 4.2 CRM (customers)

- **Tabla `agreement_customers`**: Trazabilidad cliente-convenio. Sincronizada automáticamente por trigger al crear órdenes con `agreement_id` y `customer_id`.
- **Filtro por convenio**: `GET /api/admin/customers?agreement_id=...` devuelve solo clientes que han comprado bajo ese convenio.
- **Badge "Cliente convenio"**: En listado de clientes y detalle, cuando `is_convenio_client` (existe en `agreement_customers`).
- **Detalle de cliente**: Campo `agreement_usage` con convenios usados, última compra, órdenes, total copago/institucional.
- **Endpoint**: `GET /api/admin/agreements/[id]/customers` lista clientes del convenio con paginación.

### 4.3 BillingAdapter (SII)

- Documento Referencia: TipoDoc 801 (Orden de compra), Folio = OC number.
- Factura a institución: cuando se emite factura por saldo institucional (flujo separado o agrupado).

### 4.4 Work Orders

- `lab_work_orders` hereda `agreement_id` de `orders` si existe.
- Entrega: validar que `copago_amount` esté pagado (saldo institucional puede estar pendiente).

---

## 5. API Endpoints

### 5.1 Convenios

| Método | Ruta                              | Descripción                                        |
| ------ | --------------------------------- | -------------------------------------------------- |
| GET    | /api/admin/agreements             | Lista convenios (filtros: status, branch_id, type) |
| POST   | /api/admin/agreements             | Crear convenio                                     |
| GET    | /api/admin/agreements/[id]        | Detalle con reglas, OC, balances                   |
| PUT    | /api/admin/agreements/[id]        | Actualizar                                         |
| PATCH  | /api/admin/agreements/[id]/status | Cambiar status (active, suspended, etc.)           |

### 5.2 Órdenes de Compra

| Método | Ruta                                       | Descripción           |
| ------ | ------------------------------------------ | --------------------- |
| GET    | /api/admin/agreements/[id]/purchase-orders | Lista OC del convenio |
| POST   | /api/admin/agreements/[id]/purchase-orders | Registrar OC          |
| PUT    | /api/admin/agreements/purchase-orders/[id] | Actualizar OC         |

### 5.3 Cobranza

| Método | Ruta                                         | Descripción                                           |
| ------ | -------------------------------------------- | ----------------------------------------------------- |
| GET    | /api/admin/agreements/institutional-balances | Cobranza pendiente (todos o por convenio)             |
| POST   | /api/admin/agreements/reconcile              | Conciliación masiva (balance_ids, paid_at, reference) |

### 5.4 Clientes por convenio

| Método | Ruta                                 | Descripción                                                                               |
| ------ | ------------------------------------ | ----------------------------------------------------------------------------------------- |
| GET    | /api/admin/agreements/[id]/customers | Lista clientes que han comprado bajo el convenio (paginado, orden por last_order_at desc) |

### 5.5 Export y Analítica

| Método | Ruta                                       | Descripción                                                                        |
| ------ | ------------------------------------------ | ---------------------------------------------------------------------------------- |
| GET    | /api/admin/agreements/[id]/export-planilla | Export CSV/Excel para RR.HH.                                                       |
| GET    | /api/admin/agreements/[id]/analytics       | Rentabilidad, volumen, descuentos, `unique_customers` (clientes únicos en período) |

---

## 6. Validación Zod

### createAgreementSchema

- `name`: string, min 2
- `agreement_type`: enum empresa | sindicato | mutual
- `institution_name`: string, min 2
- `institution_rut`: string, valid RUT (normalizeRUT)
- `representative_name`: string, opcional
- `valid_from`: date
- `valid_until`: date, opcional

### createPurchaseOrderSchema

- `agreement_id`: UUID
- `oc_number`: string, min 1
- `issued_at`: date, opcional
- `valid_until`: date, opcional
- `max_amount`: number, opcional, positive

### reconcileSchema

- `balance_ids`: array of UUIDs
- `paid_at`: timestamp
- `payment_reference`: string, opcional

---

## 7. RLS y Permisos

### agreements

- SELECT: admin con acceso a branch (o org-wide)
- INSERT: admin
- UPDATE: admin
- DELETE: super_admin o admin con permiso (preferir soft-delete)

### agreement_purchase_orders

- Igual que agreements, filtrado por agreement_id

### agreement_institutional_balances

- SELECT: admin
- UPDATE (status): admin (solo para reconcile)

---

## 8. Mejoras Futuras Descubiertas

### 8.1 Corto Plazo

1. **Integración con sistemas de RR.HH.**: API o webhook para enviar descuentos directamente a sistemas de nómina (si la empresa lo permite).
2. **Validación de afiliación**: Mantener lista de RUTs empleados por convenio; validar en POS que el cliente esté afiliado.
3. **Límite de cuotas por planilla**: Validar que la suma de descuentos por trabajador no exceda max_monthly_deduction.
4. **Notificaciones**: Notificar a institución cuando hay saldo pendiente por cobrar; recordatorio de renovación de convenio.

### 8.2 Mediano Plazo

5. **Dashboard de convenios**: Vista consolidada por organización: convenios activos, cobranza pendiente total, tendencias.
6. **Renovación automática**: Alertas cuando valid_until está próximo; flujo de renovación con ajuste de reglas.
7. **Facturación agrupada**: Factura mensual a institución con todas las ventas del período (en lugar de factura por venta).
8. **Formato de exportación configurable**: Plantillas por empresa (cada una puede tener formato distinto).
9. **Historial de cambios**: Audit trail de modificaciones en reglas y convenios.

### 8.3 Largo Plazo

10. **Portal de empleados**: Que el trabajador pueda ver sus compras bajo convenio y estado de descuento.
11. **Integración con mutualidades**: Si el convenio es con mutual, flujo específico de autorización.
12. **Multi-moneda**: Si se expande a otros países.
13. **Machine learning**: Predicción de rentabilidad por convenio; sugerencia de ajuste de descuentos.

---

## 9. Referencias Externas

- [Optigral - Convenio](https://optigral.cl/convenio.html): Cuotas por producto, descuento planilla.
- [Schilling - Convenios](https://www.schilling.cl/convenios): Descuentos, visitas en empresa.
- [SII - Referencias DTE](https://www.sii.cl): ReferenciaDoc, Orden de compra.
- [LRE - Libro Remuneraciones](https://www.dt.gob.cl): Formato declaración nómina.
- [Banco Chile - Pago Fácil](https://sitiospublicos.bancochile.cl): Plantillas Excel nómina.

---

## 10. Checklist de Implementación

- [ ] Migración: crear tablas agreements, agreement_purchase_orders, agreement_institutional_balances
- [ ] Migración: extender orders con agreement_id, purchase_order_id, copago_amount, institutional_amount
- [ ] RLS para todas las tablas
- [ ] API CRUD convenios
- [ ] API CRUD órdenes de compra
- [ ] Integración POS: parámetros agreement, OC, cálculo copago/institucional
- [ ] BillingAdapter: ReferenciaDoc en DTE
- [ ] API cobranza pendiente y conciliación
- [ ] Export planilla (CSV/Excel)
- [ ] API analítica
- [ ] UI: listado convenios, formulario, panel cobranza
- [ ] Validación Zod en todos los endpoints
- [ ] Rate limiting
- [ ] Documentación en skill
