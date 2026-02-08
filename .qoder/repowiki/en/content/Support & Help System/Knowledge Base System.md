# Knowledge Base System

<cite>
**Referenced Files in This Document**
- [support.tsx](file://src/app/admin/saas-management/support/page.tsx)
- [templates.tsx](file://src/app/admin/support/templates/page.tsx)
- [templates-route.ts](file://src/app/api/admin/support/templates/route.ts)
- [categories-route.ts](file://src/app/api/admin/support/categories/route.ts)
- [metrics.tsx](file://src/components/admin/saas-support/SupportMetrics.tsx)
- [support-tool.ts](file://src/lib/ai/tools/support.ts)
- [embeddings-factory.ts](file://src/lib/ai/embeddings/factory.ts)
- [semantic-memory.ts](file://src/lib/ai/memory/semantic.ts)
- [search-embeddings.sql](file://supabase/migrations/20250615000001_create_embeddings_tables.sql)
- [support-email-template.ts](file://src/lib/email/templates/support.ts)
- [saas-support-plan.md](file://docs/SAAS_SUPPORT_SYSTEM_PLAN.md)
- [saas-support-implementation.md](file://docs/SAAS_SUPPORT_IMPLEMENTATION_COMPLETE.md)
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

This document describes the knowledge base system in Opttius, focusing on self-service resources and automated support solutions. It explains the architecture, article organization, search functionality, template management, FAQ systems, and automated response generation. It also documents configuration options for content approval workflows, version control, and multilingual support, along with relationships to support tickets, frequently asked questions, and product documentation. Guidance is provided for content curation, user contributions, performance analytics, maintaining knowledge quality, encouraging community participation, and measuring self-service effectiveness.

## Project Structure

The knowledge base system is implemented across frontend pages, backend APIs, Supabase database schemas, and AI/ML infrastructure for semantic search and embeddings.

```mermaid
graph TB
subgraph "Frontend"
SP["Support Page<br/>(admin/saas-management/support)"]
TP["Templates Page<br/>(admin/support/templates)"]
MET["Support Metrics<br/>(admin/saas-support/SupportMetrics)"]
end
subgraph "Backend APIs"
TAPI["Templates API<br/>(/api/admin/support/templates)"]
CAPI["Categories API<br/>(/api/admin/support/categories)"]
MAINT["Metrics API<br/>(/api/admin/saas-management/support/metrics)"]
end
subgraph "Database"
ST["support_templates"]
SC["support_categories"]
EMB["embeddings & memory_facts"]
end
subgraph "AI/ML"
EF["Embedding Factory"]
SM["Semantic Memory"]
end
SP --> TAPI
TP --> TAPI
SP --> CAPI
SP --> MAINT
TAPI --> ST
CAPI --> SC
MAINT --> ST
MAINT --> SC
SP -.-> EF
TP -.-> EF
EF --> EMB
SM --> EMB
```

**Diagram sources**

- [support.tsx](file://src/app/admin/saas-management/support/page.tsx#L115-L691)
- [templates.tsx](file://src/app/admin/support/templates/page.tsx#L71-L687)
- [templates-route.ts](file://src/app/api/admin/support/templates/route.ts#L1-L235)
- [categories-route.ts](file://src/app/api/admin/support/categories/route.ts#L1-L159)
- [metrics.tsx](file://src/components/admin/saas-support/SupportMetrics.tsx#L48-L463)
- [embeddings-factory.ts](file://src/lib/ai/embeddings/factory.ts#L1-L40)
- [semantic-memory.ts](file://src/lib/ai/memory/semantic.ts#L48-L92)
- [search-embeddings.sql](file://supabase/migrations/20250615000001_create_embeddings_tables.sql#L154-L275)

**Section sources**

- [support.tsx](file://src/app/admin/saas-management/support/page.tsx#L1-L691)
- [templates.tsx](file://src/app/admin/support/templates/page.tsx#L1-L687)
- [templates-route.ts](file://src/app/api/admin/support/templates/route.ts#L1-L235)
- [categories-route.ts](file://src/app/api/admin/support/categories/route.ts#L1-L159)
- [metrics.tsx](file://src/components/admin/saas-support/SupportMetrics.tsx#L1-L463)
- [embeddings-factory.ts](file://src/lib/ai/embeddings/factory.ts#L1-L40)
- [semantic-memory.ts](file://src/lib/ai/memory/semantic.ts#L48-L92)
- [search-embeddings.sql](file://supabase/migrations/20250615000001_create_embeddings_tables.sql#L154-L275)

## Core Components

- Support Management Dashboard: Centralized interface for ticket filtering, search, and metrics.
- Template Management: Creation, editing, activation, and usage tracking of support templates with variable substitution.
- Categories System: Organizational taxonomy for templates and tickets.
- Metrics and Analytics: Real-time dashboards for support performance and trends.
- Semantic Search Infrastructure: Vector embeddings and similarity search for intelligent knowledge discovery.
- Automated Responses: AI-powered tools and email templates for rapid response generation.

**Section sources**

- [support.tsx](file://src/app/admin/saas-management/support/page.tsx#L115-L691)
- [templates.tsx](file://src/app/admin/support/templates/page.tsx#L71-L687)
- [templates-route.ts](file://src/app/api/admin/support/templates/route.ts#L1-L235)
- [categories-route.ts](file://src/app/api/admin/support/categories/route.ts#L1-L159)
- [metrics.tsx](file://src/components/admin/saas-support/SupportMetrics.tsx#L48-L463)
- [support-tool.ts](file://src/lib/ai/tools/support.ts#L33-L86)
- [support-email-template.ts](file://src/lib/email/templates/support.ts#L205-L229)

## Architecture Overview

The system integrates React UI components with Next.js API routes backed by Supabase. AI/ML capabilities leverage vector embeddings for semantic search and retrieval-augmented generation.

```mermaid
sequenceDiagram
participant Admin as "Admin UI"
participant API as "Next.js API"
participant DB as "Supabase"
participant AI as "Embedding Factory"
Admin->>API : GET /api/admin/support/templates
API->>DB : Query support_templates with filters
DB-->>API : Template records
API-->>Admin : JSON templates
Admin->>API : POST /api/admin/support/templates
API->>DB : Insert template with variables
DB-->>API : New template
API-->>Admin : Template created
Admin->>API : GET /api/admin/support/categories
API->>DB : Query support_categories
DB-->>API : Categories
API-->>Admin : Categories
Admin->>API : GET /api/admin/saas-management/support/metrics
API->>DB : Aggregate support stats
DB-->>API : Metrics
API-->>Admin : Metrics payload
Admin->>AI : Request embeddings for search
AI->>DB : search_embeddings(query_vector)
DB-->>AI : Similar embeddings
AI-->>Admin : Retrieved knowledge
```

**Diagram sources**

- [templates-route.ts](file://src/app/api/admin/support/templates/route.ts#L10-L80)
- [categories-route.ts](file://src/app/api/admin/support/categories/route.ts#L7-L94)
- [metrics.tsx](file://src/components/admin/saas-support/SupportMetrics.tsx#L56-L70)
- [embeddings-factory.ts](file://src/lib/ai/embeddings/factory.ts#L18-L40)
- [search-embeddings.sql](file://supabase/migrations/20250615000001_create_embeddings_tables.sql#L154-L189)

## Detailed Component Analysis

### Support Management Dashboard

The dashboard provides:

- Ticket listing with filtering by status, priority, category, and free text search.
- Pagination and real-time updates.
- Quick search across organizations and users.
- Metrics tab for performance analytics.

```mermaid
flowchart TD
Start(["Open Support Dashboard"]) --> LoadTickets["Load Tickets via API"]
LoadTickets --> ApplyFilters["Apply Status/Priority/Category/Search"]
ApplyFilters --> RenderList["Render Ticket List"]
RenderList --> ViewDetails["View Ticket Details"]
ViewDetails --> UpdateStatus["Update Status/Priority/Assignee"]
UpdateStatus --> SendEmail["Send Automated Email"]
SendEmail --> End(["Done"])
```

**Diagram sources**

- [support.tsx](file://src/app/admin/saas-management/support/page.tsx#L146-L193)
- [support.tsx](file://src/app/admin/saas-management/support/page.tsx#L195-L229)

**Section sources**

- [support.tsx](file://src/app/admin/saas-management/support/page.tsx#L115-L691)

### Template Management System

Template management enables:

- Creating templates with subject, content, category, and variables.
- Previewing rendered content with sample variable substitutions.
- Filtering templates by category and activation status.
- Tracking usage counts and creator attribution.

```mermaid
sequenceDiagram
participant Admin as "Admin"
participant UI as "Templates Page"
participant API as "Templates API"
participant DB as "Supabase"
Admin->>UI : Open Templates Page
UI->>API : GET /api/admin/support/templates?category_id&active_only
API->>DB : Query templates with joins
DB-->>API : Templates with category and creator
API-->>UI : Templates list
Admin->>UI : Create/Edit Template
UI->>API : POST/PUT template
API->>DB : Insert/Update template
DB-->>API : Template record
API-->>UI : Success
UI->>UI : Increment usage_count
```

**Diagram sources**

- [templates.tsx](file://src/app/admin/support/templates/page.tsx#L102-L128)
- [templates.tsx](file://src/app/admin/support/templates/page.tsx#L206-L245)
- [templates-route.ts](file://src/app/api/admin/support/templates/route.ts#L10-L80)
- [templates-route.ts](file://src/app/api/admin/support/templates/route.ts#L156-L234)

**Section sources**

- [templates.tsx](file://src/app/admin/support/templates/page.tsx#L71-L687)
- [templates-route.ts](file://src/app/api/admin/support/templates/route.ts#L1-L235)

### Categories System

Categories organize templates and tickets for improved discoverability and routing.

```mermaid
flowchart TD
Init(["Initialize Categories"]) --> Fetch["Fetch Active Categories"]
Fetch --> Render["Render Category Dropdown"]
Render --> Filter["Filter Templates by Category"]
Filter --> Display["Display Filtered Templates"]
```

**Diagram sources**

- [categories-route.ts](file://src/app/api/admin/support/categories/route.ts#L7-L94)
- [templates.tsx](file://src/app/admin/support/templates/page.tsx#L130-L140)

**Section sources**

- [categories-route.ts](file://src/app/api/admin/support/categories/route.ts#L1-L159)
- [templates.tsx](file://src/app/admin/support/templates/page.tsx#L71-L687)

### Metrics and Analytics

The metrics component aggregates support statistics and visualizes trends.

```mermaid
classDiagram
class SupportMetrics {
+number totalTickets
+object statusCounts
+object priorityCounts
+map categoryCounts
+number averageResponseTimeMinutes
+number averageResolutionTimeMinutes
+number averageSatisfactionRating
+map ticketsPerDay
+array topOrganizations
+fetchMetrics()
}
class EnhancedColumnChart {
+render(data, options)
}
class EnhancedPieChart {
+render(data, options)
}
class EnhancedBarChart {
+render(data, horizontal, options)
}
SupportMetrics --> EnhancedColumnChart : "uses"
SupportMetrics --> EnhancedPieChart : "uses"
SupportMetrics --> EnhancedBarChart : "uses"
```

**Diagram sources**

- [metrics.tsx](file://src/components/admin/saas-support/SupportMetrics.tsx#L20-L46)
- [metrics.tsx](file://src/components/admin/saas-support/SupportMetrics.tsx#L48-L463)

**Section sources**

- [metrics.tsx](file://src/components/admin/saas-support/SupportMetrics.tsx#L1-L463)

### Semantic Search Infrastructure

Vector embeddings enable intelligent knowledge discovery and retrieval.

```mermaid
sequenceDiagram
participant User as "User Query"
participant Factory as "Embedding Factory"
participant DB as "Supabase"
participant Search as "search_embeddings"
User->>Factory : Embed query text
Factory->>DB : Store embedding (if needed)
User->>DB : Call search_embeddings(query_vector)
DB->>Search : Execute similarity search
Search-->>DB : Top-k results
DB-->>User : Retrieved knowledge
```

**Diagram sources**

- [embeddings-factory.ts](file://src/lib/ai/embeddings/factory.ts#L18-L40)
- [semantic-memory.ts](file://src/lib/ai/memory/semantic.ts#L48-L92)
- [search-embeddings.sql](file://supabase/migrations/20250615000001_create_embeddings_tables.sql#L154-L189)

**Section sources**

- [embeddings-factory.ts](file://src/lib/ai/embeddings/factory.ts#L1-L40)
- [semantic-memory.ts](file://src/lib/ai/memory/semantic.ts#L48-L92)
- [search-embeddings.sql](file://supabase/migrations/20250615000001_create_embeddings_tables.sql#L154-L275)

### Automated Response Generation

AI tools and email templates streamline response creation and distribution.

```mermaid
sequenceDiagram
participant Agent as "AI Agent"
participant Tools as "Support Tools"
participant DB as "Supabase"
participant Email as "Email Template"
Agent->>Tools : getTickets(filters)
Tools->>DB : Query support_tickets
DB-->>Tools : Ticket list
Tools-->>Agent : Tickets
Agent->>Email : Render template with variables
Email-->>Agent : HTML email
Agent->>DB : Create ticket message
DB-->>Agent : Message created
```

**Diagram sources**

- [support-tool.ts](file://src/lib/ai/tools/support.ts#L33-L86)
- [support-email-template.ts](file://src/lib/email/templates/support.ts#L205-L229)

**Section sources**

- [support-tool.ts](file://src/lib/ai/tools/support.ts#L33-L86)
- [support-email-template.ts](file://src/lib/email/templates/support.ts#L205-L229)

## Dependency Analysis

The system exhibits clear separation of concerns:

- UI components depend on Next.js API routes for data operations.
- API routes depend on Supabase for persistence and RPC functions.
- AI/ML components depend on embedding providers and vector search functions.
- Email templates integrate with support messages and ticket lifecycle events.

```mermaid
graph LR
UI["Admin UI Pages"] --> API["Next.js API Routes"]
API --> SUP["Supabase"]
API --> RPC["RPC Functions"]
UI --> AI["Embedding Factory"]
AI --> SUP
SUP --> VDB["Vector Tables"]
```

**Diagram sources**

- [templates-route.ts](file://src/app/api/admin/support/templates/route.ts#L1-L235)
- [categories-route.ts](file://src/app/api/admin/support/categories/route.ts#L1-L159)
- [support.tsx](file://src/app/admin/saas-management/support/page.tsx#L115-L691)
- [embeddings-factory.ts](file://src/lib/ai/embeddings/factory.ts#L18-L40)
- [search-embeddings.sql](file://supabase/migrations/20250615000001_create_embeddings_tables.sql#L154-L189)

**Section sources**

- [templates-route.ts](file://src/app/api/admin/support/templates/route.ts#L1-L235)
- [categories-route.ts](file://src/app/api/admin/support/categories/route.ts#L1-L159)
- [support.tsx](file://src/app/admin/saas-management/support/page.tsx#L115-L691)
- [embeddings-factory.ts](file://src/lib/ai/embeddings/factory.ts#L1-L40)
- [search-embeddings.sql](file://supabase/migrations/20250615000001_create_embeddings_tables.sql#L154-L275)

## Performance Considerations

- Use vector similarity search with appropriate thresholds to balance precision and recall.
- Cache frequently accessed templates and categories to reduce API latency.
- Implement pagination and lazy loading for large ticket lists.
- Monitor embedding provider performance and enable fallback mechanisms.
- Optimize database queries with proper indexing on embedding vectors and metadata fields.

## Troubleshooting Guide

Common issues and resolutions:

- Unauthorized Access: Ensure admin authentication and authorization checks pass before template/category operations.
- Template Rendering Failures: Validate variable placeholders and ensure JSON serialization/deserialization for variables.
- Search Performance: Adjust match thresholds and limits; verify embedding provider availability.
- Metrics Calculation: Confirm RPC functions and aggregation queries execute successfully.

**Section sources**

- [templates-route.ts](file://src/app/api/admin/support/templates/route.ts#L18-L35)
- [templates-route.ts](file://src/app/api/admin/support/templates/route.ts#L156-L234)
- [categories-route.ts](file://src/app/api/admin/support/categories/route.ts#L12-L40)
- [support.tsx](file://src/app/admin/saas-management/support/page.tsx#L195-L229)

## Conclusion

The Opttius knowledge base system combines robust UI components, structured templates, intelligent semantic search, and comprehensive analytics to deliver a scalable self-service platform. By leveraging vector embeddings, automated response tools, and clear governance through categories and metrics, the system supports efficient content curation, user engagement, and continuous improvement of support effectiveness.
