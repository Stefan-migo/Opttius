# Comprehensive Error Handling Implementation

## Overview

This document describes the complete error handling system implemented for the Opttius SaaS platform, providing standardized error management across all components.

## Implementation Files

### 1. Error Classes and Utilities

**File:** `src/lib/errors/comprehensive-handler.ts`

Provides:

- Standardized error classes for different error types
- Error formatting and logging utilities
- Database error mapping
- Input validation helpers
- Safe execution wrappers

### 2. API Middleware

**File:** `src/lib/middleware/error-handler.ts`

Provides:

- Centralized error handling for API routes
- Request ID generation for tracing
- Authentication and authorization middleware
- Request/response validation
- Pagination helpers

## Error Class Hierarchy

```
ApplicationError (Base)
├── ValidationError
├── AuthenticationError
├── AuthorizationError
├── NotFoundError
├── ConflictError
├── RateLimitError
├── PaymentError
├── DatabaseError
├── ExternalServiceError
└── BusinessLogicError
```

## Key Features

### 1. Standardized Error Responses

All API errors return consistent JSON format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Missing required fields",
    "details": {
      "missingFields": ["email", "password"]
    },
    "timestamp": "2026-02-07T10:30:00.000Z",
    "requestId": "req_a1b2c3d4"
  }
}
```

### 2. Request Tracing

- Automatic request ID generation
- Request/response logging with timing
- Headers for client-side error tracking

### 3. Operational vs Programming Errors

- **Operational Errors**: Expected errors that can be handled (validation, auth, etc.)
- **Programming Errors**: Unexpected bugs that should be logged and investigated

### 4. Database Error Mapping

PostgreSQL error codes are automatically mapped to appropriate application errors:

- `23505` → ConflictError (unique constraint violation)
- `23503` → BusinessLogicError (foreign key violation)
- `23502` → ValidationError (not null violation)
- `23514` → ValidationError (check constraint violation)

## Usage Examples

### 1. Basic API Route with Error Handling

```typescript
import {
  handlePost,
  validateRequestBody,
} from "@/lib/middleware/error-handler";
import { ValidationError } from "@/lib/errors/comprehensive-handler";

export const POST = handlePost(async (request, { requestId }) => {
  // Validate request body
  const body = await validateRequestBody(request, (data) => {
    if (!data.email || !data.password) {
      throw new ValidationError("Email and password are required", {
        missingFields: ["email", "password"],
      });
    }
    return data;
  });

  // Your business logic here
  const result = await createUser(body);

  return NextResponse.json({ success: true, data: result });
});
```

### 2. Database Operations with Error Handling

```typescript
import { mapPostgresError } from "@/lib/errors/comprehensive-handler";

try {
  const { data, error } = await supabase.from("users").insert(userData);

  if (error) {
    throw mapPostgresError(error);
  }

  return data;
} catch (error) {
  // Errors are automatically handled by middleware
  throw error;
}
```

### 3. Safe Execution Wrappers

```typescript
import {
  withErrorHandling,
  safeExecute,
} from "@/lib/errors/comprehensive-handler";

// Async operations
const result = await withErrorHandling(
  async () => {
    return await externalApiCall();
  },
  {
    defaultValue: null, // Return null on error instead of throwing
    suppressLogs: false, // Still log the error
  },
);

// Sync operations
const parsedData = safeExecute(() => JSON.parse(rawData), {
  defaultValue: {}, // Return empty object on parse error
  transformError: (error) => new ValidationError("Invalid JSON format"),
});
```

### 4. Input Validation

```typescript
import {
  sanitizeInput,
  validateRequiredFields,
} from "@/lib/errors/comprehensive-handler";

// Comprehensive validation
const cleanData = sanitizeInput(formData, {
  required: ["name", "email"],
  types: {
    name: "string",
    email: "string",
    age: "number",
  },
  maxLength: {
    name: 100,
    email: 255,
  },
});

// Simple required fields check
validateRequiredFields(data, ["userId", "organizationId"]);
```

## Migration Guide

### From Console Logging to Structured Logging

**Before:**

```typescript
console.error("Database error:", error);
console.log("User created:", userId);
```

**After:**

```typescript
import { logger } from "@/lib/logger";

logger.error("Database operation failed", error, {
  operation: "user_creation",
});
logger.info("User created successfully", {
  userId,
  timestamp: new Date().toISOString(),
});
```

### From Manual Try-Catch to Middleware

**Before:**

```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // ... business logic
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

**After:**

```typescript
import { handlePost } from "@/lib/middleware/error-handler";

export const POST = handlePost(async (request, { requestId }) => {
  const body = await request.json();
  // ... business logic
  return NextResponse.json({ success: true });
});
```

## Testing Error Handling

### Unit Tests

```typescript
import {
  ValidationError,
  handleApiError,
} from "@/lib/errors/comprehensive-handler";

describe("Error Handling", () => {
  it("should format validation errors correctly", () => {
    const error = new ValidationError("Invalid input", { field: "email" });
    const { response, statusCode } = handleApiError(error);

    expect(statusCode).toBe(400);
    expect(response.error.code).toBe("VALIDATION_ERROR");
  });
});
```

### Integration Tests

```typescript
import { POST } from "@/app/api/users/route";
import { NextRequest } from "next/server";

it("should return 400 for invalid input", async () => {
  const request = new NextRequest("http://localhost:3000/api/users", {
    method: "POST",
    body: JSON.stringify({}), // Missing required fields
  });

  const response = await POST(request);
  const data = await response.json();

  expect(response.status).toBe(400);
  expect(data.error.code).toBe("VALIDATION_ERROR");
});
```

## Monitoring and Observability

### Error Metrics to Track

- Error rates by error code
- Request duration distributions
- Database error frequency
- External service error rates
- Authentication failure rates

### Log Analysis

Structured logs enable easy querying:

```bash
# Find all database errors
grep "DATABASE_ERROR" logs/app.log

# Count errors by type
grep "error.code" logs/app.log | jq -r '.error.code' | sort | uniq -c

# Find slow requests
grep "durationMs" logs/app.log | jq 'select(.durationMs > 5000)'
```

## Best Practices

### 1. Error Classification

- Use specific error classes rather than generic Error
- Include relevant context in error details
- Distinguish between operational and programming errors

### 2. Logging Strategy

- Log errors with sufficient context for debugging
- Don't log sensitive information (passwords, tokens)
- Use appropriate log levels (debug, info, warn, error)

### 3. User Experience

- Provide clear, actionable error messages to users
- Don't expose internal implementation details
- Include request IDs for support troubleshooting

### 4. Security

- Validate all inputs before processing
- Sanitize error messages sent to clients
- Log security-related errors with appropriate severity

## Future Enhancements

### Planned Improvements

1. **Error Reporting Service**: Integrate with error tracking platforms (Sentry, etc.)
2. **Retry Logic**: Automatic retry mechanisms for transient errors
3. **Circuit Breaker**: Prevent cascading failures
4. **Rate Limiting**: Enhanced rate limiting with error handling
5. **Health Checks**: Comprehensive system health monitoring

### Advanced Features

- Distributed tracing integration
- Error correlation across services
- Automated incident response
- Predictive error analysis

---

**Implementation Status**: ✅ Complete  
**Last Updated**: February 7, 2026  
**Maintainer**: Senior Software Engineer Team
