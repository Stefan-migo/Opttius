# Architecture & Structure Audit — Opttius

**Date**: 2026-07-18  
**Scope**: Full project at `src/`  
**Files inspected**: 1,465 TypeScript/TSX files  
**Method**: Manual exploration + automated line counts + pattern analysis

---

## 1. Architecture Strengths

### 1.1 Strong Domain-Driven Module Organization

The `src/lib/` directory is well-structured with clear domain boundaries:
`admin/`, `ai/`, `analytics/`, `billing/`, `cash-register/`, `email/`, `inventory/`, `notifications/`, `payments/`, `security/`, `telemetry/`, `whatsapp/`, `redis/`, `r2/`, `validation/`. Each module owns its concerns, with service classes and internal helpers. This is the right approach for a domain-complex SaaS like optical management.

### 1.2 Solid Security Posture

- CSP headers with random nonces via middleware (`buildCspPolicy()`)
- CSRF protection with origin/referer validation (`validateCsrfOrigin()`)
- Permission policy, X-Frame-Options, HSTS
- Dedicated security module with threat detection, incident response, behavioral analytics
- Security-specific test suites (phase1, phase2, phase3)

### 1.3 Clean Provider Architecture

The root layout (`src/app/layout.tsx`) composes providers in a clean, logical order:
`ThemeProvider → ErrorBoundary → QueryProvider → AuthProvider → TelemetryProvider → BranchProvider`

Server-side user injection via `initialUser` in `AuthProvider` prevents redirect flash on fresh page loads. This is a well-understood pattern.

### 1.4 Comprehensive Multi-Layer Testing

Three testing layers with good coverage:

- **Unit tests** (vitest) with service-level + validation schema tests
- **Integration tests** (vitest) targeting API routes and DB operations
- **E2E tests** (Playwright) with headed and CI modes
- **Characterization tests** (`.char.test.tsx`) for complex component behaviors
- **Security-specific tests** for auth bypass, RLS, and injection vectors

### 1.5 Proper API Error Hierarchy

Custom `APIError` hierarchy with `AuthenticationError`, `AuthorizationError`, `ValidationError`, `NotFoundError`, `ConflictError`, `RateLimitError`, `PaymentError` — each mapping to proper HTTP status codes and with production-safe error sanitization.

---

## 2. Architecture Risks & Weaknesses

### 2.1 CRITICAL: 358 Files Exceed 300 Lines (Violating ESLint Rule)

The project has `max-lines: [error, { max: 300 }]` in ESLint config — yet **358 files** exceed this limit. This is a systemic violation that makes the rule meaningless.

**Largest offenders:**

| Lines | File                                                                       |
| ----- | -------------------------------------------------------------------------- |
| 874   | `src/__tests__/security/phase2-security.test.ts`                           |
| 799   | `src/lib/ai/tools/products.ts`                                             |
| 795   | `src/app/admin/field-operations/[id]/_components/FieldOpDetailContent.tsx` |
| 794   | `src/lib/ai/agent/agent.ts`                                                |
| 765   | `src/app/admin/products/edit/[id]/_components/EditProductContent.tsx`      |
| 723   | `src/lib/security/incident-response.ts`                                    |
| 717   | `src/lib/payments/mercadopago/gateway.ts`                                  |
| 707   | `src/lib/ai/tools/appointments.ts`                                         |
| 692   | `src/app/api/admin/products/bulk/route.ts`                                 |
| 689   | `src/app/admin/cash-register/CashRegisterOrdersSection.tsx`                |
| 680   | `src/app/admin/quotes/_components/QuotesContent.tsx`                       |
| 667   | `src/components/admin/EmailTemplatesManager.tsx`                           |
| 662   | `src/components/admin/QuoteItemsCardDetails.tsx`                           |

Many admin page components and AI tool files are 500-800 lines — clear single-responsibility violations that make maintenance and review expensive.

### 2.2 HIGH: Duplicate API Response Systems

Three files implement overlapping response logic, creating confusion about which to use:

| File                              | Functions                                                                                                                | Lines |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----- |
| `src/lib/api/errors.ts`           | `createErrorResponse`, `createSuccessResponse`, `withErrorHandler`, `asyncHandler`                                       | 192   |
| `src/lib/api/response.ts`         | `createApiErrorResponse`, `createApiSuccessResponse`, `withApiResponse`, `ApiResponseBuilder`, `createPaginatedResponse` | 308   |
| `src/lib/api/response-helpers.ts` | `extractDataFromResponse` + legacy bridge helpers                                                                        | 226   |

`errors.ts` also has `export * from "@/lib/errors/comprehensive-handler"` at the top, then locally redefines classes with the SAME names — the local definitions silently override the wildcard re-exports. This is a maintainability timebomb.

### 2.3 HIGH: Landing Page is a Client Component

`src/app/page.tsx` is `"use client"` — this means:

- No server-side rendering for SEO-critical content
- Worse Core Web Vitals (FCP, LCP) vs a Server Component
- JavaScript required just to render the landing page
- The SEO tags in `layout.tsx` help, but content itself isn't crawl-friendly

The entire landing page section components (HeroSection, FeaturesSection, etc.) inherit the client boundary.

### 2.4 MEDIUM: 26 Barrel Files (`index.ts`)

Barrel files reintroduce circular dependency risks and defeat tree-shaking:

```
src/lib/api/index.ts               ← exports everything + export * from "./services"
src/lib/ai/tools/index.ts
src/lib/ai/providers/index.ts
src/lib/ai/memory/index.ts
...
```

The `src/lib/api/index.ts` pattern of `export * from "./services"` is the most dangerous — it re-exports every service function without explicit allowlist, making it impossible to trace import chains.

### 2.5 MEDIUM: Scattered Component Locations

Components are split between two locations with no clear convention:

**Colocated in route**: `src/app/admin/*/_components/` (40+ components scattered across admin sub-routes)  
**Centralized**: `src/components/admin/` (80+ components)

This means finding a component requires checking two locations. There's no documented rule about when to colocate vs. centralize. The presence of `src/app/admin/_components/` (root admin shared) alongside `src/app/admin/pos/components/` (nested) adds a third layer.

### 2.6 MEDIUM: Duplicate Utility Locations

Three utility locations with split responsibilities:

- `src/lib/utils.ts` — `cn()` helper + re-exports from `src/lib/utils/formatting.ts`
- `src/lib/utils/` — 8 modules: `formatting.ts`, `branch.ts`, `chatExport.ts`, `date-timezone.ts`, `rut.ts`, `slug-generator.ts`, `tax-config.ts`, `tax.ts`
- `src/utils/supabase/` — 5 client files: `client.ts`, `server.ts`, `service-role.ts`, `cron.ts`, `webhook.ts`

The `src/utils/` directory exists only for `supabase/` but the path `@/utils/supabase/server` is used extensively. Meanwhile, `src/lib/utils/` holds domain utilities. The base `src/utils/` path feels like a leftover from an earlier convention.

### 2.7 MEDIUM: Massive Service Files in API Layer

The service layer at `src/lib/api/services/` has several files exceeding healthy sizes:

| File                     | Lines |
| ------------------------ | ----- |
| `systemConfigService.ts` | 584   |
| `agreementService.ts`    | 478   |
| `adminQuoteService.ts`   | 498   |
| `customerService.ts`     | 501   |
| `productService.ts`      | 524   |
| `posService.ts`          | 417   |

These violate Single Responsibility — they typically mix DB queries, validation, and response formatting in a single class/module.

### 2.8 LOW: No Parallel or Intercepting Routes

Despite having modal-heavy workflows (POS dialogs, appointment creation over calendar view), the project doesn't use Next.js parallel routes (`@modal`, `@sidebar`) or intercepting routes (`(.)photo`). All modals are rendered via client-state (React state/context) instead of URL-driven routes, which means:

- No deep-linking to modal content
- No browser back-button support for modal dismissal
- Routes don't match the visual hierarchy

### 2.9 LOW: Missing Loading States in Admin Sub-Routes

Only the root `src/app/loading.tsx` and root `src/app/error.tsx` exist. Several admin sub-route groups (`admin/agreements/`, `admin/customers/`, `admin/quotes/`) lack their own `loading.tsx` and `error.tsx` boundaries, meaning errors and loading states bubble up to the root.

### 2.10 LOW: `any` Type Usage Widespread

Despite `@typescript-eslint/no-explicit-any` set to `"warn"`, many files use `any` types. The ESLint configuration has it as `"warn"` rather than `"error"`, and several files cast to `any` explicitly (e.g., `as unknown`, `as any` patterns in the type definitions and RPC calls).

---

## 3. File Count Summary by Category

| Category                     | Count                                |
| ---------------------------- | ------------------------------------ |
| **Total TS/TSX files**       | **1,465**                            |
| Files >300 lines             | **358** (24.4% of all files)         |
| Files >500 lines             | ~100+                                |
| Barrel files (index.ts)      | 26                                   |
| App routes (pages + layouts) | ~60 (27 dirs in `src/app/`)          |
| API routes                   | ~48 dirs in `src/app/api/admin/`     |
| Components (total)           | ~130+                                |
| - `src/components/ui/`       | ~38 (shadcn-style primitives)        |
| - `src/components/admin/`    | ~80 (domain components)              |
| - `src/components/landing/`  | 13                                   |
| Lib modules                  | ~35 directories                      |
| Hooks                        | 19                                   |
| Contexts                     | 3                                    |
| Test files                   | ~80+ (unit + integration + security) |
| Configuration files          | 4 (`src/config/`)                    |

---

## 4. Dependency Health

| Dependency     | Version     | Notes                       |
| -------------- | ----------- | --------------------------- |
| Next.js        | **14.2.35** | Current for 14.x, stable    |
| React          | **18.x**    | Current LTS                 |
| Supabase JS    | **2.52.0**  | Current                     |
| Supabase SSR   | **0.6.1**   | Current                     |
| TanStack Query | **5.90.19** | Current                     |
| Stripe         | **20.3.0**  | Current                     |
| Sentry         | **10.38.0** | Current                     |
| Resend         | **2.1.0**   | Current                     |
| Zod            | **3.25.76** | Current                     |
| MercadoPago    | **2.0.0**   | Current                     |
| ioredis        | **5.9.2**   | Current                     |
| AWS S3 SDK     | **3.982.0** | Overkill if only R2 is used |

**What can be simplified:**

- `react-is` v19.2.4 as a dependency when the project uses React 18 — verify if actually needed
- `@xenova/transformers` (heavy ~200MB+) only used in AI module — the output tracing excludes it from serverless bundles, but it complicates webpack config
- AWS S3 SDK v3 is large; if only used for R2, consider the lighter `@cloudflare/r2` client or use the S3-compatible API with `fetch`

---

## 5. Improvement Recommendations (Priority-Ordered)

### P0 — Immediate

| #   | Issue                                                                                                                                                                                                                                                                                                                          | Effort   | Impact                                               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ---------------------------------------------------- |
| 1   | **Enforce max-lines rule**: Either raise the limit to 400-500 and fix violations, or make the rule `error` and start splitting the largest files. Start with the top 20 files (all 600+ lines).                                                                                                                                | 2-3 days | Reduces review burden, improves maintainability      |
| 2   | **Consolidate API response system**: Pick ONE response format (recommend `response.ts`'s `createApiSuccessResponse`/`createApiErrorResponse`) and remove `errors.ts`'s `createErrorResponse`/`createSuccessResponse`/`asyncHandler`. Remove `export *` from `errors.ts`. Remove `response-helpers.ts` after migrating clients. | 1 day    | Eliminates confusion and dangerous wildcard override |
| 3   | **Convert landing page to Server Component**: Remove `"use client"` from `src/app/page.tsx`. Push only interactive elements (header mobile menu, CTA buttons) into isolated client sub-components.                                                                                                                             | 4 hours  | Better SEO, faster FCP/LCP                           |

### P1 — Short-term

| #   | Issue                                                                                                                                                                                                                         | Effort              | Impact                                    |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ----------------------------------------- |
| 4   | **Establish and enforce colocation convention**: Document: route-specific components go in `app/*/_components/`, shared domain components stay in `components/admin/`. Move or alias accordingly.                             | 2 hours + refactors | Reduces cognitive load finding components |
| 5   | **Consolidate utility locations**: Move `src/utils/supabase/` into `src/lib/supabase/`. Remove `src/lib/utils.ts` re-export pattern — import `cn()` directly from `clsx` + `tailwind-merge` or keep it as the only re-export. | 2 hours             | Ends split-brain imports                  |
| 6   | **Remove barrel files**: Start with `src/lib/api/index.ts` (dangerous `export * from "./services"`), then `src/lib/ai/tools/index.ts`. Replace with direct imports.                                                           | 1-2 hours per file  | Eliminates circular dependency risk       |

### P2 — Medium-term

| #   | Issue                                                                                                                                                                                                    | Effort            | Impact                      |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | --------------------------- |
| 7   | **Refactor largest service files**: Split `systemConfigService.ts` (584 lines), `agreementService.ts` (478 lines), `customerService.ts` (501 lines) by operation type (read vs write, or by sub-domain). | 1-2 days per file | SRP compliance, testability |
| 8   | **Add loading.tsx + error.tsx to admin sub-routes**: At minimum for `agreements/`, `customers/`, `quotes/`, `work-orders/`.                                                                              | 1 hour            | Better UX during navigation |
| 9   | **Enable `@typescript-eslint/no-explicit-any` as error** for new files only (use ESLint override for existing).                                                                                          | 30 min config     | Prevents type erosion       |

### P3 — Long-term

| #   | Issue                                                                                                                                                                       | Effort               | Impact                          |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ------------------------------- |
| 10  | **Evaluate parallel routes**: For POS modal dialogs and appointment creation over calendar, use `@modal` parallel route with `(.)` intercepting route for better URL state. | 2-3 days per pattern | Deep-linkable modals, better UX |
| 11  | **Audit unused dependencies**: Check `react-is` v19.2.4, `@xenova/transformers` real usage, AWS S3 SDK vs. R2. Remove or replace.                                           | 1 day                | Smaller bundles, fewer CVEs     |

---

## 6. Overall Architecture Score

```
  Architecture:   B+
  ├── Structure:      B    (good domain separation, scattered components)
  ├── Code Quality:   B-   (358 oversized files, any types, duplicate response systems)
  ├── Security:       A    (CSP, CSRF, RLS, dedicated module)
  ├── Testing:        B+   (three layers, but test files also oversized)
  ├── Dependencies:   B    (well-versioned, but some bloat)
  └── Data Flow:      B+   (clean TanStack Query + contexts, no prop drilling)
```

**Overall: B (Solid, with systemic technical debt)**

The architecture has a solid foundation — good domain separation, strong security posture, and proper provider composition. The main risks are **code volume** (358 files over 300 lines, violating its own ESLint rule), **duplicate response systems** creating confusion, and **scattered component organization** without clear convention. These are fixable structural debts, not fundamental design flaws.

The most impactful first step: **enforce the max-lines rule** and **consolidate the API response layer**. Those two changes alone would eliminate the two biggest maintainability risks.
