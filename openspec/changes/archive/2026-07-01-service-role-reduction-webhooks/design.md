# Design: Service Role Reduction — Phase 2: Webhooks

## Technical Approach

Create a `webhook_role` PostgreSQL role with explicit GRANTs on only the 8 tables webhook handlers touch, a `createWebhookClient()` helper using `SUPABASE_WEBHOOK_KEY`, and swap all 5 webhook route files from `createServiceRoleClient()` to `createWebhookClient()`. Same pattern as Phase 1 (cron_role).

Zero product behavior changes — pure security refactor. Database-level role enforcement (not app-level scoping) because webhooks derive `organization_id` only after the first query — making pre-org scoping impossible without a lookup round-trip.

## Architecture Decisions

### Decision: Database role over application scoping

| Option | Tradeoff | Decision |
|--------|----------|----------|
| `webhook_role` with GRANTs | Coarse table-level, but stronger than app-level — DB enforces it even if an exploit bypasses the app layer. Pattern matches Phase 1. | ✅ **Chosen** |
| `createScopedClient(orgId)` | Requires org context before first query. Webhooks don't have it — would need a lookup round-trip first, defeating the purpose. | ❌ Rejected |
| Shared `cron_role` | Cron has SELECT on ALL TABLES — far more permissive than what webhooks need. Would widen cron's blast radius instead of narrowing webhooks'. | ❌ Rejected |

### Decision: Webhook client in `PaymentService` constructor

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Pass webhook client in constructor | Explicit, type-safe, existing pattern (`PaymentService` already takes `SupabaseClient`). | ✅ **Chosen** |
| PaymentService creates its own client | Tight coupling, can't test with different clients, breaks the existing constructor pattern. | ❌ Rejected |
| Global singleton for webhook client | Hidden dependency, harder to mock, no benefit over constructor injection. | ❌ Rejected |

## Data Flow

```
External gateway (MP/PayPal/Flow/NOWPayments/Resend)
  │
  ▼
Webhook route handler ──► Signature verification
  │
  ▼
createWebhookClient() ──► Webhook handler logic
  │                          │
  ├── PaymentService         │  (mercadopago, paypal, flow, nowpayments)
  │     └── payments         │  SELECT, UPDATE
  │     └── webhook_events   │  SELECT, INSERT, UPDATE
  │     └── orders           │  UPDATE
  │     └── organizations    │  SELECT, UPDATE
  │     └── subscriptions    │  SELECT, INSERT, UPDATE
  │     └── subscription_tiers│ SELECT
  │     └── profiles         │  SELECT
  │
  └── Direct supabase.insert()  (resend only)
        └── email_send_events  │  INSERT

note: recordTierChange() inside applyPaymentSuccessToOrganization
creates its OWN service role client for tier_change_audit table —
not affected by this change.
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/utils/supabase/webhook.ts` | Create | `createWebhookClient()` — same pattern as `cron.ts`, reads `SUPABASE_WEBHOOK_KEY` |
| `supabase/migrations/20260701000013_create_webhook_role.sql` | Create | `CREATE ROLE webhook_role NOINHERIT`, `GRANT USAGE ON SCHEMA public`, per-table GRANTs on 8 tables |
| `src/app/api/webhooks/mercadopago/route.ts` | Modify | Swap `createServiceRoleClient` → `createWebhookClient`, update direct `supabase` calls too |
| `src/app/api/webhooks/paypal/route.ts` | Modify | Swap `createServiceRoleClient` → `createWebhookClient` |
| `src/app/api/webhooks/flow/route.ts` | Modify | Swap `createServiceRoleClient` → `createWebhookClient` |
| `src/app/api/webhooks/nowpayments/route.ts` | Modify | Swap `createServiceRoleClient` → `createWebhookClient` |
| `src/app/api/webhooks/resend/route.ts` | Modify | Swap `createServiceRoleClient` → `createWebhookClient` |
| `env.example` | Modify | Add `SUPABASE_WEBHOOK_KEY` entry after `SUPABASE_CRON_KEY` |

## Migration SQL

```sql
-- Create webhook_role with minimum privileges for webhook operations.
-- Scope: 8 tables that webhook handlers actually touch.

CREATE ROLE webhook_role NOINHERIT;

GRANT USAGE ON SCHEMA public TO webhook_role;

-- payments: looked up by gateway_payment_intent_id, status updated
GRANT SELECT, UPDATE ON payments TO webhook_role;

-- webhook_events: idempotency tracking (SELECT → INSERT → UPDATE processed)
GRANT SELECT, INSERT, UPDATE ON webhook_events TO webhook_role;

-- orders: status updated to "completed" on successful payment
GRANT UPDATE ON orders TO webhook_role;

-- subscription_tiers: read during tier matching by amount
GRANT SELECT ON subscription_tiers TO webhook_role;

-- organizations: read current tier, update to new tier
GRANT SELECT, UPDATE ON organizations TO webhook_role;

-- subscriptions: read existing, create/update after payment, update from preapproval webhook
GRANT SELECT, INSERT, UPDATE ON subscriptions TO webhook_role;

-- profiles: read org owner email for SaaS success notification
GRANT SELECT ON profiles TO webhook_role;

-- email_send_events: Resend webhook inserts delivery events
GRANT INSERT ON email_send_events TO webhook_role;
```

## Helper Contract

```typescript
// src/utils/supabase/webhook.ts
import { createClient } from "@supabase/supabase-js";

export function createWebhookClient() {
  const key = process.env.SUPABASE_WEBHOOK_KEY;
  if (!key) {
    throw new Error("SUPABASE_WEBHOOK_KEY is not configured");
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
```

## Implementation Order

| Step | What | Why this order |
|------|------|----------------|
| 1 | Create migration `20260701000013_create_webhook_role.sql` | DB must accept the new role before anything uses it |
| 2 | Create `src/utils/supabase/webhook.ts` | Helper must exist before consumers can import it |
| 3 | Modify `resend/route.ts` | Simplest change (1 table, direct insert) — validates the helper works |
| 4 | Modify `nowpayments/route.ts` | Single `updatePaymentFromWebhook` call — validates PaymentService path |
| 5 | Modify `flow/route.ts` | Mid complexity — validates recordWebhookEvent + fulfillOrder flow |
| 6 | Modify `paypal/route.ts` | Same pattern as flow, validates signature+event flow |
| 7 | Modify `mercadopago/route.ts` | Most complex — validates direct supabase calls (subscriptions) alongside PaymentService |
| 8 | Update `env.example` | Add `SUPABASE_WEBHOOK_KEY` entry |

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | `createWebhookClient()` | Mock env var, verify client creation and error on missing key |
| Integration | Each webhook route | Send mock webhook payloads, verify 200 response and correct DB state. Run with webhook_role key instead of service_role key. |
| Regression | All webhook routes | Run existing test suite — behavior must be identical under webhook_role |
| Manual | Full gateway simulation | Post-deploy: trigger real webhook events (Resend test event, sandbox MP/PayPal/Flow) and verify processing |

## Rollout / Dependencies

- **Pre-deploy**: Generate `SUPABASE_WEBHOOK_KEY` JWT for `webhook_role` via Supabase Dashboard → SQL → `auth.sign()` with payload `{"role": "webhook_role", "iss": "supabase"}`.
- **Vercel env var**: Set `SUPABASE_WEBHOOK_KEY` in production + preview environments.
- **No feature flag**: All-or-nothing swap. Rollback = revert files + drop role.

## Known Edge Cases

- **recordTierChange()** inside `applyPaymentSuccessToOrganization` creates its own `createServiceRoleClient()` — it writes to `tier_change_audit` which is not in our GRANT list. This is intentional: audit is its own concern, and the service role client inside that function was already there before this change. Not affected.
- **Mercado Pago merchant_order + subscription/preapproval topics** both use direct `supabase` calls (not through PaymentService). The subscription/preapproval block (lines 52-118) reads/updates `subscriptions` directly — the webhook client must have those GRANTs.
- **Idempotency**: `webhook_events` table ensures processed events aren't replayed even under a new role.
