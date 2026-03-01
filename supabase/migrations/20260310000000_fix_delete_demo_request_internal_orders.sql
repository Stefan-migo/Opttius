-- Fix: delete_demo_request_and_org and cleanup_expired_demo_organizations
-- internal_orders has ON DELETE RESTRICT on branch_id; must delete before branches.

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

    -- Delete in order respecting FKs (same as cleanup_expired_demo_organizations)
    DELETE FROM public.optical_internal_support_messages
    WHERE ticket_id IN (SELECT id FROM public.optical_internal_support_tickets WHERE organization_id = v_org_id);
    DELETE FROM public.optical_internal_support_tickets WHERE organization_id = v_org_id;

    DELETE FROM public.credit_note_movements
    WHERE credit_note_id IN (SELECT id FROM public.credit_notes WHERE organization_id = v_org_id OR branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[])));
    DELETE FROM public.credit_notes WHERE organization_id = v_org_id OR branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));

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
    DELETE FROM public.internal_order_status_history
    WHERE internal_order_id IN (SELECT id FROM public.internal_orders WHERE organization_id = v_org_id);
    DELETE FROM public.internal_order_items
    WHERE internal_order_id IN (SELECT id FROM public.internal_orders WHERE organization_id = v_org_id);
    DELETE FROM public.internal_orders WHERE organization_id = v_org_id;
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

-- Also fix cleanup_expired_demo_organizations for consistency
CREATE OR REPLACE FUNCTION public.cleanup_expired_demo_organizations()
RETURNS TABLE(deleted_org_id UUID, deleted_org_slug TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org RECORD;
  v_branch_ids UUID[];
  v_org_id UUID;
  v_slug TEXT;
  global_demo_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
BEGIN
  PERFORM set_config('statement_timeout', '300000', true);

  FOR v_org IN
    SELECT id, slug
    FROM public.organizations
    WHERE (metadata->>'is_demo')::boolean = true
      AND id != global_demo_id
      AND metadata->>'expires_at' IS NOT NULL
      AND (metadata->>'expires_at')::timestamptz < NOW()
  LOOP
    v_org_id := v_org.id;
    v_slug := v_org.slug;

    SELECT ARRAY_AGG(id) INTO v_branch_ids
    FROM public.branches
    WHERE organization_id = v_org_id;

    -- Delete in order respecting FKs (children first)
    DELETE FROM public.optical_internal_support_messages
    WHERE ticket_id IN (SELECT id FROM public.optical_internal_support_tickets WHERE organization_id = v_org_id);
    DELETE FROM public.optical_internal_support_tickets WHERE organization_id = v_org_id;

    DELETE FROM public.credit_note_movements
    WHERE credit_note_id IN (SELECT id FROM public.credit_notes WHERE organization_id = v_org_id OR branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[])));
    DELETE FROM public.credit_notes WHERE organization_id = v_org_id OR branch_id = ANY(COALESCE(v_branch_ids, ARRAY[]::uuid[]));

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
    DELETE FROM public.internal_order_status_history
    WHERE internal_order_id IN (SELECT id FROM public.internal_orders WHERE organization_id = v_org_id);
    DELETE FROM public.internal_order_items
    WHERE internal_order_id IN (SELECT id FROM public.internal_orders WHERE organization_id = v_org_id);
    DELETE FROM public.internal_orders WHERE organization_id = v_org_id;
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

    deleted_org_id := v_org_id;
    deleted_org_slug := v_slug;
    RETURN NEXT;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.cleanup_expired_demo_organizations() IS 'Deletes demo orgs whose expires_at has passed. Excludes global demo org. Returns list of deleted org ids/slugs.';
