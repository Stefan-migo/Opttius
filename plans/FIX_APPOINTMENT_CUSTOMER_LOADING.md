# Fix: Customer Not Loading Automatically in Forms

## Problem Description

When opening forms from the customer detail page (`/admin/customers/[id]`), the customer `[id]` is not being loaded automatically:

1. **Appointment Form**: "Nueva Cita" button in the "Citas" tab
2. **Quote Form**: "Nuevo Presupuesto" button in the "Presupuestos" tab

## Root Cause Analysis

### Data Flow

1. **Customer Detail Page** ([`src/app/admin/customers/[id]/page.tsx`](src/app/admin/customers/[id]/page.tsx:1846)) correctly passes `initialCustomerId={customerId}` to the `CreateAppointmentForm` component.

2. **CreateAppointmentForm** ([`src/components/admin/CreateAppointmentForm/index.tsx`](src/components/admin/CreateAppointmentForm/index.tsx:45)) correctly passes the prop to the `useCustomerSearch` hook.

3. **useCustomerSearch Hook** ([`src/components/admin/CreateAppointmentForm/hooks/useCustomerSearch.ts`](src/components/admin/CreateAppointmentForm/hooks/useCustomerSearch.ts:98-115)) attempts to fetch the customer by ID when `initialCustomerId` is provided.

### The Bug

The issue is on **line 105** of [`useCustomerSearch.ts`](src/components/admin/CreateAppointmentForm/hooks/useCustomerSearch.ts:105):

```typescript
const data = await response.json();
setSelectedCustomer(data.customer); // BUG: Incorrect property access
```

The API endpoint ([`src/app/api/admin/customers/[id]/route.ts`](src/app/api/admin/customers/[id]/route.ts:329-337)) returns data in the standardized API response format:

```json
{
  "success": true,
  "data": {
    "id": "...",
    "first_name": "...",
    "last_name": "...",
    "email": "..."
    // ... other customer fields
  },
  "meta": {
    "timestamp": "..."
  }
}
```

However, the hook is trying to access `data.customer` which doesn't exist. The customer data is directly in `data.data`, not wrapped in a `customer` property.

## Solution

Change line 105 from:

```typescript
setSelectedCustomer(data.customer);
```

To:

```typescript
setSelectedCustomer(data.data);
```

## Files to Modify

| File                                                                                                                                                 | Change                  |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| [`src/components/admin/CreateAppointmentForm/hooks/useCustomerSearch.ts`](src/components/admin/CreateAppointmentForm/hooks/useCustomerSearch.ts:105) | Fix data access pattern |

## Testing

After the fix:

1. Navigate to `/admin/customers/[id]` (any customer detail page)
2. Click the "+ Nueva Cita" button in the "Citas" tab
3. Verify that the customer is automatically selected and displayed in the form

## Additional Notes

The `isGuestCustomer` state initialization on line 59-61 also needs review:

```typescript
const [isGuestCustomer, setIsGuestCustomer] = useState(
  !initialData?.customer && !initialCustomerId,
);
```

This correctly sets `isGuestCustomer` to `false` when `initialCustomerId` is provided, which is correct. The issue is purely the data access pattern when fetching the customer.
