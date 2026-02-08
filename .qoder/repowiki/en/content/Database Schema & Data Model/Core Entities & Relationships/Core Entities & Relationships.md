# Core Entities & Relationships

<cite>
**Referenced Files in This Document**
- [20260128000000_create_organizations_and_subscriptions.sql](file://supabase/migrations/20260128000000_create_organizations_and_subscriptions.sql)
- [20251216000000_create_branches_system.sql](file://supabase/migrations/20251216000000_create_branches_system.sql)
- [20251218000000_separate_customers_from_users.sql](file://supabase/migrations/20251218000000_separate_customers_from_users.sql)
- [20251216000001_update_rls_for_branches.sql](file://supabase/migrations/20251216000001_update_rls_for_branches.sql)
- [20251216000002_update_appointment_availability_for_branches.sql](file://supabase/migrations/20251216000002_update_appointment_availability_for_branches.sql)
- [20251216000005_update_get_available_time_slots_for_branches.sql](file://supabase/migrations/20251216000005_update_get_available_time_slots_for_branches.sql)
- [20251217000000_add_branch_id_to_products.sql](file://supabase/migrations/20251217000000_add_branch_id_to_products.sql)
- [20251218000001_update_customer_references.sql](file://supabase/migrations/20251218000001_update_customer_references.sql)
- [20241220000000_create_user_profiles.sql](file://supabase/migrations/20241220000000_create_user_profiles.sql)
- [20250116000000_setup_admin_users.sql](file://supabase/migrations/20250116000000_setup_admin_users.sql)
- [20250116000003_fix_admin_rls.sql](file://supabase/migrations/20250116000003_fix_admin_rls.sql)
- [20260131000010_fix_admin_users_rls_recursion.sql](file://supabase/migrations/20260131000010_fix_admin_users_rls_recursion.sql)
- [config.toml](file://supabase/config.toml)
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

This document describes the core data model for Opttius, focusing on multi-tenant organizations, physical branches, patients (customers), staff users, and admin users. It explains entity relationships, foreign keys, referential integrity, multi-tenancy and branch access controls, primary key strategies, validation rules, and operational patterns. It also provides diagrams, indexing guidance, and lifecycle considerations.

## Project Structure

The data model is implemented via PostgreSQL migrations under the Supabase configuration. The relevant entities and their relationships are defined across several migrations that introduce tables, constraints, indexes, triggers, and row-level security (RLS) policies.

```mermaid
graph TB
subgraph "Supabase Configuration"
CFG["config.toml"]
end
subgraph "Migrations"
ORG["Organizations & Subscriptions<br/>20260128000000"]
BR["Branches System<br/>20251216000000"]
CUST["Customers Separation<br/>20251218000000"]
RLSB["Branch RLS Updates<br/>20251216000001"]
AVAIL["Availability Functions<br/>20251216000002"]
SLOTS["Time Slots Functions<br/>20251216000005"]
PROD["Products Branch Link<br/>20251217000000"]
CREF["Customer References<br/>20251218000001"]
PROF["User Profiles<br/>20241220000000"]
AUM["Admin Users Setup<br/>20250116000000"]
AR["Admin RLS Fix<br/>20250116000003"]
ARR["Admin RLS Recursion Fix<br/>20260131000010"]
end
CFG --> ORG
ORG --> BR
BR --> CUST
BR --> RLSB
BR --> AVAIL
BR --> SLOTS
BR --> PROD
BR --> CREF
PROF --> AUM
AUM --> AR
AR --> ARR
```

**Diagram sources**

- [config.toml](file://supabase/config.toml#L1-L345)
- [20260128000000_create_organizations_and_subscriptions.sql](file://supabase/migrations/20260128000000_create_organizations_and_subscriptions.sql#L1-L287)
- [20251216000000_create_branches_system.sql](file://supabase/migrations/20251216000000_create_branches_system.sql#L1-L397)
- [20251218000000_separate_customers_from_users.sql](file://supabase/migrations/20251218000000_separate_customers_from_users.sql#L1-L157)
- [20251216000001_update_rls_for_branches.sql](file://supabase/migrations/20251216000001_update_rls_for_branches.sql#L1-L370)
- [20251216000002_update_appointment_availability_for_branches.sql](file://supabase/migrations/20251216000002_update_appointment_availability_for_branches.sql#L1-L129)
- [20251216000005_update_get_available_time_slots_for_branches.sql](file://supabase/migrations/20251216000005_update_get_available_time_slots_for_branches.sql#L1-L160)
- [20251217000000_add_branch_id_to_products.sql](file://supabase/migrations/20251217000000_add_branch_id_to_products.sql#L1-L90)
- [20251218000001_update_customer_references.sql](file://supabase/migrations/20251218000001_update_customer_references.sql#L1-L152)
- [20241220000000_create_user_profiles.sql](file://supabase/migrations/20241220000000_create_user_profiles.sql#L1-L82)
- [20250116000000_setup_admin_users.sql](file://supabase/migrations/20250116000000_setup_admin_users.sql#L1-L280)
- [20250116000003_fix_admin_rls.sql](file://supabase/migrations/20250116000003_fix_admin_rls.sql#L1-L74)
- [20260131000010_fix_admin_users_rls_recursion.sql](file://supabase/migrations/20260131000010_fix_admin_users_rls_recursion.sql#L1-L78)

**Section sources**

- [config.toml](file://supabase/config.toml#L1-L345)

## Core Components

This section defines the primary entities and their attributes, constraints, and roles in the system.

- Organizations
  - Purpose: Multi-tenant tenants representing optical shops.
  - Primary key: UUID (generated).
  - Notable columns: name, slug (unique), owner_id (references auth.users), subscription_tier, status, metadata.
  - Constraints: subscription_tier and status are checked enums; slug is unique.
  - Indexes: slug, owner_id, status, tier.
  - RLS: Select/view depends on admin role; super admins can manage all.

- Branches
  - Purpose: Physical locations within an organization.
  - Primary key: UUID (generated).
  - Notable columns: name, code (unique), address fields, phone/email, is_active, settings.
  - Indexes: code, is_active.
  - RLS: Admins can view; super admins can manage.

- Admin Users
  - Purpose: Staff with administrative capabilities; separate from patient customers.
  - Primary key: UUID referencing auth.users(id).
  - Notable columns: email (unique), role (enum), permissions (JSONB), is_active, last_login, created_by.
  - Indexes: email, role, is_active.
  - RLS: Users can view own record; super/admin roles can manage; recursion fixed via helper functions.

- Customers (Patients)
  - Purpose: Branch-specific patients created within the platform.
  - Primary key: UUID (generated).
  - Notable columns: branch_id (FK to branches), personal info, identification (RUT), addresses, medical history, contact preferences, insurance, tags, notes, timestamps, created_by/updated_by.
  - Constraints: gender and preferred_contact_method are checked enums; country defaults to Chile.
  - Indexes: branch_id, email, phone, RUT, name, is_active, created_at.
  - RLS: Super admins see all; regular admins see only customers in accessible branches.

- Products
  - Purpose: Inventory items; linked to branches for localized stock.
  - Primary key: UUID (generated).
  - Notable columns: branch_id (nullable FK to branches), enabling legacy global items.
  - Indexes: branch_id.
  - RLS: Super admins see all; regular admins see per-accessible-branch; legacy global visibility allowed.

- Appointments, Quotes, Lab Work Orders, Orders
  - Purpose: Business workflows around eye care and sales.
  - Primary key: UUID (generated).
  - Notable columns: branch_id (FK to branches), customer_id (FK to customers), staff assignments, scheduling, statuses, timestamps.
  - Indexes: branch_id, customer_id, date/time/status combinations as appropriate.
  - RLS: Super admins see all; regular admins see per-accessible-branch; availability functions enforce branch-specific schedules.

- Schedule Settings
  - Purpose: Working hours, blocked dates, slot durations, and booking windows per branch.
  - Primary key: UUID (generated) or global fallback when branch_id is NULL.
  - Indexes: branch_id.
  - RLS: Super admins see all; regular admins see per-accessible-branch.

- Admin Activity Log
  - Purpose: Audit trail for admin actions.
  - Primary key: UUID (generated).
  - Notable columns: admin_user_id (FK to admin_users), action, resource_type, resource_id, details, ip_address, user_agent, created_at.
  - Indexes: admin_user_id, created_at.
  - RLS: Users can view their own activity; service role can manage.

**Section sources**

- [20260128000000_create_organizations_and_subscriptions.sql](file://supabase/migrations/20260128000000_create_organizations_and_subscriptions.sql#L6-L31)
- [20251216000000_create_branches_system.sql](file://supabase/migrations/20251216000000_create_branches_system.sql#L5-L21)
- [20250116000000_setup_admin_users.sql](file://supabase/migrations/20250116000000_setup_admin_users.sql#L5-L15)
- [20251218000000_separate_customers_from_users.sql](file://supabase/migrations/20251218000000_separate_customers_from_users.sql#L7-L59)
- [20251217000000_add_branch_id_to_products.sql](file://supabase/migrations/20251217000000_add_branch_id_to_products.sql#L5-L6)
- [20251216000001_update_rls_for_branches.sql](file://supabase/migrations/20251216000001_update_rls_for_branches.sql#L7-L311)
- [20251216000002_update_appointment_availability_for_branches.sql](file://supabase/migrations/20251216000002_update_appointment_availability_for_branches.sql#L12-L122)
- [20251216000005_update_get_available_time_slots_for_branches.sql](file://supabase/migrations/20251216000005_update_get_available_time_slots_for_branches.sql#L9-L157)
- [20251218000001_update_customer_references.sql](file://supabase/migrations/20251218000001_update_customer_references.sql#L7-L75)
- [20241220000000_create_user_profiles.sql](file://supabase/migrations/20241220000000_create_user_profiles.sql#L5-L33)
- [20250116000003_fix_admin_rls.sql](file://supabase/migrations/20250116000003_fix_admin_rls.sql#L10-L65)
- [20260131000010_fix_admin_users_rls_recursion.sql](file://supabase/migrations/20260131000010_fix_admin_users_rls_recursion.sql#L15-L69)

## Architecture Overview

Opttius employs a multi-tenant architecture centered on Organizations and a branch-per-location model. Admin users are scoped to organizations and branches via dedicated access controls. Customers are branch-specific and distinct from user profiles. Availability and time-slot functions are branch-aware to ensure accurate scheduling.

```mermaid
erDiagram
ORGANIZATIONS {
uuid id PK
text name
text slug UK
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
text code UK
text address_line_1
text address_line_2
text city
text state
text postal_code
text country
text phone
text email
boolean is_active
jsonb settings
timestamptz created_at
timestamptz updated_at
}
ADMIN_USERS {
uuid id PK
text email UK
text role
jsonb permissions
boolean is_active
timestamptz last_login
uuid created_by
timestamptz created_at
timestamptz updated_at
}
CUSTOMERS {
uuid id PK
uuid branch_id FK
text first_name
text last_name
text email
text phone
text rut
date date_of_birth
text gender
text address_line_1
text address_line_2
text city
text state
text postal_code
text country
text[] medical_conditions
text[] allergies
text[] medications
text medical_notes
date last_eye_exam_date
date next_eye_exam_due
text preferred_contact_method
text emergency_contact_name
text emergency_contact_phone
text insurance_provider
text insurance_policy_number
boolean is_active
text notes
text[] tags
timestamptz created_at
timestamptz updated_at
uuid created_by
uuid updated_by
}
PRODUCTS {
uuid id PK
uuid branch_id FK
text name
text description
numeric price
integer inventory_quantity
timestamptz created_at
timestamptz updated_at
}
APPOINTMENTS {
uuid id PK
uuid branch_id FK
uuid customer_id FK
uuid assigned_to
date appointment_date
time appointment_time
integer duration_minutes
text status
timestamptz created_at
timestamptz updated_at
}
QUOTES {
uuid id PK
uuid branch_id FK
uuid customer_id FK
text status
numeric total_amount
timestamptz created_at
timestamptz updated_at
}
LAB_WORK_ORDERS {
uuid id PK
uuid branch_id FK
uuid customer_id FK
text status
text lab_name
timestamptz created_at
timestamptz updated_at
}
ORDERS {
uuid id PK
uuid branch_id FK
uuid customer_id FK
text status
numeric total_amount
timestamptz created_at
timestamptz updated_at
}
SCHEDULE_SETTINGS {
uuid id PK
uuid branch_id FK
jsonb working_hours
integer slot_duration_minutes
integer min_advance_booking_hours
integer max_advance_booking_days
text[] blocked_dates
}
ADMIN_ACTIVITY_LOG {
uuid id PK
uuid admin_user_id FK
text action
text resource_type
text resource_id
jsonb details
inet ip_address
text user_agent
timestamptz created_at
}
ORGANIZATIONS ||--o{ SUBSCRIPTIONS : "has"
ORGANIZATIONS ||--o{ BRANCHES : "owns"
BRANCHES ||--o{ CUSTOMERS : "hosts"
BRANCHES ||--o{ PRODUCTS : "manages"
BRANCHES ||--o{ APPOINTMENTS : "contains"
BRANCHES ||--o{ QUOTES : "contains"
BRANCHES ||--o{ LAB_WORK_ORDERS : "contains"
BRANCHES ||--o{ ORDERS : "contains"
BRANCHES ||--o{ SCHEDULE_SETTINGS : "has"
ADMIN_USERS ||--o{ ADMIN_ACTIVITY_LOG : "generates"
CUSTOMERS ||--o{ APPOINTMENTS : "book"
CUSTOMERS ||--o{ QUOTES : "requests"
CUSTOMERS ||--o{ LAB_WORK_ORDERS : "orders"
CUSTOMERS ||--o{ ORDERS : "purchases"
```

**Diagram sources**

- [20260128000000_create_organizations_and_subscriptions.sql](file://supabase/migrations/20260128000000_create_organizations_and_subscriptions.sql#L6-L31)
- [20251216000000_create_branches_system.sql](file://supabase/migrations/20251216000000_create_branches_system.sql#L5-L21)
- [20251218000000_separate_customers_from_users.sql](file://supabase/migrations/20251218000000_separate_customers_from_users.sql#L7-L59)
- [20251217000000_add_branch_id_to_products.sql](file://supabase/migrations/20251217000000_add_branch_id_to_products.sql#L5-L6)
- [20251216000001_update_rls_for_branches.sql](file://supabase/migrations/20251216000001_update_rls_for_branches.sql#L12-L311)
- [20251218000001_update_customer_references.sql](file://supabase/migrations/20251218000001_update_customer_references.sql#L7-L75)
- [20250116000000_setup_admin_users.sql](file://supabase/migrations/20250116000000_setup_admin_users.sql#L5-L15)
- [20250116000003_fix_admin_rls.sql](file://supabase/migrations/20250116000003_fix_admin_rls.sql#L10-L65)
- [20260131000010_fix_admin_users_rls_recursion.sql](file://supabase/migrations/20260131000010_fix_admin_users_rls_recursion.sql#L15-L69)

## Detailed Component Analysis

### Organizations and Subscriptions

- Multi-tenancy foundation: Each Organization is a tenant with a unique slug and optional owner.
- Subscriptions: Stripe-backed subscriptions with status and billing periods; linked to organizations.
- Tier limits: Max branches/users/customers/products enforced via subscription tiers.

```mermaid
sequenceDiagram
participant Org as "Organizations"
participant Sub as "Subscriptions"
participant Tier as "Subscription Tiers"
Org->>Sub : "One organization has one subscription"
Sub->>Tier : "Status and limits derived from tier"
Note over Org,Sub : "Organization status affects access"
Note over Sub,Tier : "Tier features define capabilities"
```

**Diagram sources**

- [20260128000000_create_organizations_and_subscriptions.sql](file://supabase/migrations/20260128000000_create_organizations_and_subscriptions.sql#L6-L31)
- [20260128000000_create_organizations_and_subscriptions.sql](file://supabase/migrations/20260128000000_create_organizations_and_subscriptions.sql#L34-L44)
- [20260128000000_create_organizations_and_subscriptions.sql](file://supabase/migrations/20260128000000_create_organizations_and_subscriptions.sql#L212-L274)

**Section sources**

- [20260128000000_create_organizations_and_subscriptions.sql](file://supabase/migrations/20260128000000_create_organizations_and_subscriptions.sql#L6-L31)
- [20260128000000_create_organizations_and_subscriptions.sql](file://supabase/migrations/20260128000000_create_organizations_and_subscriptions.sql#L34-L44)
- [20260128000000_create_organizations_and_subscriptions.sql](file://supabase/migrations/20260128000000_create_organizations_and_subscriptions.sql#L54-L73)
- [20260128000000_create_organizations_and_subscriptions.sql](file://supabase/migrations/20260128000000_create_organizations_and_subscriptions.sql#L88-L208)

### Branches and Access Control

- Branches represent physical locations; each branch has settings and stock.
- Admin access is controlled via admin_branch_access with roles (manager, staff, viewer) and a special NULL branch_id indicating super admin access to all branches.
- Functions provide access checks and branch enumeration.

```mermaid
flowchart TD
Start(["Access Request"]) --> CheckSuper["Is user super admin?"]
CheckSuper --> |Yes| AllowAll["Allow access to all branches"]
CheckSuper --> |No| CheckBranch["Is branch specified?"]
CheckBranch --> |No| Deny["Deny (global access requires super admin)"]
CheckBranch --> |Yes| CheckAccess["User has access to branch?"]
CheckAccess --> |Yes| AllowBranch["Allow access to branch"]
CheckAccess --> |No| Deny
```

**Diagram sources**

- [20251216000000_create_branches_system.sql](file://supabase/migrations/20251216000000_create_branches_system.sql#L160-L188)
- [20251216000000_create_branches_system.sql](file://supabase/migrations/20251216000000_create_branches_system.sql#L116-L158)

**Section sources**

- [20251216000000_create_branches_system.sql](file://supabase/migrations/20251216000000_create_branches_system.sql#L23-L33)
- [20251216000000_create_branches_system.sql](file://supabase/migrations/20251216000000_create_branches_system.sql#L97-L201)
- [20251216000000_create_branches_system.sql](file://supabase/migrations/20251216000000_create_branches_system.sql#L217-L302)

### Customers (Patients)

- Branch-scoped; created within the platform; includes medical history and contact preferences.
- RLS policies ensure visibility and modification rights align with branch access.

```mermaid
classDiagram
class Branches {
+uuid id
+text code
+boolean is_active
}
class Customers {
+uuid id
+uuid branch_id
+text first_name
+text last_name
+text email
+text phone
+text rut
+date date_of_birth
+text gender
+text[] medical_conditions
+text[] allergies
+text[] medications
+text insurance_provider
+text insurance_policy_number
+boolean is_active
+timestamptz created_at
+timestamptz updated_at
}
Branches "1" o-- "*" Customers : "hosts"
```

**Diagram sources**

- [20251216000000_create_branches_system.sql](file://supabase/migrations/20251216000000_create_branches_system.sql#L5-L21)
- [20251218000000_separate_customers_from_users.sql](file://supabase/migrations/20251218000000_separate_customers_from_users.sql#L7-L59)

**Section sources**

- [20251218000000_separate_customers_from_users.sql](file://supabase/migrations/20251218000000_separate_customers_from_users.sql#L61-L74)
- [20251218000000_separate_customers_from_users.sql](file://supabase/migrations/20251218000000_separate_customers_from_users.sql#L76-L150)

### Admin Users and Permissions

- Admin users are separate from user profiles; they manage the system and are scoped by organization and branch.
- Roles and permissions are enforced via RLS and helper functions; recursion in policies was resolved.

```mermaid
sequenceDiagram
participant User as "Auth User"
participant Admin as "Admin Users"
participant Helper as "Helper Functions"
participant RLS as "RLS Policies"
User->>Admin : "Request access"
Admin->>Helper : "Check role/is_active"
Helper-->>Admin : "Role result"
Admin->>RLS : "Evaluate policy"
RLS-->>User : "Allow/Deny"
```

**Diagram sources**

- [20250116000000_setup_admin_users.sql](file://supabase/migrations/20250116000000_setup_admin_users.sql#L80-L111)
- [20250116000003_fix_admin_rls.sql](file://supabase/migrations/20250116000003_fix_admin_rls.sql#L27-L65)
- [20260131000010_fix_admin_users_rls_recursion.sql](file://supabase/migrations/20260131000010_fix_admin_users_rls_recursion.sql#L15-L69)

**Section sources**

- [20250116000000_setup_admin_users.sql](file://supabase/migrations/20250116000000_setup_admin_users.sql#L34-L71)
- [20250116000003_fix_admin_rls.sql](file://supabase/migrations/20250116000003_fix_admin_rls.sql#L10-L65)
- [20260131000010_fix_admin_users_rls_recursion.sql](file://supabase/migrations/20260131000010_fix_admin_users_rls_recursion.sql#L15-L69)

### Availability and Time Slots

- Availability checks and time slot generation are branch-aware and consult schedule settings per branch or globally.
- Functions accept branch_id and staff filters to prevent conflicts.

```mermaid
flowchart TD
A["check_appointment_availability"] --> B["Load branch schedule settings"]
B --> C{"Within working hours?"}
C --> |No| D["Not available"]
C --> |Yes| E{"Conflicts with existing appointments?"}
E --> |Yes| D
E --> |No| F["Available"]
G["get_available_time_slots"] --> H["Iterate time slots"]
H --> I{"Slot conflicts?"}
I --> |Yes| J["Mark unavailable"]
I --> |No| K["Mark available"]
```

**Diagram sources**

- [20251216000002_update_appointment_availability_for_branches.sql](file://supabase/migrations/20251216000002_update_appointment_availability_for_branches.sql#L12-L122)
- [20251216000005_update_get_available_time_slots_for_branches.sql](file://supabase/migrations/20251216000005_update_get_available_time_slots_for_branches.sql#L9-L157)

**Section sources**

- [20251216000002_update_appointment_availability_for_branches.sql](file://supabase/migrations/20251216000002_update_appointment_availability_for_branches.sql#L34-L121)
- [20251216000005_update_get_available_time_slots_for_branches.sql](file://supabase/migrations/20251216000005_update_get_available_time_slots_for_branches.sql#L33-L156)

### Product Inventory and Branch Stock

- Products are linked to branches; stock is tracked per branch with thresholds and reservations.
- RLS policies ensure visibility and updates are constrained by branch access.

**Section sources**

- [20251217000000_add_branch_id_to_products.sql](file://supabase/migrations/20251217000000_add_branch_id_to_products.sql#L18-L86)
- [20251216000000_create_branches_system.sql](file://supabase/migrations/20251216000000_create_branches_system.sql#L35-L46)

### Customer References Across Entities

- Customer references were migrated from profiles to the customers table; orders maintain a nullable reference while other entities cascade deletes.

**Section sources**

- [20251218000001_update_customer_references.sql](file://supabase/migrations/20251218000001_update_customer_references.sql#L7-L75)
- [20251218000001_update_customer_references.sql](file://supabase/migrations/20251218000001_update_customer_references.sql#L56-L75)

## Dependency Analysis

- Organizations own Subscriptions and Branches.
- Branches own Customers, Products, Appointments, Quotes, Lab Work Orders, Orders, and Schedule Settings.
- Admin Users generate Activity Logs and are scoped by Organization and Branch Access.
- Availability functions depend on Schedule Settings and Appointments.

```mermaid
graph LR
ORG["Organizations"] --> SUB["Subscriptions"]
ORG --> BR["Branches"]
BR --> CUST["Customers"]
BR --> PROD["Products"]
BR --> APP["Appointments"]
BR --> Q["Quotes"]
BR --> LWO["Lab Work Orders"]
BR --> ORD["Orders"]
BR --> SS["Schedule Settings"]
AU["Admin Users"] --> LOG["Admin Activity Log"]
SS --> APP
APP --> CUST
Q --> CUST
LWO --> CUST
ORD --> CUST
```

**Diagram sources**

- [20260128000000_create_organizations_and_subscriptions.sql](file://supabase/migrations/20260128000000_create_organizations_and_subscriptions.sql#L6-L31)
- [20251216000000_create_branches_system.sql](file://supabase/migrations/20251216000000_create_branches_system.sql#L5-L21)
- [20251218000000_separate_customers_from_users.sql](file://supabase/migrations/20251218000000_separate_customers_from_users.sql#L7-L59)
- [20251217000000_add_branch_id_to_products.sql](file://supabase/migrations/20251217000000_add_branch_id_to_products.sql#L5-L6)
- [20251216000001_update_rls_for_branches.sql](file://supabase/migrations/20251216000001_update_rls_for_branches.sql#L12-L311)
- [20251218000001_update_customer_references.sql](file://supabase/migrations/20251218000001_update_customer_references.sql#L7-L75)
- [20250116000000_setup_admin_users.sql](file://supabase/migrations/20250116000000_setup_admin_users.sql#L5-L15)
- [20250116000003_fix_admin_rls.sql](file://supabase/migrations/20250116000003_fix_admin_rls.sql#L10-L65)

**Section sources**

- [20260128000000_create_organizations_and_subscriptions.sql](file://supabase/migrations/20260128000000_create_organizations_and_subscriptions.sql#L6-L31)
- [20251216000000_create_branches_system.sql](file://supabase/migrations/20251216000000_create_branches_system.sql#L5-L21)
- [20251216000001_update_rls_for_branches.sql](file://supabase/migrations/20251216000001_update_rls_for_branches.sql#L12-L311)

## Performance Considerations

- Primary keys: All core entities use UUIDs generated by gen_random_uuid(), ensuring distributed uniqueness and avoiding sequential patterns.
- Auto-increment patterns: None; UUIDs are the universal primary key strategy.
- Indexes:
  - Organizations: slug, owner_id, status, subscription_tier.
  - Branches: code, is_active.
  - Admin Users: email, role, is_active.
  - Customers: branch_id, email, phone, RUT, name, is_active, created_at.
  - Products: branch_id.
  - Appointments/Quotes/Lab Work Orders/Orders: branch_id and customer_id where applicable.
  - Schedule Settings: branch_id.
  - Admin Activity Log: admin_user_id, created_at.
- Triggers: update_updated_at_column applied to most tables to maintain audit timestamps.
- RLS: Policies filter by branch and role; ensure queries leverage indexed columns (branch_id, email, etc.) for optimal performance.
- Availability functions: Use branch-specific schedule settings and filter by branch_id to minimize cross-branch scans.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide

- Infinite recursion in admin RLS:
  - Symptom: Policy queries on admin_users referencing admin_users causing recursion.
  - Resolution: Use helper functions (is_admin, get_admin_role) with SECURITY DEFINER and bypass RLS via direct schema-qualified queries; replace recursive policies with non-recursive ones.
- Branch access anomalies:
  - Ensure admin_branch_access includes a record with NULL branch_id for super admins.
  - Confirm can_access_branch and get_user_branches functions are used consistently.
- Customer references:
  - After migration, verify foreign keys from appointments, quotes, lab work orders, and lens purchases point to customers, not profiles.
- Availability checks:
  - Confirm schedule settings exist per branch or globally; verify functions receive branch_id to avoid cross-branch conflicts.

**Section sources**

- [20250116000003_fix_admin_rls.sql](file://supabase/migrations/20250116000003_fix_admin_rls.sql#L27-L65)
- [20260131000010_fix_admin_users_rls_recursion.sql](file://supabase/migrations/20260131000010_fix_admin_users_rls_recursion.sql#L15-L69)
- [20251216000000_create_branches_system.sql](file://supabase/migrations/20251216000000_create_branches_system.sql#L160-L188)
- [20251218000001_update_customer_references.sql](file://supabase/migrations/20251218000001_update_customer_references.sql#L7-L75)
- [20251216000002_update_appointment_availability_for_branches.sql](file://supabase/migrations/20251216000002_update_appointment_availability_for_branches.sql#L34-L121)

## Conclusion

Opttius’ data model centers on a robust multi-tenant architecture with organizations and branches, strict branch-scoped customer management, and admin users governed by non-recursive RLS policies. Availability and time-slot functions are branch-aware, and inventory is managed per branch. The design emphasizes referential integrity, validation rules, and scalable indexing to support growth and compliance with branch-level access controls.
