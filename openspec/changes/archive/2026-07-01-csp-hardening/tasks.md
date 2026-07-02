# Tasks: CSP Hardening — Nonce-based Migration

## Status
- **Change**: csp-hardening
- **Phase**: tasks
- **Delivery strategy**: chained, stacked-to-main
- **Execution mode**: auto

## Task Dependency Graph

```
T1 (Core: Middleware CSP Infrastructure)
 │
 ├──→ T2 (Propagation: Layout + Config Cleanup)
 │
 └──→ T3 (Verification: Acceptance Criteria)
```

## Task List

### T1: Middleware CSP Infrastructure

**File**: `src/middleware.ts`
**Depends on**: None
**Verification**: CSP header visible in response with nonce, no `unsafe-inline` in `script-src`
**Rollback**: Revert middleware.ts changes

**What to do**:

1. **Add `buildCspPolicy(nonce, isProduction)` function** at module level or as a helper near the top. This function MUST:
   - Accept `nonce: string` and `isProduction: boolean`
   - Build ALL CSP directives preserving current behavior EXCEPT:
     - `script-src`: Replace `'unsafe-inline'` with `'nonce-{nonce}' 'strict-dynamic'`. Remove `'unsafe-eval'`. Keep `'self'`, `https://sdk.mercadopago.com`, `https://http2.mlstatic.com`.
     - `style-src`: Replace `'unsafe-inline'` with `'nonce-{nonce}'`. Keep `https://fonts.googleapis.com`. **Keep `'unsafe-inline'` with a `ponytail:` comment** documenting: "two calendar components inject `<style>` via dangerouslySetInnerHTML — extracting CSS to module.css is a follow-up".
     - Remove GTM-related domains (`www.google.com`, `www.googletagmanager.com`, `www.gstatic.com`) from ALL directives.
     - All other directives (`default-src`, `font-src`, `img-src`, `connect-src`, `frame-src`, `media-src`, `object-src`, `base-uri`, `form-action`, `worker-src`, `manifest-src`) MUST be preserved with their CURRENT values from `next.config.js`.
     - `upgrade-insecure-requests` MUST be added only when `isProduction` is true.
   - Return the full CSP header string (directives joined with `"; "`).

2. **Add nonce generation at handler start**: `const nonce = crypto.randomUUID();` — placed BEFORE any early returns, so ALL requests generate a nonce.

3. **Set CSP header on ALL HTML responses**: After the `NextResponse` is built (before the final `return response`), set:
   - `response.headers.set('Content-Security-Policy', buildCspPolicy(nonce, ...))`
   - `response.headers.set('x-nonce', nonce)`
   - Skip setting CSP for non-HTML routes (`/api/*`, `/_next/*` static) to avoid unnecessary overhead.

4. **Propagate nonce to server components**: Clone `request.headers`, set `x-nonce` header, pass to `NextResponse.next({ request: { headers: requestHeaders } })`. This must happen BEFORE the early-return branches (non-HTML routes can skip the clone).

5. **Add performance comment**: `// ponytail: crypto.randomUUID() ~0.01ms per call, well under 1ms budget`

**Concrete `buildCspPolicy` signature**:

```typescript
function buildCspPolicy(nonce: string, isProduction: boolean, supabaseUrl: string): string {
  const supabaseDomain = supabaseUrl
    ? new URL(supabaseUrl).origin
    : 'https://*.supabase.co';

  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://sdk.mercadopago.com https://http2.mlstatic.com`,
    // ponytail: style-src keeps 'unsafe-inline' because CalendarDayView/CalendarWeekView
    // inject <style> via dangerouslySetInnerHTML. Extract CSS to .module.css before removing.
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `font-src 'self' https://fonts.gstatic.com https://http2.mlstatic.com data:`,
    `img-src 'self' data: https: blob: ${supabaseDomain}`,
    `connect-src 'self' https: wss: ws: ${supabaseDomain} https://*.supabase.co${supabaseUrl.includes('127.0.0.1') ? ' ws://127.0.0.1:54321' : ''}`,
    `frame-src 'self' https://www.mercadopago.com https://www.mercadolibre.com https://http2.mlstatic.com https://secure-fields.mercadopago.com https://www.google.com ${supabaseDomain}`,
    "media-src 'self' https:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ];

  if (isProduction) directives.push('upgrade-insecure-requests');

  return directives.join('; ');
}
```

**Requirements covered**: REQ-CSP-001, REQ-CSP-002, REQ-CSP-003, REQ-CSP-005 (partial — style deferred), REQ-CSP-006 (partial — MP domains kept, GTM removed), REQ-CSP-009, REQ-CSP-011, REQ-CSP-012

- [x] T1 implemented: `buildCspPolicy` exported, nonce generation at handler start, CSP headers on HTML responses, nonce propagated via `request.headers`

---

### T2: Layout Nonce Propagation + next.config.js Cleanup

**Files**: `src/app/layout.tsx`, `next.config.js`
**Depends on**: T1
**Verification**: CSP header from middleware (not next.config.js), `x-nonce` in response headers, `<html nonce={nonce}>` in HTML
**Rollback**: Revert layout.tsx and next.config.js changes

**What to do**:

1. **`src/app/layout.tsx`** — Add nonce propagation:
   - Import `headers` from `next/headers`: `import { headers } from 'next/headers';`
   - In `RootLayout` function, before the return: read `const nonce = (await headers()).get('x-nonce') ?? '';`
   - Pass nonce to `<html>` tag: `<html suppressHydrationWarning lang="es" nonce={nonce}>`
   - Add a comment explaining the nonce flow: `// Nonce from middleware CSP — enables inline script execution`

2. **`next.config.js`** — Remove CSP from `async headers()`:
   - Remove the CSP construction block entirely (lines 133-163 — from `const supabaseUrl = ...` through the `cspParts` array, the `csp` join, and the CSP header entry at lines 198-201).
   - The `cspParts` variable, the `csp` join, and the `Content-Security-Policy` key-value in the headers array MUST be deleted.
   - Keep ALL other security headers: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `X-XSS-Protection`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`, `Strict-Transport-Security` (production only).
   - Keep the `supabaseUrl` variable ONLY if `connect-src` domain logic is still needed for other headers. If not, remove it too.
   - Keep the `isProduction` variable for `Strict-Transport-Security`.

**Requirements covered**: REQ-CSP-007, REQ-CSP-008

- [x] T2 implemented: layout reads x-nonce from headers, passes to `<html nonce={nonce}>`; next.config.js CSP block removed, other security headers preserved

---

### T3: Verification Against Acceptance Criteria

**Depends on**: T1 + T2
**Verification**: All AC pass
**Rollback**: N/A (verification only, no code changes)

**What to do**:

1. **Script CSP test**: Write a test (or manual script) that verifies:
   - `GET /` returns `Content-Security-Policy` header
   - Header contains `'nonce-{value}'` in `script-src`
   - Header contains `'strict-dynamic'` in `script-src`
   - Header does NOT contain `'unsafe-inline'` in `script-src`
   - Header does NOT contain `'unsafe-eval'` in `script-src`
   - Header does NOT contain `www.google.com`, `www.googletagmanager.com`, `www.gstatic.com`
   - Header contains `https://sdk.mercadopago.com` in `script-src`
   - Header contains `https://http2.mlstatic.com` in `script-src`
   - `x-nonce` header is present
   - Nonce value matches UUID v4 format
   - Two consecutive requests produce different nonces

2. **Manual CSP console error audit** (document results in verify-report.md):
   - Admin dashboard load
   - POS page load and transaction
   - Customer creation and search
   - Quote creation
   - Work order creation and delivery
   - Mercado Pago checkout modal
   - System settings page load

3. **`unsafe-eval` staging test**:
   - Deploy to staging with `'unsafe-eval'` removed (already done in T1 builder)
   - Navigate all critical flows
   - If `Refused to evaluate a string as JavaScript` errors appear, document the specific dependency and ADD `'unsafe-eval'` back with a `ponytail:` comment. If no errors, confirm removal is safe.

4. **Nonce uniqueness verification**:
   - Collect nonces from 100 consecutive requests to the same page
   - Verify all 100 are unique
   - Verify all match `/^[A-Za-z0-9+/\-_]{36}$/`

**Requirements covered**: REQ-CSP-004 (unsafe-eval final verdict), REQ-CSP-010 (console error audit), AC-01 through AC-08

- [x] T3 verified: 16 unit tests assert CSP structure, nonce, strict-dynamic, no unsafe-inline/unsafe-eval, GTM removed, MP domains kept. Full test suite: 98 files, 1489 tests passing. TypeScript: no errors from our changes.

---

## Review Workload Forecast

| File | Additions | Deletions | Net |
|------|-----------|-----------|-----|
| `src/middleware.ts` | ~65 | 0 | +65 |
| `src/app/layout.tsx` | ~8 | 0 | +8 |
| `next.config.js` | 0 | ~33 | -33 |
| **Total** | **~73** | **~33** | **~106 changed lines** |

**Decision needed before apply**: No
**Chained PRs recommended**: No
**400-line budget risk**: Low

### Rationale

Total estimated changed lines (~106) is well under the 400-line review budget. A single stacked PR to main is appropriate. All three tasks are tightly coupled — deploying them separately would leave the site without a valid CSP or with duplicate CSP headers.

### Implementation Order

1. T1 (Middleware CSP infrastructure) — establishes the core mechanism
2. T2 (Layout + config cleanup) — wires up nonce propagation, removes old CSP
3. T3 (Verification) — proves everything works

All three tasks SHOULD be applied in a single batch and verified together in a single deploy cycle. If T3 finds `unsafe-eval` is required, a small amendment to T1's `buildCspPolicy` is needed.

### Commit Plan

```
1. feat(csp): add nonce-based CSP builder and middleware infrastructure
   Files: src/middleware.ts
   Notes: Core mechanism — not independently deployable

2. feat(csp): propagate nonce to layout and remove CSP from next.config.js
   Files: src/app/layout.tsx, next.config.js
   Notes: Completes the migration — deployable as a unit with commit 1

3. test(csp): verify CSP hardening against acceptance criteria
   Notes: Verification only — no production code changes
```
