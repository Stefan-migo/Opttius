# Proposal: CSRF Protection — Origin/Referer Validation

## Intent

Audit finding H1: ~200 POST/PUT/DELETE API endpoints accept requests from any origin. Supabase SSR's `SameSite=Lax` alone doesn't protect against `<form>` POST cross-site. Attackers could forge state-changing requests on behalf of authenticated users.

## Scope

### In Scope

- Origin/Referer header validation in Next.js middleware (`src/middleware.ts`)
- 403 rejection with descriptive error for mismatched origins
- Exempt route list: webhooks, cron, health
- Unit tests for validation logic

### Out of Scope

- Double Cookie Submit pattern (future enhancement for sensitive ops)
- Per-route allowlisting (defer until a real exception arises)
- Changes to webhook endpoints (already signature-verified per prior SDD)

## Capabilities

### New Capabilities

- `csrf-protection`: origin/referer validation for state-changing API requests

### Modified Capabilities

None

## Approach

Single function in `src/middleware.ts` that runs before Supabase session refresh:

1. Skip if method is GET/HEAD/OPTIONS
2. Skip if path starts with `/api/webhooks/`, `/api/cron/`, or is health check
3. Read `Origin` header; fallback to `Referer` if absent
4. Parse origin URL — reject if missing or invalid
5. Validate against `NEXT_PUBLIC_APP_URL` + `http://localhost:3000` (dev)
6. On mismatch: return `NextResponse.json({ error: "CSRF validation failed" }, { status: 403 })`

The current middleware already handles session refresh for all routes. The CSRF check inserts early in the same pipeline — no new middleware file needed.

## Affected Areas

| Area                     | Impact   | Description                              |
| ------------------------ | -------- | ---------------------------------------- |
| `src/middleware.ts`      | Modified | Add CSRF validation before session check |
| `src/middleware.test.ts` | New      | Unit tests for origin/referer validation |

## Exempt Routes

| Prefix                     | Reason                                                           |
| -------------------------- | ---------------------------------------------------------------- |
| `/api/webhooks/*`          | External POSTs (PayPal, Flow, Resend, MP, NOWPayments, WhatsApp) |
| `/api/cron/*`              | Vercel Cron Jobs — no browser origin                             |
| `/api/admin/system/health` | Health check endpoint                                            |

## Risks

| Risk                                            | Likelihood | Mitigation                                                        |
| ----------------------------------------------- | ---------- | ----------------------------------------------------------------- |
| Missing `Origin` header on same-origin requests | Low        | Fallback to `Referer`; some proxies strip Origin but keep Referer |
| `NEXT_PUBLIC_APP_URL` misconfigured             | Low        | Validate at middleware startup; log warning if unset              |
| Breaking legitimate API consumers               | Low        | Exempt list + staged rollout (monitor 403s on Sentry)             |

## Rollback Plan

Revert the CSRF addition in `src/middleware.ts` (2 lines of validation logic). Zero data migration needed. Deploy revert as a standard PR.

## Dependencies

- `NEXT_PUBLIC_APP_URL` must be set in all environments (already is)

## Success Criteria

- [ ] POST/PUT/DELETE from `curl` with no Origin header → 403
- [ ] POST/PUT/DELETE from legit origin → 200
- [ ] All webhook POSTs → 200 (exempt)
- [ ] All cron POSTs → 200 (exempt)
- [ ] GET/OPTIONS → no CSRF check (no 403s)
