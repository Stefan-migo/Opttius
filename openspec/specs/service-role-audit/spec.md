# Service Role Audit Specification

## Purpose

Eliminate unnecessary `createServiceRoleClient()` usage in API routes and server-side business logic, restricting service_role to webhooks, cron jobs, and admin tooling only. Each replaced call MUST use the authenticated user's client (`createClient()`) with proper RLS enforcement.

## Requirements

### Requirement: API routes MUST use auth client, not service role

Every Next.js API route that serves authenticated user requests SHALL use `createClient()` (authenticated as the request user) instead of `createServiceRoleClient()`. Service role SHALL only be used in routes that process webhooks, cron jobs, or perform operations before organization activation.

#### Scenario: Service-role removed from standard CRUD routes

- GIVEN an API route that reads/writes user-owned data (e.g., `api/admin/customers`, `api/admin/work-orders`, `api/admin/cash-register`, `api/categories`, `api/admin/prescriptions`)
- WHEN the route calls the database
- THEN it MUST use `createClient()` from the request context
- AND `createServiceRoleClient()` MUST NOT be called in that route

#### Scenario: Service-role retained for webhook/cron/admin routes

- GIVEN a route that processes external webhooks, cron jobs, or onboarding before org activation (e.g., `api/onboarding/*`, `api/surveys/*`, WhatsApp webhooks)
- WHEN the route calls the database
- THEN it MAY use `createServiceRoleClient()` if there is no authenticated user context
- AND the reason MUST be documented in a comment

### Requirement: Lib/services that read user data MUST accept auth client

Server-side services and library functions that perform database reads on behalf of a user SHALL accept a Supabase client as a parameter, allowing the caller to pass either an authenticated or service-role client. They SHALL NOT hardcode `createServiceRoleClient()`.

#### Scenario: Injectable client in email sending

- GIVEN `lib/email/send-quote-email.ts` calls `createServiceRoleClient()` to read quote data
- WHEN refactored to accept a `supabase` parameter from the caller
- THEN the caller (API route with auth client) passes its own authenticated client
- AND the service-role fallback is only used when no authenticated client is available

#### Scenario: Injectable client in billing adapters

- GIVEN `lib/billing/adapters/InternalBilling.ts` and `InternalInstitutionalBilling.ts` call `createServiceRoleClient()` in their constructor
- WHEN refactored to accept `supabase` from the caller
- THEN the constructor MUST accept an optional `SupabaseClient` parameter
- AND default to `createServiceRoleClient()` only when none is provided

### Requirement: Verifiable migration per path

Each migrated file SHALL produce a measurable reduction in service-role usage. The final count of `createServiceRoleClient()` calls in non-test, non-webhook, non-cron production files MUST be zero.

#### Scenario: Count verification

- GIVEN the codebase after migration
- WHEN searching for `createServiceRoleClient` in `src/app/api/`, `src/lib/` (excluding `__tests__`)
- THEN the count MUST be ≤ the initial count of ~15 legitimate services (webhooks, cron, admin-onboarding)
- AND zero occurrences in routes that the authenticated user directly calls

### Requirement: Tests MUST be updated to mock auth client

Test files that currently mock `createServiceRoleClient` SHALL be updated to mock `createClient` instead, verifying the new auth path produces identical results.

#### Scenario: Test migration

- GIVEN an existing test that mocks `createServiceRoleClient`
- WHEN the production code switches to `createClient()`
- THEN the test mock SHALL be updated to `createClient()`
- AND all assertions SHALL pass with the new mock

| Metric | Current | Target |
|--------|---------|--------|
| `createServiceRoleClient()` calls in `src/app/api/` | ~45 files | 0 (migrate to auth client) |
| `createServiceRoleClient()` calls in `src/lib/` | ~20 files | ≤ 8 (legitimate cross-user ops) |
| Webhook/cron/onboarding files using service role | ~5 files | ≤ 6 (retained as needed) |
