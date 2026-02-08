# Work Order Processing

<cite>
**Referenced Files in This Document**
- [CreateWorkOrderForm/index.tsx](file://src/components/admin/CreateWorkOrderForm/index.tsx)
- [useWorkOrderForm.ts](file://src/components/admin/CreateWorkOrderForm/hooks/useWorkOrderForm.ts)
- [work-orders/page.tsx](file://src/app/admin/work-orders/page.tsx)
- [work-orders/[id]/page.tsx](file://src/app/admin/work-orders/[id]/page.tsx)
- [work-orders/route.ts](file://src/app/api/admin/work-orders/route.ts)
- [work-orders/[id]/route.ts](file://src/app/api/admin/work-orders/[id]/route.ts)
- [work-orders/[id]/status/route.ts](file://src/app/api/admin/work-orders/[id]/status/route.ts)
- [work-orders/[id]/deliver/route.ts](file://src/app/api/admin/work-orders/[id]/deliver/route.ts)
- [20250125000000_create_lab_work_orders_system.sql](file://supabase/migrations/20250125000000_create_lab_work_orders_system.sql)
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

This document describes the work order processing system in Opttius, covering the complete lifecycle from creation to delivery. It explains work order states, the creation process via CreateWorkOrderForm, integration with external laboratories, supplier management, quality control, tracking, status updates, timeline management, and communication workflows. It also documents the API endpoints for work order management, status changes, delivery confirmation, and work order-to-quote conversion, along with modification, cancellation, and dispute resolution processes.

## Project Structure

The work order system spans UI components, pages, and backend APIs:

- UI components for creating and editing work orders
- Admin pages for listing, viewing, and managing work orders
- API routes for CRUD operations, status updates, and delivery
- Database schema with dedicated tables for quotes and lab work orders, plus status history

```mermaid
graph TB
subgraph "UI Layer"
CWF["CreateWorkOrderForm<br/>CreateWorkOrderForm/index.tsx"]
WOP["Work Orders List<br/>work-orders/page.tsx"]
WOD["Work Order Detail<br/>work-orders/[id]/page.tsx"]
end
subgraph "API Layer"
API_LIST["GET /api/admin/work-orders<br/>work-orders/route.ts"]
API_CREATE["POST /api/admin/work-orders<br/>work-orders/route.ts"]
API_GET["GET /api/admin/work-orders/[id]<br/>work-orders/[id]/route.ts"]
API_UPDATE["PUT /api/admin/work-orders/[id]<br/>work-orders/[id]/route.ts"]
API_STATUS["PUT /api/admin/work-orders/[id]/status<br/>work-orders/[id]/status/route.ts"]
API_DELIVER["POST /api/admin/work-orders/[id]/deliver<br/>work-orders/[id]/deliver/route.ts"]
end
subgraph "Data Layer"
DB_QUOTES["Quotes Table<br/>20250125000000_create_lab_work_orders_system.sql"]
DB_WO["Lab Work Orders Table<br/>20250125000000_create_lab_work_orders_system.sql"]
DB_HISTORY["Status History Table<br/>20250125000000_create_lab_work_orders_system.sql"]
end
CWF --> API_CREATE
WOP --> API_LIST
WOD --> API_GET
WOD --> API_STATUS
WOD --> API_DELIVER
API_CREATE --> DB_WO
API_LIST --> DB_WO
API_GET --> DB_WO
API_UPDATE --> DB_WO
API_STATUS --> DB_WO
API_STATUS --> DB_HISTORY
API_DELIVER --> DB_WO
DB_WO --> DB_QUOTES
```

**Diagram sources**

- [CreateWorkOrderForm/index.tsx](file://src/components/admin/CreateWorkOrderForm/index.tsx#L173-L245)
- [work-orders/page.tsx](file://src/app/admin/work-orders/page.tsx#L125-L155)
- [work-orders/[id]/page.tsx](file://src/app/admin/work-orders/[id]/page.tsx#L170-L198)
- [work-orders/route.ts](file://src/app/api/admin/work-orders/route.ts#L15-L198)
- [work-orders/[id]/route.ts](file://src/app/api/admin/work-orders/[id]/route.ts#L11-L98)
- [work-orders/[id]/status/route.ts](file://src/app/api/admin/work-orders/[id]/status/route.ts#L10-L238)
- [work-orders/[id]/deliver/route.ts](file://src/app/api/admin/work-orders/[id]/deliver/route.ts#L156-L204)
- [20250125000000_create_lab_work_orders_system.sql](file://supabase/migrations/20250125000000_create_lab_work_orders_system.sql#L71-L184)

**Section sources**

- [work-orders/page.tsx](file://src/app/admin/work-orders/page.tsx#L90-L155)
- [work-orders/[id]/page.tsx](file://src/app/admin/work-orders/[id]/page.tsx#L135-L198)
- [work-orders/route.ts](file://src/app/api/admin/work-orders/route.ts#L15-L198)
- [20250125000000_create_lab_work_orders_system.sql](file://supabase/migrations/20250125000000_create_lab_work_orders_system.sql#L71-L184)

## Core Components

- CreateWorkOrderForm: Client-side form for creating work orders with customer, prescription, frame, lens configuration, treatments, lab info, pricing, status, and notes.
- Work Orders List Page: Admin UI to list, filter, paginate, and manage work orders; supports payment status updates and deletion controls.
- Work Order Detail Page: Full-view page with status timeline, status transitions, delivery flow, and deletion controls.
- API Endpoints: REST endpoints for listing, creating, retrieving, updating, status transitions, and delivery confirmation.
- Database Schema: Dedicated tables for quotes and lab work orders, with a status history table and stored procedures/functions for numbering and status updates.

Key capabilities:

- Work order creation from quotes
- Multi-state workflow with timestamps per state
- Payment status tracking and balance calculations
- Delivery validation against outstanding balances
- Notifications and email triggers for key events

**Section sources**

- [CreateWorkOrderForm/index.tsx](file://src/components/admin/CreateWorkOrderForm/index.tsx#L32-L378)
- [useWorkOrderForm.ts](file://src/components/admin/CreateWorkOrderForm/hooks/useWorkOrderForm.ts#L81-L190)
- [work-orders/page.tsx](file://src/app/admin/work-orders/page.tsx#L90-L350)
- [work-orders/[id]/page.tsx](file://src/app/admin/work-orders/[id]/page.tsx#L135-L333)
- [work-orders/route.ts](file://src/app/api/admin/work-orders/route.ts#L200-L438)
- [work-orders/[id]/status/route.ts](file://src/app/api/admin/work-orders/[id]/status/route.ts#L10-L238)
- [work-orders/[id]/deliver/route.ts](file://src/app/api/admin/work-orders/[id]/deliver/route.ts#L156-L204)
- [20250125000000_create_lab_work_orders_system.sql](file://supabase/migrations/20250125000000_create_lab_work_orders_system.sql#L71-L184)

## Architecture Overview

The system follows a layered architecture:

- UI Layer: Next.js client components and pages
- API Layer: Next.js API routes with Supabase client and service role access
- Data Layer: PostgreSQL tables with row-level security and stored procedures

```mermaid
sequenceDiagram
participant Admin as "Admin User"
participant UI as "Work Order Detail Page"
participant API as "Status Update API"
participant DB as "PostgreSQL"
participant Notif as "Notification Service"
Admin->>UI : Select new status
UI->>API : PUT /api/admin/work-orders/[id]/status
API->>DB : RPC update_work_order_status(...)
DB-->>API : Status updated
API->>DB : SELECT updated work order
DB-->>API : Work order data
API->>Notif : notifyWorkOrderStatusChange(...)
API-->>UI : {success, workOrder}
UI-->>Admin : Show updated status
```

**Diagram sources**

- [work-orders/[id]/page.tsx](file://src/app/admin/work-orders/[id]/page.tsx#L200-L251)
- [work-orders/[id]/status/route.ts](file://src/app/api/admin/work-orders/[id]/status/route.ts#L79-L139)
- [20250125000000_create_lab_work_orders_system.sql](file://supabase/migrations/20250125000000_create_lab_work_orders_system.sql#L274-L323)

## Detailed Component Analysis

### Work Order States and Lifecycle

The system defines a comprehensive set of states for work order progression:

- Initial: quote
- Workflow states: ordered, sent_to_lab, in_progress_lab, ready_at_lab, received_from_lab, mounted, quality_check, ready_for_pickup
- Final states: delivered, cancelled, returned

Each state transition updates the corresponding timestamp fields and maintains a status history table for auditability.

```mermaid
stateDiagram-v2
[*] --> quote
quote --> ordered : "Convert from quote"
ordered --> sent_to_lab : "Send to lab"
sent_to_lab --> in_progress_lab : "Lab starts"
in_progress_lab --> ready_at_lab : "Lab ready"
ready_at_lab --> received_from_lab : "Receive from lab"
received_from_lab --> mounted : "Mount lenses"
mounted --> quality_check : "QC inspection"
quality_check --> ready_for_pickup : "Ready for pickup"
ready_for_pickup --> delivered : "Customer receives"
ordered : "ordered_at"
sent_to_lab : "sent_to_lab_at"
in_progress_lab : "lab_started_at"
ready_at_lab : "lab_completed_at"
received_from_lab : "received_from_lab_at"
mounted : "mounted_at"
quality_check : "quality_checked_at"
ready_for_pickup : "ready_at"
delivered : "delivered_at"
```

**Diagram sources**

- [20250125000000_create_lab_work_orders_system.sql](file://supabase/migrations/20250125000000_create_lab_work_orders_system.sql#L116-L141)

**Section sources**

- [20250125000000_create_lab_work_orders_system.sql](file://supabase/migrations/20250125000000_create_lab_work_orders_system.sql#L116-L141)
- [work-orders/[id]/page.tsx](file://src/app/admin/work-orders/[id]/page.tsx#L723-L778)

### Work Order Creation Process (CreateWorkOrderForm)

The form captures:

- Customer and prescription details
- Frame information (product or manual entry)
- Lens configuration (type, material, index, treatments, tint)
- Lab information (name, contact, order number, estimated delivery)
- Pricing (frame, lens, treatments, labor, subtotal, tax, discount, total, payment status/method, deposit, balance)
- Status and notes (internal and customer-visible)

Creation flow:

- Validates required fields
- Posts to POST /api/admin/work-orders
- Generates work order number via stored procedure
- Optionally snapshots prescription data
- Updates status dates if initial status is not "quote"
- Sends notifications

```mermaid
sequenceDiagram
participant User as "Admin User"
participant Form as "CreateWorkOrderForm"
participant API as "POST /api/admin/work-orders"
participant DB as "PostgreSQL"
participant Notif as "Notification Service"
User->>Form : Fill customer, prescription, frame, lens, lab, pricing
Form->>API : Submit JSON payload
API->>DB : RPC generate_work_order_number
DB-->>API : New number
API->>DB : Insert lab_work_orders
DB-->>API : New work order
API->>DB : RPC update_work_order_status (if applicable)
API->>Notif : notifyNewWorkOrder(...)
API-->>Form : {success, workOrder}
Form-->>User : Success toast and redirect
```

**Diagram sources**

- [CreateWorkOrderForm/index.tsx](file://src/components/admin/CreateWorkOrderForm/index.tsx#L173-L245)
- [work-orders/route.ts](file://src/app/api/admin/work-orders/route.ts#L251-L407)
- [20250125000000_create_lab_work_orders_system.sql](file://supabase/migrations/20250125000000_create_lab_work_orders_system.sql#L251-L272)

**Section sources**

- [CreateWorkOrderForm/index.tsx](file://src/components/admin/CreateWorkOrderForm/index.tsx#L32-L378)
- [useWorkOrderForm.ts](file://src/components/admin/CreateWorkOrderForm/hooks/useWorkOrderForm.ts#L81-L190)
- [work-orders/route.ts](file://src/app/api/admin/work-orders/route.ts#L200-L438)

### Integration with External Laboratories

- Lab information captured during creation and status transitions
- When transitioning to "sent_to_lab", lab details are persisted
- Status updates trigger notifications and optional email to customer when ready for pickup

```mermaid
flowchart TD
Start(["Transition to sent_to_lab"]) --> Capture["Capture lab details<br/>name, contact, order number, delivery date"]
Capture --> UpdateWO["Persist lab info to work order"]
UpdateWO --> Notify["Send notifications"]
Notify --> End(["Done"])
```

**Diagram sources**

- [work-orders/[id]/page.tsx](file://src/app/admin/work-orders/[id]/page.tsx#L217-L224)
- [work-orders/[id]/status/route.ts](file://src/app/api/admin/work-orders/[id]/status/route.ts#L101-L139)

**Section sources**

- [work-orders/[id]/page.tsx](file://src/app/admin/work-orders/[id]/page.tsx#L612-L667)
- [work-orders/[id]/status/route.ts](file://src/app/api/admin/work-orders/[id]/status/route.ts#L191-L224)

### Supplier Management and Quality Control

- Supplier/lab contact and order number maintained in work order records
- Quality control state ("quality_check") with optional quality notes
- Warranty fields available for tracking

**Section sources**

- [20250125000000_create_lab_work_orders_system.sql](file://supabase/migrations/20250125000000_create_lab_work_orders_system.sql#L143-L179)
- [work-orders/[id]/page.tsx](file://src/app/admin/work-orders/[id]/page.tsx#L430-L444)

### Work Order Tracking, Status Updates, Timeline, and Communication

- Timeline visualization shows all workflow steps with completion markers
- Status badges and icons provide quick visual cues
- Ready-for-pickup state triggers customer email notification
- Status history table records who changed status and when

```mermaid
sequenceDiagram
participant Admin as "Admin"
participant Detail as "Work Order Detail"
participant API as "Status API"
participant Email as "Email Service"
Admin->>Detail : Change status to ready_for_pickup
Detail->>API : PUT /api/admin/work-orders/[id]/status
API->>Email : Send work order ready email
Email-->>API : OK
API-->>Detail : Updated work order
Detail-->>Admin : Timeline updated
```

**Diagram sources**

- [work-orders/[id]/page.tsx](file://src/app/admin/work-orders/[id]/page.tsx#L723-L778)
- [work-orders/[id]/status/route.ts](file://src/app/api/admin/work-orders/[id]/status/route.ts#L191-L224)

**Section sources**

- [work-orders/[id]/page.tsx](file://src/app/admin/work-orders/[id]/page.tsx#L335-L428)
- [work-orders/[id]/status/route.ts](file://src/app/api/admin/work-orders/[id]/status/route.ts#L165-L224)

### API Endpoints for Work Order Management

- GET /api/admin/work-orders
  - Purpose: List work orders with pagination and filters
  - Query params: status, customer_id, page, limit
  - Returns: workOrders array and pagination metadata
- POST /api/admin/work-orders
  - Purpose: Create a new work order
  - Body: customer_id, prescription_id, quote_id, frame/lens/lab/pricing fields, status, notes
  - Returns: new work order with generated number
- GET /api/admin/work-orders/[id]
  - Purpose: Retrieve a work order with related data and status history
- PUT /api/admin/work-orders/[id]
  - Purpose: Update work order fields (pricing, notes, assignments, etc.)
- PUT /api/admin/work-orders/[id]/status
  - Purpose: Transition work order status and record history
- POST /api/admin/work-orders/[id]/deliver
  - Purpose: Mark work order as delivered after validating zero balance

**Section sources**

- [work-orders/route.ts](file://src/app/api/admin/work-orders/route.ts#L15-L198)
- [work-orders/route.ts](file://src/app/api/admin/work-orders/route.ts#L200-L438)
- [work-orders/[id]/route.ts](file://src/app/api/admin/work-orders/[id]/route.ts#L11-L98)
- [work-orders/[id]/route.ts](file://src/app/api/admin/work-orders/[id]/route.ts#L100-L289)
- [work-orders/[id]/status/route.ts](file://src/app/api/admin/work-orders/[id]/status/route.ts#L10-L238)
- [work-orders/[id]/deliver/route.ts](file://src/app/api/admin/work-orders/[id]/deliver/route.ts#L156-L204)

### Work Order Modifications, Cancellations, and Dispute Resolution

- Modifications: Update endpoints allow changing frame/lens details, pricing, notes, and assignments
- Cancellations: Use status transitions to "cancelled"; backend prevents deletion of delivered/paid work orders unless explicitly allowed
- Disputes: Internal notes and quality notes capture dispute-related information; warranty fields track coverage periods

**Section sources**

- [work-orders/[id]/route.ts](file://src/app/api/admin/work-orders/[id]/route.ts#L291-L422)
- [work-orders/[id]/page.tsx](file://src/app/admin/work-orders/[id]/page.tsx#L308-L333)
- [20250125000000_create_lab_work_orders_system.sql](file://supabase/migrations/20250125000000_create_lab_work_orders_system.sql#L176-L179)

## Dependency Analysis

The system exhibits clear separation of concerns:

- UI components depend on shared hooks for form state and calculations
- Pages orchestrate data fetching and user interactions
- API routes encapsulate business logic and database operations
- Database schema enforces data integrity and auditability

```mermaid
graph LR
CWF["CreateWorkOrderForm"] --> Hook["useWorkOrderForm"]
Hook --> API_CREATE["POST /api/admin/work-orders"]
WOP["Work Orders List"] --> API_LIST["GET /api/admin/work-orders"]
WOD["Work Order Detail"] --> API_GET["GET /api/admin/work-orders/[id]"]
WOD --> API_STATUS["PUT /api/admin/work-orders/[id]/status"]
WOD --> API_DELIVER["POST /api/admin/work-orders/[id]/deliver"]
API_CREATE --> DB["lab_work_orders"]
API_LIST --> DB
API_GET --> DB
API_STATUS --> DB
API_DELIVER --> DB
DB --> DB_HISTORY["lab_work_order_status_history"]
```

**Diagram sources**

- [CreateWorkOrderForm/index.tsx](file://src/components/admin/CreateWorkOrderForm/index.tsx#L46-L51)
- [useWorkOrderForm.ts](file://src/components/admin/CreateWorkOrderForm/hooks/useWorkOrderForm.ts#L81-L94)
- [work-orders/page.tsx](file://src/app/admin/work-orders/page.tsx#L125-L155)
- [work-orders/[id]/page.tsx](file://src/app/admin/work-orders/[id]/page.tsx#L170-L198)
- [work-orders/route.ts](file://src/app/api/admin/work-orders/route.ts#L15-L198)
- [work-orders/[id]/status/route.ts](file://src/app/api/admin/work-orders/[id]/status/route.ts#L10-L238)
- [work-orders/[id]/deliver/route.ts](file://src/app/api/admin/work-orders/[id]/deliver/route.ts#L156-L204)
- [20250125000000_create_lab_work_orders_system.sql](file://supabase/migrations/20250125000000_create_lab_work_orders_system.sql#L186-L226)

**Section sources**

- [work-orders/page.tsx](file://src/app/admin/work-orders/page.tsx#L90-L155)
- [work-orders/[id]/page.tsx](file://src/app/admin/work-orders/[id]/page.tsx#L135-L198)
- [work-orders/route.ts](file://src/app/api/admin/work-orders/route.ts#L15-L198)
- [work-orders/[id]/status/route.ts](file://src/app/api/admin/work-orders/[id]/status/route.ts#L10-L238)
- [work-orders/[id]/deliver/route.ts](file://src/app/api/admin/work-orders/[id]/deliver/route.ts#L156-L204)
- [20250125000000_create_lab_work_orders_system.sql](file://supabase/migrations/20250125000000_create_lab_work_orders_system.sql#L186-L226)

## Performance Considerations

- Batch relation fetching: API routes fetch related data (customers, prescriptions, quotes, products, staff) in batches to avoid N+1 queries
- Pagination: List endpoint supports pagination and filtering to reduce payload sizes
- Indexes: Database includes strategic indexes on frequently queried columns (status, customer_id, created_at)
- Stored procedures: Number generation and status updates executed via RPCs to maintain consistency

[No sources needed since this section provides general guidance]

## Troubleshooting Guide

Common issues and resolutions:

- Unauthorized access: Ensure admin authentication and proper branch context
- Validation errors: Verify required fields and numeric values conform to schema
- Status update failures: Confirm branch access and that target status is valid
- Delivery blocked by balance: Resolve outstanding payments before marking delivered
- Missing related data: Check batch fetch logic for customers, prescriptions, quotes, and products

**Section sources**

- [work-orders/route.ts](file://src/app/api/admin/work-orders/route.ts#L15-L90)
- [work-orders/[id]/status/route.ts](file://src/app/api/admin/work-orders/[id]/status/route.ts#L10-L99)
- [work-orders/[id]/deliver/route.ts](file://src/app/api/admin/work-orders/[id]/deliver/route.ts#L156-L204)

## Conclusion

The Opttius work order processing system provides a robust, auditable, and user-friendly workflow for managing lab-based eyewear production. It integrates customer and prescription data, supports detailed lens and frame configurations, tracks multi-stage production with precise timestamps, and ensures compliance through status history and notifications. The API layer offers comprehensive endpoints for lifecycle management, while the database schema enforces data integrity and scalability.
