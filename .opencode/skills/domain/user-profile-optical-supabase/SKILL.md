---
name: user-profile-optical-supabase
description: Expert guide for building and maintaining the User Profile system for optical shops with Supabase. Use when working on perfil de usuario, profile, /profile, /admin/profile, datos personales, avatar, preferencias, cambio de contraseña, or optical user account management. Covers profiles table, AuthContext, multi-route profile pages, and optical-specific profile fields.
---

# User Profile (Óptica) — Guía para perfil de usuario

Esta skill entrega indicaciones para un sistema de User Profile que sea **funcional, escalable y de alta calidad** en Next.js + Supabase, pensado para ópticas.

## Cuándo usar esta skill

- Implementar o modificar `/profile` o `/admin/profile`
- Gestionar datos personales, dirección, avatar, preferencias
- Cambio de contraseña y seguridad de cuenta
- Integrar perfil con suscripción u organización
- Revisar RLS y políticas para `profiles`
- Añadir campos óptico-específicos al perfil

---

## 1. Arquitectura de rutas

| Ruta             | Layout      | Uso                                                 |
| ---------------- | ----------- | --------------------------------------------------- |
| `/profile`       | UserHeader  | Usuario general; redirect a login si no autenticado |
| `/admin/profile` | AdminLayout | Usuario dentro del panel admin; badge de rol        |

**Regla:** Ambas rutas deben compartir el mismo contenido de perfil. Extraer `ProfilePageContent` en un componente único y variar solo header/título según contexto.

---

## 2. Modelo de datos (profiles)

### Campos usados en UI actual

- `first_name`, `last_name`, `phone`, `date_of_birth`, `bio`
- `avatar_url`
- `address_line_1`, `address_line_2`, `city`, `state`, `postal_code`, `country`
- `timezone`
- `created_at` (para "Desde X")

### Campos en DB no usados (oportunidad)

- `preferred_branch_id` — Sucursal preferida (multi-sucursal)
- `language` — Idioma de la interfaz
- `newsletter_subscribed` — Suscripción a newsletter

### Campos médicos/CRM

Los campos `rut`, `gender`, `emergency_contact_*`, `insurance_*`, `medical_*` en `profiles` pueden estar pensados para clientes. No exponer en User Profile del empleado/admin sin documentar el uso. Mantener separación conceptual: **profiles** = usuario autenticado; **customers** = clientes de la óptica.

---

## 3. Flujo de datos

```
auth.users → useAuth → fetchProfile(userId) → profiles
                    ↓
              updateProfile(updates) → supabase.from('profiles').update()
```

- **Avatar:** `AvatarUpload` → `useFileUpload` → `/api/upload` → Storage → `avatar_url` en profiles
- **Contraseña:** `supabase.auth.updateUser({ password })` — no valida contraseña actual; considerar re-auth

---

## 4. Validación (Zod)

### personalInfoSchema

- `firstName`, `lastName`: min 2 caracteres
- `phone`, `dateOfBirth`: opcionales
- `bio`: max 500 caracteres

### addressSchema

- Todos opcionales excepto `country` (refine)
- Default `country: "Chile"`

### passwordSchema

- `currentPassword`: requerida (validación cliente; Supabase no la usa)
- `newPassword`: min 6, regex mayúscula, minúscula, número
- `confirmPassword`: debe coincidir con newPassword

---

## 5. Buenas prácticas

### 5.1 Código limpio

- Extraer schemas a `src/lib/api/validation/profile-schemas.ts`
- Un solo componente de contenido; props para variantes (admin vs público)
- Hooks: `useProfileForm`, `useProfileData` para separar lógica de UI

### 5.2 UX

- Estados de carga explícitos (Loader2, skeleton)
- Toast en éxito/error
- Edición inline o por tabs; botón "Editar" / "Cancelar" claro
- Toggle de visibilidad en campos de contraseña

### 5.3 Seguridad

- RLS: `profiles` solo `UPDATE` donde `id = auth.uid()`
- Avatar bucket: path `avatars/{user_id}/*`, política restrictiva
- Cambio de contraseña: documentar que Supabase no valida contraseña actual; considerar re-auth

### 5.4 Óptica-específico

- Timezone: incluir zonas Latinoamérica (America/Santiago, America/Lima, etc.)
- País por defecto: Chile
- Sucursal preferida: si el usuario tiene acceso a múltiples sucursales, exponer `preferred_branch_id`
- Bio: placeholder "tu rol en la óptica" para contexto

---

## 6. APIs utilizadas

| Endpoint                             | Uso                               |
| ------------------------------------ | --------------------------------- |
| `/api/admin/check-status`            | Admin, organización, rol, isOwner |
| `/api/checkout/current-subscription` | Plan actual                       |
| `/api/upload`                        | Avatar (FormData)                 |

No hay API route dedicado para `profiles`; actualizaciones directas con Supabase. Considerar `/api/profile` PATCH para validación server-side y auditoría.

---

## 7. Componentes clave

- `AvatarUpload` — Drag & drop, progreso, tipos: jpeg, png, gif, webp, max 5MB
- `SubscriptionManagementSection` — Solo para `isOwner`
- `useAuthContext` — `user`, `profile`, `updateProfile`, `refetchProfile`

---

## 8. Mejoras recomendadas (ver docs)

Ver `docs/USER_PROFILE_SYSTEM.md` para:

- Unificación de páginas profile/admin/profile
- Re-autenticación en cambio de contraseña
- API route `/api/profile`
- Selector de sucursal preferida, idioma, newsletter
- Manejo de errores y optimistic updates

---

## 9. Referencias

- Documentación: `docs/USER_PROFILE_SYSTEM.md`
- Auth: `src/hooks/useAuth.ts`, `src/contexts/AuthContext.tsx`
- Páginas: `src/app/profile/page.tsx`, `src/app/admin/profile/page.tsx`
- Avatar: `src/components/ui/AvatarUpload.tsx`, `src/hooks/useFileUpload.ts`
- Tipos: `src/types/supabase.ts` (profiles)
