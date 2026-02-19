import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

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
  const { pathname } = request.nextUrl;

  // Rutas excluidas (no requieren verificación de admin)
  const excludedPaths = [
    "/onboarding",
    "/login",
    "/signup",
    "/reset-password",
    "/support",
    "/api",
    "/_next",
    "/favicon.ico",
    "/favicon",
  ];

  if (pathname === "/") {
    return NextResponse.next();
  }

  const shouldExclude = excludedPaths.some((path) => pathname.startsWith(path));

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

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
