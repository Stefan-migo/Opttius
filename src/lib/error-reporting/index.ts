/**
 * Error Reporting System Index
 * Exports all error reporting functionality
 */

export * from "./core";

// Placeholder for Sentry integration (to be implemented when Sentry is added)
export const SentryIntegration = {
  enabled: false,
  initialize: () => {
    console.warn(
      "Sentry integration not available - install @sentry/nextjs to enable",
    );
  },
  captureException: (error: Error) => {
    console.warn("Sentry not available:", error.message);
  },
};
