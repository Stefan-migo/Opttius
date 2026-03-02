# Flujo de Perfil de Usuario – Vista del Usuario

## 1. Contexto en la vida real (Chile)

En una óptica, cada empleado (admin, vendedor, optometrista) tiene una cuenta en Opttius. El perfil de usuario permite que cada persona gestione su propia información personal, preferencias y seguridad de acceso, sin depender del administrador.

**Situaciones típicas:**

- **Nuevo empleado**: Se registra en Opttius y completa su perfil con nombre, teléfono y foto para que el equipo lo reconozca en el sistema.
- **Cambio de sucursal**: Un vendedor que trabaja en varias sucursales define su sucursal preferida para que el sistema abra por defecto en esa sucursal.
- **Actualización de datos**: Cambia su teléfono o dirección para recibir recordatorios de citas y notificaciones correctamente.
- **Seguridad**: Cambia su contraseña periódicamente o tras sospecha de acceso no autorizado.
- **Owner de la óptica**: Gestiona su suscripción (plan, facturación) desde la misma pantalla de perfil.

**Problemas que resuelve el módulo:**

- Centralizar la información personal del usuario autenticado en un solo lugar.
- Permitir que cada usuario actualice sus datos sin intervención del admin.
- Ajustar preferencias regionales (zona horaria, idioma) para citas, notificaciones y reportes.
- Gestionar la seguridad de la cuenta (cambio de contraseña con verificación).
- Exponer la gestión de suscripción para el owner de la organización.

---

## 2. Flujo desde el punto de vista del usuario

### Paso 1: Acceder al perfil

**Desde el panel admin:**

1. En el menú lateral o cabecera, clic en el **avatar** o **nombre del usuario** (esquina superior derecha).
2. Se abre el menú desplegable con opción **Mi Perfil**.
3. Clic en **Mi Perfil** → se navega a `/admin/profile`.

**Desde ruta pública (usuario sin organización o pre-onboarding):**

1. Ir directamente a `/profile` (o desde un enlace en el header público).
2. Si no hay sesión, el sistema redirige a **Login**.
3. Tras iniciar sesión, se muestra el perfil con layout público.

**Qué ve el usuario:** Cabecera con avatar, nombre completo, badge de rol (en admin), badge "Desde [mes]" y pestañas: Resumen, Personal, Dirección, Suscripción (solo owners), Ajustes.

---

### Paso 2: Actualizar información personal (tab Personal)

1. Ir a la pestaña **Personal**.
2. Clic en **Editar** (icono lápiz).
3. Completar o modificar:
   - **Nombre** (obligatorio, mínimo 2 caracteres)
   - **Apellido** (obligatorio, mínimo 2 caracteres)
   - **Teléfono** (opcional, ej. +56 9 1234 5678)
   - **Fecha de nacimiento** (opcional)
   - **Bio** (opcional, máximo 500 caracteres; ej. "Optometrista, sucursal Centro")
4. Clic en **Guardar**.
5. Toast de éxito: "Información personal actualizada exitosamente".
6. Los datos se actualizan de inmediato (optimistic UI) y persisten tras recargar.

**Qué ve el usuario:** Formulario con campos editables. Si hay errores de validación (nombre muy corto, bio > 500 caracteres), se muestran mensajes en rojo bajo el campo.

---

### Paso 3: Actualizar dirección (tab Dirección)

1. Ir a la pestaña **Dirección**.
2. Clic en **Editar**.
3. Completar o modificar:
   - **Línea 1** (calle y número)
   - **Línea 2** (depto, oficina, etc.)
   - **Ciudad**, **Provincia/Región**, **Código postal**
   - **País** (por defecto: Chile)
4. Clic en **Guardar**.
5. Toast de éxito: "Dirección actualizada exitosamente".

**Qué ve el usuario:** Formulario de dirección. País por defecto "Chile" para ópticas chilenas.

---

### Paso 4: Subir o cambiar avatar

1. En la cabecera del perfil (card de resumen), sobre el área del avatar.
2. Arrastrar una imagen (jpeg, png, gif, webp, máx. 5MB) o clic para seleccionar archivo.
3. Se muestra barra de progreso durante la subida.
4. Al completar, el avatar se actualiza y se guarda en el perfil.
5. Toast de éxito: "Foto de perfil actualizada exitosamente".

**Qué ve el usuario:** Área de drag & drop con preview. Si la imagen es muy grande o formato no permitido, se muestra error.

---

### Paso 5: Cambiar contraseña (tab Ajustes → Seguridad)

1. Ir a la pestaña **Ajustes**.
2. En la card **Seguridad de la Cuenta**, clic en **Cambiar Contraseña**.
3. Completar:
   - **Contraseña actual** (obligatoria; el sistema la verifica antes de permitir el cambio)
   - **Nueva contraseña** (mín. 6 caracteres, debe incluir mayúscula, minúscula y número)
   - **Confirmar nueva contraseña** (debe coincidir)
4. Clic en **Actualizar Ahora**.
5. Si la contraseña actual es incorrecta → toast: "Contraseña actual incorrecta. Verifica e intenta de nuevo."
6. Si es correcta → toast: "Contraseña cambiada exitosamente".
7. Cerrar sesión y volver a entrar con la nueva contraseña para verificar.

**Qué ve el usuario:** Formulario con campos de contraseña. Iconos de ojo para mostrar/ocultar contraseña. Botones Cancelar y Actualizar Ahora.

---

### Paso 6: Ajustar preferencias (tab Ajustes → Personalización)

1. Ir a la pestaña **Ajustes**.
2. En la card **Personalización**, configurar:
   - **Zona Horaria Regional**: Santiago Chile (GMT-3), Buenos Aires, Lima, Bogotá, CDMX, etc.
   - **Idioma**: Español o English
   - **Sucursal Preferida**: Solo visible si el usuario tiene acceso a más de una sucursal. Opciones: Sin preferencia o sucursal específica (ej. "Centro (CEN)").
   - **Recibir novedades y ofertas por email**: Switch para suscripción a newsletter
3. Clic en **Guardar Preferencias**.
4. Toast de éxito: "Preferencias actualizadas exitosamente".

**Qué ve el usuario:** Selectores y switch. La sucursal preferida determina la sucursal por defecto al abrir el sistema.

---

### Paso 7: Gestionar suscripción (tab Suscripción, solo owners)

1. Si el usuario es **owner** de la organización, verá la pestaña **Suscripción**.
2. En la card **Mi Organización** (variante pública) o en la tab Suscripción, ver:
   - Plan actual (Basic, Pro, etc.)
   - Estado de cuenta (Activa)
   - Botón **Ajustes** para ir a configuración de suscripción
3. El componente `SubscriptionManagementSection` permite:
   - Ver plan actual y límites
   - Cambiar de plan (upgrade/downgrade)
   - Gestionar método de pago
   - Ver historial de facturación

**Qué ve el usuario:** Card con plan, estado y enlaces a gestión de suscripción. Solo visible para owners.

---

### Paso 8: Onboarding (variante pública, si aplica)

1. Si el usuario está en `/profile` y es admin pero **no tiene organización configurada**, verá una card de alerta:
   - **Configura tu Óptica Profesional**
   - "Desbloquea todas las herramientas especializadas configurando tu organización real. Toma menos de 2 minutos."
   - Botón **Comenzar Ahora** → redirige a `/onboarding/choice`
2. Si ya tiene organización, verá la card **Mi Organización** con estado y plan.

**Qué ve el usuario:** Alerta prominente solo en ruta pública cuando falta onboarding. En `/admin/profile` no se muestra.

---

## 3. Diagrama simplificado

```
[Usuario] Inicia sesión → [Sistema] Carga perfil desde profiles
                                    ↓
[Usuario] Clic avatar/nombre → [Usuario] Navega a /admin/profile
                                    ↓
[Usuario] Edita datos personales → [Usuario] Guardar
                                    ↓
[Sistema] updateProfile() → Supabase profiles.update()
                                    ↓
[Sistema] Optimistic UI + toast éxito
                                    ↓
[Usuario] Cambia contraseña → [Usuario] Ingresa actual + nueva
                                    ↓
[Sistema] signInWithPassword (verifica actual) → updateUser (nueva)
                                    ↓
[Sistema] Toast éxito
                                    ↓
[Usuario] Sube avatar → [Sistema] /api/upload → Storage → avatar_url en profiles
                                    ↓
[Usuario] Ajusta preferencias (timezone, idioma, sucursal) → [Sistema] updateProfile()
```

---

## 4. Tabla de actores

| Actor                   | Rol                                                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Usuario autenticado** | Cualquier empleado (admin, vendedor, optometrista) que gestiona su propio perfil: datos personales, dirección, avatar, contraseña, preferencias. |
| **Owner**               | Usuario dueño de la organización; además gestiona suscripción (plan, facturación) desde la tab Suscripción.                                      |
| **Sistema**             | Carga perfil desde `profiles`, actualiza vía AuthContext/updateProfile, sube avatar a Storage, verifica contraseña actual antes de cambiar.      |

---

## 5. Integraciones

| Módulo                     | Integración                                                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Auth**                   | Perfil vinculado a `auth.users`; `profiles.id` = `auth.users.id`. AuthContext expone `profile`, `updateProfile`, `refetchProfile`.   |
| **Admin Users**            | Los datos de `profiles` (nombre, apellido, teléfono, avatar) se muestran en listados de administradores y en el menú del AdminShell. |
| **Sucursales**             | `preferred_branch_id` determina la sucursal por defecto al abrir el sistema para usuarios con múltiples sucursales.                  |
| **Suscripción**            | Tab Suscripción usa `SubscriptionManagementSection` y `/api/checkout/current-subscription` para owners.                              |
| **Onboarding**             | En `/profile`, si `needsOnboarding`, se muestra alerta para configurar organización; redirige a `/onboarding/choice`.                |
| **Citas / Notificaciones** | Timezone y teléfono del perfil se usan para recordatorios y horarios.                                                                |

---

## 6. Rutas de referencia

| Acción                                   | Ruta                                                    |
| ---------------------------------------- | ------------------------------------------------------- |
| Perfil público (usuario general)         | `/profile`                                              |
| Perfil administrativo (dentro del panel) | `/admin/profile`                                        |
| Onboarding (si falta organización)       | `/onboarding/choice`                                    |
| Ajustes de suscripción (owners)          | `/admin/settings` (según SubscriptionManagementSection) |

---

## 7. Notas de implementación

- **Dos rutas, mismo contenido**: `/profile` y `/admin/profile` comparten `ProfilePageContent` con `variant: "public"` o `"admin"`. Solo cambia el layout (UserHeader vs AdminLayout) y el badge de rol.
- **Protección**: `/admin/profile` protegido por middleware (redirect a login si no hay sesión). `/profile` usa redirect client-side si `!user`.
- **Validación**: Zod para personalInfo, address, passwordChange. Mensajes en español.
- **Re-auth en contraseña**: Se usa `signInWithPassword` antes de `updateUser` para verificar la contraseña actual.
- **Avatar**: Drag & drop, tipos jpeg/png/gif/webp, máx. 5MB. Subida vía `/api/upload` → Storage → `avatar_url` en profiles.
- **Optimistic UI**: `updateProfile` actualiza el estado local antes de la respuesta; si falla, revierte y muestra toast de error.
- **RLS**: `profiles` solo editable por `auth.uid()` (cada usuario su propia fila).
