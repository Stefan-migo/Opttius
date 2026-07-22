-- Migration: fix_rls_org_scope_wave_2
-- Fixes security audit: ~24 org-blind RLS policies across 17 tables that use
-- EXISTS(SELECT 1 FROM admin_users WHERE id = auth.uid()) without any
-- organization scoping. This eliminates cross-tenant data access vulnerabilities.
--
-- Tables covered: support_categories, support_templates, support_tickets,
-- support_messages, chat_sessions, chat_messages, contact_lens_encargos,
-- contact_lens_inventory, contact_lens_families, contact_lens_price_matrices,
-- lens_families, lens_price_matrices, credit_notes, credit_note_movements,
-- payment_installments, inventory_movements, lead_activities, lead_scoring_logs
--
-- Patterns used:
--   Direct organization_id: is_super_admin OR organization_id = get_user_organization_id()
--   Via branch FK: is_super_admin OR EXISTS (SELECT 1 FROM branches b WHERE b.id = X.branch_id AND b.organization_id = get_user_organization_id())
--   Via multi-hop FK: is_super_admin OR EXISTS (SELECT 1 FROM ... WHERE ... = get_user_organization_id())
--
-- ============================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================
-- To roll back this migration, drop all new org-scoped policies and
-- re-create all dropped org-blind policies. Full SQL below:
--
-- ========================
-- DROP new org-scoped policies:
-- ========================
--
-- DROP POLICY IF EXISTS "Admins can manage support categories in their organization" ON support_categories;
-- DROP POLICY IF EXISTS "Admins can manage support tickets in their organization" ON support_tickets;
-- DROP POLICY IF EXISTS "Admins can manage support messages in their organization" ON support_messages;
-- DROP POLICY IF EXISTS "Admins can manage support templates in their organization" ON support_templates;
-- DROP POLICY IF EXISTS "Admin users can view all chat sessions in their organization" ON chat_sessions;
-- DROP POLICY IF EXISTS "Admin users can view all chat messages in their organization" ON chat_messages;
-- DROP POLICY IF EXISTS "Admins can delete contact lens encargos in their organization" ON contact_lens_encargos;
-- DROP POLICY IF EXISTS "Admins can insert contact lens encargos in their organization" ON contact_lens_encargos;
-- DROP POLICY IF EXISTS "Admins can update contact lens encargos in their organization" ON contact_lens_encargos;
-- DROP POLICY IF EXISTS "Admins can delete contact lens inventory in their organization" ON contact_lens_inventory;
-- DROP POLICY IF EXISTS "Admins can insert contact lens inventory in their organization" ON contact_lens_inventory;
-- DROP POLICY IF EXISTS "Admins can update contact lens inventory in their organization" ON contact_lens_inventory;
-- DROP POLICY IF EXISTS "Admins can manage credit_notes in their organization" ON credit_notes;
-- DROP POLICY IF EXISTS "Admins can manage credit_note_movements in their organization" ON credit_note_movements;
-- DROP POLICY IF EXISTS "Admins can manage installments in their organization" ON payment_installments;
-- DROP POLICY IF EXISTS "Admins can insert inventory movements in their organization" ON inventory_movements;
-- DROP POLICY IF EXISTS "Admins can view inventory movements in their organization" ON inventory_movements;
-- DROP POLICY IF EXISTS "Admins can view lead activities in their organization" ON lead_activities;
-- DROP POLICY IF EXISTS "Admins can view lead scoring logs in their organization" ON lead_scoring_logs;
--
-- ========================
-- Re-create dropped org-blind policies:
-- ========================
--
-- CREATE POLICY "Admin users can manage support categories" ON public.support_categories
--   USING ((EXISTS (SELECT 1 FROM public.admin_users au WHERE au.id = auth.uid() AND au.is_active = true)));
--
-- CREATE POLICY "Admin users can manage templates" ON public.support_templates
--   USING ((EXISTS (SELECT 1 FROM public.admin_users au WHERE au.id = auth.uid() AND au.is_active = true)));
--
-- CREATE POLICY "Admin users can manage tickets" ON public.support_tickets
--   USING ((EXISTS (SELECT 1 FROM public.admin_users au WHERE au.id = auth.uid() AND au.is_active = true)));
--
-- CREATE POLICY "Admin users can view all tickets" ON public.support_tickets FOR SELECT
--   USING ((EXISTS (SELECT 1 FROM public.admin_users au WHERE au.id = auth.uid() AND au.is_active = true)));
--
-- CREATE POLICY "Admin users can manage messages" ON public.support_messages
--   USING ((EXISTS (SELECT 1 FROM public.admin_users au WHERE au.id = auth.uid() AND au.is_active = true)));
--
-- CREATE POLICY "Admin users can view all messages" ON public.support_messages FOR SELECT
--   USING ((EXISTS (SELECT 1 FROM public.admin_users au WHERE au.id = auth.uid() AND au.is_active = true)));
--
-- CREATE POLICY "Admin users can view all chat sessions" ON public.chat_sessions FOR SELECT
--   USING ((EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.id = auth.uid() AND admin_users.is_active = true)));
--
-- CREATE POLICY "Admin users can view all chat messages" ON public.chat_messages FOR SELECT
--   USING ((EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.id = auth.uid() AND admin_users.is_active = true)));
--
-- CREATE POLICY "Admins can delete contact lens encargos" ON public.contact_lens_encargos FOR DELETE
--   USING ((EXISTS (SELECT 1 FROM public.admin_users au WHERE au.id = auth.uid() AND au.role = ANY (ARRAY['admin', 'super_admin']))));
--
-- CREATE POLICY "Admins can insert contact lens encargos" ON public.contact_lens_encargos FOR INSERT
--   WITH CHECK ((EXISTS (SELECT 1 FROM public.admin_users au WHERE au.id = auth.uid() AND au.role = ANY (ARRAY['admin', 'super_admin']))));
--
-- CREATE POLICY "Admins can update contact lens encargos" ON public.contact_lens_encargos FOR UPDATE
--   USING ((EXISTS (SELECT 1 FROM public.admin_users au WHERE au.id = auth.uid() AND au.role = ANY (ARRAY['admin', 'super_admin']))));
--
-- CREATE POLICY "Admins can delete contact lens inventory" ON public.contact_lens_inventory FOR DELETE
--   USING ((EXISTS (SELECT 1 FROM public.admin_users au WHERE au.id = auth.uid() AND au.role = ANY (ARRAY['admin', 'super_admin']))));
--
-- CREATE POLICY "Admins can insert contact lens inventory" ON public.contact_lens_inventory FOR INSERT
--   WITH CHECK ((EXISTS (SELECT 1 FROM public.admin_users au WHERE au.id = auth.uid() AND au.role = ANY (ARRAY['admin', 'super_admin']))));
--
-- CREATE POLICY "Admins can update contact lens inventory" ON public.contact_lens_inventory FOR UPDATE
--   USING ((EXISTS (SELECT 1 FROM public.admin_users au WHERE au.id = auth.uid() AND au.role = ANY (ARRAY['admin', 'super_admin']))));
--
-- CREATE POLICY "Admins can manage contact lens families for their org" ON public.contact_lens_families
--   USING (((EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.id = auth.uid() AND admin_users.is_active = true AND (admin_users.role = 'super_admin' OR admin_users.organization_id = (SELECT admin_users_1.organization_id FROM public.admin_users admin_users_1 WHERE admin_users_1.id = auth.uid() AND admin_users_1.is_active = true LIMIT 1)))) OR organization_id = public.get_user_organization_id() OR organization_id IS NULL))
--   WITH CHECK (((EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.id = auth.uid() AND admin_users.is_active = true AND (admin_users.role = 'super_admin' OR admin_users.organization_id = (SELECT admin_users_1.organization_id FROM public.admin_users admin_users_1 WHERE admin_users_1.id = auth.uid() AND admin_users_1.is_active = true LIMIT 1)))) OR organization_id = public.get_user_organization_id() OR organization_id IS NULL));
--
-- CREATE POLICY "Admins can manage contact lens price matrices for their org" ON public.contact_lens_price_matrices
--   USING (((EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.id = auth.uid() AND admin_users.is_active = true AND (admin_users.role = 'super_admin' OR admin_users.organization_id = (SELECT admin_users_1.organization_id FROM public.admin_users admin_users_1 WHERE admin_users_1.id = auth.uid() AND admin_users_1.is_active = true LIMIT 1)))) OR organization_id = public.get_user_organization_id() OR organization_id IS NULL))
--   WITH CHECK (((EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.id = auth.uid() AND admin_users.is_active = true AND (admin_users.role = 'super_admin' OR admin_users.organization_id = (SELECT admin_users_1.organization_id FROM public.admin_users admin_users_1 WHERE admin_users_1.id = auth.uid() AND admin_users_1.is_active = true LIMIT 1)))) OR organization_id = public.get_user_organization_id() OR organization_id IS NULL));
--
-- CREATE POLICY "Admins can delete lens families" ON public.lens_families FOR DELETE
--   USING ((EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.id = auth.uid() AND admin_users.is_active = true)));
--
-- CREATE POLICY "Admins can delete lens price matrices" ON public.lens_price_matrices FOR DELETE
--   USING ((EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.id = auth.uid() AND admin_users.is_active = true)));
--
-- CREATE POLICY "Admins can manage lens price matrices" ON public.lens_price_matrices
--   USING ((EXISTS (SELECT 1 FROM public.admin_users au WHERE au.id = auth.uid() AND au.is_active = true)))
--   WITH CHECK ((EXISTS (SELECT 1 FROM public.admin_users au WHERE au.id = auth.uid() AND au.is_active = true)));
--
-- CREATE POLICY "Admins can manage credit_notes" ON public.credit_notes
--   USING ((EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.id = auth.uid() AND admin_users.is_active = true)));
--
-- CREATE POLICY "Admins can manage credit_note_movements" ON public.credit_note_movements
--   USING ((EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.id = auth.uid() AND admin_users.is_active = true)));
--
-- CREATE POLICY "Admins can manage installments" ON public.payment_installments
--   USING ((EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.id = auth.uid() AND admin_users.is_active = true)));
--
-- CREATE POLICY "Admins can insert inventory movements" ON public.inventory_movements FOR INSERT
--   WITH CHECK ((EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.id = auth.uid() AND admin_users.is_active = true)));
--
-- CREATE POLICY "Admins can view inventory movements" ON public.inventory_movements FOR SELECT
--   USING ((EXISTS (SELECT 1 FROM public.admin_users WHERE admin_users.id = auth.uid() AND admin_users.is_active = true)));
--
-- DROP POLICY IF EXISTS "Admins can view lead activities in their organization" ON lead_activities;
-- DROP POLICY IF EXISTS "Admins can view lead scoring logs in their organization" ON lead_scoring_logs;
-- CREATE POLICY lead_activities_root_full_access ON public.lead_activities TO authenticated
--   USING (auth.uid() IN (SELECT admin_users.id FROM public.admin_users WHERE admin_users.role = ANY (ARRAY['root', 'dev'])))
--   WITH CHECK (auth.uid() IN (SELECT admin_users.id FROM public.admin_users WHERE admin_users.role = ANY (ARRAY['root', 'dev'])));
-- CREATE POLICY lead_scoring_logs_root_full_access ON public.lead_scoring_logs TO authenticated
--   USING (auth.uid() IN (SELECT admin_users.id FROM public.admin_users WHERE admin_users.role = ANY (ARRAY['root', 'dev'])))
--   WITH CHECK (auth.uid() IN (SELECT admin_users.id FROM public.admin_users WHERE admin_users.role = ANY (ARRAY['root', 'dev'])));
-- ============================================================

-- ============================================================
-- 1. DROP org-blind RLS policies
-- ============================================================

-- support_categories: org-blind admin ANY check
DROP POLICY IF EXISTS "Admin users can manage support categories" ON public.support_categories;

-- support_templates: org-blind admin ANY check
DROP POLICY IF EXISTS "Admin users can manage templates" ON public.support_templates;

-- support_tickets: org-blind admin ANY + SELECT
DROP POLICY IF EXISTS "Admin users can manage tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admin users can view all tickets" ON public.support_tickets;

-- support_messages: org-blind admin ANY + SELECT
DROP POLICY IF EXISTS "Admin users can manage messages" ON public.support_messages;
DROP POLICY IF EXISTS "Admin users can view all messages" ON public.support_messages;

-- chat_sessions: org-blind admin SELECT
DROP POLICY IF EXISTS "Admin users can view all chat sessions" ON public.chat_sessions;

-- chat_messages: org-blind admin SELECT
DROP POLICY IF EXISTS "Admin users can view all chat messages" ON public.chat_messages;

-- contact_lens_encargos: org-blind admin DELETE/INSERT/UPDATE (org-scoped "Users can..." policies already exist)
DROP POLICY IF EXISTS "Admins can delete contact lens encargos" ON public.contact_lens_encargos;
DROP POLICY IF EXISTS "Admins can insert contact lens encargos" ON public.contact_lens_encargos;
DROP POLICY IF EXISTS "Admins can update contact lens encargos" ON public.contact_lens_encargos;

-- contact_lens_inventory: org-blind admin DELETE/INSERT/UPDATE
DROP POLICY IF EXISTS "Admins can delete contact lens inventory" ON public.contact_lens_inventory;
DROP POLICY IF EXISTS "Admins can insert contact lens inventory" ON public.contact_lens_inventory;
DROP POLICY IF EXISTS "Admins can update contact lens inventory" ON public.contact_lens_inventory;

-- contact_lens_families: combined org-blind + org-scoped + IS NULL policy (replaced by clean org-scoped policy)
DROP POLICY IF EXISTS "Admins can manage contact lens families for their org" ON public.contact_lens_families;

-- contact_lens_price_matrices: same combined pattern
DROP POLICY IF EXISTS "Admins can manage contact lens price matrices for their org" ON public.contact_lens_price_matrices;

-- lens_families: org-blind DELETE
DROP POLICY IF EXISTS "Admins can delete lens families" ON public.lens_families;

-- lens_price_matrices: org-blind DELETE + org-blind manage (org-scoped manage already exists)
DROP POLICY IF EXISTS "Admins can delete lens price matrices" ON public.lens_price_matrices;
DROP POLICY IF EXISTS "Admins can manage lens price matrices" ON public.lens_price_matrices;

-- credit_notes: org-blind manage
DROP POLICY IF EXISTS "Admins can manage credit_notes" ON public.credit_notes;

-- credit_note_movements: org-blind manage
DROP POLICY IF EXISTS "Admins can manage credit_note_movements" ON public.credit_note_movements;

-- payment_installments: org-blind manage
DROP POLICY IF EXISTS "Admins can manage installments" ON public.payment_installments;

-- inventory_movements: org-blind INSERT + SELECT
DROP POLICY IF EXISTS "Admins can insert inventory movements" ON public.inventory_movements;
DROP POLICY IF EXISTS "Admins can view inventory movements" ON public.inventory_movements;

-- ============================================================
-- 2. Create org-scoped RLS policies
-- ============================================================

-- --------------------------------------------------
-- 2a. Direct organization_id pattern
-- --------------------------------------------------

-- credit_notes: has organization_id directly
CREATE POLICY "Admins can manage credit_notes in their organization"
  ON public.credit_notes
  USING (
    public.is_super_admin(auth.uid())
    OR organization_id = public.get_user_organization_id()
  );

-- chat_sessions: has organization_id directly
CREATE POLICY "Admin users can view all chat sessions in their organization"
  ON public.chat_sessions FOR SELECT
  USING (
    public.is_super_admin(auth.uid())
    OR organization_id = public.get_user_organization_id()
  );

-- --------------------------------------------------
-- 2b. FK join: chat_messages → chat_sessions.organization_id
-- --------------------------------------------------

CREATE POLICY "Admin users can view all chat messages in their organization"
  ON public.chat_messages FOR SELECT
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.chat_sessions cs
      WHERE cs.id = chat_messages.session_id
        AND cs.organization_id = public.get_user_organization_id()
    )
  );

-- --------------------------------------------------
-- 2c. FK join: credit_note_movements → credit_notes.organization_id
-- --------------------------------------------------

CREATE POLICY "Admins can manage credit_note_movements in their organization"
  ON public.credit_note_movements
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.credit_notes cn
      WHERE cn.id = credit_note_movements.credit_note_id
        AND cn.organization_id = public.get_user_organization_id()
    )
  );

-- --------------------------------------------------
-- 2d. FK join: payment_installments → orders.organization_id
-- --------------------------------------------------

CREATE POLICY "Admins can manage installments in their organization"
  ON public.payment_installments
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = payment_installments.order_id
        AND o.organization_id = public.get_user_organization_id()
    )
  );

-- --------------------------------------------------
-- 2e. Via branch_id → branches.organization_id
-- --------------------------------------------------

-- support_categories: has branch_id
CREATE POLICY "Admins can manage support categories in their organization"
  ON public.support_categories
  USING (
    public.is_super_admin(auth.uid())
    OR branch_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.branches b
      WHERE b.id = support_categories.branch_id
        AND b.organization_id = public.get_user_organization_id()
    )
  );

-- support_tickets: has branch_id
CREATE POLICY "Admins can manage support tickets in their organization"
  ON public.support_tickets
  USING (
    public.is_super_admin(auth.uid())
    OR branch_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.branches b
      WHERE b.id = support_tickets.branch_id
        AND b.organization_id = public.get_user_organization_id()
    )
  );

-- contact_lens_inventory: INSERT via branch_id → branches.organization_id
CREATE POLICY "Admins can insert contact lens inventory in their organization"
  ON public.contact_lens_inventory FOR INSERT
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.branches b
      WHERE b.id = contact_lens_inventory.branch_id
        AND b.organization_id = public.get_user_organization_id()
    )
  );

-- contact_lens_inventory: UPDATE via branch_id
CREATE POLICY "Admins can update contact lens inventory in their organization"
  ON public.contact_lens_inventory FOR UPDATE
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.branches b
      WHERE b.id = contact_lens_inventory.branch_id
        AND b.organization_id = public.get_user_organization_id()
    )
  );

-- contact_lens_inventory: DELETE via branch_id
CREATE POLICY "Admins can delete contact lens inventory in their organization"
  ON public.contact_lens_inventory FOR DELETE
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.branches b
      WHERE b.id = contact_lens_inventory.branch_id
        AND b.organization_id = public.get_user_organization_id()
    )
  );

-- inventory_movements: INSERT via branch_id → branches.organization_id
CREATE POLICY "Admins can insert inventory movements in their organization"
  ON public.inventory_movements FOR INSERT
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.branches b
      WHERE b.id = inventory_movements.branch_id
        AND b.organization_id = public.get_user_organization_id()
    )
  );

-- inventory_movements: SELECT via branch_id
CREATE POLICY "Admins can view inventory movements in their organization"
  ON public.inventory_movements FOR SELECT
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.branches b
      WHERE b.id = inventory_movements.branch_id
        AND b.organization_id = public.get_user_organization_id()
    )
  );

-- --------------------------------------------------
-- 2f. Multi-hop FK joins
-- --------------------------------------------------

-- support_messages → support_tickets.branch_id → branches.organization_id
CREATE POLICY "Admins can manage support messages in their organization"
  ON public.support_messages
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.support_tickets st
      JOIN public.branches b ON b.id = st.branch_id
      WHERE st.id = support_messages.ticket_id
        AND b.organization_id = public.get_user_organization_id()
    )
  );

-- support_templates → support_categories.branch_id → branches.organization_id
CREATE POLICY "Admins can manage support templates in their organization"
  ON public.support_templates
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.support_categories sc
      JOIN public.branches b ON b.id = sc.branch_id
      WHERE sc.id = support_templates.category_id
        AND b.organization_id = public.get_user_organization_id()
    )
  );

-- --------------------------------------------------
-- 2g. lead_activities → demo_requests.organization_id
-- --------------------------------------------------

CREATE POLICY "Admins can view lead activities in their organization"
  ON public.lead_activities
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.demo_requests dr
      WHERE dr.id = lead_activities.lead_id
        AND dr.organization_id = public.get_user_organization_id()
    )
  );

-- lead_scoring_logs → demo_requests.organization_id
CREATE POLICY "Admins can view lead scoring logs in their organization"
  ON public.lead_scoring_logs
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.demo_requests dr
      WHERE dr.id = lead_scoring_logs.lead_id
        AND dr.organization_id = public.get_user_organization_id()
    )
  );

-- --------------------------------------------------
-- 2h. contact_lens_encargos — org-scoped DELETE/INSERT/UPDATE
--     (table has organization_id directly)
-- --------------------------------------------------

CREATE POLICY "Admins can delete contact lens encargos in their organization"
  ON public.contact_lens_encargos FOR DELETE
  USING (
    public.is_super_admin(auth.uid())
    OR organization_id = public.get_user_organization_id()
  );

CREATE POLICY "Admins can insert contact lens encargos in their organization"
  ON public.contact_lens_encargos FOR INSERT
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR organization_id = public.get_user_organization_id()
  );

CREATE POLICY "Admins can update contact lens encargos in their organization"
  ON public.contact_lens_encargos FOR UPDATE
  USING (
    public.is_super_admin(auth.uid())
    OR organization_id = public.get_user_organization_id()
  );

-- ============================================================
-- 3. Verification assertions
-- ============================================================

DO $$
DECLARE
  v_count INTEGER;
  v_old_count INTEGER;
BEGIN
  -- Track total checks
  v_count := 0;

  -- ===== support_categories =====
  -- Expect: branch-scoped (exists) + new org-scoped. No org-blind.
  SELECT COUNT(*) INTO v_old_count FROM pg_policies
    WHERE tablename = 'support_categories'
      AND policyname = 'Admin users can manage support categories';
  IF v_old_count > 0 THEN
    RAISE EXCEPTION 'support_categories: old org-blind policy still exists';
  END IF;
  SELECT COUNT(*) INTO v_count FROM pg_policies
    WHERE tablename = 'support_categories'
      AND policyname = 'Admins can manage support categories in their organization';
  IF v_count < 1 THEN
    RAISE EXCEPTION 'support_categories: new org-scoped policy not found';
  END IF;

  -- ===== support_templates =====
  SELECT COUNT(*) INTO v_old_count FROM pg_policies
    WHERE tablename = 'support_templates'
      AND policyname = 'Admin users can manage templates';
  IF v_old_count > 0 THEN
    RAISE EXCEPTION 'support_templates: old org-blind policy still exists';
  END IF;
  SELECT COUNT(*) INTO v_count FROM pg_policies
    WHERE tablename = 'support_templates'
      AND policyname = 'Admins can manage support templates in their organization';
  IF v_count < 1 THEN
    RAISE EXCEPTION 'support_templates: new org-scoped policy not found';
  END IF;

  -- ===== support_tickets =====
  SELECT COUNT(*) INTO v_old_count FROM pg_policies
    WHERE tablename = 'support_tickets'
      AND policyname IN ('Admin users can manage tickets', 'Admin users can view all tickets');
  IF v_old_count > 0 THEN
    RAISE EXCEPTION 'support_tickets: old org-blind policies still exist';
  END IF;
  SELECT COUNT(*) INTO v_count FROM pg_policies
    WHERE tablename = 'support_tickets'
      AND policyname = 'Admins can manage support tickets in their organization';
  IF v_count < 1 THEN
    RAISE EXCEPTION 'support_tickets: new org-scoped policy not found';
  END IF;

  -- ===== support_messages =====
  SELECT COUNT(*) INTO v_old_count FROM pg_policies
    WHERE tablename = 'support_messages'
      AND policyname IN ('Admin users can manage messages', 'Admin users can view all messages');
  IF v_old_count > 0 THEN
    RAISE EXCEPTION 'support_messages: old org-blind policies still exist';
  END IF;
  SELECT COUNT(*) INTO v_count FROM pg_policies
    WHERE tablename = 'support_messages'
      AND policyname = 'Admins can manage support messages in their organization';
  IF v_count < 1 THEN
    RAISE EXCEPTION 'support_messages: new org-scoped policy not found';
  END IF;

  -- ===== chat_sessions =====
  SELECT COUNT(*) INTO v_old_count FROM pg_policies
    WHERE tablename = 'chat_sessions'
      AND policyname = 'Admin users can view all chat sessions';
  IF v_old_count > 0 THEN
    RAISE EXCEPTION 'chat_sessions: old org-blind policy still exists';
  END IF;
  SELECT COUNT(*) INTO v_count FROM pg_policies
    WHERE tablename = 'chat_sessions'
      AND policyname = 'Admin users can view all chat sessions in their organization';
  IF v_count < 1 THEN
    RAISE EXCEPTION 'chat_sessions: new org-scoped policy not found';
  END IF;

  -- ===== chat_messages =====
  SELECT COUNT(*) INTO v_old_count FROM pg_policies
    WHERE tablename = 'chat_messages'
      AND policyname = 'Admin users can view all chat messages';
  IF v_old_count > 0 THEN
    RAISE EXCEPTION 'chat_messages: old org-blind policy still exists';
  END IF;
  SELECT COUNT(*) INTO v_count FROM pg_policies
    WHERE tablename = 'chat_messages'
      AND policyname = 'Admin users can view all chat messages in their organization';
  IF v_count < 1 THEN
    RAISE EXCEPTION 'chat_messages: new org-scoped policy not found';
  END IF;

  -- ===== contact_lens_encargos =====
  SELECT COUNT(*) INTO v_old_count FROM pg_policies
    WHERE tablename = 'contact_lens_encargos'
      AND policyname LIKE 'Admins can % contact lens encargos'
      AND policyname NOT LIKE '%in their organization';
  IF v_old_count > 0 THEN
    RAISE EXCEPTION 'contact_lens_encargos: old org-blind policies still exist';
  END IF;
  SELECT COUNT(*) INTO v_count FROM pg_policies
    WHERE tablename = 'contact_lens_encargos'
      AND policyname LIKE '%in their organization';
  IF v_count < 3 THEN
    RAISE EXCEPTION 'contact_lens_encargos: expected 3 org-scoped admin policies, found %', v_count;
  END IF;

  -- ===== contact_lens_inventory =====
  SELECT COUNT(*) INTO v_old_count FROM pg_policies
    WHERE tablename = 'contact_lens_inventory'
      AND policyname LIKE 'Admins can % contact lens inventory'
      AND policyname NOT LIKE '%in their organization';
  IF v_old_count > 0 THEN
    RAISE EXCEPTION 'contact_lens_inventory: old org-blind policies still exist';
  END IF;
  SELECT COUNT(*) INTO v_count FROM pg_policies
    WHERE tablename = 'contact_lens_inventory'
      AND policyname LIKE '%in their organization';
  IF v_count < 3 THEN
    RAISE EXCEPTION 'contact_lens_inventory: expected 3 org-scoped admin policies, found %', v_count;
  END IF;

  -- ===== contact_lens_families =====
  SELECT COUNT(*) INTO v_old_count FROM pg_policies
    WHERE tablename = 'contact_lens_families'
      AND policyname = 'Admins can manage contact lens families for their org';
  IF v_old_count > 0 THEN
    RAISE EXCEPTION 'contact_lens_families: old combined policy still exists';
  END IF;
  SELECT COUNT(*) INTO v_count FROM pg_policies
    WHERE tablename = 'contact_lens_families'
      AND policyname = 'Admins can manage their organization''s contact lens families';
  IF v_count < 1 THEN
    RAISE EXCEPTION 'contact_lens_families: org-scoped manage policy not found';
  END IF;

  -- ===== contact_lens_price_matrices =====
  SELECT COUNT(*) INTO v_old_count FROM pg_policies
    WHERE tablename = 'contact_lens_price_matrices'
      AND policyname = 'Admins can manage contact lens price matrices for their org';
  IF v_old_count > 0 THEN
    RAISE EXCEPTION 'contact_lens_price_matrices: old combined policy still exists';
  END IF;
  SELECT COUNT(*) INTO v_count FROM pg_policies
    WHERE tablename = 'contact_lens_price_matrices'
      AND policyname = 'Admins can manage their organization''s contact lens price matri';
  IF v_count < 1 THEN
    RAISE EXCEPTION 'contact_lens_price_matrices: org-scoped manage policy not found';
  END IF;

  -- ===== lens_families =====
  SELECT COUNT(*) INTO v_old_count FROM pg_policies
    WHERE tablename = 'lens_families'
      AND policyname = 'Admins can delete lens families';
  IF v_old_count > 0 THEN
    RAISE EXCEPTION 'lens_families: old org-blind delete policy still exists';
  END IF;

  -- ===== lens_price_matrices =====
  SELECT COUNT(*) INTO v_old_count FROM pg_policies
    WHERE tablename = 'lens_price_matrices'
      AND policyname IN ('Admins can delete lens price matrices', 'Admins can manage lens price matrices');
  IF v_old_count > 0 THEN
    RAISE EXCEPTION 'lens_price_matrices: old org-blind policies still exist';
  END IF;

  -- ===== credit_notes =====
  SELECT COUNT(*) INTO v_old_count FROM pg_policies
    WHERE tablename = 'credit_notes'
      AND policyname = 'Admins can manage credit_notes';
  IF v_old_count > 0 THEN
    RAISE EXCEPTION 'credit_notes: old org-blind policy still exists';
  END IF;
  SELECT COUNT(*) INTO v_count FROM pg_policies
    WHERE tablename = 'credit_notes'
      AND policyname = 'Admins can manage credit_notes in their organization';
  IF v_count < 1 THEN
    RAISE EXCEPTION 'credit_notes: new org-scoped policy not found';
  END IF;

  -- ===== credit_note_movements =====
  SELECT COUNT(*) INTO v_old_count FROM pg_policies
    WHERE tablename = 'credit_note_movements'
      AND policyname = 'Admins can manage credit_note_movements';
  IF v_old_count > 0 THEN
    RAISE EXCEPTION 'credit_note_movements: old org-blind policy still exists';
  END IF;
  SELECT COUNT(*) INTO v_count FROM pg_policies
    WHERE tablename = 'credit_note_movements'
      AND policyname = 'Admins can manage credit_note_movements in their organization';
  IF v_count < 1 THEN
    RAISE EXCEPTION 'credit_note_movements: new org-scoped policy not found';
  END IF;

  -- ===== payment_installments =====
  SELECT COUNT(*) INTO v_old_count FROM pg_policies
    WHERE tablename = 'payment_installments'
      AND policyname = 'Admins can manage installments';
  IF v_old_count > 0 THEN
    RAISE EXCEPTION 'payment_installments: old org-blind policy still exists';
  END IF;
  SELECT COUNT(*) INTO v_count FROM pg_policies
    WHERE tablename = 'payment_installments'
      AND policyname = 'Admins can manage installments in their organization';
  IF v_count < 1 THEN
    RAISE EXCEPTION 'payment_installments: new org-scoped policy not found';
  END IF;

  -- ===== inventory_movements =====
  SELECT COUNT(*) INTO v_old_count FROM pg_policies
    WHERE tablename = 'inventory_movements'
      AND policyname IN ('Admins can insert inventory movements', 'Admins can view inventory movements');
  IF v_old_count > 0 THEN
    RAISE EXCEPTION 'inventory_movements: old org-blind policies still exist';
  END IF;
  SELECT COUNT(*) INTO v_count FROM pg_policies
    WHERE tablename = 'inventory_movements'
      AND policyname LIKE '%in their organization';
  IF v_count < 2 THEN
    RAISE EXCEPTION 'inventory_movements: expected 2 org-scoped policies, found %', v_count;
  END IF;

  -- ===== lead_activities =====
  SELECT COUNT(*) INTO v_count FROM pg_policies
    WHERE tablename = 'lead_activities'
      AND policyname = 'Admins can view lead activities in their organization';
  IF v_count < 1 THEN
    RAISE EXCEPTION 'lead_activities: new org-scoped policy not found';
  END IF;
  -- Root full access should still exist
  SELECT COUNT(*) INTO v_count FROM pg_policies
    WHERE tablename = 'lead_activities'
      AND policyname = 'lead_activities_root_full_access';
  IF v_count < 1 THEN
    RAISE EXCEPTION 'lead_activities: root full access policy missing';
  END IF;

  -- ===== lead_scoring_logs =====
  SELECT COUNT(*) INTO v_count FROM pg_policies
    WHERE tablename = 'lead_scoring_logs'
      AND policyname = 'Admins can view lead scoring logs in their organization';
  IF v_count < 1 THEN
    RAISE EXCEPTION 'lead_scoring_logs: new org-scoped policy not found';
  END IF;
  SELECT COUNT(*) INTO v_count FROM pg_policies
    WHERE tablename = 'lead_scoring_logs'
      AND policyname = 'lead_scoring_logs_root_full_access';
  IF v_count < 1 THEN
    RAISE EXCEPTION 'lead_scoring_logs: root full access policy missing';
  END IF;

  RAISE NOTICE 'RLS Wave 2: All verification assertions passed successfully';
END;
$$;
