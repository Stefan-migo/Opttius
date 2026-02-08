-- Additional Missing Foreign Key Indexes - Round 2
-- Generated: February 8, 2026

-- Indexes for remaining foreign key relationships
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_system_config_last_modified_by ON public.system_config(last_modified_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_system_maintenance_log_executed_by ON public.system_maintenance_log(executed_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_notifications_created_by ON public.admin_notifications(created_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customer_lens_purchases_product_id ON public.customer_lens_purchases(product_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pos_sessions_reopened_by ON public.pos_sessions(reopened_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prescriptions_created_by ON public.prescriptions(created_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_created_by ON public.appointments(created_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotes_prescription_id ON public.quotes(prescription_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotes_created_by ON public.quotes(created_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quotes_sent_by ON public.quotes(sent_by);