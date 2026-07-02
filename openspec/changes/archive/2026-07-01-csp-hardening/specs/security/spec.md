# CSP Hardening — Nonce-based Migration

## Purpose

Migrate the Content Security Policy from `'unsafe-inline'`/`'unsafe-eval'` to nonce-based allowlisting. This closes the primary XSS vector: currently any injected inline script executes because the policy trusts ALL inline scripts via `'unsafe-inline'`. A nonce-based policy ensures only scripts with a per-request cryptographic nonce (generated server-side, unknown to an attacker) are executed.

## Requirements

### REQ-CSP-001: Per-request Nonce Generation

The middleware MUST generate a cryptographically random nonce per request using `crypto.randomUUID()`. The nonce MUST be unique per HTTP response and MUST NOT be reusable across requests.

The nonce MUST be injected into the `Content-Security-Policy` header for `script-src` and `style-src` directives.

#### Scenario: Nonce is present in CSP header

- GIVEN a GET request to any page
- WHEN the middleware processes the request and builds the response
- THEN the `Content-Security-Policy` header MUST contain `'nonce-{value}'` in the `script-src` directive
- AND the same nonce value MUST appear in the `style-src` directive
- AND the nonce value MUST match `/^[A-Za-z0-9+/_-]{36}$/` (format of a UUID v4)

#### Scenario: Nonce is unique per request

- GIVEN two consecutive GET requests to the same page
- WHEN the middleware processes both requests
- THEN the nonce value in the first response MUST differ from the nonce value in the second response

### REQ-CSP-002: Remove `'unsafe-inline'` from `script-src`

The `script-src` directive MUST NOT contain `'unsafe-inline'`. The per-request nonce (`'nonce-{value}'`) and `'strict-dynamic'` MUST replace it.

#### Scenario: unsafe-inline is absent

- GIVEN the middleware builds the CSP header
- WHEN the `script-src` directive is constructed
- THEN `'unsafe-inline'` MUST NOT appear in the directive
- AND `'nonce-{value}'` MUST appear
- AND `'strict-dynamic'` MUST appear

#### Scenario: Inline script with matching nonce executes

- GIVEN a page that includes `<script nonce="{value}">console.log('safe')</script>`
- WHEN the browser loads the page
- THEN the inline script MUST execute without CSP errors

#### Scenario: Injected inline script without nonce is blocked

- GIVEN an attacker injects `<script>alert('xss')</script>` into the page
- WHEN the browser loads the page
- THEN the script MUST be blocked by CSP
- AND a CSP violation event MUST be generated in the browser console

### REQ-CSP-003: Add `'strict-dynamic'` to `script-src`

The `script-src` directive MUST include `'strict-dynamic'` to propagate trust from the nonced entry-point script to dynamically loaded scripts (Next.js chunks, deferred modules).

#### Scenario: Next.js chunk loads correctly

- GIVEN an admin page that loads a chunked component dynamically
- WHEN the page loads in the browser
- THEN the dynamically loaded chunk MUST execute without CSP errors
- AND the application MUST render without console errors

#### Scenario: Behaviour-altering fallback for `strict-dynamic`

- GIVEN a browser that does NOT support `'strict-dynamic'` (e.g. Safari < 15.4, IE)
- WHEN the CSP header is parsed
- THEN `'strict-dynamic'` MUST be treated as a no-op by unsupported browsers (standard CSP fallback behaviour)
- AND the nonce MUST still provide protection for scripts parsed in those browsers

### REQ-CSP-004: Evaluate and Remove `'unsafe-eval'`

The `'unsafe-eval'` source in `script-src` SHOULD be removed. Before removal, the team MUST verify that no part of the application depends on `eval()`, `Function()`, `setTimeout(string)`, or similar dynamic code execution.

This evaluation MUST be done in a staging environment. If removal causes breakage, the specific code path causing the eval dependency MUST be documented, and `'unsafe-eval'` MAY remain with a `ponytail:` comment documenting the cause and upgrade path.

#### Scenario: unsafe-eval is removable

- GIVEN staging tests pass with `'unsafe-eval'` removed from `script-src`
- WHEN the production deployment applies the policy
- THEN `'unsafe-eval'` MUST NOT appear in the `script-src` directive
- AND the application MUST function without `eval()`-related errors

#### Scenario: unsafe-eval is required

- GIVEN staging tests fail or produce `Refused to evaluate a string as JavaScript` errors
- WHEN the team identifies the specific dependency causing the requirement
- THEN the production CSP MUST retain `'unsafe-eval'`
- AND a `ponytail:` comment MUST be added in code explaining the dependency and the condition for removal

### REQ-CSP-005: Remove `'unsafe-inline'` from `style-src`

The `style-src` directive MUST NOT contain `'unsafe-inline'`. The per-request nonce MUST replace it for inline `<style>` tags. Domain-based allowlisting for `https://fonts.googleapis.com` MUST remain.

#### Scenario: unsafe-inline absent from style-src

- GIVEN the middleware builds the CSP header
- WHEN the `style-src` directive is constructed
- THEN `'unsafe-inline'` MUST NOT appear
- AND `'nonce-{value}'` MUST appear
- AND `https://fonts.googleapis.com` MUST appear

#### Scenario: Inline style with matching nonce applies

- GIVEN a page that includes `<style nonce="{value}">.highlight { color: red; }</style>`
- WHEN the browser loads the page
- THEN the inline style MUST apply without CSP errors

#### Scenario: Inline style without nonce is blocked

- GIVEN a component injects `<style>.danger { color: red; }</style>` without a nonce attribute
- WHEN the browser loads the page
- THEN the style MUST be blocked by CSP
- AND a CSP violation MUST be logged in browser console

### REQ-CSP-006: Maintain Third-Party Script Allowlisting

External script domains that cannot use nonces (loaded via `<script src="...">` without a SRI/nonce-compatible mechanism) MUST remain allowlisted by domain in `script-src`.

The following domains MUST remain in `script-src`:
- `https://sdk.mercadopago.com` — Mercado Pago SDK
- `https://http2.mlstatic.com` — Mercado Pago static assets

The following GTM-related domains MUST be evaluated for removal. If Google Tag Manager is not actively used, they SHOULD be removed. If actively used, they MUST remain with a `ponytail:` comment documenting usage:
- `https://www.google.com`
- `https://www.googletagmanager.com`
- `https://www.gstatic.com`

#### Scenario: Mercado Pago checkout loads without CSP errors

- GIVEN a user initiates a Mercado Pago checkout flow
- WHEN the Mercado Pago SDK script loads from `https://sdk.mercadopago.com`
- THEN the script MUST execute without CSP errors
- AND the checkout MUST render correctly

#### Scenario: GTM domains removed when unused

- GIVEN GTM is not configured in the application
- WHEN the CSP header is built
- THEN `www.google.com`, `www.googletagmanager.com`, and `www.gstatic.com` MUST NOT appear in `script-src`
- AND no application functionality is affected

### REQ-CSP-007: Move CSP Header Generation to Middleware

The CSP header MUST be generated in `src/middleware.ts`, not in `next.config.js` `async headers()`. This enables per-request nonce injection.

The CSP entry in `next.config.js` `async headers()` MUST be removed. All other security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, X-XSS-Protection, Permissions-Policy, Cross-Origin-Opener-Policy, Cross-Origin-Resource-Policy, Strict-Transport-Security) MUST remain in `next.config.js`.

#### Scenario: CSP header from middleware

- GIVEN a response to any request
- WHEN the response headers are inspected
- THEN the `Content-Security-Policy` header MUST be present
- AND its source MUST be the middleware (not `next.config.js`)
- AND its value MUST contain the per-request nonce

#### Scenario: Other security headers unchanged

- GIVEN a response to any request
- WHEN the response headers are inspected
- THEN `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, and `Cross-Origin-Resource-Policy` MUST be present
- AND `Strict-Transport-Security` MUST be present in production responses

### REQ-CSP-008: Nonce Propagation to Server Components

The root layout (`src/app/layout.tsx`) MUST read the nonce from the response/request context and make it available to any component that renders inline `<script>` or `<style>` tags.

Since Next.js 14 does not expose a standard `headers().get('Content-Security-Policy')` for nonce extraction in server components, the nonce MUST be passed via an alternative mechanism:
1. The middleware generates the nonce and sets it on the response headers AND on the `X-Nonce` custom response header (for downstream server component consumption), OR
2. The nonce is set via `cookies` that the layout can read, OR
3. The nonce is extracted from the `Content-Security-Policy` header in the server component using `headers()` API.

The chosen mechanism MUST be documented in the implementation.

#### Scenario: Server-rendered script tag has nonce

- GIVEN a server component renders `<script nonce={nonce}>...</script>`
- WHEN the browser parses the HTML
- THEN the script MUST execute without CSP violation

### REQ-CSP-009: Non-functional — Zero New Dependencies

The implementation MUST NOT add new npm packages. `crypto.randomUUID()` (available in both Edge and Node.js runtimes) MUST be the only cryptographic primitive used.

### REQ-CSP-010: Non-functional — CSP Console Error Audit

After deployment, there MUST be zero CSP-related console errors (or `Refused to execute/apply` warnings) in the following critical flows:
- Admin dashboard load
- POS page load and transaction
- Customer creation and search
- Quote creation
- Work order creation and delivery
- Mercado Pago checkout modal
- System settings page load

### REQ-CSP-011: Non-functional — Performance Overhead

The nonce generation and CSP header construction in middleware MUST add no more than 1ms of processing time per request.

### REQ-CSP-012: Preserve Existing CSP Directives

All CSP directives that do not involve `'unsafe-inline'` or `'unsafe-eval'` MUST be preserved with their current values. Specifically:
- `default-src`, `font-src`, `img-src`, `connect-src`, `frame-src`, `media-src`, `object-src`, `base-uri`, `form-action`, `worker-src`, `manifest-src` MUST remain unchanged
- `upgrade-insecure-requests` MUST be added only in production (same as current behaviour)

## Constraints

| Constraint | Description |
|------------|-------------|
| Next.js 14.2 Edge/Node runtime | Middleware runs on Edge runtime by default in Next.js 14. `crypto.randomUUID()` is available on Edge. |
| `'strict-dynamic'` browser support | Not supported in IE, Safari < 15.4. Target users (Chilean optical shops) use modern browsers — acceptable trade-off. |
| No new npm deps | The implementation MUST use stdlib only. |
| Single deployment unit | CSP changes are high-risk; deployment must be atomic (single commit, single deploy). |
| Dev environment continuity | Local development on `localhost` MUST work with the nonce-based CSP. |

## Out of Scope

| Item | Rationale |
|------|-----------|
| CSP violation reporting (`report-uri` / `report-to`) | Requires a collection endpoint and processing pipeline. Can be added later as a monitoring enhancement. |
| Full inline style migration audit | The spec requires nonce for `<style>` tags but does not require auditing every component that uses inline styles. Deferred — may use `'unsafe-hashes'` in a follow-up. |
| Full browser compatibility matrix | Only the `'strict-dynamic'` fallback behaviour is documented. Full matrix deferred. |
| Adding new third-party domains to CSP | Only existing domains are evaluated and migrated. New third-party integrations are separate changes. |
| SRI (Subresource Integrity) for external scripts | Nonce-based CSP is the primary mechanism. SRI adds a second layer but is out of scope for this change. |
| CSP header in API responses | API routes (`/api/*`) are not HTML pages and typically don't have inline scripts. CSP for API responses is deferred. |

## Acceptance Criteria

### AC-01: Production CSP shows nonce, not unsafe-inline

```gherkin
Given a production response from any page
When the Content-Security-Policy header is inspected
Then script-src MUST contain 'nonce-{value}' and 'strict-dynamic'
And script-src MUST NOT contain 'unsafe-inline'
And style-src MUST contain 'nonce-{value}'
And style-src MUST NOT contain 'unsafe-inline'
```

### AC-02: Admin pages load without CSP console errors

```gherkin
Given a logged-in admin user
When the user navigates to all admin pages (dashboard, POS, customers, quotes, work orders, inventory, system)
Then the browser console MUST show zero CSP-related errors
And every page MUST render its full UI without visible breakage
```

### AC-03: Mercado Pago integration works

```gherkin
Given an admin user on the POS or subscriptions page
When the user triggers a Mercado Pago checkout
Then the Mercado Pago SDK script MUST load and execute
And the checkout modal MUST render correctly
And no CSP errors appear in the console
```

### AC-04: Injected script is blocked

```gherkin
Given a page served with the nonce-based CSP
When an attacker injects a <script>alert('xss')</script> payload (simulated via browser dev tools)
Then the script MUST be blocked by CSP
And the console MUST show a CSP violation for script-src
```

### AC-05: unsafe-eval status documented

```gherkin
Given the staging deployment passes with 'unsafe-eval' removed
When the production CSP header is inspected
Then 'unsafe-eval' MUST NOT appear in script-src
```

```gherkin
Given the staging deployment fails without 'unsafe-eval'
When the production CSP header is inspected
Then 'unsafe-eval' MUST appear in script-src
And the codebase MUST contain a comment documenting the dependency and removal path
```

### AC-06: GTM domains removed if unused

```gherkin
Given the application has no active GTM integration
When the CSP header is inspected
Then www.google.com, www.googletagmanager.com, and www.gstatic.com MUST NOT appear in any directive
```

### AC-07: Dev environment works

```gherkin
Given a developer running the app on http://localhost:3000
When the developer loads any page
Then the page MUST render without CSP errors
And Next.js hot-reload MUST work without CSP violations
```

### AC-08: Nonce is cryptographically random

```gherkin
Given 1000 consecutive requests to the same page
When each response's CSP nonce is collected
Then all 1000 nonces MUST be unique
And each nonce MUST match UUID v4 format
```
