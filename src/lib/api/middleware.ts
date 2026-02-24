import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";
import {
  RateLimitError,
  AuthenticationError,
  AuthorizationError,
} from "./errors";
import { appLogger as logger } from "@/lib/logger";
import type {
  IsAdminParams,
  IsAdminResult,
  GetAdminRoleParams,
  GetAdminRoleResult,
  LogAdminActivityParams,
} from "@/types/supabase-rpc";

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limit configuration
interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (request: NextRequest) => string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
}

// Default rate limit configurations
export const rateLimitConfigs = {
  // General API endpoints
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
  },

  // Authentication endpoints (more restrictive)
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
  },

  // Contact form (prevent spam)
  contact: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
  },

  // Payment endpoints (very restrictive)
  payment: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 10,
  },

  // Search endpoints (prevent abuse)
  search: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
  },

  // Modification endpoints (POST/PUT/DELETE)
  modification: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 50,
  },

  // POS endpoints (sales processing)
  pos: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 20,
  },
};

// Rate limiting middleware
export function withRateLimit(
  config: RateLimitConfig,
): (
  request: NextRequest,
  handler: () => Promise<NextResponse>,
) => Promise<NextResponse> {
  return async (
    request: NextRequest,
    handler: () => Promise<NextResponse>,
  ): Promise<NextResponse> => {
    const key = config.keyGenerator
      ? config.keyGenerator(request)
      : getClientIdentifier(request);

    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Clean up old entries
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetTime < now) {
        rateLimitStore.delete(k);
      }
    }

    // Get current count for this key
    const current = rateLimitStore.get(key);

    if (!current || current.resetTime < now) {
      // First request in window or window expired
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
      });
    } else if (current.count >= config.maxRequests) {
      // Rate limit exceeded
      throw new RateLimitError(
        `Rate limit exceeded. Try again in ${Math.ceil((current.resetTime - now) / 1000)} seconds.`,
      );
    } else {
      // Increment count
      current.count++;
      rateLimitStore.set(key, current);
    }

    try {
      const response = await handler();

      // Add rate limit headers
      response.headers.set("X-RateLimit-Limit", config.maxRequests.toString());
      response.headers.set(
        "X-RateLimit-Remaining",
        Math.max(0, config.maxRequests - (current?.count || 1)).toString(),
      );
      response.headers.set(
        "X-RateLimit-Reset",
        ((current?.resetTime || now + config.windowMs) / 1000).toString(),
      );

      return response;
    } catch (error) {
      // If handler throws an error, ensure we return a proper JSON response
      if (error instanceof RateLimitError) {
        throw error; // Let rate limit errors bubble up
      }

      // Log unexpected errors
      if (error instanceof Error) {
        logger.error("Error in rate-limited handler", error);
      } else {
        logger.error("Error in rate-limited handler", new Error(String(error)));
      }

      // Return proper error response
      return NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : "Internal server error",
        },
        { status: 500 },
      );
    }
  };
}

// Get client identifier for rate limiting
function getClientIdentifier(request: NextRequest): string {
  // Try to get real IP from headers (for reverse proxies)
  const xForwardedFor = request.headers.get("x-forwarded-for");
  const xRealIp = request.headers.get("x-real-ip");
  const clientIp =
    xForwardedFor?.split(",")[0] || xRealIp || request.ip || "unknown";

  // For authenticated requests, also include user agent for more specificity
  const userAgent = request.headers.get("user-agent") || "unknown";

  return `${clientIp}:${userAgent.substring(0, 50)}`;
}

// Authentication middleware
export async function requireAuth(request: NextRequest): Promise<{
  userId: string;
  user: { id: string; email?: string; [key: string]: unknown };
}> {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new AuthenticationError("Authorization header required");
  }

  const token = authorization.slice(7);

  try {
    const supabase = createServiceRoleClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw new AuthenticationError("Invalid or expired token");
    }

    return { userId: user.id, user: { email: user.email, ...user } };
  } catch (error) {
    throw new AuthenticationError("Authentication failed");
  }
}

// Role-based authorization middleware using admin_users table
export async function requireRole(
  userId: string,
  requiredRole: string = "admin",
): Promise<void> {
  const supabase = createServiceRoleClient();

  try {
    // Check if user is in admin_users table
    const { data: isAdmin, error: adminError } = (await supabase.rpc(
      "is_admin",
      { user_id: userId } as IsAdminParams,
    )) as { data: IsAdminResult | null; error: Error | null };

    if (adminError) {
      logger.error("Error checking admin status:", {
        error: adminError,
        userId,
      });
      throw new AuthorizationError("Unable to verify admin status");
    }

    if (!isAdmin) {
      throw new AuthorizationError(
        "Insufficient permissions - admin access required",
      );
    }

    // If specific role is required, check that too
    if (requiredRole !== "admin") {
      const { data: userRole, error: roleError } = (await supabase.rpc(
        "get_admin_role",
        { user_id: userId } as GetAdminRoleParams,
      )) as { data: GetAdminRoleResult | null; error: Error | null };

      if (roleError) {
        logger.error("Error getting admin role:", { error: roleError, userId });
        throw new AuthorizationError("Unable to verify admin role");
      }

      // Simplified role system - only 'admin' role
      if (userRole !== "admin") {
        throw new AuthorizationError("Admin role required");
      }

      // Check if required role is also admin
      if (requiredRole && requiredRole !== "admin") {
        throw new AuthorizationError(
          `Invalid role requirement - only 'admin' role exists`,
        );
      }
    }

    logger.debug(
      `Admin access verified for user ${userId} with role check: ${requiredRole}`,
    );
  } catch (error) {
    if (error instanceof AuthorizationError) {
      throw error;
    }
    logger.error("Unexpected error in role check:", { error, userId });
    throw new AuthorizationError("Authentication system error");
  }
}

// Log admin activity for audit trail
export async function logAdminActivity(
  userId: string,
  action: string,
  resourceType: string,
  resourceId?: string,
  details?: Record<string, unknown> | string,
): Promise<void> {
  try {
    const supabase = createServiceRoleClient();

    const params: LogAdminActivityParams = {
      p_action: action,
      p_resource_type: resourceType,
      p_resource_id: resourceId || null,
      p_details: details
        ? typeof details === "string"
          ? details
          : JSON.stringify(details)
        : null,
    };

    await supabase.rpc("log_admin_activity", params);
  } catch (error) {
    logger.error("Error logging admin activity:", {
      error,
      userId,
      action,
      resourceType,
    });
    // Don't throw here - logging failures shouldn't break the main operation
  }
}

// Security headers middleware
export function withSecurityHeaders(response: NextResponse): NextResponse {
  // Prevent MIME type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");

  // Prevent clickjacking
  response.headers.set("X-Frame-Options", "DENY");

  // XSS protection
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Referrer policy
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions Policy (formerly Feature-Policy)
  // Restrict access to browser features
  const permissionsPolicy = [
    "geolocation=()",
    "microphone=()",
    "camera=()",
    "payment=(self)",
    "usb=()",
    "magnetometer=()",
    "gyroscope=()",
    "accelerometer=()",
    "autoplay=()",
    "encrypted-media=()",
  ].join(", ");
  response.headers.set("Permissions-Policy", permissionsPolicy);

  // Content Security Policy (CSP) - Enhanced security
  // Note: unsafe-inline for styles is required for Next.js CSS-in-JS
  // In the future, consider using nonces or hashes for better security
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseDomain = supabaseUrl
    ? new URL(supabaseUrl).origin
    : "https://*.supabase.co";

  const csp = [
    "default-src 'self'",
    // Scripts: allow self, Next.js inline scripts, and trusted third parties
    // unsafe-inline is required for Next.js but should be replaced with nonces in future
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://sdk.mercadopago.com https://http2.mlstatic.com https://www.google.com https://www.googletagmanager.com https://www.gstatic.com",
    // Styles: unsafe-inline required for Next.js CSS-in-JS
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    // Fonts: allow self, Google Fonts, Mercado Pago Bricks, and data URIs
    "font-src 'self' https://fonts.gstatic.com https://http2.mlstatic.com data:",
    // Images: allow self, data URIs, blob, HTTPS sources, and Supabase storage
    "img-src 'self' data: https: blob: " +
      (supabaseDomain !== "https://*.supabase.co"
        ? supabaseDomain
        : "https://*.supabase.co"),
    // Connect: allow API calls, WebSocket connections, and Supabase (ws for local dev)
    "connect-src 'self' https: wss: ws: " +
      (supabaseDomain !== "https://*.supabase.co"
        ? supabaseDomain
        : "https://*.supabase.co") +
      " https://*.supabase.co" +
      (supabaseUrl.includes("127.0.0.1") ? " ws://127.0.0.1:54321" : ""),
    // Frames: allow trusted iframes (MercadoPago Bricks secure fields, MercadoLibre, ML static, Google, Supabase)
    "frame-src 'self' https://www.mercadopago.com https://www.mercadolibre.com https://http2.mlstatic.com https://secure-fields.mercadopago.com https://www.google.com " +
      (supabaseDomain !== "https://*.supabase.co"
        ? supabaseDomain
        : "https://*.supabase.co"),
    // Media: allow audio/video from trusted sources
    "media-src 'self' https:",
    // Object: restrict object/embed tags (security best practice)
    "object-src 'none'",
    // Base URI: prevent base tag injection attacks
    "base-uri 'self'",
    // Form action: restrict form submissions to same origin
    "form-action 'self'",
    // Worker: allow service workers and web workers from same origin
    "worker-src 'self' blob:",
    // Manifest: allow web app manifest
    "manifest-src 'self'",
    // Upgrade insecure requests in production
    ...(process.env.NODE_ENV === "production"
      ? ["upgrade-insecure-requests"]
      : []),
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);

  // Strict Transport Security (HSTS) - only in production
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload",
    );
  }

  // Cross-Origin Opener Policy (COOP)
  response.headers.set(
    "Cross-Origin-Opener-Policy",
    "same-origin-allow-popups",
  );

  // Cross-Origin Resource Policy (CORP)
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");

  return response;
}

// CORS middleware
export function withCORS(
  response: NextResponse,
  origin?: string,
  methods: string[] = ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
): NextResponse {
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    "http://localhost:3000",
    "https://opttius.com",
    "https://www.opttius.com",
  ].filter(Boolean);

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  }

  response.headers.set("Access-Control-Allow-Methods", methods.join(", "));
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization",
  );
  response.headers.set("Access-Control-Max-Age", "86400"); // 24 hours

  return response;
}

// Request logging middleware
export function logRequest(
  request: NextRequest,
  startTime: number = Date.now(),
) {
  const method = request.method;
  const url = request.url;
  const userAgent = request.headers.get("user-agent") || "unknown";
  const clientIp = getClientIdentifier(request).split(":")[0];

  logger.debug("Request received", { method, url, clientIp, userAgent });

  // Return a function to log the response
  return (response: NextResponse) => {
    const duration = Date.now() - startTime;
    const status = response.status;

    logger.debug("Request completed", { method, url, status, duration });
  };
}

// Middleware composer to chain multiple middlewares
export function composeMiddleware(
  ...middlewares: Array<
    (
      request: NextRequest,
      handler: () => Promise<NextResponse>,
    ) => Promise<NextResponse>
  >
) {
  return async (
    request: NextRequest,
    baseHandler: () => Promise<NextResponse>,
  ) => {
    let handler = baseHandler;

    // Apply middlewares in reverse order
    for (let i = middlewares.length - 1; i >= 0; i--) {
      const middleware = middlewares[i];
      const currentHandler = handler;
      handler = () => middleware(request, currentHandler);
    }

    return handler();
  };
}

// Request ID middleware
export function withRequestId(response: NextResponse): NextResponse {
  const requestId = crypto.randomUUID();
  response.headers.set("X-Request-ID", requestId);
  return response;
}

// Health check bypass (skip rate limiting for health checks)
export function isHealthCheck(request: NextRequest): boolean {
  const url = new URL(request.url);
  return url.pathname === "/api/health" || url.pathname === "/health";
}
