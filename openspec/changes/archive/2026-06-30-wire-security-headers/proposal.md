# Proposal: Wire Security Headers — Remove Dead Code

## Intent

Audit finding **H3**: `withSecurityHeaders()` at `src/lib/api/middleware.ts` sets 9 security headers, but `next.config.js` already delivers the exact same headers globally via `headers()` config for ALL routes (`source: "/(.*)"`). The function is only called by a test-only endpoint at `src/app/api/test-headers/route.ts`. Entirely dead code.

## Scope

### In Scope

1. Remove `withSecurityHeaders()` definition from `src/lib/api/middleware.ts`
2. Delete `src/app/api/test-headers/route.ts`
3. Remove `withSecurityHeaders` from barrel export in `src/lib/api/index.ts`

### Out of Scope

- **CSP hardening** (finding F11): both `next.config.js` and the dead function use `'unsafe-inline'`. Requires nonces in Next.js middleware — separate concern, deferred.
- Adding tests for the next.config.js header delivery (already tested at production edge)

## Capabilities

### New Capabilities

None — pure deletion, no new behavior.

### Modified Capabilities

None — no spec-level behavior changes. The headers are already delivered by `next.config.js`.

## Approach

Three surgical deletions. No new files, no behavior changes — the security headers remain live via Next.js config.

## Affected Areas

| Area                                | Impact   | Description                                                    |
| ----------------------------------- | -------- | -------------------------------------------------------------- |
| `src/lib/api/middleware.ts`         | Modified | Remove `withSecurityHeaders()` function (L144-246, ~100 lines) |
| `src/app/api/test-headers/route.ts` | Removed  | Delete entire file (56 lines)                                  |
| `src/lib/api/index.ts`              | Modified | Remove `withSecurityHeaders` from barrel exports               |

## Risks

| Risk                             | Likelihood | Mitigation                                                             |
| -------------------------------- | ---------- | ---------------------------------------------------------------------- |
| Regression: headers stop working | Low        | `next.config.js` is independent middleware — deletion doesn't touch it |

## Rollback Plan

Restore the deleted lines/files via `git checkout` — each is an isolated deletion. A single `git revert` on the commit undoes all three.

## Dependencies

None.

## Success Criteria

- [ ] `grep -r "withSecurityHeaders"` returns zero results across the codebase
- [ ] `src/app/api/test-headers/` no longer exists
- [ ] Build passes (`next build`)
- [ ] Tests pass (`npm test`)
