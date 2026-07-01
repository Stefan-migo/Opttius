# Webhook Signature Verification — PayPal

## Domain: webhook-paypal-signature

### Purpose

Verify inbound PayPal webhook authenticity via PayPal's REST API `POST /v1/notifications/verify-webhook-signature` before processing. Prevents forged payment events from unaudited third parties.

### Requirements

#### Requirement: PayPal webhook SHALL be validated via PayPal Verify API

The system MUST call PayPal's `POST /v1/notifications/verify-webhook-signature` endpoint on every inbound webhook before calling `processWebhookEvent`. It MUST extract `paypal-auth-algo`, `paypal-cert-url`, `paypal-transmission-id`, `paypal-transmission-sig`, and `paypal-transmission-time` from request headers and pass them alongside the raw request body and `PAYPAL_WEBHOOK_ID`.

##### Scenario: Valid signature on CHECKOUT.ORDER.COMPLETED

- GIVEN a PayPal webhook with valid headers and `PAYPAL_WEBHOOK_ID` set
- WHEN the Verify API returns `verification_status: "SUCCESS"`
- THEN the webhook is processed normally (200)

##### Scenario: Invalid signature

- GIVEN a PayPal webhook with tampered headers
- WHEN the Verify API returns `verification_status: "FAILURE"`
- THEN the system returns 401 and does not process the event

##### Scenario: Verify API unavailable (fail-closed)

- GIVEN a PayPal webhook with valid-looking headers
- WHEN the Verify API returns HTTP error or times out
- THEN the system returns 401 and logs the failure; event is NOT processed

#### Requirement: Cert URL SHALL be cached

The system SHOULD cache `paypal-cert-url` responses in-memory with a TTL derived from upstream `Cache-Control` headers (default 3600s). The cache MUST be invalidated on verify API failures to allow cert refresh.

##### Scenario: Cert URL cached

- GIVEN a valid cert URL fetched within TTL
- WHEN a second webhook arrives with the same `paypal-cert-url`
- THEN PayPal verify API is called without re-fetching the cert

#### Requirement: Missing env var SHALL fail in production

If `PAYPAL_WEBHOOK_ID` is not set in production (`NODE_ENV=production`), the system MUST return 500 on webhook startup/first request. In development, it SHOULD log a warning and skip verification.

##### Scenario: Missing webhook ID in development

- GIVEN `PAYPAL_WEBHOOK_ID` is not set and `NODE_ENV=development`
- WHEN a webhook arrives
- THEN the system logs a warning and processes the event (skip verification)
