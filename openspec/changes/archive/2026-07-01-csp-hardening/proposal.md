# Proposal: CSP Hardening — Nonce-based Migration

## Intent

Current CSP uses `'unsafe-inline'` for `script-src` and `style-src`, nullifying XSS protection. Migrate to nonces so legitimate inline scripts (Next.js chunks) work while injected scripts are blocked.

## Scope

### In Scope
- Per-request nonce generation in middleware (`crypto.randomUUID()`)
- Move CSP header from `next.config.js` `async headers()` to middleware (need per-request nonce)
- Replace `script-src 'unsafe-inline'` with `'nonce-{value}'`
- Add `'strict-dynamic'` to `script-src` for Next.js chunk compatibility
- Evaluate and remove `'unsafe-eval'` (Next.js 14.2 may not need it)
- Allowlist third-party domains: Mercado Pago SDK, Google Fonts
- Remove unused GTM entries (`www.google.com`, `www.googletagmanager.com`, `www.gstatic.com`) from CSP
- Style-src `'nonce-{value}'` + Google Fonts allowlist

### Out of Scope
- CSP violation reporting endpoint (`report-uri`/`report-to`)
- Full browser compatibility matrix for `strict-dynamic`
- Migration audit of every inline style in the app (deferred)

## Capabilities

### New Capabilities
- `web-security`: CSP rules, security headers suite. First artifact: nonce-based CSP migration.

### Modified Capabilities
- None. No existing `web-security` spec in `openspec/specs/`.

## Approach

1. **Middleware**: Generate nonce via `crypto.randomUUID()`, build CSP header with nonce injected per-directive, set on response.
2. **next.config.js**: Remove CSP from `async headers()` (keep other security headers). CSP moves to middleware.
3. **Root layout**: Read nonce from `headers()` (server API) and expose to inline `<script>` / `<style>` tags.
4. **Third-party**: Mercado Pago scripts loaded via their SDK URL remain allowlisted by domain — no nonce needed. `strict-dynamic` propagates trust to dynamically loaded chunks.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/middleware.ts` | Modified | Add nonce generation + CSP header builder |
| `next.config.js` | Modified | Remove CSP from headers section |
| `src/app/layout.tsx` | Modified | Read nonce for script/style tags |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Next.js chunks blocked by nonce | Low | `strict-dynamic` propagates trust from nonced parent |
| Mercado Pago SDK fails | Low | Domain allowlisting covers external SDK scripts |
| `unsafe-eval` removal breaks something | Med | Evaluate first in staging before including in MVP |
| Inline styles blocked after removing `style-src 'unsafe-inline'` | Med | Add style nonce; audit known inline styles in layouts |

## Rollback Plan

Restore `next.config.js` CSP to original values. Remove middleware CSP override. Single-commit revert, immediate deploy.

## Dependencies

- Next.js 14.2.35 (current) — supports server-side `headers()` for nonce
- No new npm dependencies (`crypto.randomUUID()` is stdlib)

## Success Criteria

- [ ] Production CSP headers show `nonce-{value}` not `unsafe-inline` in `script-src`
- [ ] All admin pages load without CSP console errors
- [ ] Mercado Pago checkout and subscriptions render correctly
- [ ] No regression in customer flows (POS, quotes, work orders)
- [ ] `unsafe-eval` absent (or kept with documented rationale)
