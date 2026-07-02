# Proposal: Service Role Reduction — Phase 2: Webhooks

## Intent

`createServiceRoleClient()` bypasses ALL RLS. After Phase 1 (cron jobs → `createCronClient()`), Phase 2 tackles the next riskiest category: **webhook handlers** (5 files). Webhooks are externally triggered — a compromised or exploited webhook endpoint exposes the entire multi-tenant database.

Current state: all 5 webhook files use `createServiceRoleClient()`, giving them full bypass of RLS across every table in the DB.

## Scope

### In Scope
- Create `webhook_role` PostgreSQL role with explicit GRANTs limited to tables webhooks actually touch
- Create `createWebhookClient()` helper using `SUPABASE_WEBHOOK_KEY` env var
- Migrate all 5 webhook route files to use `createWebhookClient()` instead of `createServiceRoleClient()`
- Update `PaymentService` instantiation in webhook handlers to receive the webhook client
- Add `SUPABASE_WEBHOOK_KEY` to `.env.example`

### Out of Scope
- Internal services (`BackupService`, `SaasBackupService`, etc. — still use `service_role` internally, flagged for future phases)
- API route migrations (future phases — higher complexity, need auth context)
- Middleware migrations
- Creating `createScopedClient(orgId)` — deferred with rationale (see Approach below)
- Removing `createServiceRoleClient()` entirely (scoped clients only reduce the blast radius)

## Capabilities

**New Capabilities**: None — pure security refactor. Zero product behavior changes.

**Modified Capabilities**: None.

## Approach

### Why Database Roles Over Application-Level Scoping

Payment webhooks derive `organization_id` AFTER looking up the payment record by gateway ID — you cannot scope a client to an org before the first query. The Resend webhook has no org context at all (SaaS-level operational data). Therefore, `createScopedClient(orgId)` would add engineering complexity without closing any real gap in this phase.

Instead, follow the same pattern as Phase 1: create a dedicated PostgreSQL role with minimal table-level GRANTs. This provides a **stronger guarantee** than application-level scoping — the database itself enforces the boundary. Combined with existing signature verification in each webhook, this is sufficient for the current threat model.

| Threat | Mitigation |
|--------|------------|
| Compromised webhook can read all tables | `webhook_role` GRANTs restrict to 8 specific tables |
| Compromised webhook can write to all tables | GRANTs restrict to UPDATE/INSERT on specific tables only |
| Compromised webhook can read/write across orgs | Existing application-level org scoping in `PaymentService` survives |
| Replay attack | Idempotency via `webhook_events` table already in place |

### Steps

1. **Audit webhook table access** (matrix below)
2. **Create DB migration**: `webhook_role` with explicit GRANTs on 8 tables
3. **Create helper**: `src/utils/supabase/webhook.ts` — `createWebhookClient()` using `SUPABASE_WEBHOOK_KEY`
4. **Replace usages**: 5 files, one import + constructor parameter change each
5. **Add env var**: `SUPABASE_WEBHOOK_KEY` to `.env.example`
6. **Verify**: all webhook endpoints return same responses under `webhook_role`

### Webhook Table Access Matrix

| Table | Operations | Webhook Files | Via |
|-------|-----------|---------------|-----|
| `payments` | SELECT, UPDATE | mercadopago, paypal, flow, nowpayments | `PaymentService` |
| `webhook_events` | SELECT, INSERT, UPDATE | mercadopago, paypal, flow, nowpayments | `PaymentService` |
| `orders` | UPDATE | mercadopago, paypal, flow | `PaymentService.fulfillOrder` |
| `subscription_tiers` | SELECT | mercadopago | `PaymentService.applyPaymentSuccessToOrganization` |
| `organizations` | SELECT, UPDATE | mercadopago | `PaymentService.applyPaymentSuccessToOrganization` |
| `subscriptions` | SELECT, INSERT, UPDATE | mercadopago | Direct (subscription/preapproval) + `PaymentService` |
| `profiles` | SELECT | mercadopago | `PaymentService.applyPaymentSuccessToOrganization` |
| `email_send_events` | INSERT | resend | Direct `supabase.insert()` |

Total: **8 tables**. Compare with Phase 1's 15+ tables — webhooks have a smaller, more focused surface.

### File-by-File Impact

| File | Lines | Current Pattern | Change |
|------|-------|-----------------|--------|
| `webhooks/mercadopago/route.ts` | 345 | `createServiceRoleClient()` → `new PaymentService(supabase)` | Swap import + 1 line. Also has direct `supabase` calls for subscriptions |
| `webhooks/paypal/route.ts` | 172 | `createServiceRoleClient()` → `new PaymentService(supabase)` | Swap import + 1 line |
| `webhooks/flow/route.ts` | 117 | `createServiceRoleClient()` → `new PaymentService(supabase)` | Swap import + 1 line |
| `webhooks/nowpayments/route.ts` | 71 | `createServiceRoleClient()` → `new PaymentService(supabase)` | Swap import + 1 line |
| `webhooks/resend/route.ts` | 128 | `createServiceRoleClient()` → direct `supabase.insert()` | Swap import + rename variable |

Mercado Pago is the most complex case because it has direct `supabase` calls (subscriptions table) in addition to `PaymentService` calls. Its subscriptions section needs the webhook client too.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/utils/supabase/webhook.ts` | **New** | `createWebhookClient()` helper (follows `cron.ts` pattern) |
| `src/app/api/webhooks/mercadopago/route.ts` | Modified | Import + instantiation |
| `src/app/api/webhooks/paypal/route.ts` | Modified | Import + instantiation |
| `src/app/api/webhooks/flow/route.ts` | Modified | Import + instantiation |
| `src/app/api/webhooks/nowpayments/route.ts` | Modified | Import + instantiation |
| `src/app/api/webhooks/resend/route.ts` | Modified | Import + rename |
| DB migration (new) | New | `CREATE ROLE webhook_role`, GRANTs on 8 tables |
| `.env.example` | Modified | Add `SUPABASE_WEBHOOK_KEY` with comment |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Missing GRANT on a table webhooks touch | Low | Test each webhook endpoint. Roll forward with additional GRANT if needed |
| `PaymentService` uses tables beyond the 8 identified | Low | Audit `PaymentService` methods during implementation. Any service_role function called internally (e.g., `recordTierChange`) may need separate handling |
| Resend webhook data has no org context (can't scope) | None | `email_send_events` is SaaS-level operational data. No org scope needed |
| `SUPABASE_WEBHOOK_KEY` rotation not handled | Low | Same pattern as `SUPABASE_SERVICE_ROLE_KEY` — Vercel env var swap |
| PaymentService dependency on `recordTierChange` | Medium | `recordTierChange` may use its own Supabase client. Audit during implementation |

## Rollback Plan

1. Revert the DB migration: `DROP ROLE IF EXISTS webhook_role;`
2. Revert the 5 webhook files to import `createServiceRoleClient` from `@/utils/supabase/server`
3. Delete `src/utils/supabase/webhook.ts`
4. Remove `SUPABASE_WEBHOOK_KEY` from `.env.example`
5. Done — zero data loss, zero service interruption, same behavior as before

## Dependencies

- Supabase project dashboard access to issue `SUPABASE_WEBHOOK_KEY` JWT
- Vercel environment variable `SUPABASE_WEBHOOK_KEY` set for production + preview

## Success Criteria

- [ ] All 5 webhook files use `createWebhookClient()` — zero references to `createServiceRoleClient()` in `src/app/api/webhooks/`
- [ ] `createWebhookClient()` can only access the 8 granted tables — any other table query fails with permission denied
- [ ] All webhook endpoints return same response body/status as before for:
  - Mercado Pago (payment, merchant_order, and subscription/preapproval topics)
  - PayPal (CHECKOUT.ORDER.COMPLETED, PAYMENT.CAPTURE.COMPLETED)
  - Flow (status change callbacks)
  - NOWPayments (IPN callbacks — crypto payments)
  - Resend (email delivery events: sent, delivered, bounced, opened, clicked)
- [ ] `createServiceRoleClient()` still works in non-webhook contexts (unchanged)
- [ ] All existing tests continue to pass (`npm run test:run`)
