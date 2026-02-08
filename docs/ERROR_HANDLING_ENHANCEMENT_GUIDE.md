# Enhanced Error Handling Implementation Guide

## Overview

This document describes the enhanced error handling system implemented for the Opttius SaaS application. The system provides comprehensive error reporting, monitoring, and handling capabilities.

## System Components

### 1. Core Error Reporting (`src/lib/error-reporting/core.ts`)

The core error reporting system provides:

- Centralized error reporting with configurable integrations
- Multiple severity levels (low, medium, high, critical)
- Context-aware error reporting
- Integration with external services (Datadog, custom endpoints)

#### Key Functions:

```typescript
// Report any error with context
await reportError({
  error: new Error("Something went wrong"),
  context: { userId: "123", operation: "user_login" },
  severity: "high",
  userId: "123",
});

// Report API errors specifically
await reportApiError(error, {
  endpoint: "/api/users",
  method: "POST",
  statusCode: 500,
});

// Report database errors
await reportDatabaseError(error, {
  operation: "SELECT",
  tableName: "users",
});
```

### 2. Enhanced Error Handler Middleware (`src/lib/middleware/enhanced-error-handler.ts`)

Provides enhanced error handling for API routes with automatic error reporting.

#### Usage Example:

```typescript
import { withEnhancedErrorHandling } from "@/lib/middleware/enhanced-error-handler";

export const POST = withEnhancedErrorHandling(
  async (request, { requestId }) => {
    // Your route logic here
    const data = await request.json();
    // ... processing
    return NextResponse.json({ success: true });
  },
  {
    requireAuth: true,
    enableReporting: true,
    reportThreshold: 400, // Report errors >= 400
  },
);
```

### 3. Error Classes (`src/lib/errors/comprehensive-handler.ts`)

Standardized error classes for consistent error handling:

```typescript
// Application base error
throw new ApplicationError("Custom error message", {
  code: "CUSTOM_ERROR",
  statusCode: 400,
  details: { field: "value" },
});

// Validation error
throw new ValidationError("Invalid input", {
  details: validationErrors,
});

// Authentication error
throw new AuthenticationError("Invalid credentials");

// Authorization error
throw new AuthorizationError("Insufficient permissions");
```

## Configuration

### Environment Variables

```bash
# Error Reporting Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_VERSION=1.0.0

# Datadog Integration
DATADOG_API_KEY=your_datadog_api_key

# Custom Error Reporting Endpoint
ERROR_REPORTING_ENDPOINT=https://your-error-service.com/api/errors

# Sentry (when implemented)
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
```

### Initialization

Initialize error reporting in your application entry point:

```typescript
// app/layout.tsx or similar
import {
  initializeErrorReporting,
  setupGlobalErrorHandlers,
} from "@/lib/error-reporting";

// Initialize error reporting
initializeErrorReporting({
  enabled: process.env.NODE_ENV === "production",
  serviceName: "opttius-app",
  environment: process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_APP_VERSION,
});

// Setup global error handlers
setupGlobalErrorHandlers();
```

## Integration Examples

### 1. API Route Integration

```typescript
// src/app/api/users/route.ts
import { withEnhancedErrorHandling } from "@/lib/middleware/enhanced-error-handler";
import { createUserSchema } from "@/lib/validation/schemas";

export const POST = withEnhancedValidation(
  createUserSchema,
  async (validatedData, request, { requestId }) => {
    try {
      // Business logic
      const user = await createUser(validatedData);
      return NextResponse.json({ user });
    } catch (error) {
      // Errors are automatically reported and handled
      throw error;
    }
  },
  {
    requireAuth: true,
    enableReporting: true,
  },
);
```

### 2. Database Error Handling

```typescript
// src/lib/database/users.ts
import { reportDatabaseError } from "@/lib/error-reporting";

export async function getUserById(id: string) {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    // Report database errors
    await reportDatabaseError(error as Error, {
      operation: "SELECT",
      tableName: "users",
      userId: id,
    });
    throw error;
  }
}
```

### 3. Frontend Error Boundary

```typescript
// src/components/ErrorBoundary.tsx
import { ErrorBoundaryReporter } from "@/lib/error-reporting";

class ErrorBoundary extends React.Component<Props, State> {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Report React errors
    ErrorBoundaryReporter.captureError(error, errorInfo);
  }

  render() {
    // Error boundary implementation
  }
}
```

## Best Practices

### 1. Error Classification

- Use appropriate error classes for different scenarios
- Set correct HTTP status codes
- Include relevant context data

### 2. Error Reporting Strategy

- Report critical errors (5xx) immediately
- Report business logic errors that impact users
- Avoid reporting validation errors or expected failures

### 3. Context Enrichment

Always include relevant context:

```typescript
{
  userId: "current_user_id",
  requestId: "trace_id",
  endpoint: "/api/route",
  method: "POST",
  // Additional business context
}
```

### 4. Security Considerations

- Never expose sensitive data in error messages
- Sanitize error details before sending to clients
- Use generic messages for security-related errors

## Monitoring and Observability

### Log Levels Mapping

- `low`: debug level logging
- `medium`: info level logging
- `high`: warn level logging
- `critical`: error level logging

### Integration Points

1. **Application Logs**: All errors are logged via the existing logger
2. **External Services**: Configurable reporting to Datadog, Sentry, or custom endpoints
3. **Performance Monitoring**: Error rates and patterns can be tracked
4. **Alerting**: Critical errors can trigger alerts through integrated services

## Future Enhancements

### Planned Features

1. **Sentry Integration**: Full Sentry SDK integration with proper typing
2. **Advanced Analytics**: Error pattern analysis and trending
3. **Automated Retry Logic**: Smart retry mechanisms for transient errors
4. **User Impact Assessment**: Correlate errors with user impact metrics
5. **Error Resolution Tracking**: Track error resolution and prevention measures

### Performance Considerations

- Asynchronous error reporting to avoid blocking main operations
- Batch reporting for high-volume scenarios
- Configurable sampling rates for production environments
- Circuit breaker pattern for external error reporting services

## Troubleshooting

### Common Issues

1. **Errors not being reported**
   - Check if error reporting is enabled for the environment
   - Verify integration configuration (API keys, endpoints)
   - Check network connectivity to external services

2. **Performance impact**
   - Adjust reporting thresholds to reduce volume
   - Implement sampling for high-frequency errors
   - Monitor error reporting service health

3. **Missing context**
   - Ensure context data is properly extracted from requests
   - Verify user identification mechanisms
   - Check correlation ID propagation

This enhanced error handling system provides robust error management while maintaining performance and developer experience.
