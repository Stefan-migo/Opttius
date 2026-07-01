# Tasks: Webhook Signature Verification

## Review Workload Forecast

| Field                   | Value                                      |
| ----------------------- | ------------------------------------------ |
| Estimated changed lines | ~245 (PR 1: ~125, PR 2: ~120)              |
| 400-line budget risk    | Low                                        |
| Chained PRs recommended | Yes                                        |
| Suggested split         | PR 1: PayPal → PR 2: Resend + Flow + tests |
| Delivery strategy       | auto-chain                                 |
| Chain strategy          | stacked-to-main                            |

```
Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Low
```

### Suggested Work Units

| Unit | Goal                                  | Likely PR | Notes                                                                      |
| ---- | ------------------------------------- | --------- | -------------------------------------------------------------------------- |
| 1    | PayPal webhook signature verification | PR 1      | Base = main; includes gateway function, route wiring, tests                |
| 2    | Resend + Flow mandatory signature     | PR 2      | Base = main (independent of PR 1); includes Svix verify, Flow guard, tests |

## PR 1: PayPal Webhook Signature (~125 lines)

- [ ] ~~1.1 Add `svix` dep and `PAYPAL_WEBHOOK_ID`/`RESEND_WEBHOOK_SECRET` to `package.json` and `.env.local`~~ _(not needed — PayPal uses REST API, not Svix)_
- [x] 1.2 Add `validateWebhookSignature(headers, body)` method to `PayPalGateway` class + `PayPalWebhookHeaders` interface in `src/lib/payments/paypal/gateway.ts` — calls PayPal REST API, fail-closed
- [x] 1.3 Update `src/app/api/webhooks/paypal/route.ts` — read raw body via `request.clone().text()`, call `validateWebhookSignature()` before `processWebhookEvent`, return 401 on failure
- [x] 1.4 Unskip `validateWebhookSignature` unit tests — extracted to `src/__tests__/unit/lib/payments/paypal-gateway-validate.test.ts`: success, FAILURE status, API error, missing webhook_id
- [x] 1.5 Unskip integration tests in `src/__tests__/integration/api/webhooks/paypal.test.ts` — mocked gateway + services, added 401 cases for missing/invalid/failed signature
- [x] 1.6 Add `PAYPAL_WEBHOOK_ID` to `env.example`

## PR 2: Resend + Flow Mandatory Signature (~120 lines)

- [ ] 2.1 Update `src/app/api/webhooks/resend/route.ts` — read raw body via `request.text()`, verify via `new Webhook(RESEND_WEBHOOK_SECRET).verify(rawBody, headers)`, return 401 on failure; skip in dev when secret missing
- [ ] 2.2 Update `src/lib/payments/flow/gateway.ts` — replace `if (signature)` guard with mandatory check: fail in production when `s` missing, warn-skip in dev
- [ ] 2.3 Create `src/__tests__/unit/lib/payments/resend-webhook.test.ts` — Svix verification tests: valid sig, missing header, invalid sig, missing secret in dev (mock `svix.Webhook.verify`)
- [ ] 2.4 Add missing signature tests in `src/__tests__/unit/lib/payments/flow-gateway.test.ts` — missing sig in production → throw, missing sig in dev → warn and process
