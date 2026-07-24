# Delta: Structural Refactor — File Splitting

## Purpose

Zero-behavior-change structural refactor: split 361 files >300 lines into smaller modules (target <300 lines per file). Same exports, same props, same API contracts, same routes. This spec documents the **invariant surfaces** — everything that MUST remain identical after refactoring.

---

## INVARIANT Requirements

### Requirement: Public Exports Must Remain Identical

All barrel exports (`index.ts`) from refactored module directories MUST export the same named exports with the same signatures. No export MAY be removed, renamed, or have its type signature changed.

#### Scenario: Barrel exports unchanged

- GIVEN a refactored module directory with an `index.ts` barrel
- WHEN the barrel's imported symbols are compared before and after refactoring
- THEN the export names and their TypeScript types MUST be identical

#### Scenario: Named imports from external consumers

- GIVEN a consumer importing `{ foo } from "@/lib/ai/tools/products"`
- AFTER the refactoring of that module
- THEN `foo` MUST still resolve, with the same type signature, at the same import path

### Requirement: Route Handler Signatures Must Remain Identical

All Next.js App Router route handlers (`route.ts`, page props) MUST preserve their HTTP method handlers, `params`/`searchParams` types, and response shapes. The set of `.ts` files under `src/app/` MAY change (extracted handlers) but the exported route config MUST NOT change.

#### Scenario: Route responds to same methods

- GIVEN a route at `src/app/admin/products/[id]/page.tsx`
- AFTER refactoring its content into `_components/` sub-files
- WHEN a GET request is made to `/admin/products/[id]`
- THEN the response status and body shape MUST be identical to the pre-refactor behavior

#### Scenario: Route params unchanged

- GIVEN a route handler that accepts `params: { id: string }`
- AFTER refactoring
- THEN the handler MUST still accept `params: { id: string }` with the same Next.js type

### Requirement: Component Props Interfaces Must Remain Identical

Every React component's props interface — whether defined inline, via `interface`, `type`, or `React.FC<Props>` — MUST remain unchanged after extraction. Extracted sub-components MAY define new props interfaces, but the parent component's public props MUST NOT change.

#### Scenario: Parent component accepts same props

- GIVEN a parent component `EditProductContent` accepting `{ productId: string; organizationId: string }`
- WHEN it is refactored into a thin orchestrator with extracted hooks and sub-components
- THEN consumers passing `{ productId: string; organizationId: string }` MUST compile and render identically

#### Scenario: New extracted components do not leak

- GIVEN a sub-component extracted to `_components/ProductPricingTab.tsx`
- WHEN a consumer attempts to import from the original barrel file
- THEN the new sub-component MUST NOT be exported unless explicitly intended as public API

### Requirement: Service Method Signatures Must Remain Identical

All exported functions and methods from service/gateway files MUST preserve their parameter types, return types, and throw behavior.

#### Scenario: Service call unchanged

- GIVEN a service method `createPayment(data: CreatePaymentInput): Promise<PaymentResult>`
- AFTER splitting `mercadopago/gateway.ts` into a barrel over sub-modules
- THEN calling `createPayment({...})` MUST produce the same result with the same types

#### Scenario: Error types preserved

- GIVEN a service that throws `AppError` with specific codes
- AFTER refactoring
- THEN the same error types and codes MUST be thrown for the same failure conditions

### Requirement: Zod Schemas (AI Tools) Must Remain Identical

All Zod schemas used as AI tool parameter schemas MUST remain identical — same field names, same types, same refinements, same defaults. The tool definition array MUST export the same tools with the same names, descriptions, and schema references.

#### Scenario: AI tool schema unchanged

- GIVEN the Zod schema `createProductSchema` in `src/lib/ai/tools/products.ts`
- AFTER extracting execute handlers to `_actions/`
- THEN the schema definition in the parent file MUST be byte-identical to the pre-refactor version

#### Scenario: Tool name/description unchanged

- GIVEN the tool definition `{ name: "create_product", description: "...", schema: createProductSchema, execute: fn }`
- AFTER refactoring
- THEN `name`, `description`, and `schema` MUST remain unchanged; only the `execute` value MAY point to an imported handler

### Requirement: Database Queries and RLS Must Remain Identical

No SQL queries, Supabase client calls, or RLS policies MAY be modified. Refactoring is limited to TypeScript/React code only.

#### Scenario: Query unchanged

- GIVEN a Supabase query in a service function
- AFTER extracting the function to a sub-module
- THEN the executed SQL MUST be identical — same `.from()`, `.select()`, `.eq()`, `.in()`, etc. chain

#### Scenario: RLS untouched

- GIVEN existing RLS policies on database tables
- AFTER refactoring
- THEN no migration files, schema changes, or policy alterations MAY be included

---

## REMOVED Requirements

None — zero behavior changes.

---

## Acceptance Criteria (Build Verification)

| Criterion              | Command                | Evidence                                                            |
| ---------------------- | ---------------------- | ------------------------------------------------------------------- |
| TypeScript compilation | `npm run build`        | Passes with zero errors                                             |
| Lint with max-lines    | `npm run lint`         | No eslint-disable max-lines remaining (13 files), no new violations |
| Unit tests             | `npm run test`         | All existing tests pass                                             |
| Export identity        | Manual or script check | Same named exports from refactored barrels                          |
| Route identity         | Manual check           | Route handlers respond to same HTTP methods at same paths           |

### Import-from-Barrel Rule

Tests and external consumers MUST import from barrel files (`index.ts`), NOT from internal sub-module paths. Barrels are the public API boundary and the only surface guaranteed stable by this refactor. Any test importing from `_components/` or `_actions/` directly is at risk of breakage in future refactors.

---

## Module Inventory

| Module       | Files >300 | Strategy                                            | Invariant Surface                                            |
| ------------ | :--------: | --------------------------------------------------- | ------------------------------------------------------------ |
| AI           |     30     | Tool actions → `_actions/`, agent → sub-modules     | Tool schemas, tool array exports, agent class public methods |
| POS          |     23     | Discount/keyboard → hooks, dialogs → `_components/` | `POSPageContent` props, cash register public API             |
| SaaS Mgmt    |     31     | Info cards extraction, subscription detail hook     | Org/service subscription methods                             |
| Products     |     15     | Bulk route → handler files, form → hook             | Product CRUD route handlers, `EditProductContent` props      |
| Quotes       |     15     | Filter hook, table renderer, delete dialog          | Quote list/filter API, quote detail component props          |
| Security     |     9      | Module → sub-modules by operation                   | `incidentResponse()` signature, audit log methods            |
| Payments     |     6      | Gateway → barrel                                    | `createPayment()`, `refundPayment()` signatures              |
| Appointments |     5      | Settings → section extraction                       | Appointment settings page props, schedule API                |
