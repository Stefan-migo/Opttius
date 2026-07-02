import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { CSRF_EXEMPT_PREFIXES, validateCsrfOrigin } from "@/lib/api/csrf";

// ponytail: crypto.randomUUID() ~0.01ms per call, well under 1ms budget
export function buildCspPolicy(
  nonce: string,
  isProduction: boolean,
  supabaseUrl: string,
): string {
  const supabaseDomain = supabaseUrl
    ? new URL(supabaseUrl).origin
    : "https://*.supabase.co";

  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://sdk.mercadopago.com https://http2.mlstatic.com`,
    // ponytail: style-src keeps 'unsafe-inline' because CalendarDayView/CalendarWeekView
    // inject <style> via dangerouslySetInnerHTML. Extract CSS to .module.css before removing.
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `font-src 'self' https://fonts.gstatic.com https://http2.mlstatic.com data:`,
    `img-src 'self' data: https: blob: ${supabaseDomain}`,
    `connect-src 'self' https: wss: ws: ${supabaseDomain} https://*.supabase.co${supabaseUrl.includes("127.0.0.1") ? " ws://127.0.0.1:54321" : ""}`,
    `frame-src 'self' https://www.mercadopago.com https://www.mercadolibre.com https://http2.mlstatic.com https://secure-fields.mercadopago.com https://www.google.com ${supabaseDomain}`,
    "media-src 'self' https:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ];

  if (isProduction) directives.push("upgrade-insecure-requests");

  return directives.join("; ");
}

/**
 * Middleware: Refresca la sesión de Supabase y protege rutas /admin
 *
 * IMPORTANTE (docs Supabase): Usar SOLO getUser() para refrescar - getSession() no
 * garantiza revalidar el token. getUser() valida con el servidor y actualiza cookies.
 *
 * 1. getUser() refresca el token si expiró y actualiza cookies vía setAll
 * 2. Para /admin: redirige a login si no hay sesión
 */
export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  const nonce = crypto.randomUUID();
  // Propagate nonce to server components via request headers
  // Mutate directly so any NextResponse.next({ request }) inherits it (incl. setAll)
  request.headers.set("x-nonce", nonce);

  const isHtmlRoute =
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/_next") &&
    !pathname.match(/\.\w+$/);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const isProduction = process.env.NODE_ENV === "production";

  // Apply CSP headers to a NextResponse for HTML routes
  function applyCsp(resp: NextResponse): NextResponse {
    if (isHtmlRoute) {
      resp.headers.set(
        "Content-Security-Policy",
        buildCspPolicy(nonce, isProduction, supabaseUrl),
      );
      resp.headers.set("x-nonce", nonce);
    }
    return resp;
  }

  // /acceso-opticas: validar ?token= (DB) o ?key= (DEMO_OPTICAS_ACCESS_KEY fallback)
  if (pathname === "/acceso-opticas") {
    const providedToken = searchParams.get("token");
    const providedKey = searchParams.get("key");

    let valid = false;

    if (providedToken) {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { autoRefreshToken: false, persistSession: false } },
        );
        const { data, error } = await supabase
          .from("opticas_access_tokens")
          .select("id")
          .eq("token", providedToken)
          .gt("expires_at", new Date().toISOString())
          .maybeSingle();
        valid = !error && !!data;
      } catch {
        valid = false;
      }
    }

    if (!valid && providedKey) {
      const secretKey = process.env.DEMO_OPTICAS_ACCESS_KEY;
      valid = !!(
        secretKey &&
        secretKey.length > 0 &&
        providedKey === secretKey
      );
    }

    if (!valid) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Rutas excluidas (no requieren verificación de admin)
  const excludedPaths = [
    "/onboarding",
    "/login",
    "/signup",
    "/solicitar-demo",
    "/acceso-opticas",
    "/reset-password",
    "/support",
    "/api",
    "/_next",
    "/favicon.ico",
    "/favicon",
  ];

  if (pathname === "/") {
    return applyCsp(NextResponse.next({ request }));
  }

  const shouldExclude = excludedPaths.some((path) => pathname.startsWith(path));

  // CSRF check — antes de la llamada costosa a Supabase getUser()
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const isExempt = CSRF_EXEMPT_PREFIXES.some((p) => pathname.startsWith(p));
    if (!isExempt) {
      const { valid } = validateCsrfOrigin(request.headers);
      if (!valid) {
        return NextResponse.json(
          { error: "CSRF validation failed" },
          { status: 403 },
        );
      }
    }
  }

  // Crear response y cliente Supabase para refrescar sesión
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Actualizar request (para downstream) y response (para cliente)
          // Ref: https://supabase.com/docs/guides/auth/server-side/nextjs
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // Refrescar sesión: SOLO getUser() - valida JWT con servidor, refresca si expiró,
  // y dispara setAll para actualizar cookies (persistencia en refresh/nueva pestaña)
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  // Para /admin: redirigir a login si no hay sesión
  if (pathname.startsWith("/admin") && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return applyCsp(response);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
