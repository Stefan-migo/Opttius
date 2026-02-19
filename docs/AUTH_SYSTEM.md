# Sistema de autenticación — Opttius

Documentación detallada del sistema de auth con Supabase en Next.js (App Router). Esta documentación es la base de la estructura de documentación del programa; el resto de módulos se irán documentando sobre el mismo esquema.

---

## 1. Resumen ejecutivo

- **Stack**: Supabase Auth + Next.js 14+ (App Router), `@supabase/ssr` para cookies y sesión.
- **Flujos**: registro (sign up), inicio de sesión (sign in), cierre de sesión (sign out), recuperación de contraseña, perfil de usuario y roles de admin.
- **Clientes**: browser (`createBrowserClient`), middleware (`createServerClient` con cookies request/response), server para API y RSC (`createServerClient` con `cookies()`), opcional Bearer en API (`createClientFromRequest`), service role solo servidor (`createServiceRoleClient`).
- **Estado en UI**: un `AuthProvider` que usa el hook `useAuth` y expone `useAuthContext()` con user, profile, session, loading, error, isAdmin, isSuperAdmin, adminRole y métodos (signIn, signOut, signUp, updateProfile, resetPassword).

---

## 2. Arquitectura actual

### 2.1 Diagrama de flujo (alto nivel)

```
[Usuario] → Login/Signup/Reset → Supabase Auth (auth.users)
                    ↓
            JWT + refresh token
                    ↓
    Cookies (middleware refresca) ← → API Routes (getUser)
                    ↓
    AuthContext (user, profile, session, isAdmin…)
                    ↓
    Páginas y componentes (useAuthContext)
```

### 2.2 Archivos clave

| Archivo                           | Responsabilidad                                                                                                                                                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/utils/supabase/client.ts`    | Cliente browser (`createBrowserClient`) para Client Components.                                                                                                                                                          |
| `src/utils/supabase/server.ts`    | `createClient()` con cookies de Next.js; `createClientFromRequest(request)` para cookies o Bearer; `createServiceRoleClient()` para bypass RLS.                                                                          |
| `src/middleware.ts`               | Refresca sesión con `getUser()` (valida JWT con servidor, actualiza cookies vía `setAll`), redirige `/admin` → `/login` si no hay usuario.                                                                               |
| `src/hooks/useAuth.ts`            | Estado de auth: acepta `initialUser` del servidor, getSession inicial, onAuthStateChange (INITIAL_SESSION, SIGNED_IN, etc.), fetchProfile, signUp, signIn, signOut, updateProfile, resetPassword. Timeouts para loading. |
| `src/contexts/AuthContext.tsx`    | AuthProvider que combina useAuth (con `initialUser`) con estado de admin (is_admin, get_admin_role RPC). Expone useAuthContext, useRequireAuth, useProfile.                                                              |
| `src/app/login/page.tsx`          | Página de login (email/password, link a reset-password y signup).                                                                                                                                                        |
| `src/app/signup/page.tsx`         | Registro con nombre, apellido, email, teléfono, contraseña; maneja “email por confirmar”.                                                                                                                                |
| `src/app/reset-password/page.tsx` | Solicitud de enlace de recuperación y formulario de nueva contraseña (recovery).                                                                                                                                         |

### 2.3 Base de datos y triggers

- **auth.users**: tabla manejada por Supabase Auth (no se modifica desde la app).
- **public.profiles**: una fila por usuario; `id` PK y FK a `auth.users(id) ON DELETE CASCADE`. RLS: usuarios ven/actualizan solo su fila; admins tienen políticas adicionales (ver/actualizar/insertar/eliminar).
- **Trigger**: `AFTER INSERT ON auth.users` → función `public.handle_new_user()` (SECURITY DEFINER) que hace INSERT en `profiles` con `id`, `email`, `first_name`, `last_name`, `phone` desde `NEW.raw_user_meta_data`, con ON CONFLICT DO UPDATE. Así el perfil se crea/actualiza en el servidor sin depender de sesión en el cliente (importante con confirmación de email).
- **public.admin_users**: id = user id, organization_id, role, is_active, etc. Roles: root, dev, super_admin, admin, manager, etc.
- **RPCs**: `public.is_admin(user_id)`, `public.get_admin_role(user_id)` (SECURITY DEFINER) para comprobar rol sin RLS.

### 2.4 Protección de rutas

- **Middleware**: todas las rutas pasan por el matcher salvo `_next/static`, `_next/image`, `favicon.ico`. Rutas que empiezan por `/admin` requieren usuario; si no hay, redirect a `/login`. Rutas como `/login`, `/signup`, `/reset-password`, `/onboarding`, `/api` están excluidas del chequeo de “usuario requerido” pero sí pasan por el refresco de sesión.
- **Layouts**: el layout de `/admin` usa useAuthContext y lógica adicional (redirect si !user o no admin, retrasos para estabilizar auth) para evitar flashes y dobles redirects.

### 2.5 Flujo de redirect para root/dev

- Usuarios **root/dev** (creados con `scripts/create-root-user.js`) tienen `organization_id: null` en `admin_users`.
- Tras login, todos los usuarios van a `/onboarding/choice`. Esa página llama a `/api/admin/check-status`.
- Si `data.organization?.isRootUser === true`, redirigir a `/admin/saas-management/dashboard` (no mostrar las tarjetas demo/crear).
- Si `data.organization?.hasOrganization`, redirigir a `/admin`.
- Si no, mostrar opciones (demo o crear org).

### 2.6 Mensajes durante loading en admin layout

- Cuando el usuario no está autenticado o no es admin, el layout de `/admin` muestra mensajes de **redirección** (no “Acceso Denegado”):
  - Sin usuario: “Redirigiendo” / “Redirigiendo al portal de acceso”.
  - Usuario con credenciales correctas pero sin rol admin (va a onboarding): “Completando configuración” / “Redirigiendo a configuración inicial”.
- Evitar “Acceso Denegado” para usuarios en flujo de config; reservarlo para casos de denegación real.

### 2.7 API routes

- La mayoría usan `createClient()` de server y luego `const { data: { user }, error } = await supabase.auth.getUser()`. Si no hay user, responden 401.
- Rutas que deben aceptar **Bearer** (p. ej. tests, apps móviles): usar `createClientFromRequest(request)` de `@/utils/supabase/server`; devuelve `{ client, getUser }`. Usar siempre el `getUser` devuelto para la autorización (así RLS y sesión son correctos con cookies y con Bearer). En este proyecto lo usan, entre otras: `customers`, `customers/[id]`, `products`, `products/[id]`, `orders`, `onboarding/tour`, checkout y pagos.
- Donde hace falta bypass RLS se usa `createServiceRoleClient()`.

### 2.8 Persistencia de sesión en refresh / nueva pestaña (fix Feb 2026)

**Problema resuelto**: Al recargar (F5) o abrir un enlace en nueva pestaña, el cliente no tenía sesión en `document.cookie` de inmediato, lo que provocaba redirect erróneo a `/login` aunque el servidor sí tenía la sesión en las cookies de la request.

**Solución aplicada**:

1. **Layout raíz** (`src/app/layout.tsx`): Server Component que obtiene el usuario con `createClient()` y `getUser()` y pasa `initialUser` al `AuthProvider`.
2. **AuthProvider / useAuth**: Acepta `initialUser?: User | null`. Si hay `initialUser`, se usa como estado inicial y se marca `loading: false` tras cargar el perfil, evitando redirect prematuro.
3. **useAuth**: Manejo explícito de `INITIAL_SESSION` en `onAuthStateChange` para aplicar la sesión al montar (refresh/nueva pestaña).
4. **Admin layout**: Uso de `latestUserRef` para evitar closure obsoleta en el `setTimeout` de redirect; delay de ~800 ms para estabilizar auth antes de decidir redirect.
5. **Middleware**: Solo `getUser()` para refrescar (no `getSession()`); `setAll` actualiza `request.cookies` y `response.cookies` correctamente.

**Nota**: Al abrir una sección específica de `/admin` en nueva pestaña, la verificación completa de auth puede tardar; ocasionalmente el loading puede prolongarse. La sesión se mantiene; el redirect a `/admin` cuando funciona es correcto.

---

## 3. Flujos detallados

### 3.1 Registro (sign up)

1. Usuario envía email, password, firstName, lastName, phone en el formulario.
2. `signUp(email, password, { firstName, lastName, phone })` llama a `supabase.auth.signUp` con `options.data`: first_name, last_name, phone.
3. Supabase crea la fila en `auth.users` y dispara el trigger `handle_new_user`, que inserta/actualiza `profiles` con SECURITY DEFINER.
4. Si el proyecto tiene confirmación de email: `session` puede ser null y `user` presente; la UI muestra “revisa tu correo” y opcionalmente hace signOut. Si no hay confirmación, hay sesión y se redirige a onboarding/choice.

### 3.2 Inicio de sesión (sign in)

1. `signIn(email, password)` → `signInWithPassword`. El estado `loading` se mantiene hasta que `onAuthStateChange` emite SIGNED_IN y se actualiza user/profile/session.
2. Tras login exitoso la app redirige a `/onboarding/choice` (que a su vez puede redirigir a `/admin` si ya tiene organización).

### 3.3 Recuperación de contraseña

1. Usuario en `/reset-password` introduce email → `resetPasswordForEmail(email, { redirectTo: origin + '/reset-password' })`.
2. Supabase envía el correo con enlace que lleva a la misma página con hash `#type=recovery&...`.
3. La página detecta recovery por hash o por evento `PASSWORD_RECOVERY` en `onAuthStateChange` y muestra el formulario de nueva contraseña.
4. `supabase.auth.updateUser({ password })` actualiza la contraseña; luego redirección a login.

### 3.4 Perfil

- Carga: tras tener sesión, `useAuth` hace `fetchProfile(user.id)` (select por id). Si la fila no existe (PGRST116) o hay timeout, se considera “sin perfil” sin bloquear la app.
- Actualización: `updateProfile(updates)` hace update en `profiles` por `id = authState.user.id` y actualiza el estado local del contexto.

### 3.5 Admin

- Tras login, `AuthContext` llama a `checkAdminStatus(user.id)` que ejecuta `is_admin` y `get_admin_role`. El resultado se guarda en estado (isAdmin, isSuperAdmin, adminRole) y se expone en useAuthContext.
- Las API routes de admin comprueban usuario con `getUser()` y, cuando aplica, validan rol (directamente o vía lógica equivalente a is_admin/get_admin_role).

---

## 4. Seguridad

- RLS está habilitado en `profiles` y en tablas sensibles; políticas por `auth.uid()` y por rol admin según corresponda.
- Service role key solo en servidor, nunca en cliente ni en `NEXT_PUBLIC_*`.
- Middleware refresca la sesión para que las API routes reciban cookies actualizadas; las rutas protegidas usan `getUser()` para decidir redirect.
- Trigger de perfil usa SECURITY DEFINER y solo escribe datos derivados de `auth.users` (evita inyección desde cliente).

---

## 5. Integración con NotebookLM

Según `AGENTS.md`, el conocimiento del proyecto y las decisiones de arquitectura viven en el **notebook de NotebookLM** (Notebook ID: `e071bebc-ce79-4b32-a040-61a6a9c331a3`). Esta documentación es la base del auth; para robustecer la información y que forme parte de la fuente de verdad:

### 5.1 Añadir esta documentación como fuente

Tras `nlm login`:

```bash
# Opción recomendada: subir el archivo (el contenido se sube correctamente; en Windows el CLI puede fallar al imprimir por Unicode)
nlm source add e071bebc-ce79-4b32-a040-61a6a9c331a3 --file docs/AUTH_SYSTEM.md --title "Auth System Documentation"
```

En Windows, si el comando falla al final por codificación (UnicodeEncodeError), la fuente puede haberse añadido igual; comprobar con `nlm source list e071bebc-ce79-4b32-a040-61a6a9c331a3 --quiet`. Alternativa: añadir como fuente de tipo “text” pegando el contenido de `docs/AUTH_SYSTEM.md` en la interfaz web de NotebookLM.

### 5.2 Consultar para cruzar conocimiento

Para cruzar esta documentación con el resto del notebook (arquitectura, patrones, deudas):

```bash
nlm notebook query e071bebc-ce79-4b32-a040-61a6a9c331a3 "Resume el estado del proyecto Opttius: arquitectura, auth, decisiones y riesgos."
```

En terminales Windows con problemas de codificación, usar `--json` o redirigir la salida; o hacer la consulta desde la interfaz de NotebookLM.

### 5.3 Flujo para robustecer la información

1. Añadir `docs/AUTH_SYSTEM.md` y, si aplica, `.cursor/skills/supabase-auth/SKILL.md` como fuentes del notebook.
2. Hacer consultas al notebook cuando se cambie arquitectura de auth o se tomen decisiones (p. ej. “¿Cómo debemos verificar admin en API routes?”).
3. Actualizar esta documentación y el skill con las conclusiones, manteniendo el notebook como fuente de verdad (AGENTS.md).

---

## 6. Devolución: estado actual y mejoras recomendadas

Objetivo: lograr un auth system de la más alta calidad en código y funcionalidad, escalable y alineado con las mejores prácticas.

### 6.1 Lo que está bien resuelto

- **Separación de clientes**: browser vs server vs service role y `createClientFromRequest` para Bearer están bien ubicados y usados de forma coherente.
- **Trigger de perfil**: `handle_new_user` con SECURITY DEFINER y datos desde `raw_user_meta_data` evita el problema de RLS cuando la confirmación de email deja sin sesión al cliente. No se hace upsert de perfil desde el cliente en signup.
- **Middleware**: Refresco de sesión en cada request y protección de `/admin` con redirect a login. Exclusión clara de rutas públicas y API.
- **AuthContext único**: Un solo provider, hooks bien definidos (`useAuthContext`, `useRequireAuth`, `useProfile`) y estado de admin (isAdmin, isSuperAdmin, adminRole) derivado de RPCs.
- **Manejo de “email por confirmar”**: Signup detecta `!session && user` y muestra mensaje adecuado; signOut opcional para no dejar sesión a medias.
- **Recuperación de contraseña**: Flujo completo (solicitud + detección de recovery + updateUser) implementado en `/reset-password`.
- **API routes**: Uso consistente de `getUser()` para autorización y 401 cuando no hay usuario. Soporte Bearer en rutas que usan `createClientFromRequest`.
- **Timeouts en useAuth**: Evitan loading infinito en getSession y fetchProfile (10s y 15s).
- **Manejo de PGRST116**: Perfil no encontrado no se trata como error fatal; la app sigue sin perfil.
- **Persistencia en refresh/nueva pestaña** (Feb 2026): Layout raíz pasa `initialUser` desde servidor; useAuth usa `initialUser` y maneja `INITIAL_SESSION`; middleware solo `getUser()` con `setAll` correcto.

### 6.2 Mejoras recomendadas (priorizadas)

#### Alta prioridad

1. **Estandarizar verificación de admin en API**  
   Algunas rutas solo comprueban `getUser()`; otras deberían comprobar también que el usuario es admin (p. ej. vía RPC `is_admin` o lógica equivalente). Revisar todas las rutas bajo `/api/admin/*` y garantizar: (1) 401 si no hay user, (2) 403 si el user no tiene rol admin permitido para esa ruta. Opcional: helper `requireAdminUser(supabase)` que devuelva user o lance 401/403 para no repetir lógica.

2. **Eliminar o reducir console.log en producción**  
   En `useAuth.ts` hay `console.log("✅ Profile loaded successfully")` y otros logs. En producción conviene quitar logs de éxito o canalizarlos a un logger condicional (solo en dev o según variable de entorno).

#### Prioridad media

3. **Tipado de retorno de AuthContext**  
   En `AuthContextType`, métodos como `signUp` y `signIn` devuelven `Promise<{ data: any; error: any }>`. Sustituir `any` por tipos concretos (p. ej. `Session | null`, `User | null`, `AuthError | null`) para mejor DX y menos errores.

4. **Página reset-password: detección de recovery**  
   La condición actual mezcla `hash.includes("type=recovery")` con `session && !session.user.is_anonymous`. Aclarar la lógica: en flujo de recovery, confiar en el hash o en el evento `PASSWORD_RECOVERY` para mostrar el formulario de nueva contraseña y evitar mostrar el formulario de “solicitar enlace” cuando el usuario ya llegó por el enlace.

5. **Refetch de perfil tras updateUser**  
   Tras `updateUser({ password })` en reset-password, la sesión puede renovarse. Valorar si hace falta llamar a `refetchProfile` o si `onAuthStateChange` ya actualiza suficiente estado; si el perfil no cambia con el password, puede no ser necesario.

#### Prioridad baja / escalabilidad

6. **Rate limiting / seguridad en auth**  
   Para entornos de producción: considerar límites de intentos de login o recuperación de contraseña (en Supabase Dashboard o con Edge Functions / middleware) para mitigar abuso.

7. **Tests**  
   Añadir tests E2E o de integración para: login exitoso y fallido, signup con y sin confirmación, reset password (solicitud + actualización), acceso a `/admin` sin auth (redirect a login), y una API protegida con cookie y con Bearer.

8. **Documentar variante “createClientFromRequest”**  
   En `server.ts`, la firma de `createClientFromRequest` y el uso de `getUser` con token están bien; documentar en este doc o en un comentario en código que las rutas que deban aceptar Bearer deben usar `createClientFromRequest(request)` y el `getUser` devuelto para que RLS y auth sean correctos.

### 6.3 Resumen

El sistema está bien estructurado, con separación clara de clientes, trigger de perfil correcto, middleware que refresca sesión (solo `getUser()`) y protege `/admin`, persistencia de sesión en refresh/nueva pestaña vía `initialUser` e `INITIAL_SESSION`, y flujos completos de sign up, sign in, sign out y reset password. Para llevarlo a “más alta gama” y escalable, priorizar: (1) estandarizar y endurecer la verificación de admin en todas las API de admin, (2) limpiar logs en producción, (3) mejorar tipado del contexto de auth y (4) tests automatizados de los flujos críticos. El resto son refinamientos y documentación.

---

## 7. Referencia rápida e índice

- **Estado y mejoras**: apartado 6 (Devolución).
- **NotebookLM**: apartado 5 (Integración).
- **Skill de Cursor**: `.cursor/skills/supabase-auth/SKILL.md` — guía para implementar y revisar auth con Supabase en este proyecto.
- **Tipos**: `Tables<'profiles'>`, tipos de RPC en `@/types/supabase-rpc` (IsAdminParams, GetAdminRoleParams, etc.).
- **Variables de entorno**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (solo servidor).
