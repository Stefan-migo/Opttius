# Tasks: Phase 2 Finish — Structural Debt

## Review Workload Forecast

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

| Field                   | Value                                                                                                                   |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Estimated changed lines | ~13,000 (10 file extractions × ~1,300 each + 1 cleanup × ~160)                                                          |
| 400-line budget risk    | **High** — each extraction alone exceeds 400                                                                            |
| Chained PRs recommended | **Yes**                                                                                                                 |
| Suggested split         | PR 1: AI tools (T1+T3+T7) → PR 2: Admin UI (T2+T4+T8+T10) → PR 3: API/Middleware (T9+T5+T6) → PR 4: Error cleanup (T11) |
| Delivery strategy       | `ask-on-risk`                                                                                                           |

### Suggested Work Units

| Unit | Goal                                                               | Likely PR | Notes                                               |
| ---- | ------------------------------------------------------------------ | --------- | --------------------------------------------------- |
| 1    | AI module extractions (products, agent, appointments)              | PR 1      | 3 file splits, no behavioral change, verify compile |
| 2    | Admin UI extractions (field-op, product edit, help, cash register) | PR 2      | 4 file splits, verify render + build                |
| 3    | API/Middleware extractions (bulk route, security, payments)        | PR 3      | 3 file splits, verify build + route responses       |
| 4    | Error cleanup (dead functions, test + caller migration)            | PR 4      | Standalone, tiny diff                               |

---

## Phase 1: AI Module Extractions (PR 1)

- [x] **T1** — Split `src/lib/ai/tools/products.ts` (799→~30 lines)
  - Create `src/lib/ai/tools/products/` with 7 tool files (`getProducts`, `getProductById`, `createProduct`, `updateProduct`, `deleteProduct`, `updateInventory`, `getLowStockProducts`)
  - Convert original file to barrel re-export (`export * from "./products/getProducts"`)
  - Update `src/lib/ai/tools/index.ts` import unchanged (still imports `productTools` from `./products`)
- [x] **T3** — Split `src/lib/ai/agent/agent.ts` (793→~120 lines)
  - Create `agent/stream-chat.ts` — extract `streamChat()` method body (lines 298–565)
  - Create `agent/context-loader.ts` — extract `loadSessionHistory()` + `loadOrganizationalContext()` (lines 136–277)
  - Create `agent/stream-structured.ts` — extract `streamChatStructured()` (lines 597–679)
  - Keep class `Agent` in `agent.ts` with thin method wrappers that delegate to new files
- [x] **T7** — Split `src/lib/ai/tools/appointments.ts` (707→~50 lines)
  - Create `src/lib/ai/tools/appointments/` with 4 tool files (`getAppointmentSlots`, `getAppointments`, `getBranchSchedule`, `rescheduleAppointment`) + `defaults.ts` + `helpers.ts`
  - Convert original file to barrel re-export
  - Update `src/lib/ai/tools/index.ts` import unchanged

## Phase 2: Admin UI Extractions (PR 2)

- [x] **T2** — Split `src/app/admin/field-operations/[id]/_components/FieldOpDetailContent.tsx` (795→~150 lines)
  - Create `FieldOpDetailTypes.ts` — interfaces `FieldOperation`, `MobileStockItem`, `WorkOrderItem`
  - Create `FieldOpDetailDataLayer.ts` — data fetchers (`fetchWorkOrders`, `fetchCustomers`, `fetchQuotes`, `fetchCashStatus`, `fetchDetail`, `handleStatusChange`, `handleReturnStock`, `handleDeliver`)
  - Create `FieldOpDetailDialogs.tsx` — 6 Dialog blocks (delete customer, delete quote, add customer, create quote, open cash, create prescription)
  - Component imports from new files, keeps state + layout in main file
- [x] **T4** — Split `src/app/admin/products/edit/[id]/_components/EditProductContent.tsx` (765→~250 lines)
  - Create `types.ts` — `FormState` interface (lines 180–241)
  - Create `productOptions.ts` — `getOptions()` helper + all `productTypes`, `frameTypes`, `frameMaterials`, etc. constants (lines 39–178)
  - Create `useProductData.ts` — `useEffect` fetch + form initialization logic (lines 323–461)
  - Create `productSubmitHandler.ts` — `handleSubmit` data transformation + API call (lines 503–619)
- [x] **T8** — Split `src/app/admin/help/page.tsx` (699→~100 lines)
  - Create `_components/types.ts` — `Ticket` interface + `statusLabels`, `statusColors`, `priorityColors`, `priorityLabels`, `categoryLabels` maps
  - Create `_components/TicketList.tsx` — ticket table rows + pagination controls
  - Create `_components/StatsCards.tsx` — 4 metric cards (total, open, in-progress, resolved)
  - Create `_components/TicketFilters.tsx` — filter bar with status/priority/category/search selects
  - Create `_components/CreateTicketDialog.tsx` — form dialog with react-hook-form + zod
- [x] **T10** — Split `src/app/admin/cash-register/CashRegisterOrdersSection.tsx` (692→~100 lines)
  - Create `_components/OrderFilters.tsx` — search bar + filter grid (payment status, method, product, date range)
  - Create `_components/OrdersTable.tsx` — table with customer info, products, totals, payment badges, action buttons + pagination
  - Create `_components/CreditNotesSection.tsx` — credit notes table with order link, amount, refund method, reason

## Phase 3: API/Middleware Extractions (PR 3)

- [x] **T5** — Split `src/lib/security/incident-response.ts` (723→31 lines)
  - Created `incident-response/types.ts` — all interfaces (`Incident`, `IncidentCategory`, `IncidentTimelineEvent`, `IncidentEvidence`, `ResponsePlaybook`, `ResponseStep`, `ContainmentStrategy`)
  - Created `incident-response/engine.ts` — `IncidentResponseEngine` class, delegates to imported helpers/playbooks
  - Created `incident-response/playbooks.ts` — static data: `loadResponsePlaybooks()`, `loadContainmentStrategies()`, `getRemediationSteps()`
  - Created `incident-response/helpers.ts` — utility methods: `extractSuspiciousIPs`, `blockIPAddress`, `moveSystemToQuarantine`, `collectSecurityLogs`, `collectSystemInformation`, `backupSecurityLogs`, `sendNotification`, `sendIncidentAlerts`
  - Original file became barrel re-export (10 lines)
  - Note: engine.ts includes re-exports of `Incident`, `IncidentCategory`, `ResponsePlaybook` types for barrel
- [x] **T6** — Split `src/lib/payments/mercadopago/gateway.ts` (717→157 lines)
  - Created `gateway/` with 6 files: `create-payment.ts` (createPaymentIntent), `webhook-handler.ts` (processWebhookEvent + getMerchantOrder), `token-payment.ts` (createPaymentWithToken), `customer.ts` (createCustomer, findCustomerByEmail, addCardToCustomer, createCustomerAndAddCard), `preapproval.ts` (createPreApprovalPlan, createPreApproval, getPreApproval), `helpers.ts` (getReadableErrorMessage, getMPClient, mapStatus)
  - Original file keeps thin `MercadoPagoGateway` class that delegates to standalone functions (157 lines — each method is a 2-line wrapper)
- [x] **T9** — Split `src/app/api/admin/products/bulk/route.ts` (695→114 lines)
  - Created `_helpers/validation.ts` — `checkAdminAuth()` + `validateBulkRequest()` shared by POST and GET
  - Created `_helpers/export.ts` — GET handler extraction with CSV/JSON column mapping and file response
  - Created `_helpers/operations/updateStatus.ts` — status update case
  - Created `_helpers/operations/updateCategory.ts` — category update case
  - Created `_helpers/operations/updatePricing.ts` — price adjustment logic with percentage/fixed types
  - Created `_helpers/operations/updateInventory.ts` — stock update with branch context resolution and `update_product_stock` RPC
  - Created `_helpers/operations/delete.ts` — soft delete + hard delete + force delete (with order dependency check)
  - Created `_helpers/operations/duplicate.ts` — product duplication with slug generation

## Phase 4: API Response Cleanup (PR 4)

- [x] **T11a** — Remove 4 dead functions from `src/lib/api/errors.ts`
  - Delete `createErrorResponse()` (lines 50–84)
  - Delete `withErrorHandler()` (lines 87–103)
  - Delete `createSuccessResponse()` (lines 113–126)
  - Delete `asyncHandler()` (lines 129–138)
  - Also delete `ErrorResponse` interface (lines 39–47) and `SuccessResponse` interface (lines 106–111) if unused elsewhere
- [x] **T11b** — Remove dead barrel exports from `src/lib/api/index.ts`
  - Remove `createErrorResponse` and `asyncHandler` and `withErrorHandler` from the error exports block (line 13, 16)
  - Remove `ErrorResponse` and `SuccessResponse` type exports (line 34)
- [x] **T11c** — Migrate `src/app/api/admin/users/route.ts` caller
  - Change import from `{ asyncHandler }` to no import needed
  - Replace `export const GET = asyncHandler(async (request) => { ... })` with `export const GET = withApiResponse(async (request) => { ... })` using `withApiResponse` from `@/lib/api/response`
  - Verify the handler still returns `createApiSuccessResponse`/`createApiErrorResponse` inline (they already do — `asyncHandler` was wrapping them redundantly)
- [x] **T11d** — Update `src/__tests__/unit/lib/api/errors.test.ts`
  - Remove `createErrorResponse` describe block (lines 110–165)
  - Remove `createSuccessResponse` describe block (lines 167–189)
  - Remove `withErrorHandler` describe block (lines 191–228)
  - Remove `asyncHandler` describe block (lines 230–250)
  - Remove imports for deleted functions (lines 11, 14, 15, 17, 21)
  - Keep `APIError` + subclass tests
