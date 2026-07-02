# Archive Report: CSP Hardening — Nonce-based Migration

**Status**: ✅ CLOSED
**Archive Date**: 2026-07-01
**Change**: csp-hardening
**Execution Mode**: auto
**Artifact Store Mode**: hybrid (OpenSpec + Engram)

---

## Executive Summary

The CSP hardening change migrated the Content Security Policy from `'unsafe-inline'`/`'unsafe-eval'` to nonce-based allowlisting, closing the primary XSS vector. Implementation spanned 3 tasks across middleware, layout propagation, and config cleanup. All 3 tasks completed with 16 new unit tests and zero regressions (1,489 total tests passing). The delta spec was merged into `openspec/specs/security/spec.md` as a new security domain specification.

---

## Artifact Lineage

| Phase | Engram ID | Filesystem Path |
|-------|-----------|-----------------|
| Proposal | #663 | `proposal.md` |
| Spec | #664 | `specs/security/spec.md` |
| Design | #665 | `design.md` |
| Tasks | #666 | `tasks.md` |
| Apply Progress | #667 | *(Engram only — no standalone file)* |
| Verify Report | #669 | `verify-report.md` |
| Archive Report | *(this artifact)* | `archive-report.md` |

---

## Implementation Summary

### Files Changed

| File | Action | Summary |
|------|--------|---------|
| `src/middleware.ts` | Modified | Added `buildCspPolicy()` pure function, nonce generation at handler start, `applyCsp()` helper, CSP header injection on HTML routes, `x-nonce` response header |
| `src/app/layout.tsx` | Modified | Added `headers()` import from `next/headers`, reads `x-nonce`, passes `<html nonce={nonce}>` |
| `next.config.js` | Modified | Removed ~33 lines of CSP construction block (cspParts, supabaseUrl/supabaseDomain, CSP header entry). All other security headers preserved. |
| `src/__tests__/unit/lib/csp/buildCspPolicy.test.ts` | Created | 16 unit tests covering nonce injection, strict-dynamic, unsafe-inline/unsafe-eval absence, GTM removal, MP domain preservation, production-only flags, edge cases |

### Key Decisions

| Decision | Rationale |
|----------|-----------|
| Nonce propagation via `request.headers.set()` | Direct mutation instead of clone. Simpler, functionally equivalent — the clone was unnecessary overhead. |
| `style-src 'unsafe-inline'` kept | `CalendarDayView`/`CalendarWeekView` inject `<style>` via `dangerouslySetInnerHTML`. CSS injection is lower severity than script injection. Extraction to `.module.css` deferred to follow-up. Marked with `ponytail:` comment. |
| `'unsafe-eval'` removed from CSP | Only server-side eval found (`src/lib/ai/embeddings/transformers.ts` line 75, guarded by `typeof window !== "undefined"` throw). Not executed in browser context. |
| GTM domains removed from `script-src` | No active GTM/GA injection code exists. `www.google.com` kept in `frame-src` for Google Sign-In. |
| `'strict-dynamic'` added | Required for Next.js chunk compatibility. Browsers < Safari 15.4 fall back to nonce + domain allowlists. |
| Zero new npm dependencies | `crypto.randomUUID()` is stdlib. Verified ~0.01ms per request overhead. |

### Deviations from Design

1. **Nonce propagation**: Design specified "clone `request.headers` separately" — implemented as direct `.set()` mutation. Functionally equivalent, simpler.
2. **`www.google.com` in `frame-src`**: Design said "remove all GTM domains" — kept in `frame-src` because it's used for Google Sign-In iframes, not GTM. Tests updated to verify this distinction.

---

## Verification Results

- **Status**: ✅ PASS
- **Total tests**: 1,489 (16 new CSP tests + 1,473 existing baseline)
- **Regressions**: 0
- **TypeScript errors from changes**: 0
- **Task completion**: 3/3 (100%)

### Requirements Coverage

| Req | Description | Result |
|-----|-------------|--------|
| REQ-CSP-001 | Per-request nonce generation | ✅ |
| REQ-CSP-002 | Remove `'unsafe-inline'` from `script-src` | ✅ |
| REQ-CSP-003 | Add `'strict-dynamic'` to `script-src` | ✅ |
| REQ-CSP-004 | Evaluate and remove `'unsafe-eval'` | ✅ (code) / ⚠️ (staging pending) |
| REQ-CSP-005 | Remove `'unsafe-inline'` from `style-src` | ⚠️ DEFERRED — kept with `ponytail:` comment |
| REQ-CSP-006 | Maintain third-party script allowlisting | ✅ |
| REQ-CSP-007 | Move CSP header generation to middleware | ✅ |
| REQ-CSP-008 | Nonce propagation to server components | ✅ |
| REQ-CSP-009 | Zero new dependencies | ✅ |
| REQ-CSP-010 | CSP console error audit | ⚠️ (staging audit pending) |
| REQ-CSP-011 | Performance overhead < 1ms | ✅ (~0.01ms per request) |
| REQ-CSP-012 | Preserve existing CSP directives | ✅ |

### Acceptance Criteria

| AC | Description | Result |
|----|-------------|--------|
| AC-01 | Production CSP shows nonce, not unsafe-inline | ✅ PASS |
| AC-02 | Admin pages load without CSP errors | ⚠️ (staging audit needed) |
| AC-03 | Mercado Pago integration works | ⚠️ (staging test needed) |
| AC-04 | Injected script blocked by CSP | ⚠️ (no E2E test) |
| AC-05a | unsafe-eval removed | ✅ code / ⚠️ staging |
| AC-05b | unsafe-eval documented if kept | ✅ PASS |
| AC-06 | GTM domains removed | ✅ PASS |
| AC-07 | Dev environment works | ⚠️ (needs local test) |
| AC-08 | Nonce is cryptographically random | ✅ PASS |

---

## Open Items

| # | Item | Type | Description | Status |
|---|------|------|-------------|--------|
| 1 | Staging CSP console audit | Verification | Manual CSP console error audit on all critical flows (dashboard, POS, customers, quotes, work orders, inventory, system) | 🔲 Pending |
| 2 | unsafe-eval staging test | Verification | Deploy to staging with `'unsafe-eval'` removed, verify no breakage in critical flows | 🔲 Pending |
| 3 | Nonce uniqueness stress test | Improvement | Add 1,000-iteration test for statistical confidence (~10ms) | 🔲 Optional |
| 4 | Calendar inline style extraction | Tech debt | Extract `CUSTOM_SCROLLBAR_CSS` from `CalendarDayView`/`CalendarWeekView` into `.module.css`; remove `'unsafe-inline'` from `style-src` | 🔲 Follow-up |
| 5 | CSP violation reporting | Enhancement | Add `report-uri`/`report-to` endpoint and processing pipeline for monitoring | 🔲 Follow-up |
| 6 | E2E injection block test | Testing | Add browser E2E test proving injected script is blocked by CSP | 🔲 Follow-up |

---

## Main Spec Merge

The delta spec from `specs/security/spec.md` has been merged into the main specs at `openspec/specs/security/spec.md` as a **new domain** (security). This is an ADDED specification — no existing spec was modified or removed.

---

## Archived Files

All change artifacts moved to `openspec/changes/archive/2026-07-01-csp-hardening/`:

```
openspec/changes/archive/2026-07-01-csp-hardening/
├── archive-report.md
├── proposal.md
├── design.md
├── tasks.md
├── verify-report.md
└── specs/
    └── security/
        └── spec.md
```
