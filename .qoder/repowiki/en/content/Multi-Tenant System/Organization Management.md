# Organization Management

<cite>
**Referenced Files in This Document**
- [src/app/admin/saas-management/organizations/page.tsx](file://src/app/admin/saas-management/organizations/page.tsx)
- [src/app/admin/saas-management/organizations/[id]/page.tsx](file://src/app/admin/saas-management/organizations/[id]/page.tsx)
- [src/app/api/admin/organizations/route.ts](file://src/app/api/admin/organizations/route.ts)
- [src/app/api/admin/organizations/current/route.ts](file://src/app/api/admin/organizations/current/route.ts)
- [src/app/api/admin/saas-management/organizations/[id]/route.ts](file://src/app/api/admin/saas-management/organizations/[id]/route.ts)
- [src/app/api/admin/saas-management/organizations/[id]/branches/route.ts](file://src/app/api/admin/saas-management/organizations/[id]/branches/route.ts)
- [src/app/api/admin/saas-management/organizations/[id]/users/route.ts](file://src/app/api/admin/saas-management/organizations/[id]/users/route.ts)
- [src/app/api/admin/saas-management/organizations/[id]/subscriptions/route.ts](file://src/app/api/admin/saas-management/organizations/[id]/subscriptions/route.ts)
- [src/app/api/admin/organization/limits/route.ts](file://src/app/api/admin/organization/limits/route.ts)
- [src/lib/api/validation/organization-schemas.ts](file://src/lib/api/validation/organization-schemas.ts)
- [supabase/migrations/20260128000000_create_organizations_and_subscriptions.sql](file://supabase/migrations/20260128000000_create_organizations_and_subscriptions.sql)
- [supabase/migrations/20260122000005_create_organization_settings.sql](file://supabase/migrations/20260122000005_create_organization_settings.sql)
- [src/lib/saas/subscription-status.ts](file://src/lib/saas/subscription-status.ts)
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

## Introduction

This document explains the organization management system in Opttius, focusing on how organizations act as the top-level tenant container in the multi-tenant architecture. It covers organization creation, configuration, administration, settings and branding, and the relationships among organizations, branches, users, and subscriptions. Practical examples illustrate setup, configuration options, administrative workflows, data isolation, switching behavior, permissions, and delegation patterns.

## Project Structure

The organization management system spans UI pages, API routes, database migrations, and shared validation logic:

- UI pages under the admin SaaS management area provide listing, details, and CRUD operations for organizations, branches, users, and subscriptions.
- API routes implement server-side logic with strict authorization checks and data validation.
- Database migrations define the multi-tenant schema, policies, and initial configurations.
- Validation schemas ensure consistent and secure data entry.

```mermaid
graph TB
subgraph "UI"
OrgList["Organizations List Page<br/>(admin/saas-management/organizations/page.tsx)"]
OrgDetail["Organization Details Page<br/>(admin/saas-management/organizations/[id]/page.tsx)"]
end
subgraph "API"
OrgAPI["Organizations API<br/>(api/admin/organizations/*.ts)"]
OrgSaaSMgmtAPI["SaaS Org Management API<br/>(api/admin/saas-management/organizations/[id]/*.ts)"]
LimitsAPI["Tier Limits API<br/>(api/admin/organization/limits/route.ts)"]
end
subgraph "Database"
OrgTable["organizations table"]
SubTable["subscriptions table"]
BranchTable["branches table"]
AdminUserTable["admin_users table"]
SettingsTable["organization_settings table"]
end
OrgList --> OrgAPI
OrgDetail --> OrgSaaSMgmtAPI
OrgAPI --> OrgTable
OrgSaaSMgmtAPI --> OrgTable
OrgSaaSMgmtAPI --> SubTable
OrgSaaSMgmtAPI --> BranchTable
OrgSaaSMgmtAPI --> AdminUserTable
OrgSaaSMgmtAPI --> SettingsTable
LimitsAPI --> OrgTable
LimitsAPI --> SubTable
```

**Diagram sources**

- [src/app/admin/saas-management/organizations/page.tsx](file://src/app/admin/saas-management/organizations/page.tsx#L91-L761)
- [src/app/admin/saas-management/organizations/[id]/page.tsx](file://src/app/admin/saas-management/organizations/[id]/page.tsx#L107-L800)
- [src/app/api/admin/organizations/route.ts](file://src/app/api/admin/organizations/route.ts#L20-L103)
- [src/app/api/admin/saas-management/organizations/[id]/route.ts](file://src/app/api/admin/saas-management/organizations/[id]/route.ts#L11-L147)
- [src/app/api/admin/saas-management/organizations/[id]/branches/route.ts](file://src/app/api/admin/saas-management/organizations/[id]/branches/route.ts#L11-L61)
- [src/app/api/admin/saas-management/organizations/[id]/users/route.ts](file://src/app/api/admin/saas-management/organizations/[id]/users/route.ts#L11-L77)
- [src/app/api/admin/saas-management/organizations/[id]/subscriptions/route.ts](file://src/app/api/admin/saas-management/organizations/[id]/subscriptions/route.ts#L11-L61)
- [src/app/api/admin/organization/limits/route.ts](file://src/app/api/admin/organization/limits/route.ts#L13-L111)
- [supabase/migrations/20260128000000_create_organizations_and_subscriptions.sql](file://supabase/migrations/20260128000000_create_organizations_and_subscriptions.sql#L5-L91)
- [supabase/migrations/20260122000005_create_organization_settings.sql](file://supabase/migrations/20260122000005_create_organization_settings.sql#L4-L21)

**Section sources**

- [src/app/admin/saas-management/organizations/page.tsx](file://src/app/admin/saas-management/organizations/page.tsx#L91-L761)
- [src/app/admin/saas-management/organizations/[id]/page.tsx](file://src/app/admin/saas-management/organizations/[id]/page.tsx#L107-L800)
- [src/app/api/admin/organizations/route.ts](file://src/app/api/admin/organizations/route.ts#L20-L103)
- [src/app/api/admin/saas-management/organizations/[id]/route.ts](file://src/app/api/admin/saas-management/organizations/[id]/route.ts#L11-L147)
- [supabase/migrations/20260128000000_create_organizations_and_subscriptions.sql](file://supabase/migrations/20260128000000_create_organizations_and_subscriptions.sql#L5-L91)

## Core Components

- Organizations list and details UI: Provides filtering, pagination, bulk actions, and CRUD for organizations, branches, users, and subscriptions.
- Organization APIs:
  - Listing and creation for administrators.
  - Current organization retrieval and updates for authenticated admins.
  - Full management APIs for SaaS root-level access.
- Validation schemas: Enforce slug, name, tier, and branch constraints.
- Database schema: Multi-tenant tables with RLS policies and indexes.
- Tier limits and subscription status utilities: Enforce plan limits and determine subscription health.

Key responsibilities:

- Organization creation with automatic first branch and subscription initialization.
- Centralized organization settings (e.g., minimum deposit configuration).
- Hierarchical relationships: organization → branches/users/subscriptions.
- Administrative controls: activation/suspension/cancellation, tier changes, and hard deletion with cascading cleanup.

**Section sources**

- [src/app/admin/saas-management/organizations/page.tsx](file://src/app/admin/saas-management/organizations/page.tsx#L91-L761)
- [src/app/admin/saas-management/organizations/[id]/page.tsx](file://src/app/admin/saas-management/organizations/[id]/page.tsx#L107-L800)
- [src/app/api/admin/organizations/route.ts](file://src/app/api/admin/organizations/route.ts#L121-L440)
- [src/app/api/admin/organizations/current/route.ts](file://src/app/api/admin/organizations/current/route.ts#L10-L153)
- [src/lib/api/validation/organization-schemas.ts](file://src/lib/api/validation/organization-schemas.ts#L51-L70)
- [supabase/migrations/20260128000000_create_organizations_and_subscriptions.sql](file://supabase/migrations/20260128000000_create_organizations_and_subscriptions.sql#L5-L91)
- [src/app/api/admin/organization/limits/route.ts](file://src/app/api/admin/organization/limits/route.ts#L13-L111)

## Architecture Overview

The system implements a multi-tenant architecture centered on organizations. Each organization is a tenant with its own branches, users, products, orders, and subscriptions. RLS policies restrict access to the tenant’s data, while SaaS root APIs enable administrative operations across tenants.

```mermaid
sequenceDiagram
participant Admin as "Admin UI"
participant OrgAPI as "Organizations API"
participant DB as "Supabase DB"
Admin->>OrgAPI : POST /api/admin/organizations
OrgAPI->>DB : Insert organization (service role)
OrgAPI->>DB : Upsert admin_users (super_admin)
OrgAPI->>DB : Insert default branch
OrgAPI->>DB : Insert trial subscription
DB-->>OrgAPI : New organization + branch + subscription
OrgAPI-->>Admin : {organization, branch}
```

**Diagram sources**

- [src/app/api/admin/organizations/route.ts](file://src/app/api/admin/organizations/route.ts#L121-L440)
- [supabase/migrations/20260128000000_create_organizations_and_subscriptions.sql](file://supabase/migrations/20260128000000_create_organizations_and_subscriptions.sql#L5-L91)

**Section sources**

- [src/app/api/admin/organizations/route.ts](file://src/app/api/admin/organizations/route.ts#L121-L440)
- [supabase/migrations/20260128000000_create_organizations_and_subscriptions.sql](file://supabase/migrations/20260128000000_create_organizations_and_subscriptions.sql#L5-L91)

## Detailed Component Analysis

### Organizations List and Details UI

- Organizations list supports search by name/slug, tier filter, status filter, pagination, and bulk actions (activate/suspend/change tier).
- Organization details page aggregates stats, owners, recent users, branches, and subscriptions, and exposes CRUD for each entity.

Practical examples:

- Creating an organization via the “New Organization” dialog triggers POST to the organizations API.
- Bulk actions operate on multiple organizations and call the bulk actions endpoint.
- Editing organization details updates name, slug, tier, and status.

**Section sources**

- [src/app/admin/saas-management/organizations/page.tsx](file://src/app/admin/saas-management/organizations/page.tsx#L91-L761)
- [src/app/admin/saas-management/organizations/[id]/page.tsx](file://src/app/admin/saas-management/organizations/[id]/page.tsx#L107-L800)

### Organization Creation and Onboarding

- Endpoint: POST /api/admin/organizations
- Validates input using Zod schemas, ensures the user has no existing organization, checks slug uniqueness, creates the organization, assigns the creator as super_admin, initializes a default branch, and sets up a trial subscription.

```mermaid
sequenceDiagram
participant Client as "Client"
participant API as "POST /api/admin/organizations"
participant SR as "Service Role Supabase"
participant DB as "DB"
Client->>API : {name, slug, subscription_tier, branchName?}
API->>SR : getUser()
API->>SR : Validate schema
API->>SR : Check existing org assignment
API->>SR : Check slug uniqueness
API->>SR : Insert organization
API->>SR : Upsert admin_users (super_admin)
API->>SR : Insert default branch
API->>SR : Insert trial subscription
SR->>DB : Transactions
DB-->>SR : Results
SR-->>API : New org + branch + subscription
API-->>Client : {organization, branch}
```

**Diagram sources**

- [src/app/api/admin/organizations/route.ts](file://src/app/api/admin/organizations/route.ts#L121-L440)
- [src/lib/api/validation/organization-schemas.ts](file://src/lib/api/validation/organization-schemas.ts#L51-L70)

**Section sources**

- [src/app/api/admin/organizations/route.ts](file://src/app/api/admin/organizations/route.ts#L121-L440)
- [src/lib/api/validation/organization-schemas.ts](file://src/lib/api/validation/organization-schemas.ts#L51-L70)

### Organization Settings and Branding

- Organization-level branding fields include name, slug, logo_url, and slogan.
- Current organization endpoints allow authenticated admins to update branding fields.
- Additional organization settings include configurable minimum deposit percentages and amounts for Cash-First logic.

Practical examples:

- Update branding: PATCH /api/admin/organizations/current with name/logo_url/slogan.
- Configure deposit minimums: use organization_settings table and get_min_deposit function.

**Section sources**

- [src/app/api/admin/organizations/current/route.ts](file://src/app/api/admin/organizations/current/route.ts#L68-L153)
- [supabase/migrations/20260122000005_create_organization_settings.sql](file://supabase/migrations/20260122000005_create_organization_settings.sql#L4-L57)

### Branches, Users, and Subscriptions Management

- Branches: List/create/update/delete per organization; codes auto-generated if not provided.
- Users: List/create users with roles and branch access; supports super_admin global access and staff/manager roles per branch.
- Subscriptions: List/create subscriptions with gateway metadata and statuses.

```mermaid
sequenceDiagram
participant Admin as "Admin UI"
participant BranchAPI as "Branches API"
participant UserAPI as "Users API"
participant SubAPI as "Subscriptions API"
participant DB as "DB"
Admin->>BranchAPI : GET/POST/PUT/DELETE branches
Admin->>UserAPI : GET/POST users
Admin->>SubAPI : GET/POST subscriptions
BranchAPI->>DB : Manage branches
UserAPI->>DB : Manage admin_users + profiles + access
SubAPI->>DB : Manage subscriptions
DB-->>BranchAPI : Results
DB-->>UserAPI : Results
DB-->>SubAPI : Results
```

**Diagram sources**

- [src/app/api/admin/saas-management/organizations/[id]/branches/route.ts](file://src/app/api/admin/saas-management/organizations/[id]/branches/route.ts#L11-L61)
- [src/app/api/admin/saas-management/organizations/[id]/users/route.ts](file://src/app/api/admin/saas-management/organizations/[id]/users/route.ts#L11-L77)
- [src/app/api/admin/saas-management/organizations/[id]/subscriptions/route.ts](file://src/app/api/admin/saas-management/organizations/[id]/subscriptions/route.ts#L11-L61)

**Section sources**

- [src/app/api/admin/saas-management/organizations/[id]/branches/route.ts](file://src/app/api/admin/saas-management/organizations/[id]/branches/route.ts#L67-L176)
- [src/app/api/admin/saas-management/organizations/[id]/users/route.ts](file://src/app/api/admin/saas-management/organizations/[id]/users/route.ts#L83-L254)
- [src/app/api/admin/saas-management/organizations/[id]/subscriptions/route.ts](file://src/app/api/admin/saas-management/organizations/[id]/subscriptions/route.ts#L67-L161)

### Administrative Controls and Deletion

- Organization details page supports activation/suspension/cancellation and tier changes.
- Hard deletion cascades to branches, users, orders, quotes, appointments, products, customers, payments, and related entities; also deletes auth users and cleans access records.

```mermaid
flowchart TD
Start([Delete Organization Request]) --> CheckRoot["Require root access"]
CheckRoot --> VerifyOrg["Verify organization exists"]
VerifyOrg --> FetchCounts["Fetch counts for logging"]
FetchCounts --> DeleteOrg["Delete organization (CASCADE)"]
DeleteOrg --> CleanupAccess["Delete admin_branch_access for users"]
CleanupAccess --> DeleteAdminUsers["Delete admin_users"]
DeleteAdminUsers --> MaybeDeleteAuthUsers{"Owner has other orgs?"}
MaybeDeleteAuthUsers --> |No| DeleteAuthUsers["Delete auth.users entries"]
MaybeDeleteAuthUsers --> |Yes| SkipDeleteAuthUsers["Keep auth.users"]
DeleteAuthUsers --> Done([Success])
SkipDeleteAuthUsers --> Done
```

**Diagram sources**

- [src/app/api/admin/saas-management/organizations/[id]/route.ts](file://src/app/api/admin/saas-management/organizations/[id]/route.ts#L270-L504)

**Section sources**

- [src/app/admin/saas-management/organizations/[id]/page.tsx](file://src/app/admin/saas-management/organizations/[id]/page.tsx#L233-L287)
- [src/app/api/admin/saas-management/organizations/[id]/route.ts](file://src/app/api/admin/saas-management/organizations/[id]/route.ts#L270-L504)

### Data Isolation and Multi-Tenant Policies

- Organizations, subscriptions, and subscription tiers have RLS enabled.
- Policies restrict access to the current user’s organization or super admins.
- Indexes on organization_id improve query performance for tenant-scoped queries.

```mermaid
erDiagram
ORGANIZATIONS {
uuid id PK
text name
text slug UK
uuid owner_id FK
text subscription_tier
text status
jsonb metadata
timestamptz created_at
timestamptz updated_at
}
SUBSCRIPTIONS {
uuid id PK
uuid organization_id FK
text stripe_subscription_id UK
text stripe_customer_id
text status
date current_period_start
date current_period_end
date cancel_at
timestamptz canceled_at
timestamptz created_at
timestamptz updated_at
}
BRANCHES {
uuid id PK
text name
text code
uuid organization_id FK
boolean is_active
timestamptz created_at
timestamptz updated_at
}
ADMIN_USERS {
uuid id PK
uuid organization_id FK
text role
jsonb permissions
boolean is_active
timestamptz created_at
timestamptz updated_at
}
ORGANIZATIONS ||--o{ SUBSCRIPTIONS : "has"
ORGANIZATIONS ||--o{ BRANCHES : "has"
ORGANIZATIONS ||--o{ ADMIN_USERS : "has"
```

**Diagram sources**

- [supabase/migrations/20260128000000_create_organizations_and_subscriptions.sql](file://supabase/migrations/20260128000000_create_organizations_and_subscriptions.sql#L5-L91)

**Section sources**

- [supabase/migrations/20260128000000_create_organizations_and_subscriptions.sql](file://supabase/migrations/20260128000000_create_organizations_and_subscriptions.sql#L88-L208)

### Organization Switching, Permission Models, and Delegation

- Organization switching: The current organization endpoint retrieves the authenticated user’s organization_id and returns organization details. This enables switching by changing the user’s organization association.
- Permission model:
  - Super admins can manage all organizations and related resources.
  - Branch access is controlled via admin_branch_access with roles (manager/staff/global).
  - Users can view only their organization’s data due to RLS policies.
- Delegation patterns:
  - Super admin can grant global access (branch_id null) or branch-specific access with manager/staff roles.
  - Role-based permissions are stored in admin_users.permissions for granular control.

**Section sources**

- [src/app/api/admin/organizations/current/route.ts](file://src/app/api/admin/organizations/current/route.ts#L10-L61)
- [src/app/api/admin/saas-management/organizations/[id]/users/route.ts](file://src/app/api/admin/saas-management/organizations/[id]/users/route.ts#L139-L225)
- [supabase/migrations/20260128000000_create_organizations_and_subscriptions.sql](file://supabase/migrations/20260128000000_create_organizations_and_subscriptions.sql#L93-L132)

### Tier Limits and Subscription Health

- Tier limits API returns current usage vs. plan limits (branches, users, customers, products).
- Subscription status utility determines active/trial/expired/past_due/cancelled/incomplete states, with special handling for demo/root organizations.

Practical examples:

- Enforce limits before creating branches/users/customers/products.
- Show subscription status in UI to guide renewals and feature access.

**Section sources**

- [src/app/api/admin/organization/limits/route.ts](file://src/app/api/admin/organization/limits/route.ts#L13-L111)
- [src/lib/saas/subscription-status.ts](file://src/lib/saas/subscription-status.ts#L33-L142)

## Dependency Analysis

- UI depends on API routes for data operations.
- API routes depend on Supabase service role clients and RLS-enabled tables.
- Validation schemas enforce input correctness across creation and updates.
- Tier limits and subscription utilities depend on organization and subscription tables.

```mermaid
graph LR
UI_List["Organizations List UI"] --> API_Org["Organizations API"]
UI_Detail["Organization Details UI"] --> API_SaaS["SaaS Org Management API"]
API_Org --> DB_Core["Organizations/Subscription Tables"]
API_SaaS --> DB_Core
API_SaaS --> DB_Settings["Organization Settings"]
Limits["Tier Limits API"] --> DB_Core
SubStatus["Subscription Status Utility"] --> DB_Core
```

**Diagram sources**

- [src/app/admin/saas-management/organizations/page.tsx](file://src/app/admin/saas-management/organizations/page.tsx#L91-L761)
- [src/app/admin/saas-management/organizations/[id]/page.tsx](file://src/app/admin/saas-management/organizations/[id]/page.tsx#L107-L800)
- [src/app/api/admin/organizations/route.ts](file://src/app/api/admin/organizations/route.ts#L20-L103)
- [src/app/api/admin/saas-management/organizations/[id]/route.ts](file://src/app/api/admin/saas-management/organizations/[id]/route.ts#L11-L147)
- [src/app/api/admin/organization/limits/route.ts](file://src/app/api/admin/organization/limits/route.ts#L13-L111)
- [src/lib/saas/subscription-status.ts](file://src/lib/saas/subscription-status.ts#L33-L142)

**Section sources**

- [src/app/admin/saas-management/organizations/page.tsx](file://src/app/admin/saas-management/organizations/page.tsx#L91-L761)
- [src/app/admin/saas-management/organizations/[id]/page.tsx](file://src/app/admin/saas-management/organizations/[id]/page.tsx#L107-L800)
- [src/app/api/admin/organizations/route.ts](file://src/app/api/admin/organizations/route.ts#L20-L103)
- [src/app/api/admin/saas-management/organizations/[id]/route.ts](file://src/app/api/admin/saas-management/organizations/[id]/route.ts#L11-L147)
- [src/app/api/admin/organization/limits/route.ts](file://src/app/api/admin/organization/limits/route.ts#L13-L111)
- [src/lib/saas/subscription-status.ts](file://src/lib/saas/subscription-status.ts#L33-L142)

## Performance Considerations

- Use indexes on organization_id for fast tenant-scoped queries.
- Batch operations (bulk actions) reduce round trips.
- RLS adds overhead; keep queries scoped to minimize policy evaluation cost.
- Prefer server-side pagination and filtering to avoid large payloads.

## Troubleshooting Guide

Common issues and resolutions:

- Unauthorized access: Ensure the user is authenticated and has appropriate role (super_admin) for SaaS management endpoints.
- Slug conflicts: Slug must be unique and match validation rules; adjust slug and retry.
- Deletion failures: Verify organization exists and root access is granted; review cascade logs for dependent entities.
- Subscription status anomalies: Check subscription records and trial/end dates; use subscription status utility to diagnose.

**Section sources**

- [src/app/api/admin/saas-management/organizations/[id]/route.ts](file://src/app/api/admin/saas-management/organizations/[id]/route.ts#L138-L146)
- [src/lib/api/validation/organization-schemas.ts](file://src/lib/api/validation/organization-schemas.ts#L7-L20)
- [src/lib/saas/subscription-status.ts](file://src/lib/saas/subscription-status.ts#L33-L142)

## Conclusion

Opttius implements a robust multi-tenant organization management system with clear separation of concerns across UI, APIs, and database. Organizations serve as the tenant boundary, with strong data isolation via RLS, comprehensive administrative controls, and scalable relationships to branches, users, and subscriptions. The system supports practical workflows for onboarding, configuration, limits enforcement, and subscription management, enabling efficient administration and reliable data protection.
