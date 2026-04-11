"use client";

import { AlertCircle, Home, RefreshCw } from "lucide-react";
import React from "react";
import {
  ErrorBoundary as ReactErrorBoundary,
  FallbackProps,
} from "react-error-boundary";

import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

/**
 * Error Fallback Component
 * Displays a user-friendly error message when an error occurs
 */
function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  // Log error to logger
  React.useEffect(() => {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error("Error Boundary caught an error", errorObj as unknown, {
      errorBoundary: true,
      timestamp: new Date().toISOString(),
    });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-destructive/50 bg-card p-6 shadow-lg">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-destructive" />
          <h1 className="text-2xl font-bold text-foreground">Algo salió mal</h1>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Ocurrió un error inesperado. Por favor, intenta recargar la página o
            volver al inicio.
          </p>
          {process.env.NODE_ENV === "development" && (
            <details className="mt-4 rounded-md bg-muted p-3">
              <summary className="cursor-pointer text-sm font-medium text-foreground">
                Detalles del error (solo en desarrollo)
              </summary>
              <pre className="mt-2 overflow-auto text-xs text-muted-foreground">
                {error instanceof Error ? error.message : String(error)}
                {"\n\n"}
                {error instanceof Error ? error.stack : ""}
              </pre>
            </details>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            className="flex-1"
            variant="default"
            onClick={resetErrorBoundary}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Intentar de nuevo
          </Button>
          <Button
            className="flex-1"
            variant="outline"
            onClick={() => {
              window.location.href = "/";
            }}
          >
            <Home className="mr-2 h-4 w-4" />
            Volver al inicio
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Error Boundary Component
 * Wraps children and catches React errors
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ReactErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        // Additional error logging
        const errorObj =
          error instanceof Error ? error : new Error(String(error));
        logger.error("Error Boundary onError", errorObj as unknown, {
          componentStack: errorInfo.componentStack,
          errorBoundary: true,
        });
      }}
      onReset={() => {
        // Clear any error state if needed
        logger.info("Error Boundary reset by user");
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
}
