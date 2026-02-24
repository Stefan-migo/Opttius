# Mejoras Appointments, Quotes, Auth y Onboarding — Febrero 2026

Documentación consolidada de las modificaciones implementadas y estado actual. Fuente única de verdad para este ciclo de mejoras.

---

## Resumen ejecutivo

Se implementaron correcciones en cuatro bloques: **Appointments** (citas), **Quotes** (presupuestos), **Auth** (autenticación) y **Onboarding**. Todas las mejoras están en producción (commit `7c60acf`).

---

## 1. Appointments (Citas y Agenda)

### Modificaciones realizadas

| Cambio              | Archivo                                            | Descripción                                                                                                                                                  |
| ------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Filtro por sucursal | `CreateAppointmentForm/hooks/useCustomerSearch.ts` | El buscador de clientes ahora envía el header `x-branch-id` con `getBranchHeader(currentBranchId)`. Un usuario de sucursal 1 solo ve clientes de sucursal 1. |
| Inyección de branch | `CreateAppointmentForm/index.tsx`                  | Usa `useBranch()` y pasa `currentBranchId` al hook de búsqueda.                                                                                              |
| Parsing API         | `useCustomerSearch.ts`                             | Corregido: la API devuelve `{ success: true, data: [...] }`. Se usa `data.data ?? data.customers ?? []`.                                                     |
| Documentación       | `api/admin/appointments/[id]/route.ts`             | Comentario explícito: la auto-registro de guest solo corre cuando `!customer_id`. Si la cita tiene cliente registrado, nunca se duplica.                     |

### Garantía de no duplicación

La lógica de auto-registro al completar una cita **solo se ejecuta** cuando:

- `status === "completed"`
- `!customer_id` (no hay cliente vinculado)
- `guest_first_name` (hay datos de invitado)

Si la cita tiene `customer_id` (cliente ya registrado), la condición falla y no se crea ni modifica ningún customer. **No hay duplicación.**

### Pendiente

Nada pendiente en este módulo para este ciclo.

---

## 2. Quotes (Presupuestos)

### Modificaciones realizadas

| Cambio                      | Archivo                                   | Descripción                                                                                                                                                            |
| --------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Parsing clientes            | `CreateQuoteForm/hooks/useQuoteSearch.ts` | `setResults(data.data ?? data.customers ?? [])` para compatibilidad con API estandarizada.                                                                             |
| Filtro marcos por sucursal  | `useQuoteSearch.ts` (useFrameSearch)      | Se envía header `x-branch-id` con `getBranchHeader(currentBranchId)`. Stock mostrado es de la sucursal seleccionada.                                                   |
| Filtro marcos por categoría | `useQuoteSearch.ts`                       | Cambio de `type=frames` a `type=frame` (singular). La API aplica filtro por `product_type === "frame"` o `category_id === marcosCategory.id`. Solo se muestran marcos. |
| Parsing productos           | `useQuoteSearch.ts`                       | `setResults(data.data ?? data.products ?? [])`.                                                                                                                        |

### Pendiente

Nada pendiente en este módulo para este ciclo.

---

## 3. Auth (Autenticación)

### Modificaciones realizadas

| Cambio                | Archivo                | Descripción                                                                                                                                                                |
| --------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Evitar loop en reload | `hooks/useAuth.ts`     | Si existe `initialUser` (del layout server), no se ejecuta `getSession()`. Se ignora `INITIAL_SESSION` en `onAuthStateChange` para evitar race. Una sola fuente de verdad. |
| Timeouts              | `useAuth.ts`           | Timeout general: 10s → 5s. Profile fetch: 15s → 5s.                                                                                                                        |
| Expiración de sesión  | `supabase/config.toml` | `jwt_expiry`: 86400 (24h) → 7200 (2h).                                                                                                                                     |

### Nota para Supabase Cloud

Si el proyecto usa Supabase Cloud (no self-hosted), configurar JWT expiry en: **Dashboard > Authentication > Settings > JWT expiry**.

### Pendiente

Nada pendiente en este módulo para este ciclo.

---

## 4. Onboarding — Reconocer super_admin sin reload

### Modificaciones realizadas

| Cambio             | Archivo                        | Descripción                                                                                                        |
| ------------------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| refetchAdminStatus | `contexts/AuthContext.tsx`     | Nueva función que vuelve a llamar a `checkAdminStatus` y actualiza `adminData` (isAdmin, isSuperAdmin, adminRole). |
| Demo               | `onboarding/choice/page.tsx`   | Tras `assign-demo` exitoso, se llama a `await refetchAdminStatus()` antes de `router.push("/admin")`.              |
| Óptica real        | `onboarding/complete/page.tsx` | En `handleGoToAdmin`, se llama a `await refetchAdminStatus()` antes de navegar al admin.                           |

### Flujo

1. Usuario se registra → signup.
2. Usuario hace login → redirect a `/onboarding/choice`.
3. Usuario elige Demo o Activar óptica.
4. `assign-demo` o `activate-real-org` actualiza `admin_users` con `role: "super_admin"`.
5. Se llama a `refetchAdminStatus()` para actualizar el contexto.
6. Navegación a `/admin` con `isSuperAdmin` ya correcto.

### Pendiente

Nada pendiente en este módulo para este ciclo.

---

## Archivos modificados (referencia)

```
src/app/api/admin/appointments/[id]/route.ts
src/app/onboarding/choice/page.tsx
src/app/onboarding/complete/page.tsx
src/components/admin/CreateAppointmentForm/__tests__/useCustomerSearch.test.ts
src/components/admin/CreateAppointmentForm/hooks/useCustomerSearch.ts
src/components/admin/CreateAppointmentForm/index.tsx
src/components/admin/CreateQuoteForm/hooks/useQuoteSearch.ts
src/contexts/AuthContext.tsx
src/hooks/useAuth.ts
supabase/config.toml
```

---

## Documentación relacionada (actualizar si aplica)

- `docs/APPOINTMENTS_SYSTEM.md` — Incluir que el buscador de clientes filtra por sucursal.
- `docs/QUOTES_SYSTEM.md` — Incluir que clientes y marcos filtran por sucursal; marcos solo categoría marcos.
- `docs/AUTH_SYSTEM.md` — Incluir refetchAdminStatus, jwt_expiry 2h, optimización reload.

---

## Pendientes generales (fuera de este ciclo)

- Revisar `CreateQuoteForm.tsx` (legacy): si usa `customerService.searchCustomers` sin branch, considerar migrar a `useQuoteSearch` o extender el servicio.
- Supabase Cloud: configurar JWT expiry en Dashboard si no se usa config local.
