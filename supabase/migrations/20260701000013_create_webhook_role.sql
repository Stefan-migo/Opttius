-- Create webhook_role with minimum privileges for webhook operations.
-- Scope: 8 tables that webhook handlers actually touch.
-- Phase 2: replaces service_role key for all 5 webhook endpoints.
--
-- Rollback: DROP ROLE IF EXISTS webhook_role;

CREATE ROLE webhook_role NOINHERIT;

GRANT USAGE ON SCHEMA public TO webhook_role;

-- payments: looked up by gateway_payment_intent_id, status updated
GRANT SELECT, UPDATE ON payments TO webhook_role;

-- webhook_events: idempotency tracking (SELECT → INSERT → UPDATE processed)
GRANT SELECT, INSERT, UPDATE ON webhook_events TO webhook_role;

-- orders: status updated to "completed" on successful payment
GRANT UPDATE ON orders TO webhook_role;

-- subscription_tiers: read during tier matching by amount
GRANT SELECT ON subscription_tiers TO webhook_role;

-- organizations: read current tier, update to new tier
GRANT SELECT, UPDATE ON organizations TO webhook_role;

-- subscriptions: read existing, create/update after payment, update from preapproval webhook
GRANT SELECT, INSERT, UPDATE ON subscriptions TO webhook_role;

-- profiles: read org owner email for SaaS success notification
GRANT SELECT ON profiles TO webhook_role;

-- email_send_events: Resend webhook inserts delivery events
GRANT INSERT ON email_send_events TO webhook_role;
