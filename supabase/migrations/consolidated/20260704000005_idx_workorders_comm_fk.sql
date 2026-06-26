-- Migration: 20260704000005_idx_workorders_comm_fk
-- Description: FK indexes for work orders, status history, notifications, email, and chat tables
-- Phase: 1 (Performance — Indexes)
-- Spec: S-003
--
-- Rollback:
--   DROP INDEX IF EXISTS public.idx_lab_work_orders_created_by;
--   DROP INDEX IF EXISTS public.idx_lab_work_orders_pos_order_id;
--   DROP INDEX IF EXISTS public.idx_lab_work_order_status_history_changed_by;
--   DROP INDEX IF EXISTS public.idx_pos_sale_idempotency_order_id;
--   DROP INDEX IF EXISTS public.idx_pos_sale_idempotency_work_order_id;
--   DROP INDEX IF EXISTS public.idx_admin_notifications_created_by;
--   DROP INDEX IF EXISTS public.idx_system_email_templates_created_by;
--   DROP INDEX IF EXISTS public.idx_memory_facts_source_session_id;
--   DROP INDEX IF EXISTS public.idx_system_config_last_modified_by;
--   DROP INDEX IF EXISTS public.idx_system_maintenance_log_executed_by;

BEGIN;

-- lab_work_orders
CREATE INDEX IF NOT EXISTS idx_lab_work_orders_created_by
  ON public.lab_work_orders(created_by);

CREATE INDEX IF NOT EXISTS idx_lab_work_orders_pos_order_id
  ON public.lab_work_orders(pos_order_id);

-- lab_work_order_status_history
CREATE INDEX IF NOT EXISTS idx_lab_work_order_status_history_changed_by
  ON public.lab_work_order_status_history(changed_by);

-- pos_sale_idempotency
CREATE INDEX IF NOT EXISTS idx_pos_sale_idempotency_order_id
  ON public.pos_sale_idempotency(order_id);

CREATE INDEX IF NOT EXISTS idx_pos_sale_idempotency_work_order_id
  ON public.pos_sale_idempotency(work_order_id);

-- admin_notifications
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_by
  ON public.admin_notifications(created_by);

-- system_email_templates
CREATE INDEX IF NOT EXISTS idx_system_email_templates_created_by
  ON public.system_email_templates(created_by);

-- memory_facts
CREATE INDEX IF NOT EXISTS idx_memory_facts_source_session_id
  ON public.memory_facts(source_session_id);

-- system_config
CREATE INDEX IF NOT EXISTS idx_system_config_last_modified_by
  ON public.system_config(last_modified_by);

-- system_maintenance_log
CREATE INDEX IF NOT EXISTS idx_system_maintenance_log_executed_by
  ON public.system_maintenance_log(executed_by);

COMMIT;
