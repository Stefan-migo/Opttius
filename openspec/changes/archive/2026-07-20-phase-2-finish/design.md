# Design: Phase 2 Finish — Structural Debt

## Technical Approach

Pure refactor — extract cohesive blocks from 10 files > 690 lines into sub-modules, remove 4 dead response builders from `errors.ts`. No behavioral changes, no new capabilities.

### 2.4 — File Splits

| #   | File (lines)                                                                     | Pattern                  | Extractions                                                                                                                                                                             | Target lines |
| --- | -------------------------------------------------------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| 1   | `src/lib/ai/tools/products.ts` (799)                                             | 1 tool = 1 file          | `tools/products/{getProducts,getProductById,createProduct,updateProduct,deleteProduct,updateInventory,getLowStockProducts}.ts` + `index.ts` re-export                                   | ~30          |
| 2   | `src/app/admin/field-operations/[id]/_components/FieldOpDetailContent.tsx` (795) | Co-located split         | `_components/{FieldOpDetailTypes,FieldOpDetailDataLayer,FieldOpDetailDialogs}.ts` — types, data fetchers (fetchWorkOrders, fetchCustomers, etc.), 6 Dialog blocks                       | ~150         |
| 3   | `src/lib/ai/agent/agent.ts` (793)                                                | Method extraction        | `agent/{stream-chat,context-loader,stream-structured}.ts` — `streamChat` body, `loadSessionHistory`+`loadOrganizationalContext`, `streamChatStructured`. Already has `tool-executor.ts` | ~120         |
| 4   | `src/app/admin/products/edit/[id]/_components/EditProductContent.tsx` (765)      | Type/helper extraction   | `_components/{types,productOptions,useProductData,productSubmitHandler}.ts` — `FormState`, `getOptions` helpers, fetch effect, submit parsing. Form sections already extracted          | ~250         |
| 5   | `src/lib/security/incident-response.ts` (723)                                    | Module split             | `incident-response/{types,engine,playbooks,helpers}.ts` — interfaces, `IncidentResponseEngine` class, playbook/containment data, utility fns                                            | ~80          |
| 6   | `src/lib/payments/mercadopago/gateway.ts` (717)                                  | Method extraction        | `gateway/{create-payment,webhook-handler,token-payment,customer,preapproval,helpers}.ts` — each public method group + `getMPClient`/`mapStatus`                                         | ~50          |
| 7   | `src/lib/ai/tools/appointments.ts` (707)                                         | 1 tool = 1 file          | `tools/appointments/{getAppointmentSlots,getAppointments,getBranchSchedule,rescheduleAppointment,defaults,helpers}.ts` + `index.ts` re-export                                           | ~50          |
| 8   | `src/app/admin/help/page.tsx` (699)                                              | Sub-component extraction | `_components/{types,TicketList,TicketFilters,StatsCards,CreateTicketDialog}.ts`                                                                                                         | ~100         |
| 9   | `src/app/api/admin/products/bulk/route.ts` (695)                                 | Pipeline extraction      | `_helpers/{validation,export}.ts` + `_helpers/operations/{updateStatus,updateCategory,updatePricing,updateInventory,delete,duplicate}.ts`                                               | ~80          |
| 10  | `src/app/admin/cash-register/CashRegisterOrdersSection.tsx` (692)                | Sub-component extraction | `_components/{OrderFilters,OrdersTable,CreditNotesSection}.ts`                                                                                                                          | ~100         |

### 2.5 — API Response Layer

| Function                | Defined in      | Callers (non-test)                                  | Action                                            |
| ----------------------- | --------------- | --------------------------------------------------- | ------------------------------------------------- |
| `createErrorResponse`   | `errors.ts:50`  | 0 (only `withErrorHandler`/`asyncHandler` internal) | Delete                                            |
| `createSuccessResponse` | `errors.ts:113` | 0                                                   | Delete                                            |
| `withErrorHandler`      | `errors.ts:87`  | 0                                                   | Delete                                            |
| `asyncHandler`          | `errors.ts:129` | 1 (`users/route.ts:13`)                             | Replace with `withApiResponse` from `response.ts` |

**Replacement** in `users/route.ts`:

```typescript
// Before:
import { asyncHandler, AuthenticationError } from "@/lib/api/errors";
export const GET = asyncHandler(async (request: NextRequest) => { ... });
// After:
import { withApiResponse } from "@/lib/api/response";
export const GET = withApiResponse(async (request: NextRequest) => { ... });
```

Note: handler already returns `createApiSuccessResponse`/`createApiErrorResponse` from `response.ts` inline — `asyncHandler` wrapper was redundant.

## Architecture Decisions

| Decision               | Choice                    | Alternatives         | Rationale                                                                                                      |
| ---------------------- | ------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------- |
| AI tools extraction    | Per-tool files            | Per-category dir     | Already have `tools/products.ts` and `tools/appointments.ts` — consistent pattern, each tool is self-contained |
| Barrel exports         | Original file re-exports  | No re-export         | Existing callers import from `@/lib/ai/tools` — index re-export keeps imports working                          |
| Sub-directory location | Co-located `_components/` | Shared `components/` | Components are local to these pages, not reusable — co-location avoids accidental coupling                     |
| Route helpers          | `_helpers/` (private)     | `lib/` (shared)      | Bulk route logic is specific to this route — YAGNI to hoist                                                    |

## File Changes

| File                                                                        | Action                                                         |
| --------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `src/lib/ai/tools/products.ts`                                              | Modify — strip to `index.ts` that imports from `products/`     |
| `src/lib/ai/tools/products/*.ts` (7 new files)                              | Create — per-tool modules                                      |
| `src/lib/ai/tools/appointments.ts`                                          | Modify — strip to `index.ts` that imports from `appointments/` |
| `src/lib/ai/tools/appointments/*.ts` (6 new files)                          | Create — per-tool + defaults + helpers                         |
| `src/lib/ai/agent/agent.ts`                                                 | Modify — extract methods, keep class definition                |
| `src/lib/ai/agent/stream-chat.ts`                                           | Create — `streamChat` body                                     |
| `src/lib/ai/agent/context-loader.ts`                                        | Create — session history + org context loading                 |
| `src/lib/ai/agent/stream-structured.ts`                                     | Create — `streamChatStructured`                                |
| `src/app/admin/field-operations/[id]/_components/FieldOpDetailContent.tsx`  | Modify — strip types, data fetchers, dialogs                   |
| `src/app/admin/field-operations/[id]/_components/FieldOpDetailTypes.ts`     | Create — interfaces                                            |
| `src/app/admin/field-operations/[id]/_components/FieldOpDetailDataLayer.ts` | Create — fetch + mutation functions                            |
| `src/app/admin/field-operations/[id]/_components/FieldOpDetailDialogs.tsx`  | Create — 6 Dialog blocks                                       |
| `src/app/admin/products/edit/[id]/_components/EditProductContent.tsx`       | Modify — extract types/helpers/hooks                           |
| `src/app/admin/products/edit/[id]/_components/types.ts`                     | Create — `FormState`                                           |
| `src/app/admin/products/edit/[id]/_components/productOptions.ts`            | Create — getOptions helpers                                    |
| `src/app/admin/products/edit/[id]/_components/useProductData.ts`            | Create — fetch + form init hook                                |
| `src/app/admin/products/edit/[id]/_components/productSubmitHandler.ts`      | Create — submit data transformation                            |
| `src/lib/security/incident-response.ts`                                     | Modify — strip to index re-export                              |
| `src/lib/security/incident-response/types.ts`                               | Create — interfaces                                            |
| `src/lib/security/incident-response/engine.ts`                              | Create — `IncidentResponseEngine` class                        |
| `src/lib/security/incident-response/playbooks.ts`                           | Create — static playbook/containment data                      |
| `src/lib/security/incident-response/helpers.ts`                             | Create — utility methods                                       |
| `src/lib/payments/mercadopago/gateway.ts`                                   | Modify — strip to class definition + index                     |
| `src/lib/payments/mercadopago/gateway/*.ts` (6 new files)                   | Create — per-method-group modules                              |
| `src/app/admin/help/page.tsx`                                               | Modify — strip to orchestrator                                 |
| `src/app/admin/help/_components/types.ts`                                   | Create — Ticket + labels                                       |
| `src/app/admin/help/_components/TicketList.tsx`                             | Create — list + pagination                                     |
| `src/app/admin/help/_components/TicketFilters.tsx`                          | Create — filter controls                                       |
| `src/app/admin/help/_components/StatsCards.tsx`                             | Create — metric cards                                          |
| `src/app/admin/help/_components/CreateTicketDialog.tsx`                     | Create — ticket form dialog                                    |
| `src/app/api/admin/products/bulk/route.ts`                                  | Modify — strip to route dispatcher                             |
| `src/app/api/admin/products/bulk/_helpers/validation.ts`                    | Create — auth + input validation                               |
| `src/app/api/admin/products/bulk/_helpers/export.ts`                        | Create — CSV/JSON export                                       |
| `src/app/api/admin/products/bulk/_helpers/operations/*.ts` (7 new files)    | Create — per-operation handlers                                |
| `src/app/admin/cash-register/CashRegisterOrdersSection.tsx`                 | Modify — strip to composer                                     |
| `src/app/admin/cash-register/_components/OrderFilters.tsx`                  | Create — filters UI                                            |
| `src/app/admin/cash-register/_components/OrdersTable.tsx`                   | Create — table + pagination                                    |
| `src/app/admin/cash-register/_components/CreditNotesSection.tsx`            | Create — credit notes UI                                       |
| `src/lib/api/errors.ts`                                                     | Modify — remove 4 functions                                    |
| `src/lib/api/index.ts`                                                      | Modify — remove 4 barrel exports                               |
| `src/app/api/admin/users/route.ts`                                          | Modify — replace `asyncHandler` with `withApiResponse`         |
| `src/__tests__/unit/lib/api/errors.test.ts`                                 | Modify — remove 4 test blocks                                  |

## Testing Strategy

| Layer       | What                                          | Approach                                                            |
| ----------- | --------------------------------------------- | ------------------------------------------------------------------- |
| Unit        | All extractions compile + pass existing tests | `npx vitest run` — zero behavioral change means zero new test logic |
| Integration | Users route after `withApiResponse` swap      | Hand-test GET response shape matches                                |
| Build       | Full build                                    | `npm run build` — verify no broken imports                          |

No new tests needed — pure extraction means the existing tests already cover the logic.

## Migration / Rollout

No migration required. Single commit per file group (2.4 = 1 commit, 2.5 = 1 commit). Rollback: `git revert <sha>`.

## Open Questions

None.
