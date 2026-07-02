# Tasks: Service Role Reduction — Phase 2: Webhooks

## Prerequisites

1. **`SUPABASE_WEBHOOK_KEY` JWT** must be issued for `webhook_role` via Supabase Dashboard **before deployment**. One-time manual operation.
2. **Phase 1 migrations** `20260701000010_create_cron_role.sql` and `20260701000011_cron_role_write_grants.sql` must already be applied.

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | ~70 |
| 400-line budget risk | Low |
| Chained PRs recommended | Yes (per delivery strategy) |
| Delivery strategy | chained, stacked-to-main |

Decision needed before apply: **No**
Chained PRs recommended: **Yes**
400-line budget risk: **Low**

### Chained PR Plan (stacked-to-main)

| PR | Slices | Goal | Files | Est. Lines | Dependencies |
|---|---|---|---|---|---|
| 1 | 1 | **Foundation** — DB role, helper, env var | `webhook_role` migration, `webhook.ts`, `.env.example` | ~40 | None |
| 2 | 2 | **Consumer migration** — swap all 5 webhook routes | `resend`, `nowpayments`, `flow`, `paypal`, `mercadopago` | ~30 | PR 1 (needs `createWebhookClient` + DB role) |

> **Note**: At ~70 total lines the entire change easily fits in a single PR. The split follows the declared `chained, stacked-to-main` strategy for organizational consistency. If a single PR is preferred, merge PR 1+2 and mark `size:exception`.

---

## PR 1 — Foundation: DB role + helper + env var

### Task 1.1 — Create `webhook_role` migration

**File**: `supabase/migrations/20260701000013_create_webhook_role.sql` (new)

**Description**: Create `webhook_role NOINHERIT` with explicit GRANTs on the 8 tables webhook handlers touch.

**SQL Grants**:
- `payments` — SELECT, UPDATE
- `webhook_events` — SELECT, INSERT, UPDATE
- `orders` — UPDATE
- `subscription_tiers` — SELECT
- `organizations` — SELECT, UPDATE
- `subscriptions` — SELECT, INSERT, UPDATE
- `profiles` — SELECT
- `email_send_events` — INSERT

**Acceptance**:
- [x] Migration runs without error
- [x] `webhook_role` exists: `SELECT rolname FROM pg_roles WHERE rolname = 'webhook_role'`
- [x] Each GRANT verified: `SELECT * FROM information_schema.table_privileges WHERE grantee = 'webhook_role'`
- [x] No GRANTs on tables outside the 8 listed above
- [x] Rollback: `DROP ROLE IF EXISTS webhook_role;`

---

### Task 1.2 — Create `createWebhookClient()` helper

**File**: `src/utils/supabase/webhook.ts` (new)

**Description**: Create a restricted-privilege Supabase client using `SUPABASE_WEBHOOK_KEY`, following the same pattern as `cron.ts`.

**Contract**:
- Reads `SUPABASE_WEBHOOK_KEY` from environment
- Throws clear error if key is missing
- `autoRefreshToken: false`, `persistSession: false`
- Exports `createWebhookClient()` function

**Acceptance**:
- [x] File created with same structure as `src/utils/supabase/cron.ts`
- [x] Error message names the correct env var: `SUPABASE_WEBHOOK_KEY`
- [x] `createWebhookClient()` returns a valid `SupabaseClient` when env var is set
- [x] `createWebhookClient()` throws when env var is missing

---

### Task 1.3 — Add `SUPABASE_WEBHOOK_KEY` to `.env.example`

**File**: `.env.example` (modified)

**Description**: Add env var entry after `SUPABASE_CRON_KEY` with descriptive comment.

**Acceptance**:
- [x] Line added: `SUPABASE_WEBHOOK_KEY=` with comment explaining it's for webhook handlers
- [x] Placed after `SUPABASE_CRON_KEY` for logical grouping

---

## PR 2 — Consumer migration: swap all 5 webhook routes

### Task 2.1 — Modify `resend/route.ts`

**File**: `src/app/api/webhooks/resend/route.ts` (modified)

**Description**: Replace `createServiceRoleClient()` with `createWebhookClient()`. Simplest case — 1 table (`email_send_events`), direct insert only.

**Changes**:
- Import: `createServiceRoleClient` → `createWebhookClient`
- Instantiation: `createServiceRoleClient()` → `createWebhookClient()`

**Acceptance**:
- [x] Import path points to `@/utils/supabase/webhook`
- [x] No remaining reference to `createServiceRoleClient` in this file
- [x] Resend webhook returns same Response shape for test event payloads

---

### Task 2.2 — Modify `nowpayments/route.ts`

**File**: `src/app/api/webhooks/nowpayments/route.ts` (modified)

**Description**: Replace `createServiceRoleClient()` with `createWebhookClient()`. Single gateway call via `PaymentService`.

**Changes**:
- Import: `createServiceRoleClient` → `createWebhookClient`
- Instantiation: `createServiceRoleClient()` → `createWebhookClient()`

**Acceptance**:
- [x] Import updated, no remaining service-role reference
- [x] `PaymentService` receives webhook client via constructor
- [x] NOWPayments IPN callback returns same Response

---

### Task 2.3 — Modify `flow/route.ts`

**File**: `src/app/api/webhooks/flow/route.ts` (modified)

**Description**: Replace `createServiceRoleClient()` with `createWebhookClient()`. Mid complexity — validates `recordWebhookEvent` + `fulfillOrder` flow through `PaymentService`.

**Changes**:
- Import: `createServiceRoleClient` → `createWebhookClient`
- Instantiation: `createServiceRoleClient()` → `createWebhookClient()`

**Acceptance**:
- [x] Import updated, no remaining service-role reference
- [x] `PaymentService` receives webhook client
- [x] Flow status callback returns same Response

---

### Task 2.4 — Modify `paypal/route.ts`

**File**: `src/app/api/webhooks/paypal/route.ts` (modified)

**Description**: Replace `createServiceRoleClient()` with `createWebhookClient()`. Same pattern as flow — validates signature + event processing.

**Changes**:
- Import: `createServiceRoleClient` → `createWebhookClient`
- Instantiation: `createServiceRoleClient()` → `createWebhookClient()`

**Acceptance**:
- [x] Import updated, no remaining service-role reference
- [x] `PaymentService` receives webhook client
- [x] PayPal `CHECKOUT.ORDER.COMPLETED` / `PAYMENT.CAPTURE.COMPLETED` webhooks return same Response

---

### Task 2.5 — Modify `mercadopago/route.ts`

**File**: `src/app/api/webhooks/mercadopago/route.ts` (modified)

**Description**: Replace `createServiceRoleClient()` with `createWebhookClient()`. Most complex case — has both `PaymentService` calls AND direct `supabase` calls on the `subscriptions` table (subscription/preapproval topic block, lines 52–118). Both paths must use the webhook client.

**Changes**:
- Import: `createServiceRoleClient` → `createWebhookClient`
- Instantiation: `createServiceRoleClient()` → `createWebhookClient()`
- Direct `supabase.from("subscriptions")` calls (lines 76–100) automatically use the new client since they reference the same `supabase` variable

**Acceptance**:
- [x] Import updated, no remaining service-role reference
- [x] `PaymentService` receives webhook client
- [x] Direct `supabase` calls (subscription/preapproval, merchant_order) use webhook client
- [x] All Mercado Pago topics (payment, merchant_order, subscription_preapproval, preapproval) return same Response
- [x] `recordTierChange()` inside `applyPaymentSuccessToOrganization` still uses its own `createServiceRoleClient()` (intentional — writes to `tier_change_audit`, outside webhook scope)

---

## Verification & Post-Deploy

- [x] All 5 webhook files reference `createWebhookClient` from `@/utils/supabase/webhook` — zero `createServiceRoleClient` references in `src/app/api/webhooks/`
- [ ] `createWebhookClient()` fails queries on tables NOT in the GRANT list with permission denied (DB-only, verified at deploy time)
- [x] Existing test suite passes: `npm run test:run`
- [ ] **Post-deploy smoke test**: Trigger real gateway events (Resend test email, sandbox MP/PayPal/Flow) and verify processing under `webhook_role`

## Manual Deployment Steps

1. **Supabase Dashboard** → SQL Editor → generate JWT:
   ```sql
   SELECT auth.sign(
     '{"role": "webhook_role", "iss": "supabase"}',
     current_setting('app.settings.jwt_secret')
   ) AS webhook_jwt;
   ```
2. **Vercel** → Project Settings → Environment Variables → add `SUPABASE_WEBHOOK_KEY` with the JWT value for production + preview
3. **Apply migration** via Supabase CLI or Dashboard SQL Editor
4. **Deploy** PR 1 first, then PR 2

## Rollback

1. Revert PR 2 (restore 5 webhook files to `createServiceRoleClient`)
2. Revert PR 1: `DROP ROLE webhook_role`, delete `webhook.ts`, restore `.env.example`
3. Done — zero data loss, same behavior as before
