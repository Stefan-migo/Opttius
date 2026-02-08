/**
 * Enhanced Error Reporting and Monitoring System
 * Provides comprehensive error reporting capabilities with multiple integrations
 */

import { appLogger as logger } from "@/lib/logger";

// Type definitions
interface ErrorReport {
  error: Error;
  context?: Record<string, any>;
  severity: "low" | "medium" | "high" | "critical";
  userId?: string;
  sessionId?: string;
  requestId?: string;
  timestamp: Date;
}

interface ErrorReportingConfig {
  enabled: boolean;
  serviceName: string;
  environment: string;
  release: string;
  integrations: {
    datadog?: {
      apiKey: string;
      enabled: boolean;
    };
    custom?: {
      endpoint: string;
      enabled: boolean;
    };
  };
}

// Global configuration
let config: ErrorReportingConfig = {
  enabled: process.env.NODE_ENV === "production",
  serviceName: "opttius-app",
  environment: process.env.NODE_ENV || "development",
  release: process.env.NEXT_PUBLIC_APP_VERSION || "unknown",
  integrations: {
    datadog: {
      apiKey: process.env.DATADOG_API_KEY || "",
      enabled: !!process.env.DATADOG_API_KEY,
    },
    custom: {
      endpoint: process.env.ERROR_REPORTING_ENDPOINT || "",
      enabled: !!process.env.ERROR_REPORTING_ENDPOINT,
    },
  },
};

// Initialize error reporting integrations
export function initializeErrorReporting(
  newConfig?: Partial<ErrorReportingConfig>,
) {
  if (newConfig) {
    config = { ...config, ...newConfig };
  }

  logger.info("Error reporting system initialized", {
    enabled: config.enabled,
    environment: config.environment,
    integrations: Object.keys(config.integrations).filter(
      (key) =>
        config.integrations[key as keyof typeof config.integrations]?.enabled,
    ),
  });
}

// Main error reporting function
export async function reportError(report: ErrorReport): Promise<void> {
  if (!config.enabled) {
    return;
  }

  try {
    // Log to console/app logger first
    const logLevel = getLogLevel(report.severity);
    logger[logLevel](
      `Error Report [${report.severity.toUpperCase()}]: ${report.error.message}`,
      report.error,
      {
        ...report.context,
        userId: report.userId,
        sessionId: report.sessionId,
        requestId: report.requestId,
        timestamp: report.timestamp.toISOString(),
        stack: report.error.stack,
      },
    );

    // Report to Datadog if enabled
    if (config.integrations.datadog?.enabled) {
      try {
        await reportToDatadog(report);
      } catch (datadogError) {
        logger.warn("Failed to report to Datadog", datadogError);
      }
    }

    // Report to custom endpoint if enabled
    if (config.integrations.custom?.enabled) {
      try {
        await reportToCustomEndpoint(report);
      } catch (customError) {
        logger.warn("Failed to report to custom endpoint", customError);
      }
    }
  } catch (error) {
    logger.error("Error in error reporting system", error);
  }
}

// Helper functions
function getLogLevel(severity: ErrorReport["severity"]): keyof typeof logger {
  switch (severity) {
    case "low":
      return "debug";
    case "medium":
      return "info";
    case "high":
      return "warn";
    case "critical":
      return "error";
  }
}

async function reportToDatadog(report: ErrorReport): Promise<void> {
  const payload = {
    service: config.serviceName,
    message: report.error.message,
    timestamp: Math.floor(report.timestamp.getTime() / 1000),
    level: report.severity,
    tags: [
      `environment:${config.environment}`,
      `release:${config.release}`,
      ...(report.userId ? [`user_id:${report.userId}`] : []),
      ...(report.sessionId ? [`session_id:${report.sessionId}`] : []),
    ],
    error: {
      kind: report.error.name,
      stack: report.error.stack,
    },
    context: report.context,
  };

  const response = await fetch(
    "https://http-intake.logs.datadoghq.com/api/v2/logs",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "DD-API-KEY": config.integrations.datadog!.apiKey,
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error(`Datadog API error: ${response.status}`);
  }
}

async function reportToCustomEndpoint(report: ErrorReport): Promise<void> {
  const payload = {
    service: config.serviceName,
    environment: config.environment,
    release: config.release,
    error: {
      name: report.error.name,
      message: report.error.message,
      stack: report.error.stack,
    },
    context: report.context,
    userId: report.userId,
    sessionId: report.sessionId,
    requestId: report.requestId,
    timestamp: report.timestamp.toISOString(),
    severity: report.severity,
  };

  const response = await fetch(config.integrations.custom!.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      `Custom error reporting endpoint error: ${response.status}`,
    );
  }
}

// Wrapper functions for common error reporting scenarios
export async function reportApiError(
  error: Error,
  context?: {
    userId?: string;
    requestId?: string;
    endpoint?: string;
    method?: string;
    statusCode?: number;
  },
): Promise<void> {
  await reportError({
    error,
    context: {
      endpoint: context?.endpoint,
      method: context?.method,
      statusCode: context?.statusCode,
      ...context,
    },
    severity:
      context?.statusCode && context.statusCode >= 500 ? "high" : "medium",
    userId: context?.userId,
    requestId: context?.requestId,
    timestamp: new Date(),
  });
}

export async function reportDatabaseError(
  error: Error,
  context?: {
    userId?: string;
    operation?: string;
    tableName?: string;
    query?: string;
  },
): Promise<void> {
  await reportError({
    error,
    context: {
      operation: context?.operation,
      tableName: context?.tableName,
      query: context?.query,
      ...context,
    },
    severity: "high",
    userId: context?.userId,
    timestamp: new Date(),
  });
}

export async function reportUnhandledError(
  error: Error,
  context?: Record<string, any>,
): Promise<void> {
  await reportError({
    error,
    context,
    severity: "critical",
    timestamp: new Date(),
  });
}

// React error boundary integration
export class ErrorBoundaryReporter {
  static async captureError(
    error: Error,
    errorInfo?: React.ErrorInfo,
  ): Promise<void> {
    await reportError({
      error,
      context: {
        componentStack: errorInfo?.componentStack,
        react: true,
      },
      severity: "high",
      timestamp: new Date(),
    });
  }
}

// Global error handler setup
export function setupGlobalErrorHandlers(): void {
  // Global unhandled promise rejection handler
  if (typeof window !== "undefined") {
    window.addEventListener("unhandledrejection", (event) => {
      reportUnhandledError(event.reason, {
        type: "unhandled_promise_rejection",
        promise: event.promise,
      }).catch(logger.error);
    });

    // Global error handler
    window.addEventListener("error", (event) => {
      reportUnhandledError(event.error, {
        type: "global_error",
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      }).catch(logger.error);
    });
  }

  logger.info("Global error handlers installed");
}

// Export configuration utilities
export function updateErrorReportingConfig(
  newConfig: Partial<ErrorReportingConfig>,
): void {
  config = { ...config, ...newConfig };
}

export function getErrorReportingStatus(): {
  enabled: boolean;
  integrations: string[];
} {
  return {
    enabled: config.enabled,
    integrations: Object.keys(config.integrations).filter(
      (key) =>
        config.integrations[key as keyof typeof config.integrations]?.enabled,
    ),
  };
}
