# Secure Coding Guidelines

## Overview

This document outlines the security best practices and coding standards for the Opttius SaaS platform development team. These guidelines are designed to prevent common security vulnerabilities and ensure enterprise-grade security posture.

## Table of Contents

1. [Input Validation](#input-validation)
2. [Authentication & Authorization](#authentication--authorization)
3. [Data Protection](#data-protection)
4. [Error Handling](#error-handling)
5. [API Security](#api-security)
6. [Database Security](#database-security)
7. [Logging & Monitoring](#logging--monitoring)
8. [Third-Party Dependencies](#third-party-dependencies)
9. [Security Testing](#security-testing)

## Input Validation

### General Principles

- **Never trust user input** - All input must be validated and sanitized
- **Whitelist over blacklist** - Allow only known good values rather than blocking known bad values
- **Validate at boundaries** - Validate input at every entry point (API, forms, file uploads)

### Implementation Examples

```typescript
// Good: Strict validation with Zod
import { z } from "zod";

const userInputSchema = z.object({
  email: z.string().email().max(255),
  age: z.number().min(18).max(120),
  name: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z\s]+$/),
});

// Bad: Weak validation
const validateEmail = (email: string) => {
  return email.includes("@"); // Too simplistic
};

// Good: Proper email validation
const validateEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
};
```

### File Upload Security

```typescript
// Validate file types and sizes
const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const validateFileUpload = (file: File) => {
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    throw new ValidationError("Invalid file type");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new ValidationError("File too large");
  }

  // Sanitize filename
  const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  return sanitizedFilename;
};
```

## Authentication & Authorization

### Password Security

```typescript
// Good: Strong password requirements
const validatePassword = (password: string) => {
  const minLength = 12;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  return (
    password.length >= minLength &&
    hasUpperCase &&
    hasLowerCase &&
    hasNumbers &&
    hasSpecialChar
  );
};

// Store hashed passwords only
import bcrypt from "bcrypt";

const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

const verifyPassword = async (
  password: string,
  hash: string,
): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};
```

### Session Management

```typescript
// Use secure session tokens
import crypto from "crypto";

const generateSessionToken = (): string => {
  return crypto.randomBytes(32).toString("hex");
};

// Implement proper session expiration
interface Session {
  userId: string;
  tokenId: string;
  createdAt: Date;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

const createSession = (
  userId: string,
  ipAddress?: string,
  userAgent?: string,
): Session => {
  const expiresIn = 24 * 60 * 60 * 1000; // 24 hours
  return {
    userId,
    tokenId: generateSessionToken(),
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + expiresIn),
    ipAddress,
    userAgent,
  };
};
```

### Role-Based Access Control (RBAC)

```typescript
// Define permission hierarchy
type UserRole = "user" | "admin" | "super_admin" | "root";

const PERMISSIONS = {
  READ_USERS: ["admin", "super_admin", "root"],
  WRITE_USERS: ["super_admin", "root"],
  DELETE_USERS: ["root"],
  MANAGE_SYSTEM: ["root"],
};

const hasPermission = (userRole: UserRole, permission: string): boolean => {
  const allowedRoles = PERMISSIONS[permission as keyof typeof PERMISSIONS];
  return allowedRoles ? allowedRoles.includes(userRole) : false;
};

// Middleware for route protection
const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;
    if (!userRole || !hasPermission(userRole, permission)) {
      throw new AuthorizationError("Insufficient permissions");
    }
    next();
  };
};
```

## Data Protection

### Encryption at Rest

```typescript
// Encrypt sensitive data
import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!;
const IV_LENGTH = 16;

const encrypt = (text: string): string => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipher("aes-256-cbc", ENCRYPTION_KEY);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
};

const decrypt = (encryptedText: string): string => {
  const textParts = encryptedText.split(":");
  const iv = Buffer.from(textParts.shift()!, "hex");
  const encrypted = textParts.join(":");
  const decipher = crypto.createDecipher("aes-256-cbc", ENCRYPTION_KEY);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
};
```

### Data Masking

```typescript
// Mask sensitive information in logs
const maskSensitiveData = (data: Record<string, any>): Record<string, any> => {
  const masked = { ...data };

  // Mask credit card numbers
  if (masked.creditCard) {
    masked.creditCard = masked.creditCard.replace(/\d(?=\d{4})/g, "*");
  }

  // Mask SSN
  if (masked.ssn) {
    masked.ssn = "***-**-" + masked.ssn.slice(-4);
  }

  // Mask email (keep domain visible)
  if (masked.email) {
    const [local, domain] = masked.email.split("@");
    masked.email = local.charAt(0) + "***@" + domain;
  }

  return masked;
};
```

## Error Handling

### Secure Error Responses

```typescript
// Never expose internal details
class ApiError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number,
    public readonly errorCode?: string,
    public readonly internalDetails?: string, // For logging only
  ) {
    super(message);
  }
}

// Generic error for unauthorized access
const handleUnauthorized = () => {
  throw new ApiError(
    "Access denied",
    401,
    "UNAUTHORIZED",
    "User attempted to access restricted resource", // Internal only
  );
};

// Log detailed errors internally but send generic responses
const handleError = (error: Error, req: Request) => {
  // Log full details internally
  logger.error("API Error", {
    error: error.message,
    stack: error.stack,
    url: req.url,
    userId: req.user?.id,
    internalDetails:
      error instanceof ApiError ? error.internalDetails : undefined,
  });

  // Send generic response to client
  if (error instanceof ApiError) {
    return {
      success: false,
      error: {
        message: error.message,
        code: error.errorCode,
      },
    };
  }

  // Generic fallback for unexpected errors
  return {
    success: false,
    error: {
      message: "An unexpected error occurred",
      code: "INTERNAL_ERROR",
    },
  };
};
```

## API Security

### Rate Limiting

```typescript
// Implement rate limiting
import rateLimit from "express-rate-limit";

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limits for sensitive endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Only 5 attempts per 15 minutes
  skipSuccessfulRequests: true,
  message: {
    error: "Too many authentication attempts, please try again later.",
  },
});
```

### CORS Configuration

```typescript
// Restrict CORS to trusted origins
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(",") || [
    "https://app.opttius.com",
  ],
  credentials: true,
  optionsSuccessStatus: 200,
  exposedHeaders: ["X-Request-ID"],
};

// Dynamic CORS based on environment
const dynamicCors = (req: Request, callback: Function) => {
  const allowedOrigins =
    process.env.NODE_ENV === "production"
      ? ["https://app.opttius.com", "https://admin.opttius.com"]
      : ["http://localhost:3000", "http://localhost:3001"];

  const origin = req.header("Origin");
  if (origin && allowedOrigins.includes(origin)) {
    callback(null, { origin: true, credentials: true });
  } else {
    callback(new Error("Not allowed by CORS"));
  }
};
```

## Database Security

### SQL Injection Prevention

```typescript
// Always use parameterized queries
// Good: Parameterized query
const getUserByEmail = async (email: string) => {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email) // Safe parameterization
    .single();
  return { data, error };
};

// Bad: String concatenation (vulnerable to SQL injection)
const getUserByEmailUnsafe = async (email: string) => {
  const query = `SELECT * FROM users WHERE email = '${email}'`; // NEVER do this
  // ... execute query
};

// Use database transactions for data integrity
const transferFunds = async (
  fromAccount: string,
  toAccount: string,
  amount: number,
) => {
  const { data, error } = await supabase.rpc("transfer_funds", {
    from_account: fromAccount,
    to_account: toAccount,
    amount: amount,
  });

  if (error) {
    throw new ApplicationError("Transfer failed", { cause: error });
  }

  return data;
};
```

### Row Level Security (RLS)

```sql
-- Enable RLS on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );
```

## Logging & Monitoring

### Secure Logging Practices

```typescript
// Structured logging with security context
const logSecurityEvent = (
  eventType: string,
  severity: "low" | "medium" | "high" | "critical",
  details: Record<string, any>,
) => {
  logger.info("Security Event", {
    eventType,
    severity,
    timestamp: new Date().toISOString(),
    userId: details.userId,
    ipAddress: details.ipAddress,
    userAgent: details.userAgent ? maskUserAgent(details.userAgent) : undefined,
    // Never log sensitive data like passwords or tokens
    ...maskSensitiveData(details),
  });
};

// Mask sensitive information in logs
const maskUserAgent = (userAgent: string): string => {
  return userAgent.replace(/(\d+\.){3}\d+/g, "***"); // Mask IP-like patterns
};

// Log authentication events
const logAuthEvent = (
  eventType: "LOGIN_SUCCESS" | "LOGIN_FAILED" | "LOGOUT",
  userId: string,
  ipAddress: string,
  userAgent: string,
  failureReason?: string,
) => {
  logSecurityEvent(eventType, eventType === "LOGIN_FAILED" ? "high" : "low", {
    userId,
    ipAddress,
    userAgent,
    failureReason: eventType === "LOGIN_FAILED" ? failureReason : undefined,
  });
};
```

## Third-Party Dependencies

### Dependency Management

```bash
# Regular security audits
npm audit
npm audit fix

# Check for vulnerable dependencies
npm audit --audit-level=high

# Update dependencies regularly
npm outdated
npm update

# Verify package integrity
npm audit signatures
```

### Security Headers

```typescript
// Express middleware for security headers
const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains",
  );
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'",
  );
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
};
```

### Security Testing

#### Automated Security Scanning

```json
// Package.json scripts for security testing
{
  "scripts": {
    "security:scan": "snyk test",
    "security:monitor": "snyk monitor",
    "lint:security": "eslint src --ext .ts,.tsx --fix --quiet",
    "test:security": "npm run security:scan && npm run lint:security"
  }
}
```

#### Security Testing Integration

The security testing pipeline includes:

- **Static Analysis**: ESLint security plugin scanning
- **Dependency Scanning**: Snyk vulnerability detection
- **Runtime Testing**: Integration with existing test suite
- **Container Security**: Trivy scanning for Docker images

### Manual Security Testing Checklist

- [ ] Input validation testing with malicious payloads
- [ ] Authentication bypass attempts
- [ ] Authorization escalation testing
- [ ] SQL injection testing
- [ ] XSS testing
- [ ] CSRF protection verification
- [ ] Rate limiting effectiveness
- [ ] Session management security
- [ ] Data exposure prevention
- [ ] Error message sanitization

### Penetration Testing Schedule

- **Monthly**: Automated security scans
- **Quarterly**: Manual penetration testing
- **Annually**: Comprehensive security assessment
- **Post-deployment**: Security regression testing

## Compliance Requirements

### SOC 2 Type II

- Implement audit logging for all security events
- Maintain incident response procedures
- Regular security awareness training
- Document security policies and procedures

### PCI DSS

- Never store sensitive authentication data
- Implement strong encryption for data transmission
- Regular vulnerability assessments
- Maintain secure network architecture

### GDPR

- Implement data minimization principles
- Provide data subject rights mechanisms
- Maintain records of processing activities
- Implement privacy by design

## Emergency Procedures

### Security Incident Response

1. **Identification**: Detect and confirm security incident
2. **Containment**: Isolate affected systems
3. **Eradication**: Remove threat and vulnerabilities
4. **Recovery**: Restore systems to normal operation
5. **Lessons Learned**: Document and improve processes

### Contact Information

- **Security Team**: security@opttius.com
- **Emergency**: 24/7 security hotline
- **Third-party Services**: Vendor contact information

---

_Last Updated: December 2024_
_Version: 1.0_
_Review Cycle: Quarterly_
