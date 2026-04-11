"use client";

import { AlertCircle, Home, RefreshCw } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

/**
 * Global Error Page for Next.js App Router
 * This page is shown when an error occurs in the root layout or pages
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to logger
    logger.error("Global error page triggered", error as unknown, {
      digest: error.digest,
      globalError: true,
      timestamp: new Date().toISOString(),
    });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-destructive/50 bg-card p-6 shadow-lg">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-destructive" />
          <h1 className="text-2xl font-bold text-foreground">Error</h1>
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
                {error.message}
                {error.digest && `\n\nDigest: ${error.digest}`}
                {"\n\n"}
                {error.stack}
              </pre>
            </details>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="flex-1" variant="default" onClick={reset}>
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
