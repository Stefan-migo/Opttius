"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body>
        <div
          style={{
            padding: "2rem",
            textAlign: "center" as const,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <h2>Algo salió mal</h2>
          <p>Ha ocurrido un error inesperado. El equipo ha sido notificado.</p>
          <button
            onClick={() => reset()}
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1rem",
              cursor: "pointer",
              backgroundColor: "#0070f3",
              color: "white",
              border: "none",
              borderRadius: "4px",
            }}
          >
            Intentar de nuevo
          </button>
        </div>
      </body>
    </html>
  );
}
