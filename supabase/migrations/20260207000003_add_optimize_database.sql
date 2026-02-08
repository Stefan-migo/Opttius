-- Migration: Add optimize_database function for maintenance
-- This allows admins to perform vacuum/analyze on key tables

CREATE OR REPLACE FUNCTION public.optimize_database()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_time TIMESTAMPTZ := NOW();
    v_tables_optimized TEXT[] := ARRAY['products', 'categories', 'orders', 'order_items', 'profiles', 'admin_users', 'customers', 'appointments', 'quotes', 'lab_work_orders'];
    v_table_name TEXT;
    v_result JSONB;
BEGIN
    -- Check if user is super_admin
    IF NOT EXISTS (
        SELECT 1 FROM public.admin_users 
        WHERE id = auth.uid() 
        AND role IN ('super_admin', 'root', 'dev')
        AND is_active = true
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
    END IF;

    -- We can only RUN ANALYZE in a function (VACUUM cannot be run in a transaction/block)
    -- But ANALYZE helps with query planner stats
    FOR v_table_name IN SELECT unnest(v_tables_optimized)
    LOOP
        EXECUTE format('ANALYZE public.%I', v_table_name);
    END LOOP;

    v_result := jsonb_build_object(
        'success', true,
        'tables_optimized', v_tables_optimized,
        'duration_seconds', extract(epoch from (NOW() - v_start_time)),
        'message', 'Database stats updated via ANALYZE for key tables.'
    );

    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

COMMENT ON FUNCTION public.optimize_database() IS 'Performs ANALYZE on core tables to optimize query planning. Restrict to super_admin/root/dev roles.';
