-- Migration: Create Field Operations (Operativos en Terreno) module
-- Enables mobile inventory, stock transfer to temporary warehouse, and batch work order processing

-- ===== CREATE field_operations TABLE =====
CREATE TABLE IF NOT EXISTS public.field_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  location TEXT,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'prepared', 'in_progress', 'completed', 'cancelled')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_field_operations_branch ON public.field_operations(branch_id);
CREATE INDEX IF NOT EXISTS idx_field_operations_status ON public.field_operations(status);
CREATE INDEX IF NOT EXISTS idx_field_operations_organization ON public.field_operations(organization_id);
CREATE INDEX IF NOT EXISTS idx_field_operations_scheduled_date ON public.field_operations(scheduled_date DESC);

ALTER TABLE public.field_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization field operations"
  ON public.field_operations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE id = auth.uid() AND role = 'super_admin' AND is_active = true
    )
    OR organization_id = public.get_user_organization_id()
  );

CREATE POLICY "Users can manage their organization field operations"
  ON public.field_operations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE id = auth.uid() AND role = 'super_admin' AND is_active = true
    )
    OR organization_id = public.get_user_organization_id()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE id = auth.uid() AND role = 'super_admin' AND is_active = true
    )
    OR organization_id = public.get_user_organization_id()
  );

-- ===== CREATE operativo_mobile_stock TABLE =====
CREATE TABLE IF NOT EXISTS public.operativo_mobile_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_operation_id UUID NOT NULL REFERENCES public.field_operations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  reserved_quantity INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(field_operation_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_operativo_mobile_stock_field_operation ON public.operativo_mobile_stock(field_operation_id);
CREATE INDEX IF NOT EXISTS idx_operativo_mobile_stock_product ON public.operativo_mobile_stock(product_id);

ALTER TABLE public.operativo_mobile_stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view operativo mobile stock via field operation"
  ON public.operativo_mobile_stock FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.field_operations fo
      WHERE fo.id = operativo_mobile_stock.field_operation_id
      AND (
        EXISTS (
          SELECT 1 FROM public.admin_users
          WHERE id = auth.uid() AND role = 'super_admin' AND is_active = true
        )
        OR fo.organization_id = public.get_user_organization_id()
      )
    )
  );

CREATE POLICY "Users can manage operativo mobile stock via field operation"
  ON public.operativo_mobile_stock FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.field_operations fo
      WHERE fo.id = operativo_mobile_stock.field_operation_id
      AND (
        EXISTS (
          SELECT 1 FROM public.admin_users
          WHERE id = auth.uid() AND role = 'super_admin' AND is_active = true
        )
        OR fo.organization_id = public.get_user_organization_id()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.field_operations fo
      WHERE fo.id = operativo_mobile_stock.field_operation_id
      AND (
        EXISTS (
          SELECT 1 FROM public.admin_users
          WHERE id = auth.uid() AND role = 'super_admin' AND is_active = true
        )
        OR fo.organization_id = public.get_user_organization_id()
      )
    )
  );

-- ===== CREATE operativo_sync_queue TABLE (for Phase 2 offline sync) =====
CREATE TABLE IF NOT EXISTS public.operativo_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  field_operation_id UUID NOT NULL REFERENCES public.field_operations(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('customer', 'prescription', 'lab_work_order', 'payment')),
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'syncing', 'synced', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  synced_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_operativo_sync_queue_field_operation ON public.operativo_sync_queue(field_operation_id);
CREATE INDEX IF NOT EXISTS idx_operativo_sync_queue_status ON public.operativo_sync_queue(status);

ALTER TABLE public.operativo_sync_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view operativo sync queue via field operation"
  ON public.operativo_sync_queue FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.field_operations fo
      WHERE fo.id = operativo_sync_queue.field_operation_id
      AND (
        EXISTS (
          SELECT 1 FROM public.admin_users
          WHERE id = auth.uid() AND role = 'super_admin' AND is_active = true
        )
        OR fo.organization_id = public.get_user_organization_id()
      )
    )
  );

CREATE POLICY "Users can manage operativo sync queue via field operation"
  ON public.operativo_sync_queue FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.field_operations fo
      WHERE fo.id = operativo_sync_queue.field_operation_id
      AND (
        EXISTS (
          SELECT 1 FROM public.admin_users
          WHERE id = auth.uid() AND role = 'super_admin' AND is_active = true
        )
        OR fo.organization_id = public.get_user_organization_id()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.field_operations fo
      WHERE fo.id = operativo_sync_queue.field_operation_id
      AND (
        EXISTS (
          SELECT 1 FROM public.admin_users
          WHERE id = auth.uid() AND role = 'super_admin' AND is_active = true
        )
        OR fo.organization_id = public.get_user_organization_id()
      )
    )
  );

-- ===== EXTEND lab_work_orders FOR FIELD OPERATIONS =====
ALTER TABLE public.lab_work_orders
  ADD COLUMN IF NOT EXISTS field_operation_id UUID REFERENCES public.field_operations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS operativo_batch_id UUID,
  ADD COLUMN IF NOT EXISTS operativo_delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS operativo_recipient_name TEXT;

CREATE INDEX IF NOT EXISTS idx_lab_work_orders_field_operation ON public.lab_work_orders(field_operation_id) WHERE field_operation_id IS NOT NULL;
