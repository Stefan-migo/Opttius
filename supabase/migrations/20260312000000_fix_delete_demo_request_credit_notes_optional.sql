-- Fix: credit_notes/credit_note_movements may not exist (optional feature)
-- Same pattern as reset_demo_organization and cleanup_expired_demo_organizations

CREATE OR REPLACE FUNCTION public.delete_demo_request_and_org(
  p_request_id UUID
)
RETURNS TABLE(deleted_request_id UUID, deleted_org_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_branch_ids UUID[];
  v_request_id UUID;
  global_demo_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
BEGIN
  PERFORM set_config('statement_timeout', '120000', true);

  SELECT organization_id INTO v_org_id
  FROM public.demo_requests
  WHERE id = p_request_id;

  IF v_org_id IS NOT NULL AND v_org_id != global_demo_id THEN
    SELECT ARRAY_AGG(id) INTO v_branch_ids
    FROM public.branches
    WHERE organization_id = v_org_id;

    -- Delete in order respecting FKs
    DELETE FROM public.optical_internal_support_messages
    WHERE ticket_id IN (SELECT id FROM public.optical_internal_support_tickets WHERE organization_id = v_org_id);
    DELETE FROM public.optical_internal_support_tickets WHERE organization_id = v_org_id;

    -- credit_notes: skip if tables don't exist (optional feature)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'credit_notes') THEN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'credit_note_movements') THEN
        DELETE FROM public.credit_note_movements
        WHERE credit_note_id IN (SELECT id FROM public.credit_notes WHERE organization_id = v_org_id OR branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[])));
      END IF;
      DELETE FROM public.credit_notes WHERE organization_id = v_org_id OR branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    END IF;

    -- Billing (before orders)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'billing_document_items') THEN
      DELETE FROM public.billing_document_items
      WHERE billing_document_id IN (SELECT id FROM public.billing_documents WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[])));
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'billing_documents') THEN
      DELETE FROM public.billing_documents WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    END IF;

    DELETE FROM public.order_payments
    WHERE order_id IN (SELECT id FROM public.orders WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[])));
    DELETE FROM public.pos_transactions
    WHERE pos_session_id IN (SELECT id FROM public.pos_sessions WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[])));
    DELETE FROM public.order_items
    WHERE order_id IN (SELECT id FROM public.orders WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[])));
    DELETE FROM public.orders WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.quotes WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.lab_work_orders WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.prescriptions
    WHERE customer_id IN (SELECT id FROM public.customers WHERE organization_id = v_org_id OR branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[])));
    DELETE FROM public.appointments WHERE organization_id = v_org_id OR branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));

    -- internal_orders has ON DELETE RESTRICT on branch_id; must delete before branches
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'internal_orders') THEN
      DELETE FROM public.internal_order_status_history
      WHERE internal_order_id IN (SELECT id FROM public.internal_orders WHERE organization_id = v_org_id);
      DELETE FROM public.internal_order_items
      WHERE internal_order_id IN (SELECT id FROM public.internal_orders WHERE organization_id = v_org_id);
      DELETE FROM public.internal_orders WHERE organization_id = v_org_id;
    END IF;

    -- Org-scoped tables (before products/branches)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tier_change_audit') THEN
      DELETE FROM public.tier_change_audit WHERE organization_id = v_org_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_usage_log') THEN
      DELETE FROM public.ai_usage_log WHERE organization_id = v_org_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'telemetry_events') THEN
      DELETE FROM public.telemetry_events WHERE organization_id = v_org_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'telemetry_aggregates') THEN
      DELETE FROM public.telemetry_aggregates WHERE organization_id = v_org_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'telemetry_config') THEN
      DELETE FROM public.telemetry_config WHERE organization_id = v_org_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'whatsapp_phone_numbers') THEN
      DELETE FROM public.whatsapp_phone_numbers WHERE organization_id = v_org_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_tour_progress') THEN
      DELETE FROM public.user_tour_progress WHERE organization_id = v_org_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'system_config') THEN
      DELETE FROM public.system_config WHERE organization_id = v_org_id OR branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    END IF;

    DELETE FROM public.product_branch_stock WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.products WHERE organization_id = v_org_id OR branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.lens_price_matrices
    WHERE lens_family_id IN (SELECT id FROM public.lens_families WHERE organization_id = v_org_id);
    DELETE FROM public.lens_families WHERE organization_id = v_org_id;
    DELETE FROM public.contact_lens_price_matrices WHERE organization_id = v_org_id;
    DELETE FROM public.contact_lens_families WHERE organization_id = v_org_id;
    DELETE FROM public.schedule_settings WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.quote_settings WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.pos_settings WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.cash_register_closures WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.pos_sessions WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.organization_settings WHERE organization_id = v_org_id;
    DELETE FROM public.admin_notifications WHERE organization_id = v_org_id OR branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.ai_insights WHERE organization_id = v_org_id;
    DELETE FROM public.customers WHERE organization_id = v_org_id OR branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.admin_branch_access WHERE branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));
    DELETE FROM public.subscriptions WHERE organization_id = v_org_id;
    UPDATE public.admin_users SET organization_id = NULL WHERE organization_id = v_org_id;
    DELETE FROM public.branches WHERE organization_id = v_org_id;
    DELETE FROM public.organizations WHERE id = v_org_id;
  END IF;

  DELETE FROM public.demo_requests WHERE id = p_request_id;
  v_request_id := p_request_id;

  deleted_request_id := v_request_id;
  deleted_org_id := v_org_id;
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.delete_demo_request_and_org(UUID) IS 'Deletes a demo request and its associated demo organization. Root only.';
