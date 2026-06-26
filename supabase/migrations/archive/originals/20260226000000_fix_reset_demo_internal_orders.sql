-- Migration: 20260226000000_fix_reset_demo_internal_orders.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Fix reset_demo_organization 500 error
-- internal_orders has ON DELETE RESTRICT on branches - must delete before branches.
-- Also add conditional credit_notes delete for robustness.

CREATE OR REPLACE FUNCTION public.reset_demo_organization()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  demo_org_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
  demo_branch_id UUID := '00000000-0000-0000-0000-000000000002'::uuid;
  demo_branch_2_id UUID := '00000000-0000-0000-0000-000000000003'::uuid;
BEGIN
  -- Delete in order respecting foreign keys (children first)
  DELETE FROM public.optical_internal_support_messages
  WHERE ticket_id IN (SELECT id FROM public.optical_internal_support_tickets WHERE organization_id = demo_org_id);
  DELETE FROM public.optical_internal_support_tickets WHERE organization_id = demo_org_id;

  -- credit_notes: skip if tables don't exist (optional feature)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'credit_notes') THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'credit_note_movements') THEN
      DELETE FROM public.credit_note_movements
      WHERE credit_note_id IN (SELECT id FROM public.credit_notes WHERE organization_id = demo_org_id OR branch_id IN (demo_branch_id, demo_branch_2_id));
    END IF;
    DELETE FROM public.credit_notes WHERE organization_id = demo_org_id OR branch_id IN (demo_branch_id, demo_branch_2_id);
  END IF;

  -- internal_orders: ON DELETE RESTRICT on branches - must delete before branches
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'internal_orders') THEN
    DELETE FROM public.internal_order_status_history
    WHERE internal_order_id IN (SELECT id FROM public.internal_orders WHERE organization_id = demo_org_id);
    DELETE FROM public.internal_order_items
    WHERE internal_order_id IN (SELECT id FROM public.internal_orders WHERE organization_id = demo_org_id);
    DELETE FROM public.internal_orders WHERE organization_id = demo_org_id;
  END IF;

  DELETE FROM public.order_payments
  WHERE order_id IN (SELECT id FROM public.orders WHERE branch_id IN (demo_branch_id, demo_branch_2_id));
  DELETE FROM public.pos_transactions
  WHERE pos_session_id IN (SELECT id FROM public.pos_sessions WHERE branch_id IN (demo_branch_id, demo_branch_2_id));
  DELETE FROM public.order_items
  WHERE order_id IN (SELECT id FROM public.orders WHERE branch_id IN (demo_branch_id, demo_branch_2_id));
  DELETE FROM public.orders WHERE branch_id IN (demo_branch_id, demo_branch_2_id);
  DELETE FROM public.quotes WHERE branch_id IN (demo_branch_id, demo_branch_2_id);
  DELETE FROM public.lab_work_orders WHERE branch_id IN (demo_branch_id, demo_branch_2_id);
  DELETE FROM public.prescriptions
  WHERE customer_id IN (SELECT id FROM public.customers WHERE branch_id IN (demo_branch_id, demo_branch_2_id) OR organization_id = demo_org_id);
  DELETE FROM public.appointments WHERE branch_id IN (demo_branch_id, demo_branch_2_id) OR organization_id = demo_org_id;
  DELETE FROM public.product_branch_stock WHERE branch_id IN (demo_branch_id, demo_branch_2_id);
  DELETE FROM public.products WHERE branch_id IN (demo_branch_id, demo_branch_2_id) OR organization_id = demo_org_id;
  DELETE FROM public.lens_price_matrices
  WHERE lens_family_id IN (SELECT id FROM public.lens_families WHERE organization_id = demo_org_id);
  DELETE FROM public.lens_families
  WHERE organization_id = demo_org_id OR id::text LIKE '40000000-%';
  DELETE FROM public.contact_lens_price_matrices WHERE organization_id = demo_org_id;
  DELETE FROM public.contact_lens_families WHERE organization_id = demo_org_id;
  DELETE FROM public.schedule_settings WHERE branch_id IN (demo_branch_id, demo_branch_2_id);
  DELETE FROM public.quote_settings WHERE branch_id IN (demo_branch_id, demo_branch_2_id);
  DELETE FROM public.pos_settings WHERE branch_id IN (demo_branch_id, demo_branch_2_id);
  DELETE FROM public.cash_register_closures WHERE branch_id IN (demo_branch_id, demo_branch_2_id);
  DELETE FROM public.pos_sessions WHERE branch_id IN (demo_branch_id, demo_branch_2_id);
  DELETE FROM public.organization_settings WHERE organization_id = demo_org_id;
  DELETE FROM public.customers WHERE branch_id IN (demo_branch_id, demo_branch_2_id) OR organization_id = demo_org_id;
  DELETE FROM public.branches WHERE id IN (demo_branch_id, demo_branch_2_id);

  -- Re-seed with Óptica Mirada Clara
  PERFORM public.seed_demo_mirada_clara();
END;
$$;

COMMENT ON FUNCTION public.reset_demo_organization() IS 'Resets Demo Óptica Mirada Clara. Deletes internal_orders first (RESTRICT on branches), then all demo data, re-seeds via seed_demo_mirada_clara().';
