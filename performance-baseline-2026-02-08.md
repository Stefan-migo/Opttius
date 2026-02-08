# Opttius Database Performance Baseline Report

Generated: February 8, 2026

## 📊 Current Database Status

### Database Size Overview

Top 10 largest tables:

1. embeddings - 2224 kB
2. memory_facts - 656 kB
3. products - 504 kB
4. orders - 344 kB
5. lab_work_orders - 256 kB
6. quotes - 224 kB
7. customers - 216 kB
8. appointments - 176 kB
9. system_email_templates - 160 kB
10. prescriptions - 160 kB

### Current Performance Metrics

#### Slow Queries (>50ms average execution time)

1. **Vector indexes creation** - 328.89ms average
2. **Memory facts vector index** - 253.25ms average
3. **Timezone names query** - 204.86ms average (27 calls)
4. **pgvector extension setup** - 204.27ms average
5. **Unique index creation** - 179.25ms average
6. **Table size calculation** - 131.88ms average
7. **Recursive CTE queries** - 106.32ms average (27 calls)
8. **Lens matrices fix** - 104.58ms average
9. **WITH clause queries** - 67.96ms average (27 calls)
10. **Support system migration** - 60.30ms average

### Missing Indexes Analysis

**Progress**: 20+ foreign key indexes created
**Remaining**: 23 tables still need indexing

Recently created indexes:

- ✅ cart_items.variant_id
- ✅ order_items.variant_id
- ✅ admin_users.created_by
- ✅ support_tickets.category_id
- ✅ support_tickets.order_id
- ✅ support_tickets.resolved_by
- ✅ support_messages.sender_id
- ✅ support_templates.category_id
- ✅ support_templates.created_by
- ✅ system_email_templates.created_by
- ✅ system_config.last_modified_by
- ✅ system_maintenance_log.executed_by
- ✅ admin_notifications.created_by
- ✅ customer_lens_purchases.product_id
- ✅ pos_sessions.reopened_by
- ✅ prescriptions.created_by
- ✅ appointments.created_by
- ✅ quotes.prescription_id
- ✅ quotes.created_by
- ✅ quotes.sent_by

Still pending (23 remaining):

- quote_settings.updated_by
- lab_work_orders.frame_product_id
- lab_work_orders.pos_order_id
- lab_work_orders.created_by
- lab_work_order_status_history.changed_by
- schedule_settings.updated_by
- memory_facts.source_session_id
- profiles.preferred_branch_id
- customers.created_by
- customers.updated_by
- order_payments.created_by
- saas_support_tickets.created_by_user_id
- saas_support_tickets.resolved_by
- saas_support_messages.sender_id
- saas_support_templates.created_by
- [Plus 8 more tables]

## 🎯 Optimization Targets

### High Priority (>100ms queries)

- Vector index creation queries
- Recursive CTE operations
- Timezone and metadata queries

### Medium Priority (50-100ms queries)

- Table size calculations
- Migration-related queries
- Support system queries

### Index Opportunities

- 10 missing foreign key indexes
- Potential composite indexes for frequent query patterns
- Partial indexes for filtered queries

## 📈 Baseline Metrics Summary

- **Slowest query**: 328.89ms (vector index creation)
- **Most frequent slow query**: Timezone names (27 calls at 204.86ms avg)
- **Tables needing attention**: 10 tables with missing FK indexes
- **Current total database size**: ~5MB (relatively small, good starting point)

## 🚀 Next Steps

1. Implement missing foreign key indexes
2. Optimize vector index creation process
3. Review recursive CTE performance
4. Create composite indexes for common query patterns
5. Set up continuous performance monitoring

---

Baseline established using Supabase MCP server connectivity
