# Quick Start Guide: Opttius Performance Optimization

## 🚀 Getting Started

This guide will help you implement all performance optimizations for the Opttius system.

## Prerequisites

Before starting, ensure you have:

1. **Supabase Running Locally**

   ```bash
   npm run supabase:start
   ```

2. **Environment Variables Set**
   - Check `.env.local` has correct Supabase credentials
   - Ensure database connection is working

3. **Backup Strategy**
   - Make sure you can restore from backups if needed

## 📋 Implementation Steps

### Option 1: Automated Full Optimization (Recommended)

**Linux/Mac:**

```bash
chmod +x scripts/optimize-complete.sh
./scripts/optimize-complete.sh
```

**Windows:**

```cmd
scripts\optimize-complete.bat
```

This will automatically:

- ✅ Backup your database
- ✅ Analyze current performance
- ✅ Implement critical indexes
- ✅ Optimize slow queries
- ✅ Setup monitoring
- ✅ Run integration tests
- ✅ Generate optimization report

### Option 2: Manual Step-by-Step

#### Step 1: Check Prerequisites

```bash
# Linux/Mac
./scripts/optimize-complete.sh prerequisites

# Windows
scripts\optimize-complete.bat prerequisites
```

#### Step 2: Create Database Backup

```bash
# Linux/Mac
./scripts/optimize-complete.sh backup

# Windows
scripts\optimize-complete.bat backup
```

#### Step 3: Analyze Performance

```bash
# Linux/Mac
./scripts/optimize-complete.sh analyze

# Windows
scripts\optimize-complete.bat analyze
```

#### Step 4: Implement Indexes

```bash
# Linux/Mac
./scripts/optimize-complete.sh indexes

# Windows
scripts\optimize-complete.bat indexes
```

#### Step 5: Optimize Queries

```bash
# Linux/Mac
./scripts/optimize-complete.sh optimize

# Windows
scripts\optimize-complete.bat optimize
```

#### Step 6: Setup Monitoring

```bash
# Linux/Mac
./scripts/optimize-complete.sh monitoring

# Windows
scripts\optimize-complete.bat monitoring
```

#### Step 7: Run Tests

```bash
# Linux/Mac
./scripts/optimize-complete.sh test

# Windows
scripts\optimize-complete.bat test
```

#### Step 8: Generate Report

```bash
# Linux/Mac
./scripts/optimize-complete.sh report

# Windows
scripts\optimize-complete.bat report
```

## 📊 What Gets Optimized

### Database Performance

- **12 Critical Indexes**: Foreign keys, composite indexes, partial indexes
- **Query Optimizations**: Statistics updates, optimized functions
- **Monitoring Views**: Database health, performance metrics

### Expected Improvements

- **40-60% faster queries**
- **Better concurrent user handling**
- **Improved dashboard loading times**
- **Enhanced data consistency**

## 🔧 Manual Optimization Commands

If you need to run specific optimizations manually:

### Check Current Performance

```bash
# View slow queries
docker exec supabase_db_web psql -U postgres -d postgres -c "
    SELECT query, mean_time, calls
    FROM pg_stat_statements
    WHERE mean_time > 100
    ORDER BY mean_time DESC
    LIMIT 10;
"
```

### Implement Specific Indexes

```bash
# Create index on orders customer_id
docker exec supabase_db_web psql -U postgres -d postgres -c "
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_customer_id
    ON public.orders(customer_id);
"
```

### Update Database Statistics

```bash
# Update query planner statistics
docker exec supabase_db_web psql -U postgres -d postgres -c "
    ANALYZE public.orders;
    ANALYZE public.products;
    ANALYZE public.customers;
"
```

## 📈 Monitoring Results

### Check Optimization Results

```bash
# View performance report
cat optimization-report-*.md

# Check database health
docker exec supabase_db_web psql -U postgres -d postgres -c "
    SELECT * FROM public.database_health LIMIT 10;
"
```

### Monitor Performance Over Time

```bash
# Check for performance issues
docker exec supabase_db_web psql -U postgres -d postgres -c "
    SELECT * FROM public.check_performance_issues();
"
```

## 🛡️ Rollback Procedure

If you need to rollback changes:

```bash
# Restore from backup (replace timestamp)
pg_restore -U postgres -d postgres backups/opttius_backup_YYYYMMDD_HHMMSS.sql

# Or drop newly created indexes
docker exec supabase_db_web psql -U postgres -d postgres -c "
    DROP INDEX IF EXISTS idx_orders_customer_id;
    DROP INDEX IF EXISTS idx_quotes_branch_id;
    -- ... drop other indexes
"
```

## 🎯 Success Criteria

After optimization, you should see:

- [ ] All integration tests passing
- [ ] Query execution times reduced by 40-60%
- [ ] No new errors in application logs
- [ ] Dashboard loads faster
- [ ] Concurrent users handled better

## 🆘 Troubleshooting

### Common Issues

**Issue**: "Supabase containers not running"
**Solution**: Run `npm run supabase:start` and wait for containers to be ready

**Issue**: "Permission denied" on script execution
**Solution**: Run `chmod +x scripts/optimize-complete.sh`

**Issue**: "Connection refused" to database
**Solution**: Check if Supabase is running: `docker ps | grep supabase`

**Issue**: Index creation fails
**Solution**: Check if indexes already exist or if there are locking issues

### Getting Help

1. Check the optimization log: `cat optimization-log.txt`
2. Review the performance analysis report
3. Look at database logs: `docker logs supabase_db_web`
4. Check application logs for errors

## 📚 Next Steps

After successful optimization:

1. **Monitor for 24-48 hours** in production-like environment
2. **Review performance metrics** and adjust as needed
3. **Document any issues** encountered during optimization
4. **Plan next phase** of improvements based on results

---

_This guide is part of the Opttius Performance Optimization initiative_
