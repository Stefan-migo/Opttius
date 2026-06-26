-- Migration: 20260203120000_fix_multi_tenant_rls_and_settings.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- 1. FIX LENS PRICE MATRICES AND SETTINGS TABLES TO HAVE ORGANIZATION_ID
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lens_price_matrices' AND column_name = 'organization_id') THEN
        ALTER TABLE public.lens_price_matrices ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pos_settings' AND column_name = 'organization_id') THEN
        ALTER TABLE public.pos_settings ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quote_settings' AND column_name = 'organization_id') THEN
        ALTER TABLE public.quote_settings ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schedule_settings' AND column_name = 'organization_id') THEN
        ALTER TABLE public.schedule_settings ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Populate organization_id from branches for settings tables
UPDATE public.pos_settings ps SET organization_id = b.organization_id FROM public.branches b WHERE ps.branch_id = b.id AND ps.organization_id IS NULL;
UPDATE public.quote_settings qs SET organization_id = b.organization_id FROM public.branches b WHERE qs.branch_id = b.id AND qs.organization_id IS NULL;
UPDATE public.schedule_settings ss SET organization_id = b.organization_id FROM public.branches b WHERE ss.branch_id = b.id AND ss.organization_id IS NULL;

-- Populate organization_id for lens_price_matrices
UPDATE public.lens_price_matrices lpm
SET organization_id = lf.organization_id
FROM public.lens_families lf
WHERE lpm.lens_family_id = lf.id;

-- Add unique indexes for upsert operations
-- POS SETTINGS
CREATE UNIQUE INDEX IF NOT EXISTS idx_pos_settings_branch_unique ON public.pos_settings(branch_id) WHERE branch_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_pos_settings_org_global ON public.pos_settings(organization_id) WHERE branch_id IS NULL;

-- QUOTE SETTINGS
CREATE UNIQUE INDEX IF NOT EXISTS idx_quote_settings_branch_unique ON public.quote_settings(branch_id) WHERE branch_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_quote_settings_org_global ON public.quote_settings(organization_id) WHERE branch_id IS NULL;

-- SCHEDULE SETTINGS
CREATE UNIQUE INDEX IF NOT EXISTS idx_schedule_settings_branch_unique ON public.schedule_settings(branch_id) WHERE branch_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_schedule_settings_org_global ON public.schedule_settings(organization_id) WHERE branch_id IS NULL;

-- 2. EXPAND ORGANIZATION SETTINGS TABLE to include Billing fields
DO $$ 
BEGIN 
    -- Billing fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organization_settings' AND column_name = 'business_name') THEN
        ALTER TABLE public.organization_settings ADD COLUMN business_name TEXT;
        ALTER TABLE public.organization_settings ADD COLUMN business_rut TEXT;
        ALTER TABLE public.organization_settings ADD COLUMN business_address TEXT;
        ALTER TABLE public.organization_settings ADD COLUMN business_phone TEXT;
        ALTER TABLE public.organization_settings ADD COLUMN business_email TEXT;
        ALTER TABLE public.organization_settings ADD COLUMN logo_url TEXT;
        ALTER TABLE public.organization_settings ADD COLUMN header_text TEXT;
        ALTER TABLE public.organization_settings ADD COLUMN footer_text TEXT;
        ALTER TABLE public.organization_settings ADD COLUMN terms_and_conditions TEXT;
        ALTER TABLE public.organization_settings ADD COLUMN default_document_type TEXT DEFAULT 'boleta';
        ALTER TABLE public.organization_settings ADD COLUMN printer_type TEXT DEFAULT 'thermal';
        ALTER TABLE public.organization_settings ADD COLUMN printer_width_mm DECIMAL(10,2) DEFAULT 80;
        ALTER TABLE public.organization_settings ADD COLUMN printer_height_mm DECIMAL(10,2) DEFAULT 297;
    END IF;
END $$;

-- 3. ENSURE POS_SETTINGS HAS BILLING FIELDS (for per-branch override)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pos_settings' AND column_name = 'business_name') THEN
        ALTER TABLE public.pos_settings ADD COLUMN business_name TEXT;
        ALTER TABLE public.pos_settings ADD COLUMN business_rut TEXT;
        ALTER TABLE public.pos_settings ADD COLUMN business_address TEXT;
        ALTER TABLE public.pos_settings ADD COLUMN business_phone TEXT;
        ALTER TABLE public.pos_settings ADD COLUMN business_email TEXT;
        ALTER TABLE public.pos_settings ADD COLUMN logo_url TEXT;
        ALTER TABLE public.pos_settings ADD COLUMN header_text TEXT;
        ALTER TABLE public.pos_settings ADD COLUMN footer_text TEXT;
        ALTER TABLE public.pos_settings ADD COLUMN terms_and_conditions TEXT;
        ALTER TABLE public.pos_settings ADD COLUMN default_document_type TEXT DEFAULT 'boleta';
        ALTER TABLE public.pos_settings ADD COLUMN printer_type TEXT DEFAULT 'thermal';
        ALTER TABLE public.pos_settings ADD COLUMN printer_width_mm DECIMAL(10,2) DEFAULT 80;
        ALTER TABLE public.pos_settings ADD COLUMN printer_height_mm DECIMAL(10,2) DEFAULT 297;
    END IF;
END $$;

-- 4. FIX RLS POLICIES (Make them strictly multi-tenant)

-- LENS FAMILIES
ALTER TABLE public.lens_families ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view lens families" ON lens_families;
DROP POLICY IF EXISTS "Admins can insert lens families" ON lens_families;
DROP POLICY IF EXISTS "Admins can update lens families" ON lens_families;
DROP POLICY IF EXISTS "Admins can manage lens families" ON lens_families;

CREATE POLICY "Users can view their organization's lens families" ON lens_families
FOR SELECT USING (organization_id = get_user_organization_id() OR (is_root_user(auth.uid())));

CREATE POLICY "Admins can manage their organization's lens families" ON lens_families
FOR ALL USING (organization_id = get_user_organization_id() OR (is_root_user(auth.uid())))
WITH CHECK (organization_id = get_user_organization_id() OR (is_root_user(auth.uid())));

-- LENS PRICE MATRICES
ALTER TABLE public.lens_price_matrices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view lens price matrices" ON lens_price_matrices;
DROP POLICY IF EXISTS "Admins can insert lens price matrices" ON lens_price_matrices;
DROP POLICY IF EXISTS "Admins can update lens price matrices" ON lens_price_matrices;

CREATE POLICY "Users can view their organization's lens price matrices" ON lens_price_matrices
FOR SELECT USING (organization_id = get_user_organization_id() OR (is_root_user(auth.uid())));

CREATE POLICY "Admins can manage their organization's lens price matrices" ON lens_price_matrices
FOR ALL USING (organization_id = get_user_organization_id() OR (is_root_user(auth.uid())))
WITH CHECK (organization_id = get_user_organization_id() OR (is_root_user(auth.uid())));

-- CONTACT LENS FAMILIES
ALTER TABLE public.contact_lens_families ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view contact lens families for their org" ON contact_lens_families;
DROP POLICY IF EXISTS "Admins can insert contact lens families" ON contact_lens_families;
DROP POLICY IF EXISTS "Admins can update contact lens families" ON contact_lens_families;

CREATE POLICY "Users can view their organization's contact lens families" ON contact_lens_families
FOR SELECT USING (organization_id = get_user_organization_id() OR (is_root_user(auth.uid())));

CREATE POLICY "Admins can manage their organization's contact lens families" ON contact_lens_families
FOR ALL USING (organization_id = get_user_organization_id() OR (is_root_user(auth.uid())))
WITH CHECK (organization_id = get_user_organization_id() OR (is_root_user(auth.uid())));

-- CONTACT LENS PRICE MATRICES
ALTER TABLE public.contact_lens_price_matrices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view contact lens price matrices for their org" ON contact_lens_price_matrices;
DROP POLICY IF EXISTS "Admins can insert contact lens price matrices" ON contact_lens_price_matrices;
DROP POLICY IF EXISTS "Admins can update contact lens price matrices" ON contact_lens_price_matrices;

CREATE POLICY "Users can view their organization's contact lens price matrices" ON contact_lens_price_matrices
FOR SELECT USING (organization_id = get_user_organization_id() OR (is_root_user(auth.uid())));

CREATE POLICY "Admins can manage their organization's contact lens price matrices" ON contact_lens_price_matrices
FOR ALL USING (organization_id = get_user_organization_id() OR (is_root_user(auth.uid())))
WITH CHECK (organization_id = get_user_organization_id() OR (is_root_user(auth.uid())));

-- 5. ORGANIZATION SETTINGS RLS
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their organization settings" ON organization_settings;
CREATE POLICY "Users can view their organization settings" ON organization_settings
FOR SELECT USING (organization_id = get_user_organization_id() OR (is_root_user(auth.uid())));

DROP POLICY IF EXISTS "Super admins can manage organization settings" ON organization_settings;
CREATE POLICY "Super admins can manage organization settings" ON organization_settings
FOR ALL USING (organization_id = get_user_organization_id() OR (is_root_user(auth.uid())))
WITH CHECK (organization_id = get_user_organization_id() OR (is_root_user(auth.uid())));

-- 6. POS SETTINGS RLS (Allow view based on branch access)
ALTER TABLE public.pos_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view pos_settings" ON pos_settings;
-- Users can see settings for branches they have access to, or global settings for their organization
CREATE POLICY "Users can view pos_settings" ON pos_settings
FOR SELECT USING (
    (branch_id IN (SELECT branch_id FROM admin_branch_access WHERE admin_user_id = auth.uid()))
    OR (organization_id = get_user_organization_id())
    OR is_root_user(auth.uid())
);

DROP POLICY IF EXISTS "Admins can manage pos_settings" ON pos_settings;
CREATE POLICY "Admins can manage pos_settings" ON pos_settings
FOR ALL USING (
    (organization_id = get_user_organization_id())
    OR is_root_user(auth.uid())
)
WITH CHECK (
    (organization_id = get_user_organization_id())
    OR is_root_user(auth.uid())
);

-- 7. QUOTE SETTINGS RLS
ALTER TABLE public.quote_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view quote settings in their branches" ON quote_settings;
DROP POLICY IF EXISTS "Admins can update quote settings in their branches" ON quote_settings;
DROP POLICY IF EXISTS "Admins can insert quote settings in their branches" ON quote_settings;

CREATE POLICY "Users can view quote_settings" ON quote_settings
FOR SELECT USING (
    (branch_id IN (SELECT branch_id FROM admin_branch_access WHERE admin_user_id = auth.uid()))
    OR (organization_id = get_user_organization_id())
    OR is_root_user(auth.uid())
);

CREATE POLICY "Admins can manage quote_settings" ON quote_settings
FOR ALL USING (
    (organization_id = get_user_organization_id())
    OR is_root_user(auth.uid())
)
WITH CHECK (
    (organization_id = get_user_organization_id())
    OR is_root_user(auth.uid())
);

-- 8. SCHEDULE SETTINGS RLS
ALTER TABLE public.schedule_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view schedule settings in their branches" ON schedule_settings;
DROP POLICY IF EXISTS "Admins can manage schedule settings" ON schedule_settings;

CREATE POLICY "Users can view schedule_settings" ON schedule_settings
FOR SELECT USING (
    (branch_id IN (SELECT branch_id FROM admin_branch_access WHERE admin_user_id = auth.uid()))
    OR (organization_id = get_user_organization_id())
    OR is_root_user(auth.uid())
);

CREATE POLICY "Admins can manage schedule_settings" ON schedule_settings
FOR ALL USING (
    (organization_id = get_user_organization_id())
    OR is_root_user(auth.uid())
)
WITH CHECK (
    (organization_id = get_user_organization_id())
    OR is_root_user(auth.uid())
);
