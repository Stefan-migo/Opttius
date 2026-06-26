-- Migration: 20260210030000_telemetry_retention_functions.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- ============================================================================
-- Telemetry Data Retention and Cleanup Functions
-- Adds automated cleanup for old telemetry data based on organization settings
-- ============================================================================

-- Create function to clean up old telemetry data based on retention settings
CREATE OR REPLACE FUNCTION cleanup_old_telemetry_data()
RETURNS void AS $$
DECLARE
    org_record RECORD;
    retention_days INTEGER;
BEGIN
    -- Get retention settings for each organization
    FOR org_record IN 
        SELECT tc.organization_id, COALESCE(tc.retention_days, 90) as days
        FROM public.telemetry_config tc
    LOOP
        retention_days := org_record.days;
        
        -- Delete old events for this organization
        DELETE FROM public.telemetry_events 
        WHERE organization_id = org_record.organization_id 
        AND created_at < NOW() - INTERVAL '1 day' * retention_days;
        
        -- Delete old aggregates (keep longer for historical analysis)
        DELETE FROM public.telemetry_aggregates 
        WHERE organization_id = org_record.organization_id 
        AND date < CURRENT_DATE - INTERVAL '1 year';
        
        RAISE NOTICE 'Cleaned up telemetry data for organization %: removed events older than % days', 
            org_record.organization_id, retention_days;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create scheduled job function for regular cleanup
CREATE OR REPLACE FUNCTION schedule_telemetry_cleanup()
RETURNS void AS $$
BEGIN
    -- This function can be called by a cron job or scheduled task
    -- Example: SELECT schedule_telemetry_cleanup();
    
    PERFORM cleanup_old_telemetry_data();
    
    RAISE NOTICE 'Telemetry cleanup completed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- Create function to get telemetry data statistics
CREATE OR REPLACE FUNCTION get_telemetry_stats(org_id UUID DEFAULT NULL)
RETURNS TABLE(
    organization_id UUID,
    total_events BIGINT,
    unique_users BIGINT,
    date_range TEXT,
    storage_size_mb NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(te.organization_id, org_id) as organization_id,
        COUNT(*) as total_events,
        COUNT(DISTINCT te.user_id) as unique_users,
        CONCAT(
            TO_CHAR(MIN(te.created_at), 'YYYY-MM-DD'), 
            ' to ', 
            TO_CHAR(MAX(te.created_at), 'YYYY-MM-DD')
        ) as date_range,
        ROUND(pg_total_relation_size('telemetry_events'::regclass) / 1024.0 / 1024.0, 2) as storage_size_mb
    FROM public.telemetry_events te
    WHERE (org_id IS NULL OR te.organization_id = org_id)
    GROUP BY COALESCE(te.organization_id, org_id);
END;
$$ LANGUAGE plpgsql;

-- Create function to archive old telemetry data (optional)
CREATE OR REPLACE FUNCTION archive_old_telemetry_data(archive_before_date DATE DEFAULT CURRENT_DATE - INTERVAL '1 year')
RETURNS TABLE(archived_count BIGINT, archive_date DATE) AS $$
DECLARE
    archived_rows BIGINT;
BEGIN
    -- This would typically move data to an archive table
    -- For now, we'll just count what would be archived
    
    SELECT COUNT(*) INTO archived_rows
    FROM public.telemetry_events 
    WHERE created_at < archive_before_date;
    
    RETURN QUERY SELECT archived_rows, archive_before_date;
    
    RAISE NOTICE 'Would archive % events older than %', archived_rows, archive_before_date;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION cleanup_old_telemetry_data() TO authenticated;
GRANT EXECUTE ON FUNCTION schedule_telemetry_cleanup() TO authenticated;
GRANT EXECUTE ON FUNCTION get_telemetry_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION archive_old_telemetry_data(DATE) TO authenticated;

-- Example usage:
-- SELECT cleanup_old_telemetry_data(); -- Manual cleanup
-- SELECT schedule_telemetry_cleanup(); -- Scheduled cleanup
-- SELECT * FROM get_telemetry_stats(); -- Get stats for all orgs
-- SELECT * FROM get_telemetry_stats('specific-org-id'); -- Get stats for specific org
-- SELECT * FROM archive_old_telemetry_data(CURRENT_DATE - INTERVAL '1 year'); -- Check archive potential