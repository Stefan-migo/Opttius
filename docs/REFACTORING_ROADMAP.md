# 🔄 Opttius Refactoring Roadmap

**Version:** 1.0  
**Last Updated:** February 8, 2026  
**Status:** 📋 Planning Phase  
**Estimated Effort:** 40-60 hours

## 🎯 Executive Summary

This roadmap outlines a systematic approach to refactor the Opttius optical management system, focusing on improving code maintainability, reducing duplication, and establishing consistent patterns across the codebase.

## 📋 Priority Matrix

| Priority  | Focus Area                      | Estimated Effort | Business Impact | Technical Debt Reduction |
| --------- | ------------------------------- | ---------------- | --------------- | ------------------------ |
| 🔴 HIGH   | Large Component Decomposition   | 20-25 hours      | Major           | High                     |
| 🔴 HIGH   | Duplicated Utility Functions    | 8-12 hours       | Medium          | High                     |
| 🔴 HIGH   | Form Handling Consistency       | 10-15 hours      | High            | Medium                   |
| 🟡 MEDIUM | API Call Abstraction            | 8-12 hours       | Medium          | Medium                   |
| 🟡 MEDIUM | State Management Duplication    | 6-10 hours       | Medium          | Medium                   |
| 🟡 MEDIUM | Validation Logic Centralization | 6-8 hours        | Low-Medium      | Medium                   |
| 🟢 LOW    | Component Organization          | 4-6 hours        | Low             | Low                      |
| 🟢 LOW    | Performance Optimizations       | 6-8 hours        | Low             | Low                      |

---

## 🚀 Phase 1: Foundation Setup (Week 1)

### 1.1 Refactoring Infrastructure Setup

**Duration:** 2-3 days

**Tasks:**

- [ ] Set up refactoring branch (`refactor/q1-2026-foundations`)
- [ ] Configure ESLint rules for code quality metrics
- [ ] Set up bundle analyzer for size monitoring
- [ ] Create refactoring checklist template
- [ ] Establish code review process for refactored components

**Deliverables:**

- Refactoring branch created
- Code quality baseline established
- Team refactoring guidelines documented

---

## 🔧 Phase 2: Large Component Decomposition (Weeks 2-3)

### 2.1 CreateQuoteForm Refactoring

**Priority:** 🔴 HIGH  
**Duration:** 5-7 days  
**Impact:** Major improvement in maintainability

**Current State Analysis:**

- File size: 3,033 lines
- Main responsibilities: Customer selection, prescription handling, product selection, pricing calculation
- Issues: Single responsibility violation, difficult testing, poor readability

**Refactoring Plan:**

#### Step 1: Component Architecture Design

```
src/components/admin/CreateQuoteForm/
├── index.tsx                    # Main container component
├── hooks/
│   ├── useQuoteForm.ts         # Core form state management
│   ├── useQuoteCalculations.ts # Pricing logic
│   └── useQuoteValidation.ts   # Form validation
├── sections/
│   ├── CustomerSelection.tsx
│   ├── PrescriptionSelection.tsx
│   ├── ProductSelection.tsx
│   ├── PricingSummary.tsx
│   └── QuoteReview.tsx
├── utils/
│   ├── quoteHelpers.ts         # Quote-specific utilities
│   └── pricingUtils.ts         # Pricing calculations
└── types/
    └── quote.types.ts          # TypeScript interfaces
```

#### Step 2: Implementation Steps

**Week 2 - Customer & Prescription Sections:**

- [ ] Extract `CustomerSelection` component (lines 84-150)
- [ ] Extract `PrescriptionSelection` component (lines 150-300)
- [ ] Create `useQuoteForm` hook for shared state
- [ ] Implement customer search abstraction
- [ ] Create prescription validation utilities

**Week 3 - Product & Pricing Sections:**

- [ ] Extract `ProductSelection` component (lines 300-800)
- [ ] Extract `PricingSummary` component (lines 800-1200)
- [ ] Create `useQuoteCalculations` hook
- [ ] Implement pricing formula abstractions
- [ ] Extract `QuoteReview` component (lines 1200-1500)

**Week 3 - Integration & Testing:**

- [ ] Integrate all sections in main component
- [ ] Create unit tests for extracted components
- [ ] Performance testing and optimization
- [ ] Update documentation and examples

### 2.2 Other Large Components

**Priority:** 🔴 HIGH  
**Duration:** 3-4 days each

**Components to Refactor:**

1. `CreateAppointmentForm.tsx` (1,140 lines)
2. `ShippingManager.tsx` (1,059 lines)
3. `ChatbotContent.tsx` (627 lines)

**Common Refactoring Pattern:**

- Identify logical boundaries within component
- Extract sub-components by responsibility
- Create dedicated hooks for state management
- Establish clear data flow between components

---

## 🛠️ Phase 3: Utility Functions Consolidation (Week 4)

### 3.1 Duplicated Utility Functions

**Priority:** 🔴 HIGH  
**Duration:** 3-4 days

**Identified Duplications:**

#### Time Formatting Functions

**Current Issue:** Multiple `getTimeSince()` implementations
**Solution:** Create centralized time utilities

```typescript
// src/lib/utils/time.ts
export function getTimeSince(date: string | Date): string {
  const seconds = Math.floor(
    (new Date().getTime() - new Date(date).getTime()) / 1000,
  );

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

export function formatRelativeTime(date: string | Date): string {
  // Extended formatting options
}
```

#### Error Handling Patterns

**Current Issue:** Inconsistent error handling across components
**Solution:** Create error service abstraction

```typescript
// src/lib/services/errorService.ts
export class ErrorService {
  static handleApiError(error: unknown, context: string): void {
    console.error(`[${context}] Error:`, error);
    const message = this.extractErrorMessage(error);
    toast.error(message);
  }

  static extractErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
    return "An unexpected error occurred";
  }
}
```

#### Toast Notification Standardization

**Current Issue:** Ad-hoc toast usage throughout application
**Solution:** Create notification service

```typescript
// src/lib/services/notificationService.ts
export class NotificationService {
  static success(message: string, options?: ToastOptions): void {
    toast.success(message, { ...defaultOptions, ...options });
  }

  static error(message: string, options?: ToastOptions): void {
    toast.error(message, { ...defaultOptions, ...options });
  }

  static info(message: string, options?: ToastOptions): void {
    toast.info(message, { ...defaultOptions, ...options });
  }
}
```

### 3.2 Implementation Tasks

**Week 4 - Utility Consolidation:**

- [ ] Create `src/lib/utils/time.ts` with standardized time functions
- [ ] Create `src/lib/services/errorService.ts` for consistent error handling
- [ ] Create `src/lib/services/notificationService.ts` for toast standardization
- [ ] Refactor 15-20 components to use new utilities
- [ ] Remove duplicate implementations
- [ ] Update import statements across codebase

---

## 📝 Phase 4: Form Handling Standardization (Week 5)

### 4.1 Form Pattern Consistency

**Priority:** 🔴 HIGH  
**Duration:** 4-5 days

**Current Issues:**

- Inconsistent form validation approaches
- Mixed controlled/uncontrolled component usage
- Duplicate form state management patterns
- Scattered form submission logic

### 4.2 Proposed Solution Architecture

#### Generic Form Hook

```typescript
// src/hooks/useForm.ts
interface UseFormProps<T> {
  initialValues: T;
  validationSchema?: ZodSchema<T>;
  onSubmit: (values: T) => Promise<void>;
}

export function useForm<T>({
  initialValues,
  validationSchema,
  onSubmit,
}: UseFormProps<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: keyof T, value: any) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate if schema provided
      if (validationSchema) {
        const result = validationSchema.safeParse(values);
        if (!result.success) {
          const fieldErrors = result.error.flatten().fieldErrors;
          setErrors(fieldErrors as any);
          return;
        }
      }

      await onSubmit(values);
    } catch (error) {
      ErrorService.handleApiError(error, "Form Submission");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    values,
    errors,
    isSubmitting,
    handleChange,
    handleSubmit,
    setValues,
  };
}
```

#### Form Field Component

```typescript
// src/components/ui/FormField.tsx
interface FormFieldProps {
  label: string;
  error?: string;
  children: React.ReactNode;
}

export function FormField({ label, error, children }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
```

### 4.3 Implementation Plan

**Week 5 - Form Standardization:**

- [ ] Create `src/hooks/useForm.ts` generic form hook
- [ ] Create `src/components/ui/FormField.tsx` reusable field wrapper
- [ ] Create form validation utilities using existing Zod schemas
- [ ] Refactor 3-5 major forms to use new pattern
- [ ] Create form migration guide for team
- [ ] Update component documentation

---

## 🔌 Phase 5: API Layer Abstraction (Week 6)

### 5.1 API Service Architecture

**Priority:** 🟡 MEDIUM  
**Duration:** 3-4 days

**Current Issues:**

- Direct `fetch` calls throughout components
- Inconsistent error handling for API requests
- Missing request/response typing
- No centralized API configuration

### 5.2 Proposed Solution

#### API Client Setup

```typescript
// src/lib/api/client.ts
class ApiClient {
  private baseUrl: string;
  private defaultHeaders: HeadersInit;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      "Content-Type": "application/json",
      // Auth headers added via interceptor
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      ...options,
      headers: { ...this.defaultHeaders, ...options.headers },
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        throw new ApiError(response.status, await response.text());
      }

      return await response.json();
    } catch (error) {
      ErrorService.handleApiError(error, `API Request: ${endpoint}`);
      throw error;
    }
  }

  get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  post<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // PUT, DELETE, PATCH methods...
}

export const apiClient = new ApiClient("/api");
```

#### Typed API Services

```typescript
// src/lib/api/services/customerService.ts
export class CustomerService {
  static async searchCustomers(query: string, branchId?: string) {
    const params = new URLSearchParams({ q: query });
    if (branchId) params.append("branch_id", branchId);

    return apiClient.get<SearchResponse<Customer>>(
      `/admin/customers/search?${params}`,
    );
  }

  static async getCustomer(id: string) {
    return apiClient.get<Customer>(`/admin/customers/${id}`);
  }

  static async createCustomer(data: CreateCustomerData) {
    return apiClient.post<Customer>("/admin/customers", data);
  }
}
```

### 5.3 Implementation Tasks

**Week 6 - API Abstraction:**

- [ ] Create `src/lib/api/client.ts` base API client
- [ ] Create service classes for major entities (customers, products, orders)
- [ ] Implement request/response interceptors
- [ ] Add API response caching layer
- [ ] Refactor 10-15 components to use new API services
- [ ] Create API migration documentation

---

## 🔄 Phase 6: State Management Optimization (Week 7)

### 6.1 State Management Patterns

**Priority:** 🟡 MEDIUM  
**Duration:** 2-3 days

**Current Issues:**

- Duplicate loading state implementations
- Scattered pagination logic
- Inconsistent data fetching patterns
- Redundant branch context usage

### 6.2 Solutions

#### Generic Data Fetching Hook

```typescript
// src/hooks/useApiData.ts
interface UseApiDataOptions<T> {
  enabled?: boolean;
  staleTime?: number;
  refetchInterval?: number;
}

export function useApiData<T>(
  key: string[],
  fetcher: () => Promise<T>,
  options: UseApiDataOptions<T> = {},
) {
  const { enabled = true, staleTime = 0, refetchInterval } = options;

  const query = useQuery({
    queryKey: key,
    queryFn: fetcher,
    enabled,
    staleTime,
    refetchInterval,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
```

#### Pagination Hook

```typescript
// src/hooks/usePagination.ts
interface UsePaginationOptions {
  initialPage?: number;
  pageSize?: number;
}

export function usePagination(options: UsePaginationOptions = {}) {
  const { initialPage = 1, pageSize = 10 } = options;

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalItems, setTotalItems] = useState(0);

  const totalPages = Math.ceil(totalItems / pageSize);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return {
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    setCurrentPage: goToPage,
    setTotalItems,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  };
}
```

### 6.3 Implementation Tasks

**Week 7 - State Management:**

- [ ] Create `src/hooks/useApiData.ts` generic data fetching hook
- [ ] Create `src/hooks/usePagination.ts` pagination utilities
- [ ] Create `src/hooks/useSearch.ts` search functionality
- [ ] Refactor components to use new hooks
- [ ] Remove duplicate state management code
- [ ] Document hook usage patterns

---

## ✅ Phase 7: Validation Logic Centralization (Week 8)

### 7.1 Validation System Enhancement

**Priority:** 🟡 MEDIUM  
**Duration:** 2-3 days

**Current State:**

- Existing Zod schemas (1,760 lines in zod-schemas.ts)
- Inconsistent usage across components
- Mixed client/server validation

### 7.2 Enhancement Plan

#### Validation Hook

```typescript
// src/hooks/useValidation.ts
export function useValidation<T>(schema: ZodSchema<T>) {
  const validate = (
    data: unknown,
  ): {
    success: boolean;
    data?: T;
    errors?: Record<string, string>;
  } => {
    const result = schema.safeParse(data);

    if (result.success) {
      return { success: true, data: result.data };
    }

    const errors: Record<string, string> = {};
    result.error.errors.forEach((err) => {
      const path = err.path.join(".");
      errors[path] = err.message;
    });

    return { success: false, errors };
  };

  return { validate };
}
```

#### Form Validation Integration

```typescript
// src/lib/validation/formValidation.ts
export class FormValidator {
  static validateCustomer(data: unknown) {
    return customerSchema.safeParse(data);
  }

  static validateProduct(data: unknown) {
    return productSchema.safeParse(data);
  }

  static validateOrder(data: unknown) {
    return orderSchema.safeParse(data);
  }
}
```

### 7.3 Implementation Tasks

**Week 8 - Validation:**

- [ ] Create `src/hooks/useValidation.ts` validation hook
- [ ] Organize existing Zod schemas into logical groups
- [ ] Create validation service for common patterns
- [ ] Refactor forms to use centralized validation
- [ ] Add validation error display components
- [ ] Create validation testing utilities

---

## 📁 Phase 8: Component Organization & Performance (Week 9)

### 8.1 Component Structure Improvement

**Priority:** 🟢 LOW  
**Duration:** 2-3 days

#### Improved Folder Structure

```
src/components/
├── admin/
│   ├── appointments/
│   │   ├── CreateAppointmentForm/
│   │   ├── AppointmentCalendar/
│   │   └── AppointmentList/
│   ├── customers/
│   │   ├── CustomerList/
│   │   ├── CustomerDetail/
│   │   └── CustomerForm/
│   ├── orders/
│   │   ├── CreateQuoteForm/
│   │   ├── CreateWorkOrderForm/
│   │   └── OrderList/
│   └── shared/
│       ├── forms/
│       ├── tables/
│       └── layouts/
├── common/
│   ├── auth/
│   ├── navigation/
│   └── ui/
└── hooks/
    ├── forms/
    ├── data/
    └── ui/
```

### 8.2 Performance Optimizations

**Duration:** 2-3 days

#### Memoization Strategies

- [ ] Implement `React.memo` for expensive components
- [ ] Use `useMemo` for complex calculations
- [ ] Add `useCallback` for event handlers
- [ ] Implement virtual scrolling for large lists
- [ ] Code splitting for admin modules

### 8.3 Implementation Tasks

**Week 9 - Organization & Performance:**

- [ ] Restructure component folders logically
- [ ] Create component composition guidelines
- [ ] Implement performance optimizations
- [ ] Add bundle size monitoring
- [ ] Create component documentation
- [ ] Establish coding standards

---

## 📊 Success Metrics & Monitoring

### Code Quality Improvements

- [ ] Reduce average component size by 40%
- [ ] Eliminate 90% of duplicated utility functions
- [ ] Achieve 85%+ test coverage for refactored components
- [ ] Reduce bundle size by 15-20%

### Developer Experience

- [ ] Decrease time to implement new forms by 50%
- [ ] Reduce bug reports related to form handling by 60%
- [ ] Improve code review turnaround time by 30%
- [ ] Increase developer satisfaction scores

### Performance Metrics

- [ ] Reduce initial load time by 25%
- [ ] Improve time to interactive by 30%
- [ ] Decrease memory usage during form interactions
- [ ] Optimize API response times through caching

---

## 🛡️ Risk Mitigation

### Potential Risks

1. **Breaking Changes**: Implement feature flags for gradual rollout
2. **Regression Bugs**: Maintain comprehensive test suite
3. **Team Adoption**: Provide training sessions and documentation
4. **Timeline Delays**: Build buffer time into each phase

### Contingency Plans

- Maintain rollback capability for each phase
- Keep legacy code temporarily during transition
- Implement gradual migration approach
- Conduct regular progress reviews

---

## 📅 Timeline Overview

```
Phase 1: Foundation Setup          (Week 1)    🟩🟩⬜⬜⬜⬜⬜⬜⬜⬜
Phase 2: Component Decomposition   (Weeks 2-3) 🟩🟩🟩🟩⬜⬜⬜⬜⬜⬜
Phase 3: Utility Consolidation     (Week 4)    🟩🟩🟩🟩🟩⬜⬜⬜⬜⬜
Phase 4: Form Standardization      (Week 5)    🟩🟩🟩🟩🟩🟩⬜⬜⬜⬜
Phase 5: API Abstraction           (Week 6)    🟩🟩🟩🟩🟩🟩🟩⬜⬜⬜
Phase 6: State Management          (Week 7)    🟩🟩🟩🟩🟩🟩🟩🟩⬜⬜
Phase 7: Validation Centralization (Week 8)    🟩🟩🟩🟩🟩🟩🟩🟩🟩⬜
Phase 8: Organization & Perf       (Week 9)    🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩
```

**Total Duration:** 9 weeks (~2 months)  
**Team Size:** 1-2 developers  
**Maintenance:** Ongoing improvements

---

## 🚀 Getting Started

To begin the refactoring process:

1. **Create tracking branch**: `git checkout -b refactor/q1-2026-complete`
2. **Set up monitoring**: Configure code quality tools and metrics
3. **Start with Phase 2**: Begin with CreateQuoteForm decomposition
4. **Iterate weekly**: Complete one phase per week with team reviews
5. **Document everything**: Keep this roadmap updated with progress

**First Action Item**: Review and approve this roadmap, then proceed with Phase 1 setup.
