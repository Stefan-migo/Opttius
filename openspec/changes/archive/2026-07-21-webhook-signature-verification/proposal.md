# Proposal: Webhook Signature Verification

## Intent

Close 3 webhook endpoints that accept unauthenticated POST requests from the public internet. Anyone can currently POST fake payment fulfillments (PayPal, Flow) or fake email delivery events (Resend). The audit identified these as the remaining gaps after Mercado Pago, NOWPayments, and WhatsApp were already secured.

## Scope

### In Scope

- **PayPal**: Implement `POST /v1/notifications/verify-webhook-signature` via PayPal REST API. Requires `PAYPAL_WEBHOOK_ID` + cert URL caching.
- **Resend**: Add Svix `Webhook.verify()` using `RESEND_WEBHOOK_SECRET`. Resend uses Svix headers (`svix-signature`, `svix-id`, `svix-timestamp`).
- **Flow**: Make existing HMAC-SHA256 verification mandatory (fail if `s` param missing in production). Currently silently skips signature check.
- **Tests**: Unskip `processWebhookEvent` test block in PayPal gateway, unskip integration test, add Resend webhook tests, verify Flow mandatory check.
- **Env vars**: Add `PAYPAL_WEBHOOK_ID`, `RESEND_WEBHOOK_SECRET` to `.env.local` (already there for Flow).

### Out of Scope

- Mercado Pago, NOWPayments, WhatsApp — already have signature verification. Not touched.
- Refactoring the webhook route handlers beyond signature verification.
- Adding rate limiting or IP allowlisting — separate concern.
- Changing error response patterns (e.g., returning 200 vs 500) — the existing route behavior is preserved.

## Capabilities

### New Capabilities

- `webhook-paypal-signature`: PayPal webhook signature verification via REST API
- `webhook-resend-signature`: Resend webhook signature verification via Svix
- `webhook-flow-signature-mandatory`: Flow HMAC-SHA256 signature made mandatory

### Modified Capabilities

None — no existing specs are being modified; these are new protections.

## Approach

### PayPal

1. Add `validateWebhookSignature(request: NextRequest): Promise<boolean>` to `PayPalGateway` in `gateway.ts`.
2. On each webhook, call `POST {baseUrl}/v1/notifications/verify-webhook-signature` with headers (transmission-id, transmission-time, cert-url, auth-algo, transmission-sig), the webhook ID, and the raw body.
3. Cache the cert URL result (in-memory) to avoid re-fetching per request.
4. Call validation in the route handler before `processWebhookEvent`.
5. Requires `PAYPAL_WEBHOOK_ID` env var (different per environment — sandbox vs production).

### Resend

1. Install/resolve `svix` package (already in dep tree or add if missing).
   - `svix` is the library Resend uses for webhook verification.
2. Add `verifyWebhookSignature(request: NextRequest, rawBody: string): boolean` in the route handler or a dedicated validator file.
3. Parse `svix-id`, `svix-timestamp`, `svix-signature` from headers.
4. Call `new Webhook(RESEND_WEBHOOK_SECRET).verify(rawBody, headers)`.
5. Requires `RESEND_WEBHOOK_SECRET` env var (available from Resend Dashboard > Webhooks).

### Flow

1. In `FlowGateway.processWebhookEvent`, remove the `if (signature)` guard — always verify in production, warn-skip in development.
2. In production: throw if `s` param is missing or signature doesn't match.
3. No new env vars needed — `FLOW_SECRET_KEY` already configured.

### Tests

1. **PayPal**: Remove `describe.skip` from `paypal-gateway.test.ts` — the `validateWebhookSignature` block becomes real tests with mocked HTTP responses.
2. **PayPal**: Unskip `paypal.test.ts` integration tests.
3. **Resend**: Add `resend-webhook.test.ts` — unit tests for Svix verification (mock Svix library to avoid real network calls).
4. **Flow**: Add test case for missing signature in production mode → expect throw.

## Affected Areas

| Area                                                     | Impact   | Description                                      |
| -------------------------------------------------------- | -------- | ------------------------------------------------ |
| `src/lib/payments/paypal/gateway.ts`                     | Modified | Add `validateWebhookSignature()` method          |
| `src/app/api/webhooks/paypal/route.ts`                   | Modified | Call validation before processing                |
| `src/lib/payments/flow/gateway.ts`                       | Modified | Make signature verification mandatory            |
| `src/app/api/webhooks/resend/route.ts`                   | Modified | Add Svix verification before processing          |
| `src/__tests__/unit/lib/payments/paypal-gateway.test.ts` | Modified | Unskip & implement signature tests               |
| `src/__tests__/integration/api/webhooks/paypal.test.ts`  | Modified | Unskip & fix for signature validation            |
| `src/__tests__/unit/lib/payments/resend-webhook.test.ts` | New      | Resend webhook verification tests                |
| `.env.local`                                             | Modified | Add `PAYPAL_WEBHOOK_ID`, `RESEND_WEBHOOK_SECRET` |

## Risks

| Risk                                            | Likelihood | Mitigation                                                      |
| ----------------------------------------------- | ---------- | --------------------------------------------------------------- |
| PayPal sandbox vs production webhook IDs differ | High       | Use separate env vars per environment, developer must configure |
| PayPal verify API has latency                   | Low        | Cert caching reduces calls; verify endpoint is regional         |
| Svix library version mismatch                   | Low        | Pin `svix` in `package.json`; Resend docs specify version       |
| Flow missing `s` in callback (edge case)        | Low        | Dev mode skips; production fails closed (correct behavior)      |

## Rollback Plan

Revert changes to the 3 route handlers and 2 gateway files. Tests revert alongside. PayPal and Resend env vars remain in `.env.local` (no-op until code rolls back). Flow reverts to permissive behavior.

## Dependencies

- `svix` npm package (for Resend webhook verification). Check if already in tree first.
- `PAYPAL_WEBHOOK_ID` — developer must obtain from PayPal Developer Dashboard.
- `RESEND_WEBHOOK_SECRET` — developer must obtain from Resend Dashboard > Webhooks.

## Success Criteria

- [ ] PayPal webhook returns 401 on unsigned/malformed requests (tested with mock cert/verify API)
- [ ] Resend webhook returns 401 on missing/invalid Svix signature
- [ ] Flow webhook returns 401 when `s` param missing in production
- [ ] Flow webhook continues to work in development without `s` param
- [ ] All existing webhook tests pass (PayPal unit + integration unskipped, new Resend tests)
- [ ] `.env.local` documents both new vars
