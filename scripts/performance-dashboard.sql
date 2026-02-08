-- Performance Dashboard Query
-- Run this to get a quick overview of database performance

SELECT '=== PERFORMANCE SNAPSHOT ===' as section;
SELECT * FROM public.get_performance_snapshot();

SELECT '' as blank;

SELECT '=== MISSING INDEXES (PRIORITY) ===' as section;
SELECT priority_level, COUNT(*) as count 
FROM public.missing_indexes_analysis 
GROUP BY priority_level 
ORDER BY priority_level;

SELECT '' as blank;

SELECT '=== TOP 5 MISSING INDEXES ===' as section;
SELECT table_name, column_name, data_type, priority_level
FROM public.missing_indexes_analysis 
ORDER BY priority_level, table_name
LIMIT 5;

SELECT '' as blank;

SELECT '=== DATABASE SIZE OVERVIEW ===' as section;
SELECT table_name, pg_size_pretty(pg_total_relation_size('public.' || table_name)) as size 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY pg_total_relation_size('public.' || table_name) DESC 
LIMIT 10;