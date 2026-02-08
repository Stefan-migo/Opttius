# Order Management

<cite>
**Referenced Files in This Document**
- [Orders Page](file://src/app/admin/orders/page.tsx)
- [Admin Orders API](file://src/app/api/admin/orders/route.ts)
- [AI Orders Tools](file://src/lib/ai/tools/orders.ts)
- [Orders Integration Tests](file://src/__tests__/integration/api/orders.test.ts)
- [Create Manual Order Form](file://src/components/admin/CreateManualOrderForm.tsx)
- [Order Payments Migration](file://supabase/migrations/20260122000006_create_order_payments.sql)
- [Orders Branch Migration](file://supabase/migrations/20260122000004_add_branch_id_to_orders.sql)
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

This document explains the order management system in Opttius, covering the complete order lifecycle from creation to fulfillment and delivery. It documents order states, status tracking, fulfillment coordination, configuration options for order types, shipping methods, and payment processing. It also describes relationships with customer profiles, inventory systems, and accounting modules, and provides guidance for order modification, cancellation, returns, and refunds. The content is designed for both order fulfillment staff and developers extending the system.

## Project Structure

The order management system spans frontend pages, backend APIs, AI tools, and database migrations:

- Frontend:
  - Admin Orders page for viewing, filtering, and updating orders
  - Manual order creation form with customer/product search and totals calculation
- Backend:
  - Admin Orders API supporting listing, creation, and statistics
  - AI tools for programmatic order operations
- Database:
  - Migrations for order payments tracking and branch association

```mermaid
graph TB
subgraph "Frontend"
OP["Orders Page<br/>(src/app/admin/orders/page.tsx)"]
CMF["Create Manual Order Form<br/>(src/components/admin/CreateManualOrderForm.tsx)"]
end
subgraph "Backend"
API["Admin Orders API<br/>(src/app/api/admin/orders/route.ts)"]
AITOOLS["AI Orders Tools<br/>(src/lib/ai/tools/orders.ts)"]
end
subgraph "Database"
ORD["orders table"]
OITEM["order_items table"]
OPAY["order_payments table<br/>(supabase/migrations/20260122000006_create_order_payments.sql)"]
BR["branches table"]
end
OP --> API
CMF --> API
AITOOLS --> API
API --> ORD
API --> OITEM
API --> OPAY
API --> BR
```

**Diagram sources**

- [Orders Page](file://src/app/admin/orders/page.tsx#L83-L195)
- [Create Manual Order Form](file://src/components/admin/CreateManualOrderForm.tsx#L23-L219)
- [Admin Orders API](file://src/app/api/admin/orders/route.ts#L10-L204)
- [AI Orders Tools](file://src/lib/ai/tools/orders.ts#L57-L475)
- [Order Payments Migration](file://supabase/migrations/20260122000006_create_order_payments.sql#L5-L17)
- [Orders Branch Migration](file://supabase/migrations/20260122000004_add_branch_id_to_orders.sql#L5-L6)

**Section sources**

- [Orders Page](file://src/app/admin/orders/page.tsx#L1-L985)
- [Admin Orders API](file://src/app/api/admin/orders/route.ts#L1-L748)
- [AI Orders Tools](file://src/lib/ai/tools/orders.ts#L1-L475)
- [Create Manual Order Form](file://src/components/admin/CreateManualOrderForm.tsx#L1-L561)
- [Order Payments Migration](file://supabase/migrations/20260122000006_create_order_payments.sql#L1-L58)
- [Orders Branch Migration](file://supabase/migrations/20260122000004_add_branch_id_to_orders.sql#L1-L13)

## Core Components

- Orders Page: Displays orders with filtering, pagination, status updates, and actions (notify, view details, delete).
- Admin Orders API: Handles listing, creating manual orders, and retrieving statistics with multi-tenancy and branch scoping.
- AI Orders Tools: Provides structured tools for listing orders, retrieving by ID, updating status/payment status, fetching pending orders, and computing statistics.
- Create Manual Order Form: Enables staff to create orders manually with customer lookup, product search, item management, and totals calculation.
- Database Migrations: Introduce order payments tracking and branch associations for multi-location order management.

Key order attributes exposed by the system include order_number, customer_name/customer_email, status, payment_status, total_amount, created_at, order_items, and order_payments.

**Section sources**

- [Orders Page](file://src/app/admin/orders/page.tsx#L64-L81)
- [Admin Orders API](file://src/app/api/admin/orders/route.ts#L77-L114)
- [AI Orders Tools](file://src/lib/ai/tools/orders.ts#L97-L133)
- [Create Manual Order Form](file://src/components/admin/CreateManualOrderForm.tsx#L24-L47)
- [Order Payments Migration](file://supabase/migrations/20260122000006_create_order_payments.sql#L5-L17)
- [Orders Branch Migration](file://supabase/migrations/20260122000004_add_branch_id_to_orders.sql#L5-L6)

## Architecture Overview

The order management architecture integrates frontend UI, backend API, and database layers with multi-tenancy and branch-aware filtering.

```mermaid
sequenceDiagram
participant Staff as "Order Fulfillment Staff"
participant UI as "Orders Page"
participant API as "Admin Orders API"
participant DB as "Database"
Staff->>UI : Open Orders Page
UI->>API : GET /api/admin/orders?limit&offset&status
API->>DB : Query orders with filters and pagination
DB-->>API : Orders with items and payments
API-->>UI : JSON { orders, total }
UI-->>Staff : Render orders table with status badges
Staff->>UI : Update status/payment
UI->>API : PATCH /api/admin/orders/{id}
API->>DB : Update orders and order_payments
DB-->>API : Updated records
API-->>UI : Success response
UI-->>Staff : Updated status badges
```

**Diagram sources**

- [Orders Page](file://src/app/admin/orders/page.tsx#L102-L195)
- [Admin Orders API](file://src/app/api/admin/orders/route.ts#L10-L204)

**Section sources**

- [Orders Page](file://src/app/admin/orders/page.tsx#L197-L264)
- [Admin Orders API](file://src/app/api/admin/orders/route.ts#L10-L204)

## Detailed Component Analysis

### Orders Page (Admin UI)

Responsibilities:

- Fetch and display orders with pagination and filtering by status.
- Update order status and payment status via dropdowns.
- Trigger email notifications and open external payment provider links.
- Create manual orders using the Create Manual Order Form.
- Delete orders with confirmation.

Implementation highlights:

- Uses URL search parameters for pagination and filtering.
- Maps frontend status values to database values (e.g., "completed" → "delivered").
- Integrates with EmailNotificationService for order confirmation.
- Supports branch-scoped operations via branch context.

```mermaid
flowchart TD
Start(["Open Orders Page"]) --> Load["Fetch Orders<br/>GET /api/admin/orders?<br/>limit, offset, status"]
Load --> Render["Render Orders Table<br/>Status/Payment Badges"]
Render --> UpdateStatus{"Update Status?"}
UpdateStatus --> |Yes| PatchStatus["PATCH /api/admin/orders/{id}<br/>status"]
PatchStatus --> Reload["Refresh Orders List"]
UpdateStatus --> |No| UpdatePayment{"Update Payment Status?"}
UpdatePayment --> |Yes| PatchPayment["PATCH /api/admin/orders/{id}<br/>payment_status"]
PatchPayment --> Reload
UpdatePayment --> |No| Action{"Other Actions?"}
Action --> |Notify| Notify["POST /api/admin/orders/{id}/notify"]
Action --> |View Details| View["Open Order Details Modal"]
Action --> |Delete| Delete["DELETE /api/admin/orders/{id}"]
Action --> |Create Manual| Create["Open CreateManualOrderForm"]
Create --> Submit["Submit FormData"]
Submit --> Post["POST /api/admin/orders<br/>action=create_manual_order"]
Post --> Reload
Reload --> Render
```

**Diagram sources**

- [Orders Page](file://src/app/admin/orders/page.tsx#L102-L195)
- [Orders Page](file://src/app/admin/orders/page.tsx#L197-L336)

**Section sources**

- [Orders Page](file://src/app/admin/orders/page.tsx#L83-L195)
- [Orders Page](file://src/app/admin/orders/page.tsx#L197-L336)

### Admin Orders API

Responsibilities:

- Authorization checks (admin-only).
- Multi-tenancy and branch scoping via branch context.
- Listing orders with filters (status, payment_status, date range).
- Creating manual orders with validation and notifications.
- Retrieving order statistics (counts, revenue, recent orders).
- Deleting orders (cleanup/testing).

Key behaviors:

- Selects orders with embedded order_items and order_payments.
- Normalizes status values between frontend and database.
- Emits non-blocking notifications and sends order confirmation emails.
- Applies rate limiting for modifications.

```mermaid
sequenceDiagram
participant Client as "Admin Client"
participant API as "Admin Orders API"
participant Supabase as "Supabase Client"
participant DB as "Database"
Client->>API : POST /api/admin/orders
API->>Supabase : Verify admin role
Supabase-->>API : Admin verified
API->>API : Parse request body and validate action
alt action=get_stats
API->>DB : Query orders with organization/branch filters
DB-->>API : Stats data
API-->>Client : { success, stats }
else action=create_manual_order
API->>DB : Insert orders row
DB-->>API : New order
API->>DB : Insert order_items (if provided)
DB-->>API : Items inserted
API->>API : Non-blocking notifications and email
API-->>Client : { success, order }
end
```

**Diagram sources**

- [Admin Orders API](file://src/app/api/admin/orders/route.ts#L207-L667)

**Section sources**

- [Admin Orders API](file://src/app/api/admin/orders/route.ts#L10-L204)
- [Admin Orders API](file://src/app/api/admin/orders/route.ts#L207-L667)

### AI Orders Tools

Capabilities:

- List orders with optional status and payment status filters.
- Retrieve a single order by ID.
- Update order status and payment status.
- Get pending orders and compute order statistics.

Usage:

- Tools require organization context for multi-tenancy isolation.
- Execute database queries with range-based pagination.

**Section sources**

- [AI Orders Tools](file://src/lib/ai/tools/orders.ts#L57-L475)

### Create Manual Order Form

Features:

- Customer search with auto-suggest and pre-fill shipping info.
- Product search with stock visibility and quick-add.
- Dynamic item list with quantity and unit price editing.
- Automatic subtotal and total calculation.
- Submission to create manual orders via API.

Integration points:

- Submits to POST /api/admin/orders with action=create_manual_order.
- Uses customer and product search endpoints for UX.

**Section sources**

- [Create Manual Order Form](file://src/components/admin/CreateManualOrderForm.tsx#L23-L219)
- [Create Manual Order Form](file://src/components/admin/CreateManualOrderForm.tsx#L427-L547)

### Database Schema and Migrations

Order Payments Tracking:

- Adds order_payments table with payment method enumeration and references to orders.
- Provides calculate_order_balance function to compute remaining balance per order.

Branch Association:

- Adds branch_id to orders for multi-branch order tracking.

```mermaid
erDiagram
ORDERS {
uuid id PK
text order_number
text email
text customer_name
text status
text payment_status
numeric total_amount
text currency
timestamptz created_at
uuid branch_id FK
}
ORDER_ITEMS {
uuid id PK
uuid order_id FK
text product_name
text variant_title
int quantity
numeric unit_price
numeric total_price
}
ORDER_PAYMENTS {
uuid id PK
uuid order_id FK
numeric amount
text payment_method
text payment_reference
timestamptz paid_at
uuid created_by
text notes
timestamptz created_at
}
BRANCHES {
uuid id PK
text name
text code
}
ORDERS ||--o{ ORDER_ITEMS : "contains"
ORDERS ||--o{ ORDER_PAYMENTS : "has payments"
BRANCHES ||--o{ ORDERS : "hosts"
```

**Diagram sources**

- [Order Payments Migration](file://supabase/migrations/20260122000006_create_order_payments.sql#L5-L17)
- [Orders Branch Migration](file://supabase/migrations/20260122000004_add_branch_id_to_orders.sql#L5-L6)

**Section sources**

- [Order Payments Migration](file://supabase/migrations/20260122000006_create_order_payments.sql#L1-L58)
- [Orders Branch Migration](file://supabase/migrations/20260122000004_add_branch_id_to_orders.sql#L1-L13)

## Dependency Analysis

- Frontend depends on Admin Orders API for data and mutations.
- Admin Orders API depends on Supabase client, branch middleware, and notification/email services.
- Database migrations define the schema for orders, items, payments, and branch relationships.
- AI tools depend on Supabase client and organization context.

```mermaid
graph LR
UI["Orders Page"] --> API["Admin Orders API"]
UI --> CMF["Create Manual Order Form"]
CMF --> API
API --> SUP["Supabase Client"]
API --> NOTIF["Notifications Service"]
API --> EMAIL["Email Notification Service"]
API --> DB["Database"]
DB --> ORD["orders"]
DB --> OITEM["order_items"]
DB --> OPAY["order_payments"]
DB --> BR["branches"]
```

**Diagram sources**

- [Orders Page](file://src/app/admin/orders/page.tsx#L83-L195)
- [Create Manual Order Form](file://src/components/admin/CreateManualOrderForm.tsx#L23-L219)
- [Admin Orders API](file://src/app/api/admin/orders/route.ts#L10-L204)

**Section sources**

- [Orders Page](file://src/app/admin/orders/page.tsx#L1-L985)
- [Admin Orders API](file://src/app/api/admin/orders/route.ts#L1-L748)
- [Create Manual Order Form](file://src/components/admin/CreateManualOrderForm.tsx#L1-L561)

## Performance Considerations

- Pagination: API supports limit/offset for efficient listing; UI handles pagination state and requests.
- Filtering: Server-side filters reduce payload sizes; use status and date range filters judiciously.
- Multi-tenancy: Organization and branch filters ensure small result sets; avoid broad queries without filters.
- Notifications: Non-blocking notifications and email sends prevent UI delays.
- Rate limits: Modifications are rate-limited to protect database resources.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide

Common issues and resolutions:

- Unauthorized access: Ensure admin role verification passes; check user session and RPC is_admin.
- Multi-tenancy isolation: Verify organization_id and branch_id filters; super admin scope differs from regular admin.
- Payment status mismatch: Confirm frontend-to-database status normalization (e.g., "completed" → "delivered").
- Missing order items/payments: API selects embedded relations; ensure foreign keys and inserts are successful.
- Rate limit exceeded: Modification requests may be throttled; retry after cooldown.

**Section sources**

- [Admin Orders API](file://src/app/api/admin/orders/route.ts#L16-L43)
- [Admin Orders API](file://src/app/api/admin/orders/route.ts#L502-L500)
- [Orders Integration Tests](file://src/__tests__/integration/api/orders.test.ts#L85-L193)

## Conclusion

Opttius order management provides a robust, multi-tenant, branch-aware system for managing orders from creation to delivery. The Admin Orders API centralizes order operations with strong filtering, status tracking, and payment reconciliation via the order_payments table. The UI offers intuitive controls for staff, while AI tools enable programmatic automation. Developers can extend functionality by adding new order states, integrating additional payment methods, and enhancing fulfillment workflows without disrupting existing integrations.
