# Tasks: CSRF Protection — Origin/Referer Validation

## Review Workload Forecast

| Field                   | Value          |
| ----------------------- | -------------- |
| Estimated changed lines | ~100           |
| 400-line budget risk    | Low            |
| Chained PRs recommended | No             |
| Suggested split         | Single PR      |
| Delivery strategy       | single-pr      |
| Chain strategy          | size-exception |

```
Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low
```

### Suggested Work Units

| Unit | Goal                               | Likely PR | Notes                       |
| ---- | ---------------------------------- | --------- | --------------------------- |
| 1    | Validation fn + middleware + tests | PR 1      | Single PR; ~100 lines total |

## Phase 1: Test — RED (TDD)

- [x] 1.1 Create `src/__tests__/unit/lib/api/csrf.test.ts` — 6 scenarios: same-origin passes (`Origin: https://app.opttius.com`), referer fallback (no Origin, Referer set), mismatched origin returns invalid (`Origin: https://evil-site.com`), both headers missing returns invalid, localhost dev allowed (`http://localhost:3000`), invalid Origin URL (non-parseable) returns invalid

## Phase 2: Implementation — GREEN

- [x] 2.1 Create `src/lib/api/csrf.ts` with `validateCsrfOrigin(headers: Headers): { valid: boolean; reason?: string }` — parse Origin (fallback Referer), extract origin via `new URL()`, match against allowed list (`NEXT_PUBLIC_APP_URL` origin + `http://localhost:3000`). Make all Phase 1 tests pass.
- [x] 2.2 Insert CSRF check in `src/middleware.ts` — after `/acceso-opticas` block and home-page return (line 75), before Supabase session refresh (line 80). Skip GET/HEAD/OPTIONS. Exempt `/api/webhooks/`, `/api/cron/`, `/api/admin/system/health`.

## Phase 3: Verify

- [x] 3.1 Run `npm run test:run` — confirm all 6 test scenarios pass
- [-] 3.2 Run `npm run build` — pre-existing build failure (unrelated: `pos-billing-settings` imports server-only module)
