-- Performance Monitoring Views
-- Created: February 8, 2026

-- View for tracking slow queries
CREATE OR REPLACE VIEW public.slow_queries_monitor AS
SELECT 
    substring(query, 1, 100) as query_snippet,
    calls,
    total_exec_time,
    mean_exec_time,
    stddev_exec_time,
    rows,
    CASE 
        WHEN mean_exec_time > 1000 THEN 'CRITICAL'
        WHEN mean_exec_time > 500 THEN 'HIGH'
        WHEN mean_exec_time > 100 THEN 'MEDIUM'
        ELSE 'LOW'
    END as priority_level
FROM pg_stat_statements 
WHERE mean_exec_time > 50
ORDER BY mean_exec_time DESC;

-- View for missing index analysis
CREATE OR REPLACE VIEW public.missing_indexes_analysis AS
SELECT 
    tc.table_name,
    kcu.column_name,
    ct.data_type,
    CASE 
        WHEN ct.data_type IN ('uuid', 'integer', 'bigint') THEN 'HIGH'
        WHEN ct.data_type IN ('text', 'varchar') THEN 'MEDIUM'
        ELSE 'LOW'
    END as priority_level
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu 
    ON tc.constraint_name = kcu.constraint_name 
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.columns AS ct
    ON ct.table_name = tc.table_name 
    AND ct.column_name = kcu.column_name
    AND ct.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_schema = 'public' 
AND NOT EXISTS (
    SELECT 1 FROM pg_indexes i 
    WHERE i.tablename = tc.table_name 
    AND i.indexdef ILIKE '%' || kcu.column_name || '%'
)
ORDER BY 
    CASE 
        WHEN ct.data_type IN ('uuid', 'integer', 'bigint') THEN 1
        WHEN ct.data_type IN ('text', 'varchar') THEN 2
        ELSE 3
    END,
    tc.table_name;

-- Function to get current performance snapshot
CREATE OR REPLACE FUNCTION public.get_performance_snapshot()
RETURNS TABLE (
    snapshot_time TIMESTAMPTZ,
    total_slow_queries BIGINT,
    avg_query_time NUMERIC,
    top_slow_query TEXT,
    missing_indexes_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        NOW() as snapshot_time,
        (SELECT COUNT(*) FROM pg_stat_statements WHERE mean_exec_time > 50) as total_slow_queries,
        (SELECT ROUND(AVG(mean_exec_time)::numeric, 2) FROM pg_stat_statements WHERE mean_exec_time > 10) as avg_query_time,
        (SELECT substring(query, 1, 50) FROM pg_stat_statements WHERE mean_exec_time > 10 ORDER BY mean_exec_time DESC LIMIT 1) as top_slow_query,
        (SELECT COUNT(*) FROM public.missing_indexes_analysis) as missing_indexes_count;
END;
$$;