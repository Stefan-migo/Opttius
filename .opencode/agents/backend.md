---
description: Especialista en backend y APIs. Business logic, endpoints, servicios, webhooks, y patrones de API para el sistema óptico.
mode: subagent
---

# Backend Agent

Especialista en backend, APIs y lógica de negocio para Opttius.

## Cuándo Usar

- Crear/modificar APIs
- Implementar business logic
- Webhooks (Mercado Pago, WhatsApp)
- Validación de datos
- Servicios y utilities

## Arquitectura de APIs

### Estructura

```
src/app/api/admin/[module]/route.ts  # GET, POST
src/app/api/admin/[module]/[id]/route.ts  # GET, PUT, DELETE
src/app/api/admin/[module]/[id]/[action]/route.ts  # Acciones específicas
```

### Response Helpers

```typescript
// Success
import { createApiSuccessResponse } from "@/lib/api/responses";
return createApiSuccessResponse(data);

// Error
import { createApiErrorResponse } from "@/lib/api/responses";
return createApiErrorResponse(400, "Error message");
```

### Validación con Zod

```typescript
import { z } from "zod";

const CreateCustomerSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  rut: z.string().regex(/^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/),
  branch_id: z.uuid(),
});

const data = CreateCustomerSchema.parse(body);
```

## Multi-Tenant

### Headers

- `x-branch-id` - Sucursal actual
- "global" para super admin

### Validación de Acceso

```typescript
// Verificar acceso a branch
import { validateBranchAccess } from "@/lib/admin/projects";
const data = await validateBranchAccess(user.id, branchId);
if (!data) return createApiErrorResponse(403, "Access denied");
```

### Organization ID

```typescript
import { getUserOrganizationId } from "@/lib/admin/auth";
const organizationId = await getUserOrganizationId(user.id);
```

## Módulos y APIs

| Módulo       | Endpoint                  | Descripción            |
| ------------ | ------------------------- | ---------------------- |
| Customers    | `/api/admin/customers`    | CRUD clientes          |
| Appointments | `/api/admin/appointments` | Citas y calendario     |
| Quotes       | `/api/admin/quotes`       | Presupuestos           |
| Orders       | `/api/admin/orders`       | Pedidos                |
| Work Orders  | `/api/admin/work-orders`  | Órdenes de laboratorio |
| Products     | `/api/admin/products`     | Catálogo               |
| Payments     | `/api/admin/payments`     | Pagos                  |

## Webhooks

### Mercado Pago

```
POST /api/webhooks/mercadopago
```

### WhatsApp

```
POST /api/webhooks/whatsapp
```

### NOWPayments (Crypto)

```
POST /api/webhooks/nowpayments
```

## Skills a Usar

```
skill({ name: "crm-optical-supabase" })           # Customers
skill({ name: "appointments-optical-supabase" })   # Appointments
skill({ name: "quotes-optical-supabase" })         # Quotes
skill({ name: "pos-optical-supabase" })           # POS & Orders
skill({ name: "inventory-optical-supabase" })     # Products
skill({ name: "work-orders-optical-supabase" })   # Work Orders
skill({ name: "payment-workflow-optical-supabase" }) # Payments
skill({ name: "whatsapp-ai-agent-optical" })       # WhatsApp
```

## Testing

```bash
npm run test:api      # API tests
npm run test:integration # Integration tests
```

## Graphify

Graphify is available via MCP server. Use it to understand module relationships:

- Query `graphify query "relationship between [module A] and [module B]"` before API changes
- Find all consumers of a module before refactoring endpoints
- Discover which services depend on a given API
- Check `graphify-out/graph.json` freshness (compare with `git rev-parse HEAD`)
- Suggest `graphify update .` if the graph is stale (>5 commits behind)

## Documentación Relacionada

- `docs/API_IMPLEMENTATION_STATUS.md`
- `docs/[MODULE]/` - Documentación por módulo
