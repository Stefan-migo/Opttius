# Customers & Patients

<cite>
**Referenced Files in This Document**
- [supabase/20251218000000_separate_customers_from_users.sql](file://supabase/migrations/20251218000000_separate_customers_from_users.sql)
- [supabase/20250123000000_adapt_customers_for_optical_shop.sql](file://supabase/migrations/20250123000000_adapt_customers_for_optical_shop.sql)
- [supabase/20250131000001_add_rut_search_function.sql](file://supabase/migrations/20250131000001_add_rut_search_function.sql)
- [supabase/20251219000000_update_rut_search_for_customers.sql](file://supabase/migrations/20251219000000_update_rut_search_for_customers.sql)
- [supabase/20251216000000_create_branches_system.sql](file://supabase/migrations/20251216000000_create_branches_system.sql)
- [src/lib/supabase.ts](file://src/lib/supabase.ts)
- [src/app/admin/customers/page.tsx](file://src/app/admin/customers/page.tsx)
- [src/app/admin/customers/new/page.tsx](file://src/app/admin/customers/new/page.tsx)
- [src/app/admin/customers/[id]/page.tsx](file://src/app/admin/customers/[id]/page.tsx)
- [src/app/api/admin/customers/route.ts](file://src/app/api/admin/customers/route.ts)
- [src/lib/utils/rut.ts](file://src/lib/utils/rut.ts)
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

This document describes the customer and patient data model for an optical practice management system. It focuses on:

- The customer entity and its separation from internal user accounts
- Patient demographics, identity verification (RUT), and medical history
- Lifecycle management from initial consultation to ongoing care
- Medical record keeping, prescription history, and appointment tracking
- Identity verification and search capabilities
- Privacy and data protection considerations
- Integration patterns with appointment scheduling and prescription systems

## Project Structure

The customer/patient domain spans database migrations, backend API routes, frontend pages, and utility libraries:

- Database: Supabase Postgres with migrations defining customer, prescription, appointment, and related tables
- Backend: Next.js App Router API handlers for customer CRUD and analytics
- Frontend: Admin pages for listing, creating, editing, and viewing customer details
- Utilities: RUT formatting and normalization helpers

```mermaid
graph TB
subgraph "Database (Supabase)"
CUST["customers"]
PRES["prescriptions"]
APPT["appointments"]
BR["branches"]
ABA["admin_branch_access"]
end
subgraph "Backend API"
API["/api/admin/customers/*"]
SUP["Supabase Client"]
end
subgraph "Frontend"
LIST["/admin/customers"]
NEW["/admin/customers/new"]
DETAIL["/admin/customers/[id]"]
end
subgraph "Utilities"
RUT["RUT Utils"]
end
LIST --> API
NEW --> API
DETAIL --> API
API --> SUP
SUP --> CUST
SUP --> PRES
SUP --> APPT
SUP --> BR
SUP --> ABA
NEW --> RUT
```

**Diagram sources**

- [supabase/20251218000000_separate_customers_from_users.sql](file://supabase/migrations/20251218000000_separate_customers_from_users.sql#L6-L59)
- [supabase/20250123000000_adapt_customers_for_optical_shop.sql](file://supabase/migrations/20250123000000_adapt_customers_for_optical_shop.sql#L38-L145)
- [supabase/20251216000000_create_branches_system.sql](file://supabase/migrations/20251216000000_create_branches_system.sql#L4-L33)
- [src/app/api/admin/customers/route.ts](file://src/app/api/admin/customers/route.ts#L22-L223)
- [src/app/admin/customers/page.tsx](file://src/app/admin/customers/page.tsx#L75-L515)
- [src/app/admin/customers/new/page.tsx](file://src/app/admin/customers/new/page.tsx#L31-L353)
- [src/app/admin/customers/[id]/page.tsx](file://src/app/admin/customers/[id]/page.tsx#L225-L800)
- [src/lib/utils/rut.ts](file://src/lib/utils/rut.ts#L17-L64)

**Section sources**

- [supabase/20251218000000_separate_customers_from_users.sql](file://supabase/migrations/20251218000000_separate_customers_from_users.sql#L1-L157)
- [supabase/20250123000000_adapt_customers_for_optical_shop.sql](file://supabase/migrations/20250123000000_adapt_customers_for_optical_shop.sql#L1-L455)
- [supabase/20251216000000_create_branches_system.sql](file://supabase/migrations/20251216000000_create_branches_system.sql#L1-L397)
- [src/app/api/admin/customers/route.ts](file://src/app/api/admin/customers/route.ts#L1-L703)
- [src/app/admin/customers/page.tsx](file://src/app/admin/customers/page.tsx#L1-L516)
- [src/app/admin/customers/new/page.tsx](file://src/app/admin/customers/new/page.tsx#L1-L353)
- [src/app/admin/customers/[id]/page.tsx](file://src/app/admin/customers/[id]/page.tsx#L1-L800)
- [src/lib/utils/rut.ts](file://src/lib/utils/rut.ts#L1-L65)

## Core Components

- Customer entity: Branch-scoped, separate from internal users; stores personal info, identity (RUT), demographics, medical history, contact preferences, insurance, and status
- Prescriptions: Optical prescriptions linked to customers with spherical, cylindrical, axis, add, pupillary distances, lens type/material, special requirements, and status
- Appointments: Scheduled visits with type, status, outcomes, reminders, and optional linkage to prescriptions and orders
- Branch system: Multi-branch architecture with access control and RLS policies
- Identity verification: RUT normalization and partial-match search functions

**Section sources**

- [supabase/20251218000000_separate_customers_from_users.sql](file://supabase/migrations/20251218000000_separate_customers_from_users.sql#L6-L59)
- [supabase/20250123000000_adapt_customers_for_optical_shop.sql](file://supabase/migrations/20250123000000_adapt_customers_for_optical_shop.sql#L38-L145)
- [supabase/20251216000000_create_branches_system.sql](file://supabase/migrations/20251216000000_create_branches_system.sql#L4-L33)
- [supabase/20250131000001_add_rut_search_function.sql](file://supabase/migrations/20250131000001_add_rut_search_function.sql#L5-L47)
- [supabase/20251219000000_update_rut_search_for_customers.sql](file://supabase/migrations/20251219000000_update_rut_search_for_customers.sql#L5-L37)

## Architecture Overview

The system separates internal users (profiles) from external customers (customers). Customers are branch-specific and protected by Row Level Security (RLS). The API enforces admin authorization, branch context, and organization isolation. Frontend pages integrate with the API to manage customers, prescriptions, and appointments.

```mermaid
sequenceDiagram
participant UI as "Admin UI"
participant API as "Customers API"
participant SB as "Supabase Client"
participant DB as "Postgres"
UI->>API : GET /api/admin/customers?page&limit&search&status
API->>SB : createClientFromRequest()
API->>SB : RPC is_admin()
SB-->>API : isAdmin
API->>SB : getBranchContext()
API->>SB : Query customers with filters and RLS
SB-->>API : Customers + Count
API-->>UI : {customers, pagination}
UI->>API : POST /api/admin/customers (create)
API->>SB : Validate body (Zod)
API->>SB : getBranchContext()
API->>SB : validateTierLimit(customers)
API->>SB : Check existing (email/RUT)
API->>SB : Insert customer (branch-scoped)
SB-->>API : New customer
API-->>UI : {success, customer}
```

**Diagram sources**

- [src/app/api/admin/customers/route.ts](file://src/app/api/admin/customers/route.ts#L22-L223)
- [src/app/api/admin/customers/route.ts](file://src/app/api/admin/customers/route.ts#L226-L703)
- [src/lib/supabase.ts](file://src/lib/supabase.ts#L1-L36)

## Detailed Component Analysis

### Customer Entity and Medical History

- Purpose: Store patient demographics, identity verification (RUT), medical conditions/allergies/medications, eye exam dates, contact preferences, insurance, and general notes/tags
- Branch scoping: Each customer belongs to a branch and is isolated via RLS and branch filters
- Indexes: Optimized lookups by email, phone, RUT, name, activity, and timestamps
- RLS: Super admins see all; branch admins see only their accessible branches

```mermaid
erDiagram
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
uuid created_by FK
uuid updated_by FK
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
CUSTOMERS }o--|| BRANCHES : "belongs_to"
```

**Diagram sources**

- [supabase/20251218000000_separate_customers_from_users.sql](file://supabase/migrations/20251218000000_separate_customers_from_users.sql#L6-L59)
- [supabase/20251216000000_create_branches_system.sql](file://supabase/migrations/20251216000000_create_branches_system.sql#L4-L21)

**Section sources**

- [supabase/20251218000000_separate_customers_from_users.sql](file://supabase/migrations/20251218000000_separate_customers_from_users.sql#L6-L75)
- [supabase/20251218000000_separate_customers_from_users.sql](file://supabase/migrations/20251218000000_separate_customers_from_users.sql#L76-L157)

### Identity Verification and Search (RUT)

- Normalization: Removes dots, dashes, spaces; uppercases for consistent comparison
- Partial match search: Supports flexible RUT input formats
- Index: Functional index on normalized RUT for efficient LIKE queries
- Validation: Ensures correct format before storing

```mermaid
flowchart TD
Start(["User enters RUT"]) --> Normalize["Normalize RUT<br/>Remove separators, uppercase"]
Normalize --> Validate["Validate format (7-8 digits + verification digit)"]
Validate --> |Valid| Store["Store normalized RUT"]
Validate --> |Invalid| Error["Show validation error"]
Store --> Search["Search by normalized RUT substring"]
Search --> Results["Return matching customers"]
```

**Diagram sources**

- [src/lib/utils/rut.ts](file://src/lib/utils/rut.ts#L17-L64)
- [supabase/20250131000001_add_rut_search_function.sql](file://supabase/migrations/20250131000001_add_rut_search_function.sql#L5-L21)
- [supabase/20251219000000_update_rut_search_for_customers.sql](file://supabase/migrations/20251219000000_update_rut_search_for_customers.sql#L5-L37)

**Section sources**

- [src/lib/utils/rut.ts](file://src/lib/utils/rut.ts#L1-L65)
- [supabase/20250131000001_add_rut_search_function.sql](file://supabase/migrations/20250131000001_add_rut_search_function.sql#L1-L48)
- [supabase/20251219000000_update_rut_search_for_customers.sql](file://supabase/migrations/20251219000000_update_rut_search_for_customers.sql#L1-L38)

### Prescriptions and Medical Records

- Fields: Right/left eye sphere/cylinder/axis/add/pd, lens type/material, special requirements (prism, tint, coatings), notes, status (active/current)
- Links: Associated with a customer; supports multiple historical prescriptions
- Functions: Retrieve current prescription and upcoming appointments

```mermaid
erDiagram
CUSTOMERS ||--o{ PRESCRIPTIONS : "has_many"
PRESCRIPTIONS {
uuid id PK
uuid customer_id FK
date prescription_date
date expiration_date
text prescription_number
text issued_by
text issued_by_license
decimal od_sphere
decimal od_cylinder
integer od_axis
decimal od_add
decimal od_pd
decimal od_near_pd
decimal os_sphere
decimal os_cylinder
integer os_axis
decimal os_add
decimal os_pd
decimal os_near_pd
text frame_pd
decimal height_segmentation
text prescription_type
text lens_type
text lens_material
text[] coatings
text prism_od
text prism_os
text tint_od
text tint_os
text notes
text observations
text recommendations
boolean is_active
boolean is_current
timestamptz created_at
timestamptz updated_at
uuid created_by FK
}
```

**Diagram sources**

- [supabase/20250123000000_adapt_customers_for_optical_shop.sql](file://supabase/migrations/20250123000000_adapt_customers_for_optical_shop.sql#L38-L95)

**Section sources**

- [supabase/20250123000000_adapt_customers_for_optical_shop.sql](file://supabase/migrations/20250123000000_adapt_customers_for_optical_shop.sql#L38-L95)

### Appointments and Care Lifecycle

- Fields: Date/time, duration, type (exam, consultation, fitting, delivery, repair, follow-up, emergency), status, assigned staff, outcomes, follow-up requirements, reminders
- Links: Optionally linked to prescriptions and orders
- Functions: Retrieve upcoming appointments for a customer

```mermaid
erDiagram
CUSTOMERS ||--o{ APPOINTMENTS : "has_many"
PRESCRIPTIONS ||--o{ APPOINTMENTS : "may_link_to"
ORDERS ||--o{ APPOINTMENTS : "may_link_to"
APPOINTMENTS {
uuid id PK
uuid customer_id FK
uuid branch_id FK
uuid assigned_to FK
uuid created_by FK
uuid prescription_id FK
uuid order_id FK
date appointment_date
time appointment_time
integer duration_minutes
text appointment_type
text status
text notes
text reason
text outcome
boolean follow_up_required
date follow_up_date
boolean reminder_sent
timestamptz reminder_sent_at
timestamptz created_at
timestamptz updated_at
timestamptz completed_at
timestamptz cancelled_at
text cancellation_reason
}
```

**Diagram sources**

- [supabase/20250123000000_adapt_customers_for_optical_shop.sql](file://supabase/migrations/20250123000000_adapt_customers_for_optical_shop.sql#L97-L145)
- [supabase/20251216000000_create_branches_system.sql](file://supabase/migrations/20251216000000_create_branches_system.sql#L48-L76)

**Section sources**

- [supabase/20250123000000_adapt_customers_for_optical_shop.sql](file://supabase/migrations/20250123000000_adapt_customers_for_optical_shop.sql#L97-L145)
- [supabase/20251216000000_create_branches_system.sql](file://supabase/migrations/20251216000000_create_branches_system.sql#L48-L76)

### Customer Lifecycle Management

- Onboarding: Create customer with branch context, validate uniqueness by email/RUT, enforce tier limits
- Ongoing care: Track prescriptions and appointments; maintain medical history fields
- Communication: Preferred contact method and emergency contacts; reminders for appointments
- Reporting: Analytics summary (totals, counts, segments) via API

```mermaid
sequenceDiagram
participant Admin as "Admin User"
participant UI as "Customers Page"
participant API as "Customers API"
participant SB as "Supabase"
participant DB as "Postgres"
Admin->>UI : Open "/admin/customers"
UI->>API : GET customers with filters
API->>SB : Query customers (RLS + branch filter)
SB-->>API : Customers + Count
API-->>UI : Render list
Admin->>UI : Click "New Customer"
UI->>API : POST create customer (Zod validated)
API->>SB : Check existing (email/RUT)
API->>SB : Insert customer (branch-scoped)
SB-->>API : New customer
API-->>UI : Redirect to detail
```

**Diagram sources**

- [src/app/admin/customers/page.tsx](file://src/app/admin/customers/page.tsx#L75-L160)
- [src/app/admin/customers/new/page.tsx](file://src/app/admin/customers/new/page.tsx#L31-L133)
- [src/app/api/admin/customers/route.ts](file://src/app/api/admin/customers/route.ts#L226-L596)

**Section sources**

- [src/app/admin/customers/page.tsx](file://src/app/admin/customers/page.tsx#L75-L515)
- [src/app/admin/customers/new/page.tsx](file://src/app/admin/customers/new/page.tsx#L31-L353)
- [src/app/api/admin/customers/route.ts](file://src/app/api/admin/customers/route.ts#L226-L596)

### Frontend Pages and Workflows

- List: Search by name/email/phone/RUT, filter by status, paginate, branch selector, global view for super admins
- New: Form with personal/address info, RUT formatting, branch selection (or enforced for super admin global view)
- Detail: Tabs for overview, prescriptions, appointments, quotes, purchases, analytics; lazy load heavy forms

```mermaid
graph LR
LIST["Customers List"] --> |GET| API["/api/admin/customers"]
NEW["New Customer"] --> |POST| API
DETAIL["Customer Detail"] --> |GET| API
API --> DB["Supabase Postgres"]
```

**Diagram sources**

- [src/app/admin/customers/page.tsx](file://src/app/admin/customers/page.tsx#L75-L160)
- [src/app/admin/customers/new/page.tsx](file://src/app/admin/customers/new/page.tsx#L31-L133)
- [src/app/admin/customers/[id]/page.tsx](file://src/app/admin/customers/[id]/page.tsx#L225-L265)
- [src/app/api/admin/customers/route.ts](file://src/app/api/admin/customers/route.ts#L22-L223)

**Section sources**

- [src/app/admin/customers/page.tsx](file://src/app/admin/customers/page.tsx#L1-L516)
- [src/app/admin/customers/new/page.tsx](file://src/app/admin/customers/new/page.tsx#L1-L353)
- [src/app/admin/customers/[id]/page.tsx](file://src/app/admin/customers/[id]/page.tsx#L1-L800)

## Dependency Analysis

- Database dependencies: customers depends on branches; prescriptions/appointments depend on customers; admin_branch_access controls branch visibility
- Backend dependencies: API uses Supabase client, branch middleware, admin RPC, rate limiting, Zod validation
- Frontend dependencies: Pages consume API endpoints; lazy load forms to optimize bundles

```mermaid
graph TB
API["Customers API"] --> SUP["Supabase Client"]
SUP --> CUST["customers"]
SUP --> PRES["prescriptions"]
SUP --> APPT["appointments"]
SUP --> BR["branches"]
SUP --> ABA["admin_branch_access"]
LIST["Customers List"] --> API
NEW["New Customer"] --> API
DETAIL["Customer Detail"] --> API
```

**Diagram sources**

- [src/app/api/admin/customers/route.ts](file://src/app/api/admin/customers/route.ts#L1-L703)
- [src/lib/supabase.ts](file://src/lib/supabase.ts#L1-L36)
- [supabase/20251218000000_separate_customers_from_users.sql](file://supabase/migrations/20251218000000_separate_customers_from_users.sql#L6-L59)
- [supabase/20250123000000_adapt_customers_for_optical_shop.sql](file://supabase/migrations/20250123000000_adapt_customers_for_optical_shop.sql#L38-L145)
- [supabase/20251216000000_create_branches_system.sql](file://supabase/migrations/20251216000000_create_branches_system.sql#L4-L33)

**Section sources**

- [src/app/api/admin/customers/route.ts](file://src/app/api/admin/customers/route.ts#L1-L703)
- [src/lib/supabase.ts](file://src/lib/supabase.ts#L1-L36)
- [supabase/20251218000000_separate_customers_from_users.sql](file://supabase/migrations/20251218000000_separate_customers_from_users.sql#L1-L157)
- [supabase/20250123000000_adapt_customers_for_optical_shop.sql](file://supabase/migrations/20250123000000_adapt_customers_for_optical_shop.sql#L1-L455)
- [supabase/20251216000000_create_branches_system.sql](file://supabase/migrations/20251216000000_create_branches_system.sql#L1-L397)

## Performance Considerations

- Indexes: Composite and functional indexes on RUT, names, statuses, timestamps
- Queries: Pagination and filtered counts; branch-aware queries avoid scanning unrelated data
- Lazy loading: Dynamic imports for heavy forms reduce initial payload
- Rate limiting: POST endpoints are rate-limited to prevent abuse

[No sources needed since this section provides general guidance]

## Troubleshooting Guide

- Authentication/Admin checks: API verifies admin status via RPC; unauthorized access returns 401/403
- Branch context: Ensure branch header is present; super admin global view requires explicit branch selection
- Duplicate detection: Creation prevents duplicates by email/RUT within the same branch
- Tier limits: Creation validates organization’s customer limit before inserting
- RUT validation: Use provided utilities to format and validate before submission

**Section sources**

- [src/app/api/admin/customers/route.ts](file://src/app/api/admin/customers/route.ts#L55-L82)
- [src/app/api/admin/customers/route.ts](file://src/app/api/admin/customers/route.ts#L364-L468)
- [src/lib/utils/rut.ts](file://src/lib/utils/rut.ts#L17-L64)

## Conclusion

The customer/patient model is designed for optical practice management with strict separation between internal users and external customers. It supports comprehensive patient demographics, identity verification via RUT, medical history, and integrated workflows for prescriptions and appointments. Branch scoping and RLS ensure privacy and multi-tenant isolation, while API endpoints and frontend pages provide a robust admin experience.
