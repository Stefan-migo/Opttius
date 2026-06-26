-- Migration: 20260703000002_fix_security_definer_search_path
-- Description: Add SET search_path = 'public' to handle_organization_delete
--   and handle_organization_delete_fallback (SECURITY DEFINER functions).
--   These are trigger functions on organizations table that operate on auth.users.
--   Body remains identical — only the search_path clause is added.
--
-- Rollback:
--   CREATE OR REPLACE FUNCTION public.handle_organization_delete()
--     RETURNS trigger
--     LANGUAGE plpgsql
--     SECURITY DEFINER
--     AS $$ ... original body without search_path ... $$;
--   CREATE OR REPLACE FUNCTION public.handle_organization_delete_fallback()
--     RETURNS trigger
--     LANGUAGE plpgsql
--     SECURITY DEFINER
--     AS $$ ... original body without search_path ... $$;

BEGIN;

-- T-005: Add search_path to handle_organization_delete
CREATE OR REPLACE FUNCTION public.handle_organization_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
    v_owner_id UUID;
    v_email TEXT;
BEGIN
    -- Obtener el owner_id antes de eliminar la organización
    SELECT old.owner_id INTO v_owner_id FROM organizations WHERE id = old.id;

    -- Si tiene owner, obtener su email para logging
    IF v_owner_id IS NOT NULL THEN
        SELECT email INTO v_email FROM auth.users WHERE id = v_owner_id;

        -- Eliminar admin_users relacionados
        DELETE FROM admin_users WHERE organization_id = old.id;

        -- Eliminar de auth.users
        DELETE FROM auth.users WHERE id = v_owner_id;

        RAISE NOTICE 'Cascade delete: User % (%) and admin_users removed for organization %',
            v_email, v_owner_id, old.name;
    END IF;

    RETURN OLD;
END;
$function$;

-- T-006: Add search_path to handle_organization_delete_fallback
CREATE OR REPLACE FUNCTION public.handle_organization_delete_fallback()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
    v_admin_user RECORD;
BEGIN
    -- Si no tiene owner, buscar primer admin_users
    FOR v_admin_user IN
        SELECT id, email FROM admin_users
        WHERE organization_id = old.id
        AND role IN ('super_admin', 'admin')
        LIMIT 1
    LOOP
        -- Eliminar todos los admin_users
        DELETE FROM admin_users WHERE organization_id = old.id;

        -- Eliminar de auth
        DELETE FROM auth.users WHERE id = v_admin_user.id;

        RAISE NOTICE 'Cascade delete (fallback): User % removed for organization %',
            v_admin_user.email, old.name;
    END LOOP;

    RETURN OLD;
END;
$function$;

COMMIT;
