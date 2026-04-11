# Flujo de Sistema (Configuración) – Vista del Usuario

## 1. Contexto en la vida real (Chile)

Una óptica necesita configurar su sistema de gestión para que funcione según sus necesidades: IVA 19%, datos de contacto, horarios de atención, umbrales de stock bajo, plantillas de email, boletas y facturas con RUT y razón social, opciones de formularios (género, tipo de lente, etc.), y herramientas de mantenimiento (backups, auditoría de seguridad).

**Ejemplos concretos:**

- **Óptica Visión Centro (Santiago)**: Configura IVA 19%, dirección Av. Providencia 1234, teléfono +56 2 2345 6789, umbral de stock bajo 5 unidades, horarios L-V 9:00–19:00.
- **Óptica Multi-sucursal**: Sucursal Providencia tiene facturación con RUT 76.123.456-7; Sucursal Las Condes tiene otro RUT por ser local independiente.
- **Admin antes de actualización**: Crea backup de la base de datos, ejecuta auditoría de seguridad, restaura un backup anterior tras un error.

**Problemas que resuelve el módulo:**

- Centralizar toda la configuración del sistema en un solo lugar.
- Diferenciar configuraciones por alcance: todas las sucursales vs sucursal actual.
- Configurar boletas y facturas con datos fiscales chilenos (RUT, razón social).
- Personalizar formularios (productos, clientes, citas, presupuestos, POS).
- Monitorear la salud del sistema y ejecutar mantenimiento (backups, auditoría, optimización).

---

## 2. Flujo desde el punto de vista del usuario

### Paso 1: Acceder al módulo Sistema (admin)

1. Ir a **Sistema** en el menú lateral (icono de servidor).
2. Ver la página **Administración del Sistema** con:
   - Cards de estado: Saludable / Advertencias / Críticos / Última verificación.
   - Botón **Actualizar Estado**.
   - Tabs: Resumen, Configuración, Email, Notificaciones, Boletas, Formularios, WhatsApp, Salud, Mantenimiento.

**Qué ve el usuario:** Dashboard con estado general y acceso rápido a cada sección.

---

### Paso 2: Configurar parámetros generales (admin)

1. Ir a la pestaña **Configuración**.
2. Si hay varias sucursales, elegir el **alcance**:
   - **Todas las sucursales**: aplica a toda la organización.
   - **Sucursal actual**: aplica solo a la sucursal seleccionada.
3. Filtrar por categoría (General, Contacto, E-commerce, Inventario, etc.).
4. Activar **Mostrar configuraciones sensibles** si se necesita editar claves API, contraseñas SMTP, etc.
5. Editar los valores deseados, por ejemplo:
   - **IVA (tax_rate)**: 19 (Chile).
   - **Dirección, teléfono, email de contacto**.
   - **Umbral de stock bajo** (low_stock_threshold).
   - **Horarios de atención** (business_hours).
6. Clic en **Guardar** en cada campo modificado (guardado individual).

**Qué ve el usuario:** Lista de configuraciones agrupadas por categoría. Card especial con **Información de la Óptica** (nombre, logo, slogan) que se edita desde la organización.

---

### Paso 3: Configurar Email y plantillas (admin)

1. Ir a la pestaña **Email**.
2. Ver y editar **plantillas de email** (confirmación de cita, presupuesto enviado, trabajo listo, etc.).
3. Configurar **EmailConfig** (SMTP, Resend, remitente) si aplica.

**Qué ve el usuario:** Gestor de plantillas y configuración de envío de correos.

---

### Paso 4: Configurar notificaciones (admin)

1. Ir a la pestaña **Notificaciones**.
2. Elegir alcance: **Todas las sucursales** o **Sucursal actual**.
3. Activar o desactivar tipos de notificación (quote_new, work_order_new, low_stock, etc.).
4. Ajustar prioridades si aplica.

**Qué ve el usuario:** Lista de tipos de notificación con toggles y prioridades.

---

### Paso 5: Configurar Boletas y Facturas (admin)

1. Ir a la pestaña **Boletas** (o **Boletas y Facturas**).
2. Ver sub-tabs: **POS**, **Facturación**, **Vista previa**.
3. En **POS**:
   - Porcentaje mínimo de depósito (min_deposit_percent).
   - Monto mínimo de depósito (opcional).
4. En **Facturación** (por sucursal):
   - **Razón social** (business_name).
   - **RUT** (formato automático 12.345.678-9).
   - **Dirección, teléfono, email**.
   - **Logo** (subir imagen).
   - **Encabezado y pie de página**.
   - **Tipo de documento por defecto**: Boleta o Factura.
   - **Impresora**: térmica, A4, letter, etc.
5. Guardar cambios.

**Qué ve el usuario:** Formulario con datos fiscales chilenos y configuración de impresión.

---

### Paso 6: Configurar opciones de formularios (admin)

1. Ir a la pestaña **Formularios**.
2. Seleccionar el tipo de formulario:
   - **Productos** (opciones de armazón, lente, accesorio).
   - **Clientes** (género, método de contacto).
   - **Citas** (tipo de cita).
   - **Presupuestos** (opciones de lentes, presbicia).
   - **Recetas** (tipo, material).
   - **POS** (opciones del punto de venta).
   - **Global** (parámetros compartidos).
3. Ver los campos de opciones (product_option_fields).
4. Agregar, editar o eliminar valores de cada campo (ej. género: Masculino, Femenino, Otro).
5. Ordenar valores con arrastrar y soltar si aplica.

**Qué ve el usuario:** Selector de formulario y lista de campos con sus valores editables.

---

### Paso 7: Revisar salud del sistema (admin)

1. Ir a la pestaña **Salud**.
2. Ver métricas detalladas (uso de memoria, conexiones, etc.).
3. Clic en **Actualizar** para refrescar.
4. Opción **Liberar memoria** si el sistema lo permite.

**Qué ve el usuario:** Panel con métricas técnicas y estado de salud.

---

### Paso 8: Mantenimiento y backups (admin)

1. Ir a la pestaña **Mantenimiento**.
2. **Herramientas de mantenimiento**:
   - **Backup Base de Datos**: Crear copia de seguridad.
   - **Limpiar Logs**: Eliminar logs antiguos.
   - **Optimizar DB**: Optimizar rendimiento.
   - **Verificar Seguridad**: Auditoría (admins inactivos, cantidad mínima de admins, políticas).
   - **Test Email**: Probar configuración de correo.
   - **Estado Sistema**: Reporte completo (usuarios, admins activos, productos, actividad 24h).
3. Tras ejecutar **Backup Base de Datos**:
   - Se muestra diálogo con ID, archivo, tablas, registros, tamaño, tiempo.
   - Botón **Descargar Backup Ahora** (URL con expiración).
4. **Backups disponibles**:
   - Lista de backups con fecha, tamaño, acciones.
   - **Ver detalles**: abre diálogo con información del backup.
   - **Restaurar**: confirma y restaura (crea backup de seguridad previo).
   - **Eliminar**: elimina el archivo de backup.

**Qué ve el usuario:** Botones de acciones y lista de backups con acciones por fila.

---

### Paso 9: Resultados de auditoría y estado (admin)

1. Tras **Verificar Seguridad**:
   - Diálogo con lista de problemas detectados (admins inactivos, etc.) o mensaje "No se encontraron problemas".
2. Tras **Estado Sistema**:
   - Diálogo con reporte: usuarios totales, admins activos, productos, órdenes, clientes, actividad 24h.
3. Tras **Restaurar backup**:
   - Diálogo de resultados: tablas restauradas, registros, backup de seguridad creado.

**Qué ve el usuario:** Diálogos modales con la información solicitada.

---

## 3. Diagrama simplificado

```
[Admin] Accede a Sistema → [Admin] Elige alcance (todas sucursales / sucursal)
        ↓
[Admin] Configura parámetros (IVA, contacto, stock, horarios)
        ↓
[Sistema] Guarda por clave en system_config (merge: branch > org > global)
        ↓
[Admin] Configura Email, Notificaciones, Boletas, Formularios
        ↓
[Admin] Revisa Salud → [Admin] Ejecuta Mantenimiento (backup, auditoría, estado)
        ↓
[Sistema] Crea backup / Muestra reporte / Restaura backup
        ↓
[Admin] Descarga backup o cierra diálogos
```

---

## 4. Tabla de actores

| Actor                 | Rol                                                                                                               |
| --------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Admin óptica**      | Configura parámetros, email, notificaciones, boletas, formularios; revisa salud; ejecuta mantenimiento y backups. |
| **Super admin**       | Puede configurar scope global (todas las organizaciones); acceso a sucursales de su organización.                 |
| **Root/Dev**          | Configuración global; no ejecuta mantenimiento sin organization_id (limitación actual).                           |
| **Vendedor/Employee** | Solo lectura según políticas RLS; no modifica configuración.                                                      |

---

## 5. Integraciones

| Módulo             | Integración                                                                                                                   |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| **POS**            | Lee `tax_rate`, `min_deposit_percent`; usa `branch_billing_settings` (RUT, razón social, logo) para boletas y facturas.       |
| **Inventario**     | Lee `low_stock_threshold`, `auto_low_stock_alerts` para alertas de stock bajo.                                                |
| **Citas**          | Lee `business_hours`, `enable_online_appointments` para disponibilidad.                                                       |
| **Email**          | Lee `resend_api_key`, SMTP; plantillas en EmailTemplatesManager.                                                              |
| **Formularios**    | `product_option_fields` y `product_option_values` definen opciones en productos, clientes, citas, presupuestos, recetas, POS. |
| **Organizaciones** | Nombre, logo, slogan en `organizations`; no en system_config.                                                                 |

---

## 6. Rutas de referencia

| Acción                       | Ruta admin                                          |
| ---------------------------- | --------------------------------------------------- |
| Página principal Sistema     | `/admin/system`                                     |
| Tab Resumen                  | `/admin/system?tab=overview`                        |
| Tab Configuración            | `/admin/system?tab=config`                          |
| Tab Email                    | `/admin/system?tab=email`                           |
| Tab Notificaciones           | `/admin/system?tab=notifications`                   |
| Tab Boletas y Facturas       | `/admin/system?tab=billing`                         |
| Tab Formularios              | `/admin/system?tab=formularios`                     |
| Tab WhatsApp                 | `/admin/system?tab=whatsapp`                        |
| Tab Salud                    | `/admin/system?tab=health`                          |
| Tab Mantenimiento            | `/admin/system?tab=maintenance`                     |
| Configuración POS (redirect) | `/admin/pos/settings` → `/admin/system?tab=billing` |

---

## 7. Notas de implementación

- **Alcance (scope):** Si la óptica tiene varias sucursales, el selector "Todas las sucursales" vs "Sucursal actual" determina si la config se guarda a nivel organización o sucursal. Regla de merge: Branch > Org > Global.
- **Guardado individual:** Cada configuración se guarda con su propio botón "Guardar"; no hay guardado masivo del formulario.
- **Configuraciones sensibles:** Por defecto ocultas; activar "Mostrar configuraciones sensibles" para ver/editar claves API, contraseñas.
- **Backups:** Se almacenan en Supabase Storage; la URL de descarga tiene tiempo limitado de validez.
- **Restauración:** Antes de restaurar un backup, el sistema crea un backup de seguridad automático.
- **Permisos:** Las acciones de mantenimiento requieren rol admin, super_admin, root o dev; todas scopeadas por organización.
