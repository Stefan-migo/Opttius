-- Missing Foreign Key Indexes Implementation
-- Generated: February 8, 2026

-- Indexes for better JOIN performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_users_created_by ON public.admin_users(created_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_tickets_category_id ON public.support_tickets(category_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_tickets_order_id ON public.support_tickets(order_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_tickets_resolved_by ON public.support_tickets(resolved_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_messages_sender_id ON public.support_messages(sender_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_templates_category_id ON public.support_templates(category_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_templates_created_by ON public.support_templates(created_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_system_email_templates_created_by ON public.system_email_templates(created_by);

-- Additional performance indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_status_created ON public.orders(status, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_customers_email ON public.customers(email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_appointments_date_status ON public.appointments(appointment_date, status);