# Tasks: coverage-gaps-6-2

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~530 (all additions, 0 deletions) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Batch A+B: supabase utils) → PR 2 (Batch C: quotes) → PR 3 (Batch D: work-orders) |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Supabase utils: client + cron + webhook + server tests | PR 1 | ~220 lines, base=main, same mock patterns |
| 2 | Validation: quotes schema expansion | PR 2 | ~180 lines, base=main, standalone |
| 3 | Validation: work orders schema expansion | PR 3 | ~150 lines, base=main, standalone |

---

## Phase 1 (Batch A): Supabase Utils — Lightweight

- [x] **A1** — `src/__tests__/unit/supabase/client.test.ts` (NEW, ~35 lines). Test `createClient()`: returns client when env vars set; passes undefined when env missing (non-null assertion). Mock `@supabase/ssr` → `createBrowserClient`.
- [x] **A2** — `src/__tests__/unit/supabase/cron.test.ts` (NEW, ~40 lines). Test `createCronClient()`: returns client with service role key; throws when key missing. Mock `@supabase/supabase-js` → `createClient`.
- [x] **A3** — `src/__tests__/unit/supabase/webhook.test.ts` (MODIFY, +15 lines). Add scenario: passes URL and auth config correctly (assert URL arg explicitly). Reuse existing mock pattern.

## Phase 2 (Batch B): Supabase Utils — server.ts

- [x] **B1** — `src/__tests__/unit/supabase/server.test.ts` (NEW, ~130 lines). Test 3 functions:
  - `createClient()`: returns server client from cookies; `setAll` silently catches throws.
  - `createClientFromRequest()`: Bearer token flow (token in header, `autoRefreshToken:false`, `persistSession:false`); fallback to cookies when no header; fallback when request undefined; ignores non-Bearer header (Basic).
  - `createServiceRoleClient()`: returns admin client when key set; throws when key missing.
  - Mocks: `@supabase/ssr` → `createServerClient`, `@supabase/supabase-js` → `createClient`, `next/headers` → `cookies()`.

## Phase 3 (Batch C): Quotes Schema Expansion

- [x] **C1** — `quotes.test.ts` (MODIFY, +70 lines). Add preprocessor coverage: `near_lens_cost` (string→30000, null→null, ""→null, negative→reject); `far_lens_cost` NaN string → null; `contact_lens_quantity` default 1; `contact_lens_cost` default 0; `contact_lens_price` default 0. Boolean defaults: `customer_own_frame`, `customer_own_near_frame`, `near_frame_price_includes_tax`.
- [x] **C2** — `quotes.test.ts` (MODIFY, +60 lines). Numeric boundaries: `lens_tint_percentage` (0/50/100 accept, -1/101 reject), `discount_percentage` (same), `contact_lens_rx_axis_od/os` (0/90/180 accept, -1/200/90.5 reject), all price fields accept 0/50000 reject -1. String maxLength: `frame_name` (255 edge), `currency` (`"CLP"` accept, overflow reject).
- [x] **C3** — `quotes.test.ts` (MODIFY, +50 lines). Optional UUIDs (`prescription_id`, `frame_product_id`, `lens_family_id` et al.) accept null/undefined/valid UUID. String→number coercion edge: `far_lens_cost: "abc"` → null (not error). Contact lens Rx fields accept numbers and null. `presbyopia_solution` omitted → defaults to `"none"`.

## Phase 4 (Batch D): Work Orders Schema Expansion

- [x] **D1** — `work-orders.test.ts` (MODIFY, +60 lines). Preprocessors: `near_lens_cost` (string→20000, null→null, ""→null, negative→reject); `far_lens_cost` NaN→null. Required field edge: `frame_name` whitespace-only after trim (schema bug: `.min()` before `.trim()` → whitespace passes). Boolean default: `customer_own_frame`.
- [x] **D2** — `work-orders.test.ts` (MODIFY, +50 lines). `payment_status` invalid reject. Numeric boundaries: `lens_tint_percentage` (0/100 accept, -1/101 reject), `deposit_amount` (0/50000 accept, -1 reject), `balance_amount` (positive accept, 0/negative reject). String maxLength boundaries on `frame_name`, `lens_type`, `lens_material`, `lab_name`, `internal_notes`, `customer_notes`.
- [x] **D3** — `work-orders.test.ts` (MODIFY, +40 lines). Optional UUIDs (`prescription_id`, `quote_id`, `frame_product_id` et al.) accept null/undefined/valid UUID. `total_amount` edge: `""` → preprocessor returns undefined → required_error; `"invalid"` → same. Lab fields (`lab_estimated_delivery_date`, `payment_method`). Notes max(5000) for `internal_notes`/`customer_notes`.

---

## Implementation Order

PR 1 first (supabase foundation — establishes mock patterns used across all 4 test files). PR 2 and PR 3 are independent of each other and of supabase utils; they can ship in any order after PR 1. Each PR is <250 lines, well within the 400-line budget, self-verifiable via `npx vitest run src/__tests__/unit/`.
