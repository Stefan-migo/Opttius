-- Add missing write GRANTs for cron_role discovered during Phase 1 verification.
-- Cron jobs INSERT into ai_insights, UPDATE demo_requests and payments.
-- SELECT + INSERT on existing tables already covered by 20260701000010.

GRANT INSERT ON ai_insights TO cron_role;
GRANT UPDATE ON demo_requests TO cron_role;
GRANT UPDATE ON payments TO cron_role;
