-- Create cron_role with minimum privileges for cron job operations.
-- Phase 1: define role + permissions.
-- Phase 2: create a dedicated service account and issue SUPABASE_CRON_KEY JWT.

CREATE ROLE cron_role NOINHERIT;

GRANT USAGE ON SCHEMA public TO cron_role;

-- Read access to all tables (cron jobs are read-heavy)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO cron_role;

-- Tables cron jobs need to INSERT into
GRANT INSERT ON notifications TO cron_role;
GRANT INSERT ON email_logs TO cron_role;
GRANT INSERT ON appointment_reminders TO cron_role;

-- Future tables — cron_role gets SELECT by default
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO cron_role;
