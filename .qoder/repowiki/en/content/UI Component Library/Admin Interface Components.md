# Admin Interface Components

<cite>
**Referenced Files in This Document**
- [CreateWorkOrderForm/index.tsx](file://src/components/admin/CreateWorkOrderForm/index.tsx)
- [CreateWorkOrderForm/hooks/useWorkOrderForm.ts](file://src/components/admin/CreateWorkOrderForm/hooks/useWorkOrderForm.ts)
- [CreateWorkOrderForm/hooks/useWorkOrderCalculations.ts](file://src/components/admin/CreateWorkOrderForm/hooks/useWorkOrderCalculations.ts)
- [CreateWorkOrderForm/hooks/useWorkOrderValidation.ts](file://src/components/admin/CreateWorkOrderForm/hooks/useWorkOrderValidation.ts)
- [AppointmentCalendar.tsx](file://src/components/admin/AppointmentCalendar.tsx)
- [BranchSelector.tsx](file://src/components/admin/BranchSelector.tsx)
- [CreateAppointmentForm.tsx](file://src/components/admin/CreateAppointmentForm.tsx)
- [work-orders/page.tsx](file://src/app/admin/work-orders/page.tsx)
- [appointments/page.tsx](file://src/app/admin/appointments/page.tsx)
- [branches/page.tsx](file://src/app/admin/branches/page.tsx)
- [POSReceipt.tsx](file://src/components/admin/POS/POSReceipt.tsx)
- [useBranch.ts](file://src/hooks/useBranch.ts)
- [Chatbot.tsx](file://src/components/admin/Chatbot.tsx)
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

This document provides comprehensive technical documentation for the admin interface components focused on optical shop management. It covers specialized components including CreateWorkOrderForm, AppointmentCalendar, BranchSelector, and supporting chart components. The documentation explains business-specific UI patterns, form validation, data visualization, administrative workflows, component props, state management, event handling, and integration with backend APIs. It also details the relationship between admin components and business logic, data binding patterns, and real-time updates.

## Project Structure

The admin interface follows a modular structure organized by feature areas:

- Admin pages under src/app/admin/ handle high-level views and orchestration
- Reusable components under src/components/admin/ encapsulate UI logic and business patterns
- Custom hooks under src/components/admin/CreateWorkOrderForm/hooks/ manage form state and calculations
- Shared hooks under src/hooks/ provide cross-cutting concerns like branch context

```mermaid
graph TB
subgraph "Admin Pages"
WorkOrders["Work Orders Page<br/>src/app/admin/work-orders/page.tsx"]
Appointments["Appointments Page<br/>src/app/admin/appointments/page.tsx"]
Branches["Branches Page<br/>src/app/admin/branches/page.tsx"]
end
subgraph "Reusable Admin Components"
CreateWOForm["CreateWorkOrderForm<br/>src/components/admin/CreateWorkOrderForm/index.tsx"]
AppCal["AppointmentCalendar<br/>src/components/admin/AppointmentCalendar.tsx"]
BranchSel["BranchSelector<br/>src/components/admin/BranchSelector.tsx"]
CreateApptForm["CreateAppointmentForm<br/>src/components/admin/CreateAppointmentForm.tsx"]
POSReceipt["POSReceipt<br/>src/components/admin/POS/POSReceipt.tsx"]
Chatbot["Chatbot<br/>src/components/admin/Chatbot.tsx"]
end
subgraph "Custom Hooks"
HookForm["useWorkOrderForm<br/>hooks/useWorkOrderForm.ts"]
HookCalc["useWorkOrderCalculations<br/>hooks/useWorkOrderCalculations.ts"]
HookVal["useWorkOrderValidation<br/>hooks/useWorkOrderValidation.ts"]
HookBranch["useBranch<br/>src/hooks/useBranch.ts"]
end
WorkOrders --> CreateWOForm
Appointments --> AppCal
Appointments --> CreateApptForm
Branches --> BranchSel
CreateWOForm --> HookForm
CreateWOForm --> HookCalc
CreateWOForm --> HookVal
BranchSel --> HookBranch
AppCal --> HookBranch
```

**Diagram sources**

- [work-orders/page.tsx](file://src/app/admin/work-orders/page.tsx#L90-L724)
- [appointments/page.tsx](file://src/app/admin/appointments/page.tsx#L112-L800)
- [branches/page.tsx](file://src/app/admin/branches/page.tsx#L73-L648)
- [CreateWorkOrderForm/index.tsx](file://src/components/admin/CreateWorkOrderForm/index.tsx#L32-L378)
- [AppointmentCalendar.tsx](file://src/components/admin/AppointmentCalendar.tsx#L72-L630)
- [BranchSelector.tsx](file://src/components/admin/BranchSelector.tsx#L15-L107)
- [CreateAppointmentForm.tsx](file://src/components/admin/CreateAppointmentForm.tsx#L47-L800)
- [POSReceipt.tsx](file://src/components/admin/POS/POSReceipt.tsx#L14-L211)
- [useBranch.ts](file://src/hooks/useBranch.ts#L40-L53)

**Section sources**

- [work-orders/page.tsx](file://src/app/admin/work-orders/page.tsx#L90-L724)
- [appointments/page.tsx](file://src/app/admin/appointments/page.tsx#L112-L800)
- [branches/page.tsx](file://src/app/admin/branches/page.tsx#L73-L648)

## Core Components

This section documents the primary admin components and their specialized functionality for optical shop management.

### CreateWorkOrderForm

The CreateWorkOrderForm component orchestrates the creation of laboratory work orders from optical prescriptions. It integrates customer selection, prescription mapping, frame and lens configuration, pricing calculations, and submission to backend APIs.

Key features:

- Multi-step form with specialized sections for customer, prescription, frame, lens configuration, lab info, pricing, status, and notes
- Real-time pricing calculations with tax inclusion/exclusion logic
- Business rule enforcement for optical shop workflows
- Integration with quote-to-work-order conversion

**Section sources**

- [CreateWorkOrderForm/index.tsx](file://src/components/admin/CreateWorkOrderForm/index.tsx#L24-L378)

### AppointmentCalendar

The AppointmentCalendar provides a sophisticated scheduling interface supporting both weekly and monthly views. It integrates with schedule settings, handles availability checking, and supports drag-and-drop appointment management.

Key features:

- Dual view modes (week/month) with responsive design
- Dynamic time slot generation based on schedule settings
- Availability checking per date and time slot
- Color-coded appointment types and statuses
- Interactive slot selection for new appointments

**Section sources**

- [AppointmentCalendar.tsx](file://src/components/admin/AppointmentCalendar.tsx#L62-L630)

### BranchSelector

The BranchSelector enables administrators to switch between branches or access global views when appropriate. It integrates with the branch context and provides visual feedback during branch switching operations.

Key features:

- Dynamic branch selection with loading states
- Global view option for super administrators
- Visual indicators for current branch and primary branch designation
- Disabled states during branch switching operations

**Section sources**

- [BranchSelector.tsx](file://src/components/admin/BranchSelector.tsx#L15-L107)

### CreateAppointmentForm

The CreateAppointmentForm manages appointment creation and editing with support for both registered customers and guest customers. It includes customer search, availability checking, and comprehensive appointment details.

Key features:

- Toggle between registered and guest customer modes
- Customer search with debounced API calls
- Availability checking with schedule settings integration
- Comprehensive appointment type and status management
- Follow-up appointment creation support

**Section sources**

- [CreateAppointmentForm.tsx](file://src/components/admin/CreateAppointmentForm.tsx#L39-L800)

## Architecture Overview

The admin interface follows a layered architecture with clear separation of concerns:

```mermaid
graph TB
subgraph "Presentation Layer"
UIComponents["UI Components<br/>CreateWorkOrderForm, AppointmentCalendar,<br/>BranchSelector, CreateAppointmentForm"]
Pages["Admin Pages<br/>Work Orders, Appointments, Branches"]
POSReceipt["POS Receipt Component"]
Chatbot["AI Chatbot"]
end
subgraph "Business Logic Layer"
CustomHooks["Custom Hooks<br/>useWorkOrderForm, useWorkOrderCalculations,<br/>useWorkOrderValidation"]
BranchContext["Branch Context<br/>useBranch hook"]
end
subgraph "Integration Layer"
APIClient["API Client<br/>fetch/POST/PUT/DELETE"]
BranchHeader["Branch Header<br/>getBranchHeader"]
end
subgraph "Data Layer"
BackendAPI["Backend API<br/>/api/admin/* endpoints"]
Supabase["Supabase Database"]
end
UIComponents --> CustomHooks
Pages --> UIComponents
UIComponents --> APIClient
CustomHooks --> BranchContext
BranchContext --> BranchHeader
APIClient --> BackendAPI
BackendAPI --> Supabase
POSReceipt --> BackendAPI
Chatbot --> BackendAPI
```

**Diagram sources**

- [CreateWorkOrderForm/index.tsx](file://src/components/admin/CreateWorkOrderForm/index.tsx#L17-L22)
- [useBranch.ts](file://src/hooks/useBranch.ts#L40-L53)
- [work-orders/page.tsx](file://src/app/admin/work-orders/page.tsx#L134-L140)

## Detailed Component Analysis

### CreateWorkOrderForm Analysis

The CreateWorkOrderForm implements a complex optical shop workflow with specialized business logic:

```mermaid
sequenceDiagram
participant User as "User"
participant Form as "CreateWorkOrderForm"
participant Hooks as "Custom Hooks"
participant API as "Backend API"
participant Calc as "Calculations"
User->>Form : Select Customer
Form->>Form : handleCustomerSelect()
Form->>API : Fetch Customer Details
API-->>Form : Customer Data
User->>Form : Select Prescription
Form->>Form : setSelectedPrescription()
User->>Form : Select Frame/Lens
Form->>Form : handleFrameSelect()
Form->>Hooks : updateFormData()
User->>Form : Configure Pricing
Form->>Calc : handleDepositChange()
Calc->>Hooks : updateFormData()
Hooks->>Calc : calculateTotals()
User->>Form : Submit Form
Form->>Form : validate()
Form->>API : POST /api/admin/work-orders
API-->>Form : Work Order Created
Form-->>User : Success Toast
```

**Diagram sources**

- [CreateWorkOrderForm/index.tsx](file://src/components/admin/CreateWorkOrderForm/index.tsx#L72-L245)
- [useWorkOrderCalculations.ts](file://src/components/admin/CreateWorkOrderForm/hooks/useWorkOrderCalculations.ts#L50-L124)

**Section sources**

- [CreateWorkOrderForm/index.tsx](file://src/components/admin/CreateWorkOrderForm/index.tsx#L24-L378)
- [useWorkOrderForm.ts](file://src/components/admin/CreateWorkOrderForm/hooks/useWorkOrderForm.ts#L81-L190)
- [useWorkOrderCalculations.ts](file://src/components/admin/CreateWorkOrderForm/hooks/useWorkOrderCalculations.ts#L15-L153)
- [useWorkOrderValidation.ts](file://src/components/admin/CreateWorkOrderForm/hooks/useWorkOrderValidation.ts#L14-L96)

### AppointmentCalendar Analysis

The AppointmentCalendar implements sophisticated scheduling logic with business-specific constraints:

```mermaid
flowchart TD
Start([Calendar Initialization]) --> LoadSettings["Load Schedule Settings"]
LoadSettings --> GenerateSlots["Generate Time Slots"]
GenerateSlots --> CheckAvailability["Check Slot Availability"]
CheckAvailability --> HasAppointments{"Has Appointments?"}
HasAppointments --> |Yes| RenderAppointments["Render Appointment Blocks"]
HasAppointments --> |No| CheckClickable{"Is Clickable?"}
CheckClickable --> |Yes| ShowAddIndicator["Show Add Indicator"]
CheckClickable --> |No| DisabledSlot["Disabled Slot"]
RenderAppointments --> End([Calendar Display])
ShowAddIndicator --> End
DisabledSlot --> End
```

**Diagram sources**

- [AppointmentCalendar.tsx](file://src/components/admin/AppointmentCalendar.tsx#L83-L211)

**Section sources**

- [AppointmentCalendar.tsx](file://src/components/admin/AppointmentCalendar.tsx#L29-L630)

### BranchSelector Analysis

The BranchSelector provides multi-branch navigation with business logic integration:

```mermaid
classDiagram
class BranchSelector {
+branches : Branch[]
+currentBranch : Branch
+isGlobalView : boolean
+isSuperAdmin : boolean
+isLoading : boolean
+setCurrentBranch(branchId : string)
+handleBranchChange(value : string)
}
class BranchContext {
+branches : Branch[]
+currentBranch : Branch
+isGlobalView : boolean
+isSuperAdmin : boolean
+refreshBranches()
}
class useBranch {
+currentBranchId : string
+currentBranchName : string
+canSwitchBranch : boolean
+hasMultipleBranches : boolean
+switchBranch(branchId : string)
+refreshBranches()
}
BranchSelector --> BranchContext : "uses"
useBranch --> BranchContext : "wraps"
```

**Diagram sources**

- [BranchSelector.tsx](file://src/components/admin/BranchSelector.tsx#L15-L107)
- [useBranch.ts](file://src/hooks/useBranch.ts#L40-L53)

**Section sources**

- [BranchSelector.tsx](file://src/components/admin/BranchSelector.tsx#L15-L107)
- [useBranch.ts](file://src/hooks/useBranch.ts#L1-L53)

### CreateAppointmentForm Analysis

The CreateAppointmentForm implements dual customer management with availability checking:

```mermaid
sequenceDiagram
participant User as "User"
participant Form as "CreateAppointmentForm"
participant Customer as "Customer Search"
participant Availability as "Availability Check"
participant API as "Backend API"
User->>Form : Toggle Customer Mode
Form->>Form : setIsGuestCustomer()
User->>Form : Enter Customer Search
Form->>Customer : Debounced Search
Customer->>API : GET /api/admin/customers/search
API-->>Customer : Customer Results
Customer-->>Form : Display Results
User->>Form : Select Date
Form->>Availability : fetchAvailability()
Availability->>API : GET /api/admin/appointments/availability
API-->>Availability : Available Slots
Availability-->>Form : Update Slots
User->>Form : Submit Appointment
Form->>API : POST/PUT /api/admin/appointments
API-->>Form : Appointment Saved
```

**Diagram sources**

- [CreateAppointmentForm.tsx](file://src/components/admin/CreateAppointmentForm.tsx#L308-L470)

**Section sources**

- [CreateAppointmentForm.tsx](file://src/components/admin/CreateAppointmentForm.tsx#L39-L800)

### POSReceipt Analysis

The POSReceipt component generates printable receipts with configurable printer settings:

**Section sources**

- [POSReceipt.tsx](file://src/components/admin/POS/POSReceipt.tsx#L14-L211)

### Chatbot Analysis

The Chatbot component provides contextual AI assistance integrated with admin sections:

**Section sources**

- [Chatbot.tsx](file://src/components/admin/Chatbot.tsx#L26-L94)

## Dependency Analysis

The admin components exhibit clear dependency relationships and integration patterns:

```mermaid
graph TB
subgraph "External Dependencies"
Lucide["Lucide Icons"]
Sonner["Sonner Notifications"]
NextNavigation["Next.js Navigation"]
Tailwind["Tailwind CSS"]
end
subgraph "Internal Dependencies"
UIComponents["UI Components"]
BusinessLogic["Business Logic"]
Utils["Utility Functions"]
Contexts["React Contexts"]
end
subgraph "API Integration"
BranchHeader["Branch Header Utility"]
TaxUtils["Tax Calculation Utilities"]
FormatUtils["Formatting Utilities"]
end
CreateWorkOrderForm --> UIComponents
CreateWorkOrderForm --> BusinessLogic
CreateWorkOrderForm --> BranchHeader
CreateWorkOrderForm --> TaxUtils
AppointmentCalendar --> BranchHeader
AppointmentCalendar --> Utils
BranchSelector --> Contexts
BranchSelector --> BranchHeader
CreateAppointmentForm --> BranchHeader
CreateAppointmentForm --> FormatUtils
WorkOrdersPage --> BranchHeader
AppointmentsPage --> BranchHeader
BranchesPage --> BranchHeader
```

**Diagram sources**

- [CreateWorkOrderForm/index.tsx](file://src/components/admin/CreateWorkOrderForm/index.tsx#L1-L22)
- [BranchSelector.tsx](file://src/components/admin/BranchSelector.tsx#L1-L13)
- [CreateAppointmentForm.tsx](file://src/components/admin/CreateAppointmentForm.tsx#L1-L37)

**Section sources**

- [CreateWorkOrderForm/index.tsx](file://src/components/admin/CreateWorkOrderForm/index.tsx#L1-L22)
- [BranchSelector.tsx](file://src/components/admin/BranchSelector.tsx#L1-L13)
- [CreateAppointmentForm.tsx](file://src/components/admin/CreateAppointmentForm.tsx#L1-L37)

## Performance Considerations

The admin interface implements several performance optimizations:

- **Lazy Loading**: Large components like AppointmentCalendar and CreateAppointmentForm use dynamic imports to reduce initial bundle size
- **Memoization**: Complex calculations use useMemo for optimal re-rendering
- **Debounced Searches**: Customer search in CreateAppointmentForm uses debounced API calls
- **Conditional Rendering**: Loading states prevent unnecessary computations
- **Efficient State Updates**: Custom hooks minimize re-renders through targeted state updates

## Troubleshooting Guide

Common issues and their resolutions:

### Form Validation Issues

- **Problem**: Validation errors not displaying properly
- **Solution**: Check useWorkOrderValidation hook for field-specific validation logic
- **Location**: [useWorkOrderValidation.ts](file://src/components/admin/CreateWorkOrderForm/hooks/useWorkOrderValidation.ts#L19-L44)

### Branch Context Issues

- **Problem**: Branch switching not working correctly
- **Solution**: Verify useBranch hook returns proper context values
- **Location**: [useBranch.ts](file://src/hooks/useBranch.ts#L40-L53)

### API Integration Problems

- **Problem**: Branch-specific API calls failing
- **Solution**: Ensure getBranchHeader utility is properly applied to requests
- **Location**: [CreateWorkOrderForm/index.tsx](file://src/components/admin/CreateWorkOrderForm/index.tsx#L183-L186)

### Calendar Availability Issues

- **Problem**: Incorrect time slot availability
- **Solution**: Verify schedule settings and time slot generation logic
- **Location**: [AppointmentCalendar.tsx](file://src/components/admin/AppointmentCalendar.tsx#L83-L143)

**Section sources**

- [useWorkOrderValidation.ts](file://src/components/admin/CreateWorkOrderForm/hooks/useWorkOrderValidation.ts#L19-L44)
- [useBranch.ts](file://src/hooks/useBranch.ts#L40-L53)
- [CreateWorkOrderForm/index.tsx](file://src/components/admin/CreateWorkOrderForm/index.tsx#L183-L186)
- [AppointmentCalendar.tsx](file://src/components/admin/AppointmentCalendar.tsx#L83-L143)

## Conclusion

The admin interface components demonstrate a well-architected solution for optical shop management with specialized business logic, robust form handling, and seamless integration with backend systems. The components follow modern React patterns with custom hooks for state management, comprehensive validation, and real-time updates. The modular design enables maintainability and extensibility while providing an intuitive administrative experience for optical business operations.
