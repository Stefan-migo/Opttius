# Mejoras del Módulo User Profile — Febrero 2026

**Fecha:** 2026-02-20  
**Estado:** Implementación completada  
**Rutas afectadas:** `/profile`, `/admin/profile`

---

## 1. Resumen Ejecutivo

Se implementó el plan de mejoras del módulo User Profile, eliminando duplicación de código (~900 líneas por ruta), añadiendo seguridad (re-auth en cambio de contraseña), exponiendo campos DB no usados, y documentando consideraciones (RLS, middleware, rendimiento, seguridad).

---

## 2. Modificaciones Implementadas

### 2.1 Fase 1 — Prioridad Alta ✅

| Item                             | Descripción                                                               | Archivos                                                     |
| -------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **Schemas Zod**                  | Schemas extraídos y reutilizables                                         | `src/lib/api/validation/profile-schemas.ts`                  |
| **ProfilePageContent unificado** | Componente compartido con `variant: "public" \| "admin"`                  | `src/components/profile/ProfilePageContent.tsx`              |
| **Páginas reducidas**            | Layout + ProfilePageContent                                               | `src/app/profile/page.tsx`, `src/app/admin/profile/page.tsx` |
| **AvatarUpload tokens**          | Migración dorado/azul/verde → epoch-accent, epoch-primary, admin-success  | `src/components/ui/AvatarUpload.tsx`                         |
| **Re-auth contraseña**           | `signInWithPassword` antes de `updateUser` para validar contraseña actual | En ProfilePageContent                                        |

### 2.2 Fase 2 — Prioridad Media ✅

| Item                    | Descripción                                                              | Archivos                            |
| ----------------------- | ------------------------------------------------------------------------ | ----------------------------------- |
| **API /api/profile**    | PATCH con validación server-side                                         | `src/app/api/profile/route.ts`      |
| **Mapeo de errores**    | Códigos Supabase → mensajes en español                                   | `src/lib/profile/error-messages.ts` |
| **Campos DB expuestos** | preferred_branch_id, language, newsletter_subscribed en tab Preferencias | ProfilePageContent                  |
| **Tipografía**          | font-display (título), font-cormorant (subtítulos de cards)              | ProfilePageContent                  |

### 2.3 Fase 3 — Prioridad Baja ✅

| Item                | Descripción                                                                | Archivos                                                                                                                 |
| ------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Bordes**          | Decisión: mantener rounded-2xl (estética suave). Documentado.              | `docs/USER_PROFILE_SYSTEM.md`                                                                                            |
| **Optimistic UI**   | updateProfile actualiza estado local antes de respuesta; revierte si falla | `src/hooks/useAuth.ts`                                                                                                   |
| **Tests unitarios** | Schemas y error-messages                                                   | `src/__tests__/unit/lib/api/validation/profile-schemas.test.ts`, `src/__tests__/unit/lib/profile/error-messages.test.ts` |

### 2.4 Fase 4 — Documentación ✅

- Secciones 7.1–7.7 en `USER_PROFILE_SYSTEM.md`: RLS, Middleware, Rendimiento, Seguridad, Bordes, Optimistic UI, Tests.
- Referencias actualizadas (API, error-messages, schemas).

---

## 3. Pendientes (No implementados)

| Item                                 | Prioridad | Notas                                                                                                                                                         |
| ------------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Usar /api/profile desde frontend** | Media     | El frontend sigue usando Supabase directo vía AuthContext. La API existe pero no se invoca. Opción: AuthContext llamar a `/api/profile` en lugar de Supabase. |
| **Proteger /profile en middleware**  | Media     | Actualmente protección client-side (redirect si !user). Considerar añadir a rutas auth en middleware.                                                         |
| **i18n**                             | Baja      | Textos hardcodeados en español.                                                                                                                               |
| **Accesibilidad**                    | Baja      | Revisar aria-labels, focus management.                                                                                                                        |

---

## 4. Archivos Creados/Modificados

### Creados

- `src/components/profile/ProfilePageContent.tsx`
- `src/components/profile/index.ts`
- `src/lib/api/validation/profile-schemas.ts`
- `src/app/api/profile/route.ts`
- `src/lib/profile/error-messages.ts`
- `src/__tests__/unit/lib/api/validation/profile-schemas.test.ts`
- `src/__tests__/unit/lib/profile/error-messages.test.ts`

### Modificados

- `src/app/profile/page.tsx`
- `src/app/admin/profile/page.tsx`
- `src/components/ui/AvatarUpload.tsx`
- `src/hooks/useAuth.ts` (optimistic UI)
- `src/types/database.ts` (preferred_branch_id en profiles)
- `docs/USER_PROFILE_SYSTEM.md`

---

## 5. Checklist de Pruebas Manuales

### 5.1 Rutas y Acceso

- [ ] `/profile` carga correctamente con usuario autenticado
- [ ] `/profile` redirige a login si no hay sesión
- [ ] `/admin/profile` carga correctamente con usuario admin
- [ ] `/admin/profile` redirige a login si no hay sesión (middleware)

### 5.2 Información Personal (tab Personal)

- [ ] Editar nombre, apellido, teléfono, fecha nacimiento, bio
- [ ] Guardar muestra toast de éxito
- [ ] Datos persisten tras refresh
- [ ] Validación: nombre/apellido < 2 caracteres muestra error
- [ ] Validación: bio > 500 caracteres muestra error
- [ ] Optimistic UI: cambios visibles antes de confirmar (si aplica)

### 5.3 Dirección (tab Dirección)

- [ ] Editar dirección (líneas 1/2, ciudad, estado, código postal, país)
- [ ] Guardar muestra toast de éxito
- [ ] Datos persisten tras refresh
- [ ] País por defecto "Chile" cuando se omite

### 5.4 Seguridad (tab Seguridad)

- [ ] Cambiar contraseña con contraseña actual correcta → éxito
- [ ] Contraseña actual incorrecta → toast "Contraseña actual incorrecta"
- [ ] Nueva contraseña sin mayúscula/minúscula/número → error de validación
- [ ] Contraseñas no coinciden → error
- [ ] Tras cambio exitoso, cerrar sesión y entrar con nueva contraseña

### 5.5 Preferencias (tab Ajustes/Personalización)

- [ ] Cambiar zona horaria → guardar → persiste
- [ ] Cambiar idioma (es/en) → guardar → persiste
- [ ] Toggle newsletter → guardar → persiste
- [ ] Si usuario tiene múltiples sucursales: selector "Sucursal preferida" visible
- [ ] Si usuario tiene 1 o 0 sucursales: selector no visible
- [ ] Seleccionar sucursal preferida → guardar → persiste

### 5.6 Avatar

- [ ] Subir imagen (jpeg, png, gif, webp) → se muestra en avatar
- [ ] Drag & drop funciona
- [ ] Avatar persiste tras refresh
- [ ] AvatarUpload usa tokens Epoch (sin dorado/azul legacy)

### 5.7 Variantes (public vs admin)

- [ ] `/profile` (public): alerta de onboarding si `needsOnboarding`
- [ ] `/profile` (public): card "Mi Organización" si tiene organización
- [ ] `/admin/profile` (admin): badge de rol visible
- [ ] `/admin/profile` (admin): sin alerta de onboarding

### 5.8 Suscripción (si aplica)

- [ ] Tab Suscripción visible para owners
- [ ] SubscriptionManagementSection funciona

### 5.9 Tipografía y Diseño

- [ ] Título principal usa font-display (Cinzel)
- [ ] Títulos de cards usan font-cormorant
- [ ] Cards mantienen rounded-2xl (no rounded-none)

### 5.10 Optimistic UI y Errores

- [ ] Al guardar datos personales: UI actualiza de inmediato (optimistic)
- [ ] Si falla la petición: toast de error y datos revierten
- [ ] Errores de Supabase muestran mensajes amigables (si se usa getProfileErrorMessage)

---

## 6. Comandos de Verificación

```bash
# Tests unitarios
npm test -- --run src/__tests__/unit/lib/api/validation/profile-schemas.test.ts src/__tests__/unit/lib/profile/error-messages.test.ts
```
