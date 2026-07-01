# Design: Webhook Signature Verification

## Technical Approach

Add signature verification to 3 unprotected webhook endpoints (PayPal, Resend, Flow), following the existing pattern set by Mercado Pago, NOWPayments, and WhatsApp. Each webhook verifies in its own route — no shared middleware. Payload raw body must be read before JSON parsing for integrity checking.

## Architecture Decisions

### Decision: PayPal verification — call PayPal REST API per webhook event

**Choice**: `POST /v1/notifications/verify-webhook-signature` via `fetch` in a module-level function in `gateway.ts`. Cert URL cached in a module-level `Map<string, {cert: string, expiresAt: number}>` with TTL from `Cache-Control` header (default 1h).
**Alternatives**: Local JWT verification (impossible — PayPal uses its own signing), SDK (unnecessary dep).
**Rationale**: PayPal's verify API is the documented, supported path. Cert caching avoids re-fetching per call. Ponytail: no class for a Map with one entry.

### Decision: Resend verification — Svix `Webhook.verify()` inline in route

**Choice**: Add `svix` npm package, call `Webhook.verify(rawBody, headersObject)` in the route handler before processing.
**Alternatives**: Custom HMAC verification (Svix standard is the documented Resend approach).
**Rationale**: `svix` is Resend's official lib, handles edge cases (timestamps, tolerance, multiple signatures). One line per call.

### Decision: Flow — make existing signature mandatory, no structural change

**Choice**: Change `if (signature)` guard to reject in production when `s` is missing. Same HMAC-SHA256 logic, same `generateFlowSignature` helper.
**Alternatives**: Extract to separate validator (unnecessary — it's 6 lines).
**Rationale**: Code already exists and is correct. Removing the conditional skip is the minimal diff.

### Decision: No shared validation middleware

**Choice**: Each route calls its own validator directly.
**Alternatives**: Webhook middleware layer, Next.js middleware.
**Rationale**: Explicit per-route patterns already exist (Mercado Pago, NOWPayments, WhatsApp). No code to extract yet. YAGNI.

## Data Flow

```
PayPal webhook:
  Route POST → request.text() (raw body) → validateWebhookSignature(rawBody, headers)
    → calls PayPal Verify API with headers + PAYPAL_WEBHOOK_ID + raw body
    → cert URL cache check/update
  On success → JSON.parse(rawBody) → processWebhookEvent(parsed)

Resend webhook:
  Route POST → request.text() (raw body) → new Webhook(secret).verify(rawBody, svixHeaders)
  On success → JSON.parse(rawBody) → store email event

Flow webhook:
  Route POST → processWebhookEvent(request) → formData → reads "s" param
    → if missing & production: throw
    → if present: HMAC-SHA256 verify → throw on mismatch
    → proceed
```

## File Changes

| File                                                     | Action | Description                                                                               |
| -------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------- |
| `src/lib/payments/paypal/gateway.ts`                     | Modify | Add `validateWebhookSignature(rawBody, headers)` + cert URL cache module-level Map        |
| `src/app/api/webhooks/paypal/route.ts`                   | Modify | Read raw body, call validation before `processWebhookEvent`, return 401 on failure        |
| `src/lib/payments/flow/gateway.ts`                       | Modify | Remove `if (signature)` guard — fail in production when `s` missing                       |
| `src/app/api/webhooks/resend/route.ts`                   | Modify | Read raw body, verify via Svix before processing, return 401 on failure                   |
| `src/__tests__/unit/lib/payments/paypal-gateway.test.ts` | Modify | Remove `describe.skip` on `validateWebhookSignature`, add working tests (mock verify API) |
| `src/__tests__/integration/api/webhooks/paypal.test.ts`  | Modify | Remove `describe.skip`, update mocks to include validation step                           |
| `src/__tests__/unit/lib/payments/flow-gateway.test.ts`   | Modify | Add test: missing signature in production → throw                                         |
| `src/__tests__/unit/lib/payments/resend-webhook.test.ts` | Create | Svix verification tests (mock `Webhook.verify`)                                           |
| `package.json`                                           | Modify | Add `svix` dependency                                                                     |
| `.env.local`                                             | Modify | Add `PAYPAL_WEBHOOK_ID=` and `RESEND_WEBHOOK_SECRET=` placeholders                        |

## Interfaces / Contracts

```typescript
// PayPal — module-level function in gateway.ts
function validateWebhookSignature(
  rawBody: string,
  headers: Headers,
): Promise<boolean>;
// ponytail: module-level Map for cert cache, not a class

// Resend — inline in route, no wrapper
// new Webhook(process.env.RESEND_WEBHOOK_SECRET).verify(rawBody, svixHeaders)

// Flow — existing generateFlowSignature unchanged, guard logic:
// if (signature) { verify } else if (production) { throw }
```

## Testing Strategy

| Layer         | What                                                   | How                                                         |
| ------------- | ------------------------------------------------------ | ----------------------------------------------------------- |
| Unit (PayPal) | `validateWebhookSignature` success/failure/API-down    | Mock `global.fetch` for verify API responses                |
| Unit (Resend) | Svix verify success/failure/missing headers            | Mock `svix.Webhook.verify`                                  |
| Unit (Flow)   | Missing sig in prod → throw, missing sig in dev → warn | Set `NODE_ENV` via `vi.stubEnv`                             |
| Integration   | PayPal route with validation enabled                   | Unskip integration test, update mocks to include validation |

## Migration / Rollout

No migration required. Env vars are additive. Code changes are backwards-compatible for existing valid webhooks.

## Open Questions

None.
