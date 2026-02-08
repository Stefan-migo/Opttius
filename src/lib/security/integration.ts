import { NextRequest, NextResponse } from "next/server";
import { getSecurityMonitor, getSecurityAlerting } from "@/lib/security";
import { appLogger as logger } from "@/lib/logger";
import { getClientIdentifier } from "@/lib/rate-limiting/config";

/**
 * Security Integration Middleware
 *
 * Integrates security monitoring with existing application systems.
 * Provides automatic security event logging for authentication, rate limiting,
 * and other security-relevant operations.
 *
 * @module lib/security/integration
 */

/**
 * Middleware for authentication security monitoring
 *
 * Wraps authentication middleware to log security events
 */
export function withAuthSecurity(
  handler: (request: NextRequest) => Promise<NextResponse>,
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest) => {
    const securityMonitor = getSecurityMonitor();
    const clientIp = getClientIdentifier(request);
    const userAgent = request.headers.get("user-agent") || "unknown";

    try {
      // Log authentication attempt
      securityMonitor.logAuthEvent(
        "auth.login_attempt",
        {
          userAgent,
        },
        {
          ipAddress: clientIp,
          userAgent,
        },
      );

      const response = await handler(request);

      // Log successful authentication
      if (response.status === 200) {
        securityMonitor.logAuthEvent(
          "auth.login_success",
          {
            userAgent,
          },
          {
            ipAddress: clientIp,
            userAgent,
          },
        );
      }

      return response;
    } catch (error) {
      // Log authentication failure
      securityMonitor.logAuthEvent(
        "auth.login_failure",
        {
          failureReason:
            error instanceof Error ? error.message : "Unknown error",
          attemptCount: 1, // This would need to be tracked separately
          userAgent,
        },
        {
          ipAddress: clientIp,
          userAgent,
        },
      );

      throw error;
    }
  };
}

/**
 * Middleware for rate limiting security monitoring
 *
 * Integrates with rate limiting to log security events for violations
 */
export function withRateLimitSecurity(
  handler: (request: NextRequest) => Promise<NextResponse>,
  endpointCategory: string = "general",
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest) => {
    const securityMonitor = getSecurityMonitor();
    const clientIp = getClientIdentifier(request);

    try {
      const response = await handler(request);
      return response;
    } catch (error) {
      // Check if this is a rate limit error
      if (
        error instanceof Error &&
        error.message.includes("Rate limit exceeded")
      ) {
        securityMonitor.logRateLimitEvent(
          "rate_limit.exceeded",
          {
            endpoint: request.nextUrl.pathname,
            requestCount: 1, // Would need actual count tracking
            limit: 100, // Default value, would come from actual config
            windowMs: 15 * 60 * 1000, // Default 15 minutes
          },
          {
            ipAddress: clientIp,
            requestId: response?.headers.get("X-Request-ID") || undefined,
          },
        );
      }

      throw error;
    }
  };
}

/**
 * Middleware for data access security monitoring
 *
 * Logs access to sensitive data endpoints
 */
export function withDataSecurity(
  handler: (request: NextRequest) => Promise<NextResponse>,
  resourceType: string,
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest) => {
    const securityMonitor = getSecurityMonitor();
    const clientIp = getClientIdentifier(request);

    // Log sensitive data access
    securityMonitor.logDataEvent(
      "data.access_sensitive",
      {
        resource: resourceType,
        accessType: request.method,
        query: request.nextUrl.search,
      },
      {
        ipAddress: clientIp,
        requestId: request.headers.get("X-Request-ID") || undefined,
      },
    );

    return handler(request);
  };
}

/**
 * Global security middleware
 *
 * Applies security monitoring to all requests
 */
export async function securityMiddleware(request: NextRequest): Promise<void> {
  const securityMonitor = getSecurityMonitor();
  const clientIp = getClientIdentifier(request);
  const userAgent = request.headers.get("user-agent") || "unknown";

  // Log all requests for security analysis
  securityMonitor.logEvent(
    "system.suspicious_activity",
    {
      method: request.method,
      url: request.nextUrl.pathname,
      userAgent,
      headers: {
        "content-type": request.headers.get("content-type"),
        accept: request.headers.get("accept"),
      },
    },
    {
      ipAddress: clientIp,
      userAgent,
      source: "global-middleware",
    },
  );

  // Check for suspicious patterns
  const suspiciousPatterns = [
    "/admin",
    "/api/admin",
    "/wp-admin",
    "/.env",
    "/config",
  ];

  if (
    suspiciousPatterns.some((pattern) =>
      request.nextUrl.pathname.includes(pattern),
    )
  ) {
    securityMonitor.logEvent(
      "network.suspicious_ip",
      {
        pattern: suspiciousPatterns.find((p) =>
          request.nextUrl.pathname.includes(p),
        ),
        url: request.nextUrl.pathname,
      },
      {
        ipAddress: clientIp,
        userAgent,
        severity: "medium",
      },
    );
  }
}

/**
 * Payment security integration
 *
 * Integrates with payment processing to monitor for fraud
 */
export class PaymentSecurityIntegration {
  private securityMonitor = getSecurityMonitor();
  private securityAlerting = getSecurityAlerting();

  /**
   * Monitor payment transaction for suspicious patterns
   */
  async monitorTransaction(
    transactionData: {
      amount: number;
      currency: string;
      userId?: string;
      ipAddress?: string;
      gateway: string;
      transactionId: string;
    },
    historicalData?: {
      userAvgAmount?: number;
      userTransactionCount?: number;
      recentTransactions?: number;
    },
  ): Promise<void> {
    const alerts: string[] = [];

    // Check for amount anomalies
    if (historicalData?.userAvgAmount) {
      const deviation =
        Math.abs(transactionData.amount - historicalData.userAvgAmount) /
        historicalData.userAvgAmount;
      if (deviation > 2.0) {
        // 200% deviation
        alerts.push(
          `Unusual transaction amount: ${transactionData.amount} ${transactionData.currency} (normal: ${historicalData.userAvgAmount})`,
        );

        this.securityMonitor.logPaymentEvent(
          "payment.amount_anomaly",
          {
            gateway: transactionData.gateway,
            transactionId: transactionData.transactionId,
            amount: transactionData.amount,
            currency: transactionData.currency,
            avgAmount: historicalData.userAvgAmount,
            deviation: Math.round(deviation * 100),
          },
          {
            userId: transactionData.userId,
            ipAddress: transactionData.ipAddress,
          },
        );
      }
    }

    // Check for frequency anomalies
    if (
      historicalData?.recentTransactions &&
      historicalData.recentTransactions > 10
    ) {
      alerts.push(
        `High transaction frequency: ${historicalData.recentTransactions} recent transactions`,
      );

      this.securityMonitor.logPaymentEvent(
        "payment.frequency_anomaly",
        {
          gateway: transactionData.gateway,
          transactionId: transactionData.transactionId,
          recentCount: historicalData.recentTransactions,
        },
        {
          userId: transactionData.userId,
          ipAddress: transactionData.ipAddress,
        },
      );
    }

    // Send alerts if suspicious activity detected
    if (alerts.length > 0) {
      await this.securityAlerting.sendAlert(
        "Suspicious Payment Activity Detected",
        `Potential fraudulent payment activity for user ${transactionData.userId || "unknown"}`,
        "high",
        [], // Related events would be added here
        [
          "Review transaction details",
          "Verify user identity",
          "Consider transaction blocking",
          "Notify fraud team",
        ],
      );
    }
  }

  /**
   * Monitor webhook signature validation failures
   */
  async monitorWebhookSecurity(
    gateway: string,
    transactionId: string,
    expectedSignature: string,
    receivedSignature: string,
    ipAddress?: string,
  ): Promise<void> {
    this.securityMonitor.logPaymentEvent(
      "payment.signature_invalid",
      {
        gateway,
        transactionId,
        expectedSignature: expectedSignature.substring(0, 10) + "...",
        receivedSignature: receivedSignature.substring(0, 10) + "...",
      },
      {
        ipAddress,
        severity: "critical",
      },
    );

    await this.securityAlerting.sendAlert(
      "Payment Webhook Signature Validation Failed",
      `Invalid signature received from ${gateway} for transaction ${transactionId}`,
      "critical",
      [],
      [
        "Investigate source IP address",
        "Verify webhook configuration",
        "Check for man-in-the-middle attack",
        "Review recent payment gateway changes",
      ],
    );
  }
}

// Export integration utilities
export const paymentSecurity = new PaymentSecurityIntegration();

// Export types
export type { NextRequest, NextResponse };
