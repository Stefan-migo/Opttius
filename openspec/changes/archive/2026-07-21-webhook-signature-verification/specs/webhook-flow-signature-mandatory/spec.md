# Webhook Flow Signature Mandatory — Specification

## Purpose

Make existing HMAC-SHA256 signature verification mandatory in production. Currently the `s` parameter check is conditional; this spec removes the silent skip so forged callbacks are always rejected when they matter.

## Requirements

### Requirement: Flow webhook signature SHALL be mandatory in production

The system MUST reject webhook callbacks when the `s` (signature) parameter is missing and `NODE_ENV=production`. In development, missing signature SHALL log a warning and continue. When signature is present, it MUST be verified against HMAC-SHA256 of all other form parameters using `FLOW_SECRET_KEY`.

#### Scenario: Valid signature on payment callback

- GIVEN a Flow callback with correct `s` parameter matching HMAC-SHA256 of sorted params
- WHEN `processWebhookEvent` runs
- THEN the event is processed normally

#### Scenario: Missing signature in production

- GIVEN a Flow callback without `s` parameter and `NODE_ENV=production`
- WHEN `processWebhookEvent` runs
- THEN the system throws with "Flow Webhook: Missing signature"

#### Scenario: Invalid signature in production

- GIVEN a Flow callback with wrong `s` parameter and `NODE_ENV=production`
- WHEN `processWebhookEvent` runs
- THEN the system throws with "Flow Webhook: Invalid signature"

#### Scenario: Missing signature in development

- GIVEN a Flow callback without `s` parameter and `NODE_ENV=development`
- WHEN `processWebhookEvent` runs
- THEN the system logs a warning and processes the event normally

### Requirement: No new env vars needed

`FLOW_SECRET_KEY` is already expected by `getFlowConfig()`. No additional configuration is required.

#### Scenario: Existing setup continues working

- GIVEN `FLOW_SECRET_KEY` is already configured (in sandbox or production mode)
- WHEN a valid signed Flow callback arrives
- THEN verification passes with existing credentials
