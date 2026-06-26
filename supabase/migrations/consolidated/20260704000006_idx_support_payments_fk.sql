-- Migration: 20260704000006_idx_support_payments_fk
-- Description: FK indexes for support, payments, agreements, field operations, and misc tables
-- Phase: 1 (Performance — Indexes)
-- Spec: S-003
--
-- Rollback:
--   DROP INDEX IF EXISTS public.idx_agreement_institutional_balances_purchase_order_id;
--   DROP INDEX IF EXISTS public.idx_agreement_institutional_balances_invoice_id;
--   DROP INDEX IF EXISTS public.idx_agreement_institutional_invoices_emitted_by;
--   DROP INDEX IF EXISTS public.idx_agreements_created_by;
--   DROP INDEX IF EXISTS public.idx_agreements_updated_by;
--   DROP INDEX IF EXISTS public.idx_credit_notes_created_by;
--   DROP INDEX IF EXISTS public.idx_credit_notes_pos_session_id;
--   DROP INDEX IF EXISTS public.idx_demo_requests_assigned_to;
--   DROP INDEX IF EXISTS public.idx_demo_requests_organization_id;
--   DROP INDEX IF EXISTS public.idx_demo_requests_reviewed_by;
--   DROP INDEX IF EXISTS public.idx_field_operations_created_by;
--   DROP INDEX IF EXISTS public.idx_internal_order_status_history_changed_by;
--   DROP INDEX IF EXISTS public.idx_internal_orders_assigned_driver_id;
--   DROP INDEX IF EXISTS public.idx_internal_orders_assigned_vehicle_id;
--   DROP INDEX IF EXISTS public.idx_inventory_movements_created_by;
--   DROP INDEX IF EXISTS public.idx_inventory_transfers_confirmed_by;
--   DROP INDEX IF EXISTS public.idx_inventory_transfers_created_by;
--   DROP INDEX IF EXISTS public.idx_lead_activities_created_by;
--   DROP INDEX IF EXISTS public.idx_nurture_log_campaign_email_id;
--   DROP INDEX IF EXISTS public.idx_nurture_log_campaign_id;
--   DROP INDEX IF EXISTS public.idx_nurture_log_queue_id;
--   DROP INDEX IF EXISTS public.idx_nurture_queue_campaign_email_id;
--   DROP INDEX IF EXISTS public.idx_nurture_queue_campaign_id;
--   DROP INDEX IF EXISTS public.idx_optical_internal_support_messages_sender_id;
--   DROP INDEX IF EXISTS public.idx_optical_internal_support_tickets_created_by_user_id;
--   DROP INDEX IF EXISTS public.idx_optical_internal_support_tickets_related_appointment_id;
--   DROP INDEX IF EXISTS public.idx_optical_internal_support_tickets_related_quote_id;
--   DROP INDEX IF EXISTS public.idx_optical_internal_support_tickets_related_work_order_id;
--   DROP INDEX IF EXISTS public.idx_optical_internal_support_tickets_resolved_by;
--   DROP INDEX IF EXISTS public.idx_opticas_access_tokens_created_by;
--   DROP INDEX IF EXISTS public.idx_pos_sessions_reopened_by;
--   DROP INDEX IF EXISTS public.idx_referrals_converted_demo_request_id;
--   DROP INDEX IF EXISTS public.idx_referrals_converted_organization_id;
--   DROP INDEX IF EXISTS public.idx_saas_backups_created_by;
--   DROP INDEX IF EXISTS public.idx_saas_support_messages_sender_id;
--   DROP INDEX IF EXISTS public.idx_saas_support_templates_created_by;
--   DROP INDEX IF EXISTS public.idx_saas_support_tickets_created_by_user_id;
--   DROP INDEX IF EXISTS public.idx_saas_support_tickets_resolved_by;
--   DROP INDEX IF EXISTS public.idx_schedule_settings_updated_by;
--   DROP INDEX IF EXISTS public.idx_support_messages_sender_id;
--   DROP INDEX IF EXISTS public.idx_support_templates_category_id;
--   DROP INDEX IF EXISTS public.idx_support_templates_created_by;
--   DROP INDEX IF EXISTS public.idx_support_tickets_category_id;
--   DROP INDEX IF EXISTS public.idx_support_tickets_order_id;
--   DROP INDEX IF EXISTS public.idx_support_tickets_resolved_by;
--   DROP INDEX IF EXISTS public.idx_tier_change_audit_changed_by_user_id;
--   DROP INDEX IF EXISTS public.idx_workflow_definitions_created_by;
--   DROP INDEX IF EXISTS public.idx_workflow_executions_created_by;

BEGIN;

-- ============================================================
-- Agreements
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_agreement_institutional_balances_purchase_order_id
  ON public.agreement_institutional_balances(purchase_order_id);

CREATE INDEX IF NOT EXISTS idx_agreement_institutional_balances_invoice_id
  ON public.agreement_institutional_balances(invoice_id);

CREATE INDEX IF NOT EXISTS idx_agreement_institutional_invoices_emitted_by
  ON public.agreement_institutional_invoices(emitted_by);

CREATE INDEX IF NOT EXISTS idx_agreements_created_by
  ON public.agreements(created_by);

CREATE INDEX IF NOT EXISTS idx_agreements_updated_by
  ON public.agreements(updated_by);

-- ============================================================
-- Credit Notes & POS
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_credit_notes_created_by
  ON public.credit_notes(created_by);

CREATE INDEX IF NOT EXISTS idx_credit_notes_pos_session_id
  ON public.credit_notes(pos_session_id);

CREATE INDEX IF NOT EXISTS idx_pos_sessions_reopened_by
  ON public.pos_sessions(reopened_by);

-- ============================================================
-- Demo Requests & Referrals
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_demo_requests_assigned_to
  ON public.demo_requests(assigned_to);

CREATE INDEX IF NOT EXISTS idx_demo_requests_organization_id
  ON public.demo_requests(organization_id);

CREATE INDEX IF NOT EXISTS idx_demo_requests_reviewed_by
  ON public.demo_requests(reviewed_by);

CREATE INDEX IF NOT EXISTS idx_referrals_converted_demo_request_id
  ON public.referrals(converted_demo_request_id);

CREATE INDEX IF NOT EXISTS idx_referrals_converted_organization_id
  ON public.referrals(converted_organization_id);

-- ============================================================
-- Field Operations
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_field_operations_created_by
  ON public.field_operations(created_by);

-- ============================================================
-- Internal Orders / Drivers / Vehicles
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_internal_order_status_history_changed_by
  ON public.internal_order_status_history(changed_by);

CREATE INDEX IF NOT EXISTS idx_internal_orders_assigned_driver_id
  ON public.internal_orders(assigned_driver_id);

CREATE INDEX IF NOT EXISTS idx_internal_orders_assigned_vehicle_id
  ON public.internal_orders(assigned_vehicle_id);

-- ============================================================
-- Inventory
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_by
  ON public.inventory_movements(created_by);

CREATE INDEX IF NOT EXISTS idx_inventory_transfers_confirmed_by
  ON public.inventory_transfers(confirmed_by);

CREATE INDEX IF NOT EXISTS idx_inventory_transfers_created_by
  ON public.inventory_transfers(created_by);

-- ============================================================
-- Lead Activities
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_lead_activities_created_by
  ON public.lead_activities(created_by);

-- ============================================================
-- Nurture
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_nurture_log_campaign_email_id
  ON public.nurture_log(campaign_email_id);

CREATE INDEX IF NOT EXISTS idx_nurture_log_campaign_id
  ON public.nurture_log(campaign_id);

CREATE INDEX IF NOT EXISTS idx_nurture_log_queue_id
  ON public.nurture_log(queue_id);

CREATE INDEX IF NOT EXISTS idx_nurture_queue_campaign_email_id
  ON public.nurture_queue(campaign_email_id);

CREATE INDEX IF NOT EXISTS idx_nurture_queue_campaign_id
  ON public.nurture_queue(campaign_id);

-- ============================================================
-- Optical Internal Support
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_optical_internal_support_messages_sender_id
  ON public.optical_internal_support_messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_optical_internal_support_tickets_created_by_user_id
  ON public.optical_internal_support_tickets(created_by_user_id);

CREATE INDEX IF NOT EXISTS idx_optical_internal_support_tickets_related_appointment_id
  ON public.optical_internal_support_tickets(related_appointment_id);

CREATE INDEX IF NOT EXISTS idx_optical_internal_support_tickets_related_quote_id
  ON public.optical_internal_support_tickets(related_quote_id);

CREATE INDEX IF NOT EXISTS idx_optical_internal_support_tickets_related_work_order_id
  ON public.optical_internal_support_tickets(related_work_order_id);

CREATE INDEX IF NOT EXISTS idx_optical_internal_support_tickets_resolved_by
  ON public.optical_internal_support_tickets(resolved_by);

-- ============================================================
-- Opticas Access Tokens
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_opticas_access_tokens_created_by
  ON public.opticas_access_tokens(created_by);

-- ============================================================
-- SaaS
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_saas_backups_created_by
  ON public.saas_backups(created_by);

CREATE INDEX IF NOT EXISTS idx_saas_support_messages_sender_id
  ON public.saas_support_messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_saas_support_templates_created_by
  ON public.saas_support_templates(created_by);

CREATE INDEX IF NOT EXISTS idx_saas_support_tickets_created_by_user_id
  ON public.saas_support_tickets(created_by_user_id);

CREATE INDEX IF NOT EXISTS idx_saas_support_tickets_resolved_by
  ON public.saas_support_tickets(resolved_by);

-- ============================================================
-- Schedule Settings
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_schedule_settings_updated_by
  ON public.schedule_settings(updated_by);

-- ============================================================
-- Support (B2C)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_support_messages_sender_id
  ON public.support_messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_support_templates_category_id
  ON public.support_templates(category_id);

CREATE INDEX IF NOT EXISTS idx_support_templates_created_by
  ON public.support_templates(created_by);

CREATE INDEX IF NOT EXISTS idx_support_tickets_category_id
  ON public.support_tickets(category_id);

CREATE INDEX IF NOT EXISTS idx_support_tickets_order_id
  ON public.support_tickets(order_id);

CREATE INDEX IF NOT EXISTS idx_support_tickets_resolved_by
  ON public.support_tickets(resolved_by);

-- ============================================================
-- Tier Change Audit
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_tier_change_audit_changed_by_user_id
  ON public.tier_change_audit(changed_by_user_id);

-- ============================================================
-- Workflows
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_workflow_definitions_created_by
  ON public.workflow_definitions(created_by);

CREATE INDEX IF NOT EXISTS idx_workflow_executions_created_by
  ON public.workflow_executions(created_by);

COMMIT;
