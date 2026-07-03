# Tasks: Add Unit Tests — Remaining Modules (Sprint B)

## Review Workload Forecast

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Low

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1,400 (4 PRs × ~350) |
| 400-line budget risk | Low |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4 |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

### Suggested Work Units

| Unit | Goal | Likely PR | Base | Est. Lines |
|------|------|-----------|------|------------|
| 1 | Email foundation (4 files) | PR 1 | main | ~350 |
| 2 | Email services (3 files) | PR 2 | main | ~350 |
| 3 | SaaS + notifications + cash-register (4 files) | PR 3 | main | ~350 |
| 4 | Inventory + analytics + onboarding (4 files) | PR 4 | main | ~350 |

## Phase 1: Email Foundation — PR 1 (~350 lines, 4 files)

- [ ] 1.1 `email/client.test.ts` — `resend` client init (missing API key → null), `emailConfig` defaults, `EmailType` enum, `sendEmail`/`sendBatchEmails`: success, invalid `to`, provider error, rate limit. Mock: `vi.mock("resend")`, `vi.mock("@/lib/logger")`.
- [ ] 1.2 `email/org-utils.test.ts` — org email helpers: `getOrgEmailConfig`, `getOrgReplyTo`, `getSenderFromOrg`: org with custom from, org with defaults, missing org, invalid config fields. Mock: supabase chain via `createMockSupabase()`.
- [ ] 1.3 `email/template-utils.test.ts` — `renderTemplate`, `replaceVariables`, `applyLayout`: valid template + vars, missing variable (leave placeholder vs throw), nested variables, empty template, special chars, layout wrapping. No mocks — pure string ops.
- [ ] 1.4 `email/template-loader.test.ts` — `loadTemplate`, `getTemplatesByOrg`: template found, not found, org with no templates, DB error, invalid type filter. Mock: supabase chain for `from("system_email_templates").select()`.

## Phase 2: Email Services — PR 2 (~350 lines, 3 files)

- [ ] 2.1 `email/send-quote-email.test.ts` — `sendQuoteEmail`: valid quote with customer, quote with missing fields, org with no email config, quote with attachments, Resend returns error, customer with no email. Mock: `vi.mock("@/lib/email/client")`, `vi.mock("@/lib/logger")`, mock supabase chain.
- [ ] 2.2 `email/send-delivery-completion-email.test.ts` — `sendDeliveryCompletionEmail`: valid delivery, work order with no customer email, missing work order, org email config missing, Resend fails. Mock: `vi.mock("@/lib/email/client")`, `vi.mock("@/lib/logger")`, mock supabase chain.
- [ ] 2.3 `email/ai-template-variables.test.ts` — `resolveTemplateVariables` AI path: variables resolved successfully, partial resolution, AI returns malformed JSON, AI provider error, unknown variable type fallback, empty variable set. Mock: AI SDK provider (`@ai-sdk/openai` or similar), `vi.mock("@/lib/logger")`.

## Phase 3: SaaS + Notifications + Cash Register — PR 3 (~350 lines, 4 files)

- [ ] 3.1 `saas/subscription-status.test.ts` — `getSubscriptionStatus`: active, past_due, canceled, trialing, expired, org not found, inactive → returns `status: "inactive"`. Mock: supabase chain for `from("organizations").select("subscription_status")`.
- [ ] 3.2 `saas/audit-log.test.ts` — `createAuditLog`, `getAuditLogs`, `getAuditLogsByEntity`: valid entries, missing fields, entity type filter, date range, pagination, empty results. Mock: supabase chain for `from("audit_logs")`.
- [ ] 3.3 `notifications/notification-service.test.ts` — `createNotification`: valid payload, missing org_id, missing type, branch-scoped vs org-scoped, DB insert fails. `getNotifications`: paginated, filtered by type/read, empty. Mock: supabase chain for `from("admin_notifications")`, `vi.mock("@/lib/email/client")`.
- [ ] 3.4 `cash-register/closure-builder.test.ts` — `buildClosureData`: valid cash session data, zero sales, negative values, missing fields, totals calculation matches. Partial mock: supabase for fetching related data, pure math validation.

## Phase 4: Inventory + Analytics + Onboarding — PR 4 (~350 lines, 4 files)

- [ ] 4.1 `inventory/stock-helpers.test.ts` — `getProductStock`, `getLowStockProducts`, `getBranchStock`, `reserveStock`, `releaseStock`: existing product, zero stock, missing product, branch with no stock, concurrent reservation, release restores correctly. Mock: `createMockSupabase()` for `from("product_branch_stock")` chain.
- [ ] 4.2 `inventory/operativo-mobile-stock-helpers.test.ts` — mobile stock transfer helpers: `transferToMobile`, `syncFromMobile`, `getMobileInventory`: valid transfer, insufficient source stock, network failure, partial sync, conflict resolution. Mock: `createMockSupabase()` + mock logger.
- [ ] 4.3 `analytics/compute-analytics-kpis.test.ts` — `computeAnalyticsKPIs`: empty period, single sale, multiple sales, mixed payment methods, date range boundaries, division by zero (zero sales → 0 or null), calendar month rollover. Mock: supabase chain for order/work-order aggregates.
- [ ] 4.4 `onboarding/tour-config.test.ts` — `getTourSteps`, `getTourProgress`, `completeStep`, `isTourComplete`: first-time user, partial progress, all steps done, invalid tour ID, role-filtered steps. Mock: supabase chain for `from("user_tour_progress")` — or pure config test if steps are static constants.

## Mock Patterns Reference

| Module | Mock Strategy |
|--------|---------------|
| Email foundation | `vi.mock("resend")` + `vi.mock("@/lib/logger")` |
| Email services | `vi.mock("@/lib/email/client")` + mock supabase chain |
| SaaS (status, audit) | `createMockSupabase()` via `from().select().single()` |
| Notifications | mock supabase chain + `vi.mock("@/lib/email/client")` |
| Stock helpers | `createMockSupabase()` for product_branch_stock queries |
| Analytics KPIs | mock supabase chain for aggregate queries |
| Onboarding | mock supabase chain for user_tour_progress |
| Template utils, closure builder | pure function inputs (no vi.mock needed) |
