-- Create root_admin_role with minimum privileges for root admin cross-org operations.
-- Phase 1: define role + permissions.
-- Phase 2: create a dedicated service account and issue SUPABASE_ROOT_ADMIN_KEY JWT.

CREATE ROLE root_admin_role NOINHERIT;

GRANT USAGE ON SCHEMA public TO root_admin_role;

-- SaaS management tables — full CRUD
GRANT SELECT, INSERT, UPDATE, DELETE ON organizations TO root_admin_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON subscriptions TO root_admin_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON subscription_tiers TO root_admin_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON admin_users TO root_admin_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO root_admin_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON branches TO root_admin_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON admin_branch_access TO root_admin_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON system_email_templates TO root_admin_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON payment_gateways_config TO root_admin_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON system_config TO root_admin_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON whatsapp_phone_numbers TO root_admin_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON saas_support_tickets TO root_admin_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON saas_support_messages TO root_admin_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON saas_support_templates TO root_admin_role;

-- Demo/lead tables — SELECT, INSERT, UPDATE
GRANT SELECT, INSERT, UPDATE ON demo_requests TO root_admin_role;
GRANT SELECT, INSERT, UPDATE ON lead_activities TO root_admin_role;

-- Read-only tables
GRANT SELECT ON email_send_events TO root_admin_role;
GRANT SELECT ON lead_scoring_rules TO root_admin_role;
GRANT SELECT ON chat_sessions TO root_admin_role;
GRANT SELECT ON chat_messages TO root_admin_role;
GRANT SELECT ON products TO root_admin_role;
GRANT SELECT ON orders TO root_admin_role;
GRANT SELECT ON customers TO root_admin_role;

-- Audit tables — SELECT, INSERT
GRANT SELECT, INSERT ON saas_audit_log TO root_admin_role;
GRANT SELECT, INSERT ON tier_change_audit TO root_admin_role;
GRANT SELECT, INSERT ON admin_activity_log TO root_admin_role;

-- RPC functions
GRANT EXECUTE ON FUNCTION get_auth_user_id_by_email TO root_admin_role;
GRANT EXECUTE ON FUNCTION create_demo_organization_for_user TO root_admin_role;
GRANT EXECUTE ON FUNCTION reset_demo_organization TO root_admin_role;
GRANT EXECUTE ON FUNCTION log_admin_activity TO root_admin_role;
GRANT EXECUTE ON FUNCTION update_lead_score_and_priority TO root_admin_role;
GRANT EXECUTE ON FUNCTION record_lead_activity TO root_admin_role;

-- Future tables — root_admin_role gets SELECT by default
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO root_admin_role;
