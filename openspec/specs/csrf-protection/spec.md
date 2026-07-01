# CSRF Protection Specification

## Purpose

Prevent Cross-Site Request Forgery on state-changing API endpoints by validating the `Origin` (or `Referer`) header in Next.js middleware. No tokens, no sessions — lightweight header validation that stops `<form>` cross-site POSTs without adding state to the request path.

## Requirements

### Requirement: Origin/Referer Header Validation

The middleware MUST validate the `Origin` header on every POST, PUT, PATCH, and DELETE request. If `Origin` is absent, MUST fall back to `Referer`. If both are absent or parse to an invalid URL, MUST reject the request.

#### Scenario: Same-origin request passes

- GIVEN a POST request to `/api/orders` with `Origin: https://app.opttius.com`
- WHEN the middleware runs the CSRF check
- THEN the request proceeds

#### Scenario: Missing origin falls back to referer

- GIVEN a POST request to `/api/orders` with no `Origin` header and `Referer: https://app.opttius.com/orders`
- WHEN the middleware runs the CSRF check
- THEN it validates the `Referer` origin instead
- AND the request proceeds

#### Scenario: Mismatched origin is rejected

- GIVEN a POST request to `/api/orders` with `Origin: https://evil-site.com`
- WHEN the middleware runs the CSRF check
- THEN it returns 403 with `{ "error": "CSRF validation failed" }`

#### Scenario: Both origin and referer missing

- GIVEN a POST request to `/api/orders` with no `Origin` and no `Referer` headers
- WHEN the middleware runs the CSRF check
- THEN it returns 403

### Requirement: Safe Method Bypass

The middleware MUST skip CSRF validation for GET, HEAD, and OPTIONS requests. These are idempotent and not vulnerable to `<form>` CSRF.

#### Scenario: GET passes through

- GIVEN a GET request to `/api/orders`
- WHEN the middleware runs
- THEN the CSRF check is skipped
- AND the request proceeds

### Requirement: Exempt Route Bypass

The middleware MUST skip CSRF validation for requests to `/api/webhooks/*`, `/api/cron/*`, and `/api/admin/system/health`. These endpoints handle external POSTs (webhooks, cron jobs) that don't originate from a browser.

#### Scenario: Webhook POST is exempt

- GIVEN a POST request to `/api/webhooks/paypal` with `Origin: https://ip-origin.paypal.com`
- WHEN the middleware runs
- THEN the CSRF check is skipped
- AND the request proceeds

#### Scenario: Cron POST is exempt

- GIVEN a POST request to `/api/cron/daily-report`
- WHEN the middleware runs
- THEN the CSRF check is skipped
- AND the request proceeds

#### Scenario: Health check is exempt

- GIVEN a POST request to `/api/admin/system/health`
- WHEN the middleware runs
- THEN the CSRF check is skipped
- AND the request proceeds

### Requirement: Dev Localhost Support

The middleware SHOULD accept `http://localhost:3000` as a valid origin in addition to `NEXT_PUBLIC_APP_URL`. This allows local development without CSRF friction.

#### Scenario: Localhost dev request

- GIVEN a POST request from `http://localhost:3000` with `Origin: http://localhost:3000`
- AND `NEXT_PUBLIC_APP_URL` is `https://app.opttius.com`
- WHEN the middleware runs the CSRF check
- THEN the request proceeds

### Requirement: Descriptive 403 Response

On validation failure, the middleware MUST respond with status 403 and a JSON body containing a descriptive error.

#### Scenario: Error response format

- GIVEN a POST with a mismatched `Origin`
- WHEN the middleware rejects it
- THEN the response status MUST be 403
- AND the body MUST be `{ "error": "CSRF validation failed" }`
- AND `Content-Type` MUST be `application/json`

## Non-Goals

- No CSRF tokens (double-submit cookie pattern). Header validation only.
- No changes to webhook endpoints. They verify payload signatures independently.
- No per-route allowlisting. Defer until a real exception arises.
