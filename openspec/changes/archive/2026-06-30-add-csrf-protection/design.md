# Design: CSRF Protection — Origin/Referer Validation

## Technical Approach

Pure function `validateCsrfOrigin()` extracted to `src/lib/api/csrf.ts` — validates `Origin` (fallback `Referer`) against `NEXT_PUBLIC_APP_URL` + `localhost:3000`. Called from existing `src/middleware.ts` before Supabase session refresh. Three exempt prefixes: `/api/webhooks/`, `/api/cron/`, `/api/admin/system/health`. Zero new dependencies.

## Architecture Decisions

### Decision: Separate pure function vs inline in middleware

| Option               | Tradeoff                                                                              |
| -------------------- | ------------------------------------------------------------------------------------- |
| Inline in middleware | Fewer files, but unmockable without `NextRequest`                                     |
| **Separate file**    | Testable with vanilla `Headers`; follows existing lib pattern (`src/lib/api/csrf.ts`) |

**Choice**: Separate file. The function takes `Headers` (Web API) — zero Next.js coupling. Unit tests use `new Headers()` directly.

### Decision: Env var comparison strategy

| Option                                      | Tradeoff                                     |
| ------------------------------------------- | -------------------------------------------- |
| String match `NEXT_PUBLIC_APP_URL` raw      | Breaks if trailing slash or path differs     |
| **Parse both sides via `new URL().origin`** | Stable — ignores path, trailing slash, query |

**Choice**: `new URL(source).origin === new URL(allowed).origin` comparison. Handles `https://app.opttius.com` vs `https://app.opttius.com/` correctly.

### Decision: Exempt routes

| Option                          | Tradeoff                       |
| ------------------------------- | ------------------------------ |
| Prefix-based `startsWith` check | Simple, covers wildcard intent |
| Regex                           | Overkill for 3 known prefixes  |

**Choice**: `pathname.startsWith()` — same pattern already used in middleware for `excludedPaths`.

## Data Flow

```
Request ──→ middleware()
              │
              ├─ /acceso-opticas?  → handle token
              │
              ├─ Method in {GET,HEAD,OPTIONS}? → skip CSRF ──→ continue
              ├─ Path starts with exempt prefix? → skip CSRF ─→ continue
              │
              ├─ validateCsrfOrigin(request.headers)
              │     ├─ Origin headers? → parse URL → match allowed
              │     ├─ No Origin? → Referer header → parse URL → match allowed
              │     └─ Both missing or mismatched? → return { valid: false, reason }
              │
              ├─ Valid? → continue to session refresh
              └─ Invalid? → return 403 JSON response
                              │
                              └─ Request rejected (never hits Supabase)
```

## File Changes

| File                                      | Action | Description                              |
| ----------------------------------------- | ------ | ---------------------------------------- |
| `src/lib/api/csrf.ts`                     | Create | Pure validation function                 |
| `src/middleware.ts`                       | Modify | Insert CSRF check before session refresh |
| `src/__tests__/unit/lib/api/csrf.test.ts` | Create | Unit tests                               |

## Key Functions

### `validateCsrfOrigin(headers: Headers): { valid: boolean; reason?: string }`

Pure function, no side effects, no class.

```typescript
// Pseudocode
1. Read "origin" header; if absent, read "referer"
2. If both missing → { valid: false, reason: "Missing Origin and Referer headers" }
3. Parse via new URL(source) — catch invalid → { valid: false, reason: "Invalid URL" }
4. Build allowed list: [new URL(NEXT_PUBLIC_APP_URL).origin, "http://localhost:3000"]
5. If parsed.origin matches allowed → { valid: true }
6. Else → { valid: false, reason: `Origin ${parsed.origin} not allowed` }
```

### Middleware integration

Insert after `/acceso-opticas` block and home-page return, before session refresh:

```typescript
// CSRF check — before expensive Supabase getUser()
if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
  const exemptPrefixes = [
    "/api/webhooks/",
    "/api/cron/",
    "/api/admin/system/health",
  ];
  const isExempt = exemptPrefixes.some((p) => pathname.startsWith(p));
  if (!isExempt) {
    const { valid, reason } = validateCsrfOrigin(request.headers);
    if (!valid) {
      return NextResponse.json(
        { error: "CSRF validation failed" },
        { status: 403 },
      );
    }
  }
}
```

## Testing Strategy

| Layer | What                    | Approach                                                                     |
| ----- | ----------------------- | ---------------------------------------------------------------------------- |
| Unit  | Origin validation       | `new Headers({ origin: "..." })` — test pass/fail per scenarios              |
| Unit  | Referer fallback        | No Origin header, set Referer only                                           |
| Unit  | Missing both            | Neither header → invalid                                                     |
| Unit  | Dev localhost           | `http://localhost:3000` passes even when APP_URL is production               |
| Unit  | Webhook external origin | Origin from external → still valid IF exempt (skip in middleware, not in fn) |

**Note**: The pure function doesn't know about exempt routes — that's the middleware's job. Tests confirm identical behavior.

## Migration / Rollout

No migration required. Deploy and monitor Sentry for 403 spikes.

## Open Questions

None.
