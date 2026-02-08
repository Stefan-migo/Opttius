# Analytics & Logging System

<cite>
**Referenced Files in This Document**
- [analytics-help.ts](file://src/lib/analytics-help.ts)
- [route.ts](file://src/app/api/admin/analytics/dashboard/route.ts)
- [page.tsx](file://src/app/admin/analytics/page.tsx)
- [index.ts](file://src/lib/logger/index.ts)
- [diagnoseSystem.ts](file://src/lib/ai/tools/diagnoseSystem.ts)
- [analyzeBusinessFlow.ts](file://src/lib/ai/tools/analyzeBusinessFlow.ts)
- [20260128000000_create_organizations_and_subscriptions.sql](file://supabase/migrations/20260128000000_create_organizations_and_subscriptions.sql)
- [20260122000006_create_order_payments.sql](file://supabase/migrations/20260122000006_create_order_payments.sql)
- [20260121000000_create_lens_price_matrices.sql](file://supabase/migrations/20260121000000_create_lens_price_matrices.sql)
- [20260131000004_create_ai_insights.sql](file://supabase/migrations/20260131000004_create_ai_insights.sql)
- [route.ts](file://src/app/api/cron/backups/route.ts)
- [vercel.json](file://vercel.json)
- [SECURITY_AUDIT_REPORT.md](file://docs/SECURITY_AUDIT_REPORT.md)
- [SECURITY_AUDIT_SUMMARY.md](file://docs/SECURITY_AUDIT_SUMMARY.md)
</cite>

## Table of Contents

1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)
10. [Appendices](#appendices)

## Introduction

This document describes the Opttius analytics and logging system with a focus on business intelligence and operational monitoring. It covers:

- Analytics entities: metrics collection, KPI tracking, user behavior analytics, and system performance monitoring
- Logging entities: audit trails, operation logs, error tracking, and compliance logging
- Interactions among analytics data, user activities, system events, and business metrics
- Aggregation strategies, time-series analysis, and reporting capabilities
- Real-time analytics processing, batch job scheduling, and data warehouse integration
- Privacy considerations, GDPR compliance, and data retention policies
- Implementation patterns for metric collection, log aggregation, and performance monitoring
- Query optimization for analytical workloads and historical data management

## Project Structure

The analytics and logging system spans frontend dashboards, backend APIs, database schemas, and scheduled jobs:

- Frontend dashboard renders KPIs and time-series charts
- Backend API aggregates metrics and trends from Supabase
- Database migrations define tenant-aware schemas and analytics tables
- Scheduled cron jobs automate backups and batch processing
- Structured logging supports audit and error tracking

```mermaid
graph TB
subgraph "Frontend"
UI["Analytics Dashboard Page<br/>page.tsx"]
Charts["Charts Components<br/>Enhanced*"]
end
subgraph "Backend"
API["Analytics API Route<br/>GET /api/admin/analytics/dashboard"]
Cron["Backup Cron Job<br/>GET /api/cron/backups"]
end
subgraph "Database"
Org["Organizations & Subscriptions<br/>20260128000000_*"]
Payments["Order Payments<br/>20260122000006_*"]
Lenses["Lens Price Matrices<br/>20260121000000_*"]
Insights["AI Insights<br/>20260131000004_*"]
end
subgraph "Logging"
Logger["Structured Logger<br/>index.ts"]
end
UI --> API
Charts --> UI
API --> Org
API --> Payments
API --> Lenses
API --> Insights
Cron --> Org
Logger --> API
Logger --> Cron
```

**Diagram sources**

- [page.tsx](file://src/app/admin/analytics/page.tsx#L1-L1165)
- [route.ts](file://src/app/api/admin/analytics/dashboard/route.ts#L1-L635)
- [route.ts](file://src/app/api/cron/backups/route.ts#L1-L41)
- [index.ts](file://src/lib/logger/index.ts#L1-L111)
- [20260128000000_create_organizations_and_subscriptions.sql](file://supabase/migrations/20260128000000_create_organizations_and_subscriptions.sql#L1-L287)
- [20260122000006_create_order_payments.sql](file://supabase/migrations/20260122000006_create_order_payments.sql#L1-L58)
- [20260121000000_create_lens_price_matrices.sql](file://supabase/migrations/20260121000000_create_lens_price_matrices.sql#L1-L202)
- [20260131000004_create_ai_insights.sql](file://supabase/migrations/20260131000004_create_ai_insights.sql#L1-L131)

**Section sources**

- [page.tsx](file://src/app/admin/analytics/page.tsx#L1-L1165)
- [route.ts](file://src/app/api/admin/analytics/dashboard/route.ts#L1-L635)
- [index.ts](file://src/lib/logger/index.ts#L1-L111)
- [20260128000000_create_organizations_and_subscriptions.sql](file://supabase/migrations/20260128000000_create_organizations_and_subscriptions.sql#L1-L287)
- [20260122000006_create_order_payments.sql](file://supabase/migrations/20260122000006_create_order_payments.sql#L1-L58)
- [20260121000000_create_lens_price_matrices.sql](file://supabase/migrations/20260121000000_create_lens_price_matrices.sql#L1-L202)
- [20260131000004_create_ai_insights.sql](file://supabase/migrations/20260131000004_create_ai_insights.sql#L1-L131)

## Core Components

- Analytics API: Computes KPIs, trends, and distributions for POS sales, work orders, quotes, appointments, customers, and products
- Analytics Dashboard: Renders KPI cards, time-series charts, and distribution visuals
- Structured Logger: Provides structured logging for audit, operations, and error tracking
- AI Tools: Diagnostic and business flow analysis for system health and process bottlenecks
- Database Schema: Tenant-aware tables for organizations, subscriptions, payments, lens pricing, and AI insights
- Cron Jobs: Automated backups and scheduled maintenance

Key implementation patterns:

- Branch-aware analytics via branch context injection
- Feature gating for advanced analytics based on subscription tiers
- Time-range slicing for daily trends and growth comparisons
- Aggregation via SQL queries and client-side computations

**Section sources**

- [route.ts](file://src/app/api/admin/analytics/dashboard/route.ts#L1-L635)
- [page.tsx](file://src/app/admin/analytics/page.tsx#L1-L1165)
- [index.ts](file://src/lib/logger/index.ts#L1-L111)
- [diagnoseSystem.ts](file://src/lib/ai/tools/diagnoseSystem.ts#L49-L83)
- [analyzeBusinessFlow.ts](file://src/lib/ai/tools/analyzeBusinessFlow.ts#L1-L331)
- [20260128000000_create_organizations_and_subscriptions.sql](file://supabase/migrations/20260128000000_create_organizations_and_subscriptions.sql#L1-L287)
- [20260122000006_create_order_payments.sql](file://supabase/migrations/20260122000006_create_order_payments.sql#L1-L58)
- [20260131000004_create_ai_insights.sql](file://supabase/migrations/20260131000004_create_ai_insights.sql#L1-L131)

## Architecture Overview

The analytics pipeline integrates frontend, backend, database, and logging:

- Frontend requests analytics for a selected period and branch
- Backend validates admin access, checks feature permissions, and applies branch filters
- Database queries compute KPIs, trends, and distributions
- Results are returned to the dashboard for rendering
- Structured logging captures request lifecycle and errors

```mermaid
sequenceDiagram
participant Client as "Analytics Dashboard<br/>page.tsx"
participant API as "Analytics API<br/>GET /api/admin/analytics/dashboard"
participant DB as "Supabase DB"
participant Log as "Logger<br/>index.ts"
Client->>API : "Fetch analytics(period, branch)"
API->>Log : "debug('Analytics Dashboard API called')"
API->>API : "Validate admin and feature access"
API->>DB : "Query orders/customers/products/quotes/work_orders/appointments"
DB-->>API : "Raw data"
API->>API : "Compute KPIs, trends, distributions"
API->>Log : "info('Analytics calculated successfully', {kpis})"
API-->>Client : "JSON analytics payload"
```

**Diagram sources**

- [page.tsx](file://src/app/admin/analytics/page.tsx#L160-L191)
- [route.ts](file://src/app/api/admin/analytics/dashboard/route.ts#L8-L635)
- [index.ts](file://src/lib/logger/index.ts#L40-L104)

**Section sources**

- [route.ts](file://src/app/api/admin/analytics/dashboard/route.ts#L1-L635)
- [page.tsx](file://src/app/admin/analytics/page.tsx#L134-L191)
- [index.ts](file://src/lib/logger/index.ts#L1-L111)

## Detailed Component Analysis

### Analytics API: Metrics Collection and KPIs

The analytics endpoint aggregates:

- Revenue (POS sales and work orders), growth vs previous period
- Orders, work orders, quotes, and appointments statistics
- Customer acquisition and retention indicators
- Product inventory health and top-performing SKUs
- Payment method breakdown
- Daily sales, customer, work orders, and quotes trends

Implementation highlights:

- Branch-aware filtering and global view for super admins
- Feature gating for advanced analytics based on subscription tiers
- Time-range slicing for daily trends and growth calculations
- Aggregation logic for KPIs and distributions

```mermaid
flowchart TD
Start(["Request Received"]) --> Auth["Validate Admin & Feature Access"]
Auth --> Filters["Apply Branch Filters"]
Filters --> Queries["Execute Parallel Queries<br/>orders/customers/products/quotes/work_orders/appointments"]
Queries --> Compute["Compute KPIs & Trends"]
Compute --> Format["Format Response Payload"]
Format --> Log["Log Success"]
Log --> End(["Return JSON"])
```

**Diagram sources**

- [route.ts](file://src/app/api/admin/analytics/dashboard/route.ts#L14-L635)

**Section sources**

- [route.ts](file://src/app/api/admin/analytics/dashboard/route.ts#L1-L635)
- [analytics-help.ts](file://src/lib/analytics-help.ts#L1-L39)

### Analytics Dashboard: Reporting and Visualizations

The dashboard presents:

- KPI cards for total revenue, work orders, quotes, and appointments
- Time-series charts for sales and work orders (column/line toggles)
- Distribution charts for work orders and quotes statuses
- Payment methods breakdown and product inventory health

User interactions:

- Period selection (7/30/90/365 days)
- Branch selector for super admins
- Refresh button and loading states

**Section sources**

- [page.tsx](file://src/app/admin/analytics/page.tsx#L1-L1165)

### Structured Logging: Audit, Operations, and Error Tracking

The logger provides:

- Structured JSON logs with timestamps
- Levels: debug, info, warn, error
- Error enrichment with stack traces and contextual data
- Centralized logging for API requests and cron jobs

Security and compliance:

- Error responses sanitize internal details
- Audit trail coverage includes admin activity, payments, security events, and user access

**Section sources**

- [index.ts](file://src/lib/logger/index.ts#L1-L111)
- [SECURITY_AUDIT_REPORT.md](file://docs/SECURITY_AUDIT_REPORT.md#L382-L439)

### AI Tools: System Diagnostics and Business Flow Analysis

Diagnostic capabilities:

- Multi-dimensional system health analysis (orders, inventory, customers, performance)
- Bottleneck identification in business processes
- Efficiency scoring and recommendations

Execution pattern:

- Parallel analysis of multiple domains
- Structured insights with severity and actionable recommendations

**Section sources**

- [diagnoseSystem.ts](file://src/lib/ai/tools/diagnoseSystem.ts#L49-L83)
- [diagnoseSystem.ts](file://src/lib/ai/tools/diagnoseSystem.ts#L334-L383)
- [analyzeBusinessFlow.ts](file://src/lib/ai/tools/analyzeBusinessFlow.ts#L1-L331)

### Database Schema: Entities and Relationships

Core entities:

- Organizations and Subscriptions: multi-tenancy foundation
- Order Payments: cash-first payment tracking
- Lens Price Matrices: pricing engine for optical products
- AI Insights: contextual insights per organization and section

```mermaid
erDiagram
ORGANIZATIONS {
uuid id PK
text name
text slug
uuid owner_id
text subscription_tier
text status
jsonb metadata
timestamptz created_at
timestamptz updated_at
}
SUBSCRIPTIONS {
uuid id PK
uuid organization_id FK
text stripe_subscription_id
text stripe_customer_id
text status
date current_period_start
date current_period_end
date cancel_at
timestamptz canceled_at
timestamptz created_at
timestamptz updated_at
}
ORDER_PAYMENTS {
uuid id PK
uuid order_id FK
decimal amount
text payment_method
text payment_reference
timestamptz paid_at
uuid created_by
text notes
timestamptz created_at
}
LENS_PRICE_MATRICES {
uuid id PK
uuid lens_family_id FK
decimal sphere_min
decimal sphere_max
text lens_type
text lens_material
decimal base_price
text sourcing_type
decimal stock_cost
decimal surfaced_cost
decimal lab_cost
decimal astigmatism_multiplier
decimal prism_multiplier
boolean is_active
timestamptz created_at
timestamptz updated_at
}
AI_INSIGHTS {
uuid id PK
timestamptz created_at
timestamptz updated_at
uuid organization_id FK
text section
text type
text title
text message
text action_label
text action_url
jsonb metadata
boolean is_dismissed
integer priority
integer feedback_score
}
ORGANIZATIONS ||--o{ SUBSCRIPTIONS : "has"
ORGANIZATIONS ||--o{ AI_INSIGHTS : "generates"
LENS_PRICE_MATRICES }o--|| LENS_FAMILIES : "belongs_to"
```

**Diagram sources**

- [20260128000000_create_organizations_and_subscriptions.sql](file://supabase/migrations/20260128000000_create_organizations_and_subscriptions.sql#L6-L44)
- [20260122000006_create_order_payments.sql](file://supabase/migrations/20260122000006_create_order_payments.sql#L5-L17)
- [20260121000000_create_lens_price_matrices.sql](file://supabase/migrations/20260121000000_create_lens_price_matrices.sql#L6-L56)
- [20260131000004_create_ai_insights.sql](file://supabase/migrations/20260131000004_create_ai_insights.sql#L6-L31)

**Section sources**

- [20260128000000_create_organizations_and_subscriptions.sql](file://supabase/migrations/20260128000000_create_organizations_and_subscriptions.sql#L1-L287)
- [20260122000006_create_order_payments.sql](file://supabase/migrations/20260122000006_create_order_payments.sql#L1-L58)
- [20260121000000_create_lens_price_matrices.sql](file://supabase/migrations/20260121000000_create_lens_price_matrices.sql#L1-L202)
- [20260131000004_create_ai_insights.sql](file://supabase/migrations/20260131000004_create_ai_insights.sql#L1-L131)

### Batch Jobs and Scheduling

- Backup cron job runs weekly via Vercel Cron configuration
- Authentication enforced via cron secret headers
- Iterates over active organizations and performs backup operations

```mermaid
sequenceDiagram
participant Cron as "Vercel Cron"
participant API as "GET /api/cron/backups"
participant DB as "Supabase DB"
participant Log as "Logger"
Cron->>API : "Invoke with Authorization header"
API->>API : "Validate CRON_SECRET"
API->>DB : "SELECT active organizations"
DB-->>API : "Organizations list"
API->>API : "Iterate and backup each org"
API->>Log : "Log progress and errors"
API-->>Cron : "JSON results"
```

**Diagram sources**

- [route.ts](file://src/app/api/cron/backups/route.ts#L1-L41)
- [vercel.json](file://vercel.json#L1-L8)

**Section sources**

- [route.ts](file://src/app/api/cron/backups/route.ts#L1-L41)
- [vercel.json](file://vercel.json#L1-L8)

## Dependency Analysis

- Frontend depends on backend analytics API and chart components
- Backend depends on Supabase for data access and logger for observability
- Database migrations define tenant isolation and feature-specific tables
- Cron jobs depend on backend routes and environment secrets

```mermaid
graph LR
Page["page.tsx"] --> API["route.ts (analytics)"]
Page --> Charts["Enhanced* charts"]
API --> DB["Supabase (migrations)"]
API --> Logger["index.ts"]
CronRoute["route.ts (backups)"] --> DB
CronRoute --> Logger
Vercel["vercel.json"] --> CronRoute
```

**Diagram sources**

- [page.tsx](file://src/app/admin/analytics/page.tsx#L1-L1165)
- [route.ts](file://src/app/api/admin/analytics/dashboard/route.ts#L1-L635)
- [route.ts](file://src/app/api/cron/backups/route.ts#L1-L41)
- [index.ts](file://src/lib/logger/index.ts#L1-L111)
- [vercel.json](file://vercel.json#L1-L8)

**Section sources**

- [page.tsx](file://src/app/admin/analytics/page.tsx#L1-L1165)
- [route.ts](file://src/app/api/admin/analytics/dashboard/route.ts#L1-L635)
- [route.ts](file://src/app/api/cron/backups/route.ts#L1-L41)
- [index.ts](file://src/lib/logger/index.ts#L1-L111)
- [vercel.json](file://vercel.json#L1-L8)

## Performance Considerations

- Use branch filters to limit dataset size for targeted analytics
- Leverage database indexes on frequently queried columns (e.g., created_at, branch_id, payment_method)
- Apply time-range boundaries to reduce scan windows
- Cache periodic dashboard results when appropriate and invalidate on data changes
- Monitor query durations and optimize aggregations with materialized summaries for high-frequency reports
- Use parallel queries for independent datasets to minimize latency

[No sources needed since this section provides general guidance]

## Troubleshooting Guide

Common issues and resolutions:

- Unauthorized access: Verify admin role and feature gating for advanced analytics
- Missing data: Confirm branch context and date range selections
- Feature not available: Upgrade subscription tier to enable advanced analytics
- Logging errors: Inspect structured logs for request IDs and stack traces

**Section sources**

- [route.ts](file://src/app/api/admin/analytics/dashboard/route.ts#L14-L57)
- [SECURITY_AUDIT_REPORT.md](file://docs/SECURITY_AUDIT_REPORT.md#L311-L439)

## Conclusion

Opttius provides a robust analytics and logging framework:

- Tenant-aware analytics with branch scoping and feature gating
- Comprehensive KPI computation and time-series reporting
- Structured logging for audit and error tracking
- AI-driven diagnostics and business flow analysis
- Automated batch jobs for backups and maintenance

These components collectively support business intelligence, operational monitoring, and compliance needs while maintaining scalability and security.

[No sources needed since this section summarizes without analyzing specific files]

## Appendices

### Privacy, GDPR, and Data Retention

- Data minimization: collect only necessary fields for analytics and logging
- Access controls: enforce row-level security and role-based permissions
- Audit logging: maintain records of administrative actions and sensitive operations
- Data retention: align with organizational policies and legal obligations

**Section sources**

- [SECURITY_AUDIT_SUMMARY.md](file://docs/SECURITY_AUDIT_SUMMARY.md#L129-L141)
