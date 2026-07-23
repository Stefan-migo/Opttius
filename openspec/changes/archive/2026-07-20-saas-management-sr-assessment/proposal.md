# Proposal: SaaS Management Service Role Assessment

## Intent

~46 API files under `src/app/api/admin/saas-management/` use `createServiceRoleClient()` for cross-org root admin operations. This is a security anti-pattern — a single generic `service_role` call with no audit trail on intent. Fix by introducing a `createRootAdminClient()` that wraps the same key but makes INTENT explicit. Follows the established `cron_role` pattern.

## Scope

### In Scope

- Create `root_admin_role` Postgres role + explicit GRANTs (migration)
- Create `createRootAdminClient()` helper in `lib/supabase/` (parallel to `createCronClient()`)
- Migrate ~48 `createServiceRoleClient()` calls across 46 API files + 2 helper libs
- No behavior change — same key, same auth.admin.\* API access, just clearer naming

### Out of Scope

- JWT-based role auth replacement (future phase)
- Non-saas-management API files using `createServiceRoleClient()`
- Any functional or behavioral change

## Capabilities

> Pure refactor/migration — no spec-level behavior change.

### New Capabilities

None — this is a technical migration, not a new capability.

### Modified Capabilities

None — existing capabilities behave identically.

## Approach

1. **Migration:** Create `root_admin_role` with explicit GRANTs on saas-management tables, following the existing `cron_role` GRANT pattern
2. **Helper:** Create `lib/supabase/root-admin-client.ts` exporting `createRootAdminClient()` — wraps `SUPABASE_SERVICE_ROLE_KEY` same as `createCronClient()`
3. **Migrate calls:** Replace `createServiceRoleClient()` → `createRootAdminClient()` in all 46 API route files + 2 libs (`lib/saas/audit-log.ts`, `lib/saas/tier-change-audit.ts`)
4. **Stacked PRs** (400-line budget):
   - PR 1: Migration + helper + Organizations/Users (~15 files)
   - PR 2: Subscriptions + Tiers + Analytics (~8 files)
   - PR 3: Support (dual auth pattern — 4 files)
   - PR 4: Demos + Leads + Email + Payments + WhatsApp + System (~15 files)

## Affected Areas

| Area                                                            | Impact   | Description                               |
| --------------------------------------------------------------- | -------- | ----------------------------------------- |
| `src/app/api/admin/saas-management/organizations/**/*.ts`       | Modified | SR→root admin in all handlers             |
| `src/app/api/admin/saas-management/users/**/*.ts`               | Modified | SR→root admin in all handlers             |
| `src/app/api/admin/saas-management/subscriptions/**/*.ts`       | Modified | SR→root admin in all handlers             |
| `src/app/api/admin/saas-management/tiers/**/*.ts`               | Modified | SR→root admin in all handlers             |
| `src/app/api/admin/saas-management/analytics/**/*.ts`           | Modified | SR→root admin in all handlers             |
| `src/app/api/admin/saas-management/support/**/*.ts`             | Modified | SR→root admin (dual auth pattern)         |
| `src/app/api/admin/saas-management/demos/**/*.ts`               | Modified | SR→root admin in all handlers             |
| `src/app/api/admin/saas-management/leads/**/*.ts`               | Modified | SR→root admin in all handlers             |
| `src/app/api/admin/saas-management/email/**/*.ts`               | Modified | SR→root admin in all handlers             |
| `src/app/api/admin/saas-management/payments/**/*.ts`            | Modified | SR→root admin in all handlers             |
| `src/app/api/admin/saas-management/whatsapp/**/*.ts`            | Modified | SR→root admin in all handlers             |
| `src/app/api/admin/saas-management/system/**/*.ts`              | Modified | SR→root admin in all handlers             |
| `lib/saas/audit-log.ts`                                         | Modified | SR→root admin                             |
| `lib/saas/tier-change-audit.ts`                                 | Modified | SR→root admin                             |
| `lib/supabase/root-admin-client.ts`                             | **New**  | Helper wrapping SUPABASE_SERVICE_ROLE_KEY |
| `supabase/migrations/YYYYMMDDHHMMSS_create_root_admin_role.sql` | **New**  | Postgres role + GRANTs                    |

## Risks

| Risk                                                     | Likelihood | Mitigation                                                |
| -------------------------------------------------------- | ---------- | --------------------------------------------------------- |
| Missed SR call in a file                                 | Low        | Grep audit before/after; automated check in CI            |
| Dual-auth files (support) use wrong client for anon path | Low        | Manual review per file with explicit inline comments      |
| Migration breaks if run twice without idempotency guards | Low        | Use `CREATE ROLE IF NOT EXISTS`, idempotent GRANT syntax  |
| Stacked PR merge conflicts between slices                | Med        | Chain PRs sequentially toward main; rebase child branches |

## Rollback Plan

1. Revert each stacked PR in reverse order (PR 4 → PR 3 → PR 2 → PR 1)
2. Delete migration via `supabase migration repair` if partially applied
3. Delete `lib/supabase/root-admin-client.ts`
4. All files return to `createServiceRoleClient()` — identical behavior, no data impact

## Dependencies

- None — pure rename at the helper level, no package changes

## Success Criteria

- [ ] No `createServiceRoleClient()` calls remain in `src/app/api/admin/saas-management/`
- [ ] All 46 API respond identically to the same requests (regression comparison)
- [ ] `createRootAdminClient()` is the only SR helper used in saas-management routes
- [ ] Migration idempotent (safe to run in production)
- [ ] `auth.admin.*` calls continue working through the new client

## Proposal Question Round

This is a straightforward migration with no business ambiguity, but a few questions for alignment:

1. **Naming convention** — `createRootAdminClient()` matches the intent. Any preference for `createRootClient()` (shorter) or `createSaasAdminClient()` (more scoped)?
2. **Dual-auth files** (support routes) — some use `createClient()` for non-root paths and `createServiceRoleClient()` for root. Should both become `createRootAdminClient()` in those files, or keep the anonymous client separate?
3. **CI guard** — worth adding a custom ESLint rule or grep check to `lint-staged` that blocks `createServiceRoleClient` from re-entering `saas-management/`?
