# Sistema de User Profile — Opttius

**Última actualización:** 2026-02-20  
**Módulos:** `/profile` (público) y `/admin/profile` (administrativo)

---

## 1. Resumen Ejecutivo

El sistema de User Profile de Opttius permite a los usuarios autenticados gestionar su información personal, preferencias, seguridad y suscripción. Existen dos rutas principales:

| Ruta             | Layout      | Contexto                                     | Diferencias                        |
| ---------------- | ----------- | -------------------------------------------- | ---------------------------------- |
| `/profile`       | UserHeader  | Usuario general, puede no tener organización | Onboarding alert, redirect a login |
| `/admin/profile` | AdminLayout | Usuario dentro del panel admin               | Badge de rol, sin onboarding       |

Ambas páginas comparten ~95% del código (información personal, dirección, contraseña, preferencias, suscripción).

---

## 2. Arquitectura Actual

### 2.1 Flujo de datos

```
auth.users (Supabase Auth)
       │
       ▼
profiles (tabla public.profiles)
       │
       ├── useAuth (hook) → AuthContext
       │
       └── updateProfile() → Supabase .update().eq('id', userId)
```

- **Origen del perfil:** `useAuth` en `useAuth.ts` hace `fetchProfile(userId)` desde `profiles`
- **Actualización:** `updateProfile(updates)` en `useAuth.ts` hace `supabase.from('profiles').update().eq('id', userId)`
- **Avatar:** `AvatarUpload` → `useFileUpload` → `/api/upload` → Supabase Storage → `avatar_url` en profiles

### 2.2 Esquema de `profiles` (Supabase actual)

| Campo                             | Tipo         | Uso en UI                                                |
| --------------------------------- | ------------ | -------------------------------------------------------- |
| id                                | uuid         | FK auth.users                                            |
| first_name, last_name             | string       | ✅ Personal                                              |
| email                             | string       | auth.users (no editable en profile)                      |
| phone                             | string       | ✅ Personal                                              |
| date_of_birth                     | date         | ✅ Personal                                              |
| avatar_url                        | string       | ✅ AvatarUpload                                          |
| bio                               | string       | ✅ Personal                                              |
| address_line_1, address_line_2    | string       | ✅ Dirección                                             |
| city, state, postal_code, country | string       | ✅ Dirección                                             |
| timezone                          | string       | ✅ Preferencias                                          |
| preferred_branch_id               | uuid         | ✅ Preferencias (selector, solo si múltiples sucursales) |
| language                          | string       | ✅ Preferencias (es, en)                                 |
| newsletter_subscribed             | bool         | ✅ Preferencias (switch)                                 |
| rut, gender                       | string       | ❌ No usado en profile                                   |
| emergency*contact*\*              | string       | ❌ No usado en profile                                   |
| insurance\_\*                     | string       | ❌ No usado en profile                                   |
| medical\_\*                       | jsonb/string | ❌ No usado en profile                                   |
| is_active_customer                | bool         | ❌ No usado en profile                                   |
| preferred_contact_method          | string       | ❌ No usado en profile                                   |

**Nota:** La tabla `profiles` en Supabase tiene campos adicionales (médicos, seguros, RUT) que no se exponen en el módulo de User Profile. Esos campos pueden estar pensados para clientes/CRM, no para el perfil del usuario autenticado.

### 2.3 APIs utilizadas

| Endpoint                             | Uso                            |
| ------------------------------------ | ------------------------------ |
| `/api/admin/check-status`            | Admin check, organización, rol |
| `/api/checkout/current-subscription` | Plan actual, suscripción       |
| `/api/upload`                        | Subida de avatar (FormData)    |

No existe un API route dedicado para `profiles`; las actualizaciones se hacen directamente desde el cliente con Supabase.

---

## 3. Componentes Clave

### 3.1 Páginas

- `src/app/profile/page.tsx` — Perfil público (con UserHeader)
- `src/app/admin/profile/page.tsx` — Perfil administrativo (con AdminLayout)

### 3.2 Componentes compartidos

- `AvatarUpload` — Subida de avatar con drag & drop
- `SubscriptionManagementSection` — Gestión de suscripción (solo owners)
- `useAuth` / `useAuthContext` — Estado de auth y perfil

### 3.3 Validación (Zod)

- `personalInfoSchema` — firstName, lastName, phone, dateOfBirth, bio
- `addressSchema` — addressLine1/2, city, state, postalCode, country
- `passwordChangeSchema` — currentPassword, newPassword, confirmPassword (regex mayúscula, minúscula, número)
- `profileUpdateSchema` — Campos para API PATCH (snake_case)

---

## 4. Análisis del Estado Actual

### 4.1 Fortalezas

1. **Validación robusta:** Zod con mensajes en español
2. **UX coherente:** Tabs, estados de edición, feedback con toast
3. **Seguridad:** Cambio de contraseña con validación, visibilidad toggle
4. **Responsive:** Grid adaptativo, diseño mobile-first
5. **Integración auth:** Perfil sincronizado con AuthContext
6. **Avatar:** Drag & drop, progreso, tipos permitidos
7. **Preferencias:** Timezone para Latinoamérica
8. **Suscripción:** Integración con SubscriptionManagementSection para owners

### 4.2 Debilidades y Oportunidades de Mejora

| Área                   | Problema                                                                                                                    | Recomendación                                                                            |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **Duplicación**        | `/profile` y `/admin/profile` son casi idénticos (~900 líneas cada uno)                                                     | Extraer `ProfilePageContent` compartido en un componente único                           |
| **Password change**    | `currentPassword` se valida en Zod pero **no se usa** en Supabase; `updateUser({ password })` no requiere contraseña actual | Considerar re-auth antes de cambio o documentar que Supabase no valida contraseña actual |
| **Campos no usados**   | `preferred_branch_id`, `language`, `newsletter_subscribed` existen en DB pero no en UI                                      | Añadir selector de sucursal preferida y preferencia de idioma si aplica                  |
| **API dedicada**       | No hay API route para profile; todo va directo a Supabase                                                                   | Crear `/api/profile` para validación server-side, auditoría, transformaciones            |
| **Tipos**              | `database.ts` y `supabase.ts` tienen esquemas distintos para profiles                                                       | Unificar tipos y usar el esquema real de Supabase                                        |
| **Error handling**     | Errores genéricos en catch                                                                                                  | Mapear códigos de error de Supabase a mensajes amigables                                 |
| **Optimistic updates** | No hay                                                                                                                      | Considerar optimistic UI para avatar y datos personales                                  |
| **Accesibilidad**      | Algunos labels podrían mejorar                                                                                              | Revisar aria-labels, focus management                                                    |
| **i18n**               | Textos hardcodeados en español                                                                                              | Preparar para i18n si se expande                                                         |
| **Tests**              | No hay tests unitarios para profile                                                                                         | Añadir tests para schemas y handlers                                                     |

### 4.3 Riesgos

1. **Cambio de contraseña:** Supabase `updateUser({ password })` no verifica la contraseña actual. Un atacante con sesión activa podría cambiarla sin conocer la actual. Mitigación: re-autenticación antes del cambio.
2. **RLS:** Las políticas de `profiles` deben permitir solo `UPDATE` donde `id = auth.uid()`.
3. **Avatar:** Verificar que el bucket `avatars` tenga políticas restrictivas (solo el usuario puede subir a su carpeta).

---

## 5. Mejoras Propuestas (Roadmap)

### Prioridad Alta

1. **Unificar páginas de perfil:** Un solo `ProfilePageContent` con props para variantes (admin vs público)
2. **Re-autenticación en cambio de contraseña:** Usar `reauthenticate` antes de `updateUser` si Supabase lo soporta, o al menos advertir al usuario
3. **API route `/api/profile`:** PATCH para actualizar perfil con validación server-side

### Prioridad Media

4. **Selector de sucursal preferida:** Usar `preferred_branch_id` para usuarios con múltiples sucursales
5. **Preferencia de idioma:** Exponer `language` en preferencias
6. **Newsletter:** Toggle para `newsletter_subscribed`
7. **Manejo de errores:** Mapeo de códigos Supabase a mensajes en español

### Prioridad Baja

8. **Optimistic updates:** Actualizar UI antes de confirmar en servidor
9. **Tests:** Unit tests para schemas y lógica de formularios
10. **i18n:** Estructura para traducciones

---

## 6. Mejores Prácticas para Ópticas

### 6.1 Datos relevantes para ópticas

- **Nombre completo:** Para facturación y comunicación
- **Teléfono:** Contacto para citas y recordatorios
- **Dirección:** Envío de lentes, facturación
- **Timezone:** Citas y notificaciones
- **Sucursal preferida:** Si la óptica tiene múltiples locales
- **Idioma:** Comunicación y reportes

### 6.2 Separación de conceptos

- **profiles:** Datos del usuario autenticado (empleado/admin/dueño)
- **customers:** Clientes de la óptica (CRM) — pueden tener campos médicos, seguros, etc.
- **admin_users:** Rol y permisos del usuario en la organización

No confundir `profiles` con datos de clientes. Los campos médicos en `profiles` pueden estar pensados para un perfil híbrido (usuario que también es cliente); en ese caso, documentar claramente el uso.

### 6.3 Seguridad

- RLS: `profiles` solo editable por `auth.uid()`
- Avatar: bucket con path `avatars/{user_id}/*`
- Contraseña: validación fuerte en cliente; re-auth (signInWithPassword) antes de updateUser

---

## 7. Consideraciones

### 7.1 Consideraciones de RLS

| Política                                          | Tabla    | Condición                                                                |
| ------------------------------------------------- | -------- | ------------------------------------------------------------------------ |
| Users can view own profile                        | profiles | `auth.uid() = id`                                                        |
| Users can update own profile                      | profiles | `auth.uid() = id`                                                        |
| Users can insert own profile                      | profiles | `auth.uid() = id`                                                        |
| Admins can view/update/insert/delete all profiles | profiles | `EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND is_active)` |

**Nota:** El perfil de usuario solo actualiza su propia fila vía AuthContext; las políticas de admin permiten edición en otros contextos (ej. admin-users).

### 7.2 Consideraciones de Middleware

- **`/admin/profile`:** Protegido por middleware — redirige a `/login` si no hay sesión.
- **`/profile`:** No protegido por middleware. La protección es client-side (redirect en useEffect si `!user`). Considerar añadir `/profile` a rutas que requieran auth en middleware para evitar flash de contenido no autenticado.

### 7.3 Consideraciones de Rendimiento

- **Índices:** `profiles` tiene PK en `id`; no se requieren índices adicionales para queries por usuario.
- **Avatar:** Subida vía `/api/upload`; limitar tamaño (5MB) y tipos permitidos (jpeg, png, gif, webp).

### 7.4 Consideraciones de Seguridad

- **Cambio de contraseña:** Re-autenticación vía `signInWithPassword` antes de `updateUser` para verificar contraseña actual.
- **Avatar bucket:** Verificar políticas de Storage (solo `auth.uid()` puede subir a `avatars/{user_id}/*`).

### 7.5 Bordes (rounded-none)

El módulo admin-users usa `admin-card` con `rounded-none` según el Design System. Para el módulo Profile se mantiene **rounded-2xl** en cards e inputs para una estética más suave y diferenciada del panel admin. Si en el futuro el Design System exige consistencia total, aplicar `rounded-none` en ProfilePageContent.

### 7.6 Optimistic UI

`updateProfile` en `useAuth.ts` aplica actualización optimista: actualiza el estado local inmediatamente antes de la respuesta del servidor. Si la petición falla, revierte al estado anterior y lanza el error (el handler muestra toast de error).

### 7.7 Tests

- `src/__tests__/unit/lib/api/validation/profile-schemas.test.ts` — personalInfoSchema, addressSchema, passwordChangeSchema, profileUpdateSchema
- `src/__tests__/unit/lib/profile/error-messages.test.ts` — getProfileErrorMessage

---

## 8. Referencias

- Skill: `.cursor/skills/user-profile-optical-supabase/SKILL.md`
- Componente compartido: `src/components/profile/ProfilePageContent.tsx`
- Schemas: `src/lib/api/validation/profile-schemas.ts`
- Auth: `src/hooks/useAuth.ts`, `src/contexts/AuthContext.tsx`
- Supabase profiles: `src/types/supabase.ts` (esquema actual)
- Avatar: `src/components/ui/AvatarUpload.tsx`, `src/hooks/useFileUpload.ts`
- API: `src/app/api/profile/route.ts` (PATCH)
- Errores: `src/lib/profile/error-messages.ts`
