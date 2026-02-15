import { NextRequest, NextResponse } from "next/server";
import { withSecurityHeaders } from "@/lib/api/middleware";

/**
 * Endpoint de prueba para verificar headers de seguridad
 * Útil para testing manual de la Fase 3.2
 *
 * GET /api/test-headers
 *
 * Retorna información sobre los headers aplicados
 */
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    // Crear respuesta básica
    const response = NextResponse.json({
      message: "Headers de seguridad aplicados correctamente",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      headers: {
        "X-Frame-Options": "DENY",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "X-XSS-Protection": "1; mode=block",
        "Permissions-Policy":
          "geolocation=(), microphone=(), camera=(), payment=(self), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), autoplay=(), encrypted-media=()",
        "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
        "Cross-Origin-Resource-Policy": "same-origin",
        "Content-Security-Policy": "Ver headers de respuesta para CSP completo",
        "Strict-Transport-Security":
          process.env.NODE_ENV === "production"
            ? "max-age=31536000; includeSubDomains; preload"
            : "No aplicado en desarrollo",
      },
      instructions: {
        "Ver en navegador":
          "Abre DevTools (F12) > Network > Selecciona este request > Headers > Response Headers",
        "Ver con curl": "curl -I http://localhost:3000/api/test-headers",
        "Ver online":
          "Usa https://securityheaders.com/ o https://observatory.mozilla.org/",
      },
    });

    // Aplicar headers de seguridad
    return withSecurityHeaders(response);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Error al generar headers de prueba",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
