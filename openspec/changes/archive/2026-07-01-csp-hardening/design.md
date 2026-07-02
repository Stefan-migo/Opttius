# Design: CSP Hardening — Nonce-based Migration

## Status

- **Change**: csp-hardening
- **Phase**: design
- **Delivery**: chained, stacked-to-main
- **Execution**: auto

## Technical Approach

### Overview

Migrate CSP from `'unsafe-inline'`/`'unsafe-eval'` to nonce-based allowlisting. The primary XSS vector today is `script-src 'unsafe-inline'` — ANY injected inline script executes because the policy trusts ALL of them. A per-request nonce (cryptographically random UUID, generated server-side, unknown to attackers) ensures only scripts bearing that nonce execute.

The CSP header moves from `next.config.js` `async headers()` (static) to `src/middleware.ts` (per-request dynamic). Other security headers remain in `next.config.js`.

### Nonce Propagation Strategy

The critical architectural question: **how does the nonce flow from middleware → layout → browser?**

Next.js 14 App Router has a dual-path constraint:
- Server components read REQUEST headers via `headers()` from `next/headers`
- Next.js internally reads RESPONSE header `x-nonce` for its auto-generated inline bootstrap scripts

**Solution — dual propagation:**

```
Middleware                                 Layout/Server Components
┌──────────────────────┐                    ┌──────────────────────┐
│ crypto.randomUUID()  │                    │ headers().get(       │
│ → nonce              │                    │   'x-nonce')         │
│                      │   request headers  │ → nonce              │
│ requestHeaders.set(  │ ─────────────────► │                      │
│   'x-nonce', nonce)──┘                    │ <html nonce={nonce}> │
│                      │                    │                      │
│ response.headers.set(│                    │ Next.js reads        │
│   'CSP', nonce-csp)  │                    │ x-nonce header →     │
│ response.headers.set(│                    │ applies to its own   │
│   'x-nonce', nonce)  │                    │ inline bootstrap     │
│                      │                    │ scripts              │
└──────────────────────┘                    └──────────────────────┘
```

#### Step-by-step:

1. **Middleware** (`src/middleware.ts`): Generate `nonce = crypto.randomUUID()` at the top of the handler, before any branching.
2. **Request headers**: Clone `request.headers`, set `x-nonce`, pass to `NextResponse.next({ request: { headers: requestHeaders } })`. This makes it visible to `headers()` in server components.
3. **Response headers**: Set `Content-Security-Policy` with `nonce-{value}` in `script-src` and `style-src`. ALSO set `x-nonce` as a response header so Next.js's internal HTML post-processor reads it and applies the nonce to its auto-generated inline scripts.
4. **Root layout** (`src/app/layout.tsx`): Read `headers().get('x-nonce')` and set `nonce={nonce}` on `<html>`. This makes the nonce available for:
   - Any explicit `<script nonce={...}>` or `<style nonce={...}>` in components
   - Any future `next/script` usage (accepts `nonce` prop)
   - Debugging/reference in components that need it

#### Why not cookies?

Cookies would work but add overhead: set in middleware, read in layout, then consume. Request header mutation is simpler — no serialization, no expiration, no deletion race.

### CSP Directive Changes

#### Current (`next.config.js`):
```
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://sdk.mercadopago.com https://http2.mlstatic.com www.google.com www.googletagmanager.com www.gstatic.com
style-src  'self' 'unsafe-inline' https://fonts.googleapis.com
```

#### Target (middleware):
```
script-src 'self' 'nonce-{random}' 'strict-dynamic' https://sdk.mercadopago.com https://http2.mlstatic.com
style-src  'self' 'nonce-{random}' https://fonts.googleapis.com
```

**Removed:**
- `'unsafe-inline'` from both `script-src` and `style-src` — replaced by nonce
- `'unsafe-eval'` — evaluated for removal (see § below)
- `www.google.com`, `www.googletagmanager.com`, `www.gstatic.com` — no active GTM/GA injection code exists
- `https://` scheme in domain entries — redundant, `'self'` already covers https origin

**Added:**
- `'nonce-{value}'` in `script-src` and `style-src`
- `'strict-dynamic'` in `script-src`

**Unchanged (preserved from current):**
- `default-src 'self'`
- `font-src 'self' https://fonts.gstatic.com https://http2.mlstatic.com data:`
- `img-src 'self' data: https: blob: {supabaseDomain}`
- `connect-src 'self' https: wss: ws: {supabaseDomain} https://*.supabase.co`
- `frame-src 'self' https://www.mercadopago.com https://secure-fields.mercadopago.com {supabaseDomain}`
- `media-src 'self' https:`
- `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`
- `worker-src 'self' blob:`, `manifest-src 'self'`
- `upgrade-insecure-requests` (production only)

### `'strict-dynamic'` Behavior

`'strict-dynamic'` tells the browser: once a script with a valid nonce loads, any script it dynamically creates is ALSO trusted — even if loaded from a domain not in the CSP. This is critical for Next.js because its code-split chunks are loaded dynamically by the bootstrapped script.

**Fallback:** Browsers that don't support `'strict-dynamic'` (Safari < 15.4, IE) ignore the token and fall back to the remaining `script-src` entries (`'nonce-{value}'`, `'self'`, domain allowlists). Nonce protection still works — `strict-dynamic` is additive.

### `'unsafe-eval'` Removal Assessment

**Server-side eval usage found:**
- `src/lib/ai/embeddings/transformers.ts` (line 75): `eval('import("@xenova/transformers")')` — server-side ONLY (guarded by `typeof window !== "undefined"` throw). Not executed in browser context.

**Browser-side eval usage:** None found. All `setTimeout`/`setInterval` calls pass function references, not strings.

**Verdict:** `'unsafe-eval'` can be removed from the browser-facing CSP. The staging verification per REQ-CSP-004 must still confirm, but code analysis indicates no breakage.

### Inline Style Risk Assessment

**Known inline style injection points:**

| File | Line | Pattern |
|------|------|---------|
| `CalendarDayView.tsx` | 44 | `<style dangerouslySetInnerHTML={{ __html: CUSTOM_SCROLLBAR_CSS }} />` |
| `CalendarWeekView.tsx` | 42 | `<style dangerouslySetInnerHTML={{ __html: CUSTOM_SCROLLBAR_CSS }} />` |

Both are **client components** (`"use client"`). These inject `<style>` tags that WILL be blocked when `style-src 'unsafe-inline'` is removed. The style contains custom scrollbar CSS for the appointment calendars.

**Decision:** For the initial migration, keep `style-src 'unsafe-inline'` and add a `ponytail:` comment documenting the blocker. This is a deliberate trade-off:

- `script-src` nonce migration addresses the high-severity XSS vector
- Inline style XSS is lower severity (CSS injection can't execute JS)
- Fixing the calendar components requires extracting CSS into a module or passing nonce props — meaningful scope that can be deferred

**Upgrade path:** Extract `CUSTOM_SCROLLBAR_CSS` into a `.module.css` file or move to Tailwind utilities. Then remove `style-src 'unsafe-inline'` in a follow-up.

## Component/Module Design

### Middleware Changes (`src/middleware.ts`)

```typescript
// New functions to add:

function generateNonce(): string {
  return crypto.randomUUID();  // UUID v4, 36 chars, available on Edge runtime
}

function buildCspPolicy(nonce: string, isProduction: boolean): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseDomain = supabaseUrl
    ? new URL(supabaseUrl).origin
    : 'https://*.supabase.co';

  // Build CSP with nonce in script-src and style-src
  const parts = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://sdk.mercadopago.com https://http2.mlstatic.com`,
    // ponytail: style-src keeps 'unsafe-inline' because CalendarDayView/CalendarWeekView
    // inject inline <style> via dangerouslySetInnerHTML. Remove when those are migrated
    // to CSS modules or accept a nonce prop.
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `font-src 'self' https://fonts.gstatic.com https://http2.mlstatic.com data:`,
    `img-src 'self' data: https: blob: ${supabaseDomain}`,
    `connect-src 'self' https: wss: ws: ${supabaseDomain} https://*.supabase.co`,
    `frame-src 'self' https://www.mercadopago.com https://secure-fields.mercadopago.com ${supabaseDomain}`,
    "media-src 'self' https:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ];

  if (isProduction) {
    parts.push('upgrade-insecure-requests');
  }

  return parts.join('; ');
}
```

**Middleware flow changes:**

```
request
  │
  ├─ Generate nonce
  ├─ Clone request headers, set x-nonce
  ├─ Build CSP with nonce
  │
  ├─ [existing logic: acceso-opticas, excluded paths, CSRF, session refresh]
  │
  └─ Every response that returns HTML:
       ├─ Set Content-Security-Policy header
       ├─ Set x-nonce response header (Next.js internal consumption)
       └─ return response
```

**Return point mapping:**

| Return point | Current | Modified |
|---|---|---|
| `pathname === "/"` | `return NextResponse.next()` | `return addCsp(NextResponse.next({ request: { headers } }))` |
| Excluded path (normal flow) | Falls through to CSRF/session | CSP added via modified `response` object |
| `/admin` no user | `return NextResponse.redirect(...)` | No CSP needed (redirect) |
| CSRF failure | `return NextResponse.json(...)` | No CSP needed (JSON API) |
| Normal flow (end) | `return response` | CSP added to `response` object |

### Root Layout Changes (`src/app/layout.tsx`)

```typescript
import { headers } from 'next/headers';

export default async function RootLayout({ children }) {
  const nonce = headers().get('x-nonce') ?? '';
  // ... existing supabase client, user fetch ...
  
  return (
    <html suppressHydrationWarning lang="es" nonce={nonce}>
      {/* body unchanged */}
    </html>
  );
}
```

The `nonce={nonce}` on `<html>` is for:
- Any component that renders inline `<script>` or `<style>` tags and needs the nonce
- Next.js auto-detection in some versions
- Explicit reference from any child component (e.g., `<Script nonce={nonce}>`)

### `next.config.js` Changes

Remove the `cspParts` block (lines 142-163) from `async headers()`. Keep ALL other security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, X-XSS-Protection, Permissions-Policy, Cross-Origin-Opener-Policy, Cross-Origin-Resource-Policy, Strict-Transport-Security).

### GTM Domain Evaluation

**Finding:** The SEOManager component stores `seo_google_tag_manager_id` and `seo_google_analytics_id` in DB config, but there is NO code that injects GTM/GA scripts into pages. The GTM domains in the current CSP (`www.google.com`, `www.googletagmanager.com`, `www.gstatic.com`) were added speculatively but are dead code.

**Decision:** Remove all three GTM-related domains from CSP. If GTM/GA injection is implemented later, the CSP must be updated at that time.

### Supabase URL Handling

The current CSP dynamicall includes the Supabase project URL in `img-src`, `connect-src`, and `frame-src`. This logic moves to the middleware `buildCspPolicy()` function unchanged.

The `supabaseUrl.includes("127.0.0.1")` check for WebSocket on local development is preserved.

## File Changes

| File | Change Type | Impact |
|------|-------------|--------|
| `src/middleware.ts` | Modified | Add `generateNonce()` + `buildCspPolicy()` + nonce propagation + CSP header setting |
| `src/app/layout.tsx` | Modified | Import `headers()`, read `x-nonce`, pass to `<html nonce={nonce}>` |
| `next.config.js` | Modified | Remove CSP from `async headers()` block (lines 142-163) |

**No new files. No new dependencies.**

## Data Flow

```
1. Browser sends request
       │
2. Middleware receives request
       │
3. Middleware generates nonce = crypto.randomUUID()
       │
4. Middleware clones request headers, sets x-nonce
       │
5. Middleware calls NextResponse.next({ request: { headers } })
       │
6. Middleware sets CSP on response (with nonce in script-src, style-src)
   Middleware sets x-nonce on response (Next.js reads this for its scripts)
       │
7. Server component (layout) renders
   - Reads headers().get('x-nonce')
   - Sets <html nonce={nonce}>
       │
8. Next.js renders inline bootstrap scripts
   - Reads x-nonce from response headers
   - Applies nonce to auto-generated <script> tags
       │
9. Browser receives HTML + CSP header
   - Validates all scripts against nonce
   - Blocks any script without matching nonce
```

## Implementation Order

### Phase 1: Core Middleware CSP (highest risk, highest value)

1. Add `buildCspPolicy(nonce, isProduction)` function to middleware
2. Add nonce generation at top of middleware handler
3. Set CSP header + x-nonce on all HTML response paths
4. Verify: CSP header appears on all pages with correct nonce

### Phase 2: Layout Nonce Propagation

1. Import `headers()` in layout
2. Read `x-nonce`, pass to `<html nonce={nonce}>`
3. Verify: Nonce attribute present in rendered HTML

### Phase 3: Clean up `next.config.js`

1. Remove CSP block from `async headers()`
2. Keep all other security headers
3. Verify: No duplicate CSP headers

### Phase 4: Third-Party Domain Cleanup

1. Remove GTM domains from CSP (`www.google.com`, `www.googletagmanager.com`, `www.gstatic.com`)
2. Remove unused `https://` scheme entries where redundant

### Phase 5: `'unsafe-eval'` Staging Test

1. Deploy to staging with `'unsafe-eval'` removed
2. Run all critical flows
3. If pass → keep removed. If fail → re-add with `ponytail:` comment.
4. Verify: CSP header contains or omits `'unsafe-eval'` per test result

### Phase 6: Verification (post-deploy)

1. Manual CSP console error audit on all critical flows (per REQ-CSP-010)
2. Mercado Pago checkout test
3. Verify nonce is unique per request (AC-08)

## Testing Strategy

### Automated Tests

```typescript
// Test: CSP header structure (integration)
// Location: src/__tests__/middleware/csp.test.ts
describe('CSP Middleware', () => {
  it('sets Content-Security-Policy header with nonce', async () => {
    const response = await fetch('/');
    const csp = response.headers.get('Content-Security-Policy');
    expect(csp).toContain("script-src 'self' 'nonce-");
    expect(csp).toContain("'strict-dynamic'");
    expect(csp).not.toContain("'unsafe-inline'");
  });

  it('generates unique nonce per request', async () => {
    const [r1, r2] = await Promise.all([fetch('/'), fetch('/')]);
    const nonce1 = r1.headers.get('Content-Security-Policy')?.match(/nonce-([^\s']+)/)?.[1];
    const nonce2 = r2.headers.get('Content-Security-Policy')?.match(/nonce-([^\s']+)/)?.[1];
    expect(nonce1).not.toBe(nonce2);
  });

  it('preserves other security headers in next.config.js', async () => {
    const response = await fetch('/');
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  it('keeps Mercado Pago domains in script-src', async () => {
    const csp = await fetch('/').then(r => r.headers.get('Content-Security-Policy'));
    expect(csp).toContain('https://sdk.mercadopago.com');
    expect(csp).toContain('https://http2.mlstatic.com');
  });

  it('removes GTM domains from script-src', async () => {
    const csp = await fetch('/').then(r => r.headers.get('Content-Security-Policy'));
    expect(csp).not.toContain('googletagmanager');
    expect(csp).not.toContain('www.google.com');
    expect(csp).not.toContain('www.gstatic.com');
  });
});
```

### Manual Verification Checklist

- [ ] All admin pages (dashboard, POS, customers, quotes, work orders, inventory, system) load without CSP console errors
- [ ] Mercado Pago checkout renders correctly
- [ ] CalendarDayView and CalendarWeekView inline styles work (via `'unsafe-inline'` in style-src)
- [ ] JSON-LD structured data renders (not affected by script-src)
- [ ] Dev environment hot-reload works (no CSP errors during development)
- [ ] Production shows `upgrade-insecure-requests` directive
- [ ] Nonce IS unique across consecutive requests
- [ ] `'unsafe-eval'` removal confirmed working in staging (or documented with reason to keep)

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Nonce propagation fails — Next.js inline scripts blocked | Low | Critical — app doesn't render | Dual propagation (request + response headers) covers both paths. `strict-dynamic` provides additional fallback. Test on staging first. |
| `strict-dynamic` breaks Mercado Pago SDK | Low | Medium — payment failure | Mercado Pago SDK loaded via `<script src="...">` (external), not dynamically. Domain allowlist covers it independently of `strict-dynamic`. |
| Calendar inline styles break | Medium | Medium — custom scrollbar missing | Keep `'unsafe-inline'` in `style-src` with `ponytail:` comment. Zero user-facing breakage. |
| CSP prevents analytics/tracking in future | Low | Low | GTM domains removed because no active injection. If GTM/GA is added later, CSP must be updated in tandem. |
| `'unsafe-eval'` removal breaks unknown dependency | Low | Medium — staging catches before production | Staging test in Phase 5 catches breakage. If it happens, re-add with documented reason. |

## Rollback Plan

1. Restore `next.config.js` CSP block to original values
2. Revert middleware CSP changes
3. Revert layout nonce changes
4. Single-commit revert, immediate deploy
5. Verify original CSP headers return
