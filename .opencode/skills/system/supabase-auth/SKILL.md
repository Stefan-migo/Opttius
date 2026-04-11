---
name: supabase-auth
description: "Expert guide for implementing and maintaining a high-quality Supabase Auth system in Next.js. Use when building or modifying authentication (sign up, sign in, sign out, session, profiles, RLS, middleware, API auth). Ensures functional, secure, and scalable auth following Supabase and Next.js best practices."
---

# Supabase Auth — Guía para sistema de autenticación de alta gama

Esta skill entrega las indicaciones y guías para un sistema de auth con Supabase que sea **funcional, seguro y escalable** en Next.js (App Router).

## Cuándo usar esta skill

- Implementar o modificar flujos de auth (login, registro, recuperación de contraseña).
- Crear o ajustar sesión, perfiles (`profiles`) y sincronización con `auth.users`.
- Definir o revisar políticas RLS y triggers (p. ej. `handle_new_user`).
- Proteger rutas con middleware o server components.
- Autenticar API routes (cookies vs Bearer).
- Revisar buenas prácticas de seguridad y escalabilidad del auth.

---

## 1. Arquitectura recomendada (Next.js + Supabase)

### Clientes Supabase

| Contexto                                    | Cliente                                                                       | Uso                                                                              |
| ------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **Browser (Client Components)**             | `createBrowserClient` (`@supabase/ssr`) desde `utils/supabase/client.ts`      | Hook `useAuth`, AuthContext, formularios login/signup.                           |
| **Middleware**                              | `createServerClient` con `getAll`/`setAll` de cookies en `request`/`response` | Refrescar sesión en cada request; redirigir a `/login` en rutas protegidas.      |
| **Server (API routes, Server Components)**  | `createServerClient` con `cookies()` de Next.js                               | `getUser()` para autorización; leer/escribir sesión vía cookies.                 |
| **Server (operaciones admin / bypass RLS)** | `createServiceRoleClient` (solo server, nunca exponer key)                    | Operaciones que requieren saltarse RLS.                                          |
| **API con Bearer (tests / móvil)**          | Cliente con `global.headers.Authorization: Bearer <token>`                    | `createClientFromRequest(request)` cuando `Authorization: Bearer` está presente. |

Regla: **nunca** usar la service role key en el cliente; **siempre** refrescar sesión en middleware para que las API routes reciban cookies actualizadas.

### Flujo de sesión

1. **Middleware**: en cada request llamar `getSession()` (o según docs, el método que refresque el token) para actualizar cookies.
2. **Auth state en cliente**: `getSession()` inicial + `onAuthStateChange` para login/logout/refresh.
3. **API routes**: usar `getUser()` (valida JWT con el servidor), no solo `getSession()`, para decisiones de autorización.

---

## 2. Buenas prácticas de implementación

### 2.1 Registro (sign up)

- Enviar `email`, `password` y datos extra en `options.data` (p. ej. `first_name`, `last_name`, `phone`) para el trigger.
- Crear fila en `profiles` mediante **trigger** `AFTER INSERT ON auth.users` con función **SECURITY DEFINER** que haga `INSERT ... ON CONFLICT DO UPDATE` en `profiles`. Así se evita depender de `auth.uid()` en el cliente cuando hay confirmación de email (session null).
- No hacer upsert de perfil desde el cliente justo después de `signUp` si la confirmación está activa; el trigger debe ser la única fuente de creación/actualización inicial del perfil.
- Mostrar mensaje claro cuando `session == null && user != null` (email por confirmar) y opcionalmente hacer `signOut()` para no dejar sesión “a medias” en el cliente.

### 2.2 Inicio de sesión (sign in)

- Usar `signInWithPassword({ email, password })`.
- No poner `loading = false` en el mismo flujo del submit; dejar que `onAuthStateChange` (evento `SIGNED_IN`) actualice el estado para evitar condiciones de carrera.
- Tras login exitoso, redirigir a una ruta que refleje el estado del usuario (onboarding, dashboard, etc.).

### 2.3 Cierre de sesión (sign out)

- Llamar `supabase.auth.signOut()` y limpiar estado local (user, profile, session).
- En layouts protegidos, usar un ref (p. ej. `signOutInProgress`) para no disparar redirecciones o efectos mientras el signOut está en curso.

### 2.4 Recuperación de contraseña

- Solicitud: `resetPasswordForEmail(email, { redirectTo: `${origin}/reset-password` })`.
- Página de reset: detectar modo “recovery” por **hash** `#type=recovery` en la URL o por evento **PASSWORD_RECOVERY** en `onAuthStateChange`. Solo entonces mostrar el formulario de nueva contraseña; no mostrar el formulario de “solicitar enlace” cuando el usuario ya llegó por el enlace (evitar confusión con `session && !is_anonymous` como único criterio).
- Tras `updateUser({ password })`, redirigir a login; no es necesario `refetchProfile` porque el perfil no cambia con el password.

### 2.5 Perfil (`profiles`)

- Un solo registro por usuario (`id` = `auth.uid()`).
- Lectura/actualización del propio perfil vía RLS (`auth.uid() = id`).
- Admins: políticas adicionales RLS (o funciones SECURITY DEFINER) para ver/actualizar otros perfiles si aplica.
- Cargar perfil después de tener sesión; manejar “profile not found” (PGRST116) sin tratar como error fatal (p. ej. perfil aún no creado por el trigger).

### 2.6 Roles y admin

- Mantener tabla `admin_users` (id = user id, role, is_active) y funciones `is_admin(uuid)`, `get_admin_role(uuid)` con **SECURITY DEFINER** para no depender de RLS en la comprobación.
- Tipar las RPCs: en este proyecto usar `@/types/supabase-rpc` (IsAdminParams, IsAdminResult, GetAdminRoleParams, GetAdminRoleResult) para evitar `any`.
- En el cliente, llamar a estas RPCs una vez por usuario (p. ej. en AuthContext) y cachear `isAdmin` / `isSuperAdmin` / `adminRole`. Considerar super_admin = rol `super_admin`, `root` o `dev` según negocio.
- En API routes, después de `getUser()`, validar rol con la misma lógica (RPC o tabla) según necesidad; no confiar solo en claims del JWT si los roles están en DB. **Todas** las rutas bajo `/api/admin/*` deben: (1) 401 si no hay user, (2) 403 si el user no es admin. Opcional: helper `requireAdminUser(supabase)` que devuelva user o responda 401/403.

---

## 3. Seguridad y RLS

- **RLS activado** en todas las tablas que almacenan datos por usuario u organización.
- Políticas explícitas: SELECT/INSERT/UPDATE/DELETE por `auth.uid()` o por rol cuando corresponda.
- Triggers que escriben en tablas propias del usuario (p. ej. `profiles`) deben usar **SECURITY DEFINER** y solo escribir datos derivados de `NEW` (auth.users) o datos ya validados.
- No exponer `SUPABASE_SERVICE_ROLE_KEY` al cliente ni en variables `NEXT_PUBLIC_*`.
- En producción, considerar confirmación de email y políticas de contraseña (longitud, complejidad) según requisitos.

---

## 4. Middleware (Next.js)

- Crear **una** instancia de `createServerClient` por request con cookies de `request` y `response`.
- Llamar al método que **refresca la sesión** (p. ej. `getSession()` según documentación de Supabase SSR) para que las cookies se actualicen.
- Para rutas protegidas (p. ej. `/admin/*`): si `getUser()` indica que no hay usuario, redirigir a `/login` (o a una URL de retorno guardada).
- Excluir rutas estáticas, API y auth (`/login`, `/signup`, `/reset-password`, `/_next`, etc.) del chequeo de auth en el middleware.
- Matcher del middleware debe incluir todas las rutas que necesiten refresco de cookies, salvo assets estáticos.

---

## 5. API Routes

- Obtener usuario con `getUser()` (validación server-side del JWT), no solo `getSession()`.
- **Cookies vs Bearer**: si la ruta debe aceptar tanto peticiones del navegador (cookies) como con `Authorization: Bearer <token>` (tests, apps móviles), usar **createClientFromRequest(request)** de `@/utils/supabase/server`. Ese helper devuelve `{ client, getUser }`: usar siempre el `getUser` devuelto para la autorización, para que RLS y sesión sean correctos con ambos métodos.
- Respuesta 401 cuando no hay usuario; 403 cuando el usuario no tiene permiso para la acción.
- Para operaciones que requieren servicio backend (bypass RLS), usar `createServiceRoleClient()` solo en el servidor y nunca exponer la key.

---

## 6. Estado en el cliente (React)

- **Un solo AuthProvider** en la raíz (p. ej. en `layout.tsx`) que envuelva la app.
- Hook central (p. ej. `useAuth`) que: lea sesión inicial con `getSession()`, suscriba `onAuthStateChange`, exponga user, profile, session, loading, error y métodos (signIn, signOut, signUp, updateProfile, resetPassword).
- **Eventos de onAuthStateChange** a manejar: `SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED`, `PASSWORD_RECOVERY`. Si en algún caso la sesión inicial no se aplica bien al montar, considerar también **INITIAL_SESSION** (Supabase puede emitirlo al iniciar) y actualizar estado de la misma forma que en SIGNED_IN cuando hay session/user.
- Evitar múltiples suscripciones a `onAuthStateChange`; un solo listener en el hook que actualiza el estado global.
- Timeouts de seguridad para `getSession()` y carga de perfil (p. ej. 10s y 15s) para no dejar `loading` indefinido; en timeout, marcar loading false y manejar “sin sesión” o “sin perfil”.
- `refetchProfile`: si se expone, tipar como `() => Promise<Profile | null> | null` (null cuando no hay user) para que el llamador sepa que puede ser una promesa o nada.
- `AuthContext` puede extender el estado con `isAdmin`, `isSuperAdmin`, `adminRole` obtenidos vía RPC tras tener `user.id`. Tipar retornos de signUp/signIn/signOut (p. ej. `AuthError | null`, `Session | null`) en lugar de `any`.

---

## 7. Escalabilidad y mantenibilidad

- Tipar `Profile` y estado de auth con tipos generados (p. ej. `Tables<'profiles'>`) y tipos de Supabase.
- Centralizar creación de clientes en `utils/supabase/client.ts` y `server.ts`; no instanciar Supabase disperso.
- Mensajes de error de auth traducidos o mapeados para la UI; no exponer detalles internos al usuario.
- Logs de errores de auth en servidor (sin datos sensibles) para diagnóstico.
- Tests E2E o de integración para flujos críticos: sign up, sign in, sign out, reset password, acceso a rutas protegidas y a API con/sin cookie y con Bearer.

---

## 8. Referencia rápida (este proyecto)

- **Cliente browser**: `@/utils/supabase/client` → `createClient()`.
- **Servidor (cookies)**: `@/utils/supabase/server` → `createClient()`.
- **Servidor (request con Bearer opcional)**: `createClientFromRequest(request)` → usar el `getUser` devuelto para auth; rutas que aceptan Bearer (tests, móvil) deben usar este helper.
- **Service role**: `createServiceRoleClient()` desde server.
- **Auth state**: `useAuth()` + `AuthContext` (`useAuthContext()`, `useRequireAuth()`, `useProfile()`).
- **Middleware**: `src/middleware.ts` refresca sesión (`getSession()`) y protege `/admin` con `getUser()`.
- **Perfil**: trigger `handle_new_user` en `auth.users` → INSERT/UPDATE `profiles` (SECURITY DEFINER); metadata `first_name`, `last_name`, `phone` desde `raw_user_meta_data`.
- **Admin**: RPCs `is_admin(user_id)`, `get_admin_role(user_id)`; tipos en `@/types/supabase-rpc`. Estado en contexto: `isAdmin`, `isSuperAdmin`, `adminRole`.
- **Root/dev**: usuarios con rol `root` o `dev` (organization_id null) deben ir directo a `/admin/saas-management/dashboard` sin pasar por onboarding/choice. La página `/onboarding/choice` comprueba `isRootUser` de check-status y redirige antes de mostrar las tarjetas demo/crear.

Seguir estas guías mantiene el auth consistente, seguro y alineado con Supabase y Next.js.
