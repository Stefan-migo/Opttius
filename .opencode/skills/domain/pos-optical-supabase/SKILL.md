---
name: pos-optical-supabase
description: Expert guide for building and maintaining a high-quality Point of Sale (POS) system for optical shops with Supabase. Use when working on POS, sales terminal, checkout, cash register, CAJA, caja, sesiones de caja, cierres de caja, work orders from POS, quotes to POS, payment processing, receipts, or optical retail transactions. Covers multi-tenant architecture, RLS, SII/Chile tax integration, lens/frame workflows, and optical-specific data models.
---

# POS para Ópticas con Supabase

Guía para desarrollar y mantener un POS de alta gama para ópticas usando Supabase y Next.js.

## Cuándo Usar Este Skill

- Terminal de ventas (POS, checkout)
- Procesamiento de ventas y pagos
- Caja y sesiones de caja (cash register)
- Carga de presupuestos al POS
- Órdenes de trabajo desde ventas (lab_work_orders)
- Impresión de recibos
- Saldos pendientes y abonos
- Integración SII (boletas, facturas Chile)
- Flujos óptica-específicos: marcos, lentes, recetas, presbicia

## Arquitectura Core del POS

### Flujo de Datos

```
Cliente/Presupuesto → Carrito POS → process-sale API → orders + order_items
                                                    → order_payments
                                                    → lab_work_orders (si aplica)
                                                    → product_branch_stock (reducción)
                                                    → BillingAdapter (SII)
                                                    → pos_sessions (actualización caja)
```

### Tablas Principales

| Tabla                  | Propósito                                 |
| ---------------------- | ----------------------------------------- |
| `orders`               | Orden de venta (is_pos_sale=true)         |
| `order_items`          | Líneas de la venta                        |
| `order_payments`       | Pagos (cash, card, transfer)              |
| `pos_sessions`         | Sesiones de caja (abrir/cerrar)           |
| `pos_transactions`     | Log de transacciones (sale, refund, void) |
| `lab_work_orders`      | Órdenes de laboratorio (marco + lentes)   |
| `product_branch_stock` | Stock por sucursal (se reduce en venta)   |

### Reglas Críticas

1. **Caja abierta obligatoria**: No procesar ventas sin sesión de caja abierta (excepto super admin).
2. **Branch obligatorio**: Usuario debe tener sucursal seleccionada (x-branch-id).
3. **Validación Zod**: Siempre usar `processSaleSchema` en la API.
4. **Stock por sucursal**: Reducir stock en `product_branch_stock` para productos físicos.
5. **Work order condicional**: Solo crear lab_work_order si hay marco + lentes que requieren montaje.

## Óptica-Específico

### Tipos de Items en el Carrito

| Tipo                      | product_id      | Requiere Work Order  |
| ------------------------- | --------------- | -------------------- |
| Producto físico           | UUID real       | No (solo stock)      |
| Marco manual              | frame-manual-\* | Sí (con lentes)      |
| Lente completo            | lens-\*         | Sí                   |
| Tratamientos              | treatments-\*   | Sí                   |
| Mano de obra              | labor-\*        | Sí                   |
| Lentes de contacto        | contact-lens-\* | No (entrega directa) |
| Accesorios, lentes de sol | UUID real       | No                   |

### Lógica Cash-First (Depósito Mínimo)

- Si `paymentAmount < minDeposit`: work_order status = `on_hold_payment`, no visible en taller.
- Si `balance === 0`: status = `ordered`, payment = `paid`.
- Si pago parcial suficiente: status = `ordered`, payment = `partial`.

### Presbicia (Dos Lentes Separados)

- `presbyopia_solution: "two_separate"` → far_lens_family_id + near_lens_family_id.
- Costos: far_lens_cost + near_lens_cost.

### Marco del Cliente

- `customer_own_frame: true` → precio marco = 0, pero se registra para work order.
- Incluir frame_name, frame_brand, frame_model para trazabilidad.

## Integración con Otros Módulos

### CRM (customers)

- `customer_id` opcional: ventas sin cliente registrado permitidas para accesorios.
- Cliente obligatorio si hay work order (marco + lentes).
- Búsqueda por nombre, RUT, email, teléfono.

### Presupuestos (quotes)

- `load-to-pos` API: convierte presupuesto en items del carrito.
- Validar que quote no esté ya convertido (status !== converted_to_work).
- Vincular quote_id en work order al procesar.

### Recetas (prescriptions)

- `prescription_id` en lens_data para trazabilidad.
- Validar que receta pertenezca al cliente.
- Matriz de precios: `calculate_lens_price` RPC con sphere/cylinder.

### Inventario

- Solo reducir stock para productos con `product_type !== "service"`.
- Excluir IDs temporales: frame-manual, lens-, treatments-, labor-, discount-.
- Usar RPC `update_product_stock` con quantity_change negativo.

## API Routes

| Ruta                                         | Método | Propósito                                         |
| -------------------------------------------- | ------ | ------------------------------------------------- |
| `/api/admin/pos/process-sale`                | POST   | Procesar venta completa                           |
| `/api/admin/pos/pending-balance`             | GET    | Órdenes con saldo pendiente                       |
| `/api/admin/pos/pending-balance/pay`         | POST   | Registrar abono                                   |
| `/api/admin/pos/settings`                    | GET    | Configuración POS                                 |
| `/api/admin/quotes/[id]/load-to-pos`         | POST   | Cargar presupuesto al carrito                     |
| `/api/admin/cash-register/open`              | GET    | Estado caja (isOpen, session)                     |
| `/api/admin/cash-register/open`              | POST   | Abrir caja (opening_cash_amount)                  |
| `/api/admin/cash-register/close`             | GET    | Resumen del día para cierre                       |
| `/api/admin/cash-register/close`             | POST   | Crear cierre (actual*cash, card_machine*\*, etc.) |
| `/api/admin/cash-register/reopen`            | POST   | Reabrir caja (session_id, solo admin)             |
| `/api/admin/cash-register/closures`          | GET    | Lista cierres (paginación, filtros fecha)         |
| `/api/admin/cash-register/closures/[id]`     | GET    | Detalle de un cierre                              |
| `/api/admin/cash-register/session-movements` | GET    | Movimientos de sesión                             |

## Módulo CAJA (Cash Register)

La CAJA gestiona sesiones de efectivo y cierres diarios. **Obligatoria** para ventas POS.

### Tablas

- `pos_sessions`: Sesiones abiertas/cerradas por sucursal (opening_cash_amount, status: open|closed|suspended).
- `cash_register_closures`: Cierres diarios con conciliación (expected*cash, actual_cash, cash_difference, card_machine*\*, status: draft|confirmed|closed|reopened).

### Flujo

1. **Abrir**: POST open con monto inicial. Una sola sesión abierta por branch.
2. **Ventas**: order_payments.pos_session_id vincula pagos a sesión.
3. **Cerrar**: GET close (resumen) → POST close (actual_cash, datáfono). Cierra pos_session, crea closure.
4. **Reabrir**: POST reopen (session_id). Solo admin. Marca closure como reopened, incrementa reopen_count.

### Reglas

- Branch obligatorio para abrir/cerrar.
- Si closure status=closed hoy, no abrir nueva sesión: debe reabrir.
- expected_cash = opening_cash_amount + cash_sales (solo efectivo, no transferencias).
- Página: `/admin/cash-register` (abrir, cerrar, historial, reapertura).

## Mejores Prácticas

### Código

- **Rate limiting**: Usar `rateLimitConfigs.pos` en process-sale.
- **Branch context**: Siempre `getBranchContext(request, user.id)`.
- **Service role**: Usar para operaciones que cruzan RLS (orders, stock, work orders).
- **Logging**: `logger.info` en puntos clave (venta exitosa, work order creado).
- **No bloquear**: Notificaciones y billing en try/catch, no fallar la venta.

### UX

- Búsqueda de productos con debounce.
- Búsqueda de clientes con sugerencias.
- Carga de presupuesto desde URL (?quote=uuid).
- Diálogo de pago con método, monto, referencia fiscal.
- Impresión térmica (80mm) o A4 según configuración.

### Seguridad

- Validar `is_admin` antes de cualquier operación.
- Filtrar por branch_id en todas las queries.
- No exponer datos sensibles en logs (solo IDs, montos).

## Checklist de Calidad POS

- [ ] Caja abierta verificada antes de process-sale
- [ ] Branch_id en headers para usuarios no super admin
- [ ] CAJA: open/close/reopen con branch obligatorio
- [ ] CAJA: order_payments.pos_session_id en cada venta
- [ ] processSaleSchema validado en API
- [ ] Stock reducido para productos físicos (no servicios)
- [ ] Work order solo cuando hay marco + lentes
- [ ] Cliente obligatorio si hay work order
- [ ] order_payments registrado con pos_session_id
- [ ] BillingAdapter.emitDocument para SII (no bloquear)
- [ ] Respuestas API con createApiSuccessResponse
- [ ] Rate limiting en process-sale

## Referencias

- Documentación: `docs/POS_SYSTEM.md` (incluye sección CAJA completa)
- API process-sale: `src/app/api/admin/pos/process-sale/route.ts`
- Servicio: `src/lib/api/services/posService.ts`
- Página POS: `src/app/admin/pos/page.tsx`
- Página Caja: `src/app/admin/cash-register/page.tsx`
- Migración base: `supabase/migrations/20250121000000_create_pos_system.sql`
