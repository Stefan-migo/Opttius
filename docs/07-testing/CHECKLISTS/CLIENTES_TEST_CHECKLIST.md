# Checklist de Pruebas Manuales — Clientes (CRM)

**Fecha:** 2026-02-22  
**Módulo:** CRM (Gestión de clientes)

---

## 1. Listado y búsqueda

- [ ] **Página de clientes**: `/admin/customers` carga correctamente.
- [ ] **Listado**: Tabla o cards con clientes. Verificar que muestra datos correctos (nombre, email, RUT, teléfono).
- [ ] **Paginación**: Si hay >20 clientes, verificar paginación (cambiar página, items por página).
- [ ] **Buscar por nombre**: Escribir parte del nombre. Verificar que filtra resultados.
- [ ] **Buscar por RUT**: Buscar por RUT (con o sin puntos/guion). Verificar normalización y resultados.
- [ ] **Buscar por email**: Buscar por email o parte de él. Verificar resultados.
- [ ] **Buscar por teléfono**: Buscar por número. Verificar resultados.
- [ ] **Búsqueda sin resultados**: Buscar texto que no coincida. Verificar mensaje apropiado.
- [ ] **Selector de sucursal**: Cambiar sucursal. Verificar que los clientes se filtran por branch.

---

## 2. Crear cliente

- [ ] **Formulario crear**: `/admin/customers/new` o botón "Nuevo cliente".
- [ ] **Campos obligatorios**: first_name, last_name. Verificar validación.
- [ ] **RUT chileno**: Ingresar RUT válido (formato 12.345.678-9). Verificar que acepta y formatea.
- [ ] **RUT inválido**: Ingresar RUT con dígito verificador incorrecto. Verificar que rechaza.
- [ ] **Email**: Formato válido. Opcional según schema.
- [ ] **Teléfono**: Formato. Opcional.
- [ ] **Dirección**: address_line_1, city, etc. Verificar que se guardan.
- [ ] **Datos médicos**: medical_conditions, allergies, last_eye_exam_date (si aplica). Verificar persistencia.
- [ ] **Duplicados**: Intentar crear cliente con email o RUT ya existente en la sucursal. Verificar que rechaza o advierte.
- [ ] **Límite de tier**: Si el plan tiene límite de clientes, verificar que rechaza al superar.
- [ ] **Branch asignado**: Verificar que el cliente se crea en la sucursal seleccionada.

---

## 3. Ver detalle de cliente

- [ ] **Ficha de cliente**: `/admin/customers/[id]` muestra datos completos.
- [ ] **Tabs o secciones**: Datos personales, prescripciones, citas, presupuestos, órdenes (si aplica).
- [ ] **Enlaces a relacionados**: Clic en cita, presupuesto, orden. Verificar navegación correcta.
- [ ] **Editar**: Botón editar lleva a formulario de edición.

---

## 4. Editar cliente

- [ ] **Formulario editar**: `/admin/customers/[id]/edit` carga datos actuales.
- [ ] **Modificar campos**: Cambiar nombre, email, teléfono, etc. Guardar. Verificar persistencia.
- [ ] **RUT**: Verificar si RUT es editable (a veces es inmutable).
- [ ] **Validación**: Mismos criterios que crear (RUT válido, email formato, etc.).

---

## 5. Prescripciones (recetas)

- [ ] **Listar prescripciones**: En ficha de cliente, ver prescripciones asociadas.
- [ ] **Crear prescripción**: (Si hay formulario) Crear receta con OD/OS (esfera, cilindro, eje, ADD, PD). Verificar que se asocia al cliente.
- [ ] **Editar prescripción**: Modificar datos de receta. Verificar persistencia.
- [ ] **Prescripción activa**: Verificar que las prescripciones se usan en presupuestos y work orders.

---

## 6. Multi-sucursal

- [ ] **Clientes por branch**: Cliente creado en sucursal A no aparece en listado de sucursal B (si el modelo es branch-scoped).
- [ ] **Búsqueda por sucursal**: Al buscar, resultados filtrados por sucursal seleccionada.
- [ ] **Organización**: Clientes pertenecen a la organización. Super admin puede ver todos.

---

## 7. Integración con otros módulos

- [ ] **Citas**: Crear cita desde ficha de cliente o vincular cliente al crear cita. Verificar asociación.
- [ ] **Presupuestos**: Crear presupuesto para el cliente. Verificar que customer_id se asocia.
- [ ] **POS**: En POS, buscar y seleccionar cliente. Verificar que la venta se asocia al cliente.
- [ ] **Work orders**: Work order con customer_id. Verificar que desde ficha de cliente se ven los trabajos.

---

## Resumen rápido

| Área           | Casos críticos                                             |
| -------------- | ---------------------------------------------------------- |
| Búsqueda       | Por nombre, RUT, email, teléfono; normalización RUT        |
| Crear          | first_name, last_name, RUT válido; duplicados; límite tier |
| Editar         | Persistencia, validaciones                                 |
| Prescripciones | Crear, editar, asociar                                     |
| Multi-sucursal | Filtro por branch                                          |
