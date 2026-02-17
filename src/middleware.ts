import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Middleware: Refresca la sesión de Supabase y protege rutas /admin
 *
 * 1. SIEMPRE refresca la sesión (requerido para SSR - evita 401 en API routes)
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
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // 1. Refrescar sesión: getSession() dispara refresh si el token expiró y actualiza cookies
  //    (necesario para que la sesión persista al recargar la página)
  await supabase.auth.getSession();

  // 2. Obtener usuario para la verificación: getUser() valida el JWT con el servidor
  const {
    data: { user },
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
