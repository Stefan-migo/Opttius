# Webhook Signature Verification — Resend

## Domain: webhook-resend-signature

### Purpose

Verify inbound Resend email webhooks via Svix's standard `Webhook.verify()` before processing email events. Prevents forged delivery/open/click events from untrusted senders.

### Requirements

#### Requirement: Resend webhook SHALL be validated via Svix

The system MUST verify every inbound Resend webhook using Svix's `Webhook.verify(rawBody, headers)` with `RESEND_WEBHOOK_SECRET`. It MUST extract `svix-id`, `svix-timestamp`, and `svix-signature` from request headers. The `svix` package MUST be added as a dependency if not present.

##### Scenario: Valid Svix signature on email.delivered

- GIVEN a Resend webhook with valid Svix headers and `RESEND_WEBHOOK_SECRET` set
- WHEN `Webhook.verify()` succeeds
- THEN the email event is stored normally (200)

##### Scenario: Missing signature header

- GIVEN a Resend webhook without `svix-signature` header
- WHEN the route handler receives the request
- THEN the system returns 401 and does not store the event

##### Scenario: Invalid signature

- GIVEN a Resend webhook with tampered payload or `svix-signature`
- WHEN `Webhook.verify()` throws
- THEN the system returns 401 and logs the failure

#### Requirement: Missing env var SHALL fail in production

If `RESEND_WEBHOOK_SECRET` is not set in production, the system MUST reject all webhooks. In development, it SHOULD warn and skip verification.

##### Scenario: Missing secret in development

- GIVEN `RESEND_WEBHOOK_SECRET` is not set and `NODE_ENV=development`
- WHEN a webhook arrives
- THEN the system logs a warning and processes the event

#### Requirement: Raw body MUST be preserved for verification

The system MUST read the request body as raw text before JSON parsing to pass to Svix verify. Reading as `request.text()` before `request.json()` is acceptable; the raw body MUST match what Resend sent byte-for-byte.

##### Scenario: Raw body verification

- GIVEN a Resend webhook with valid Svix signature
- WHEN the handler reads `request.text()` then parses JSON
- THEN Svix verify passes with the unchanged raw body string
