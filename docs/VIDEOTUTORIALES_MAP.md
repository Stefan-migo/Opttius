# Mapa de Videotutoriales — Opttius

**Versión:** 1.0  
**Fecha:** 2026-02-24  
**Propósito:** Identificar qué secciones del sistema merecen y necesitan videotutoriales para usuarios finales

---

## Criterios de priorización

| Criterio              | Peso  | Descripción                                 |
| --------------------- | ----- | ------------------------------------------- |
| **Complejidad**       | Alto  | Flujos con múltiples pasos o decisiones     |
| **Frecuencia de uso** | Alto  | Funciones que se usan diariamente           |
| **Errores comunes**   | Medio | Áreas donde los usuarios suelen equivocarse |
| **Onboarding**        | Alto  | Primer contacto del usuario con el sistema  |
| **Multi-sucursal**    | Medio | Comportamiento que cambia por sucursal      |

---

## Prioridad 1: Esenciales (grabar primero)

### 1.1 Primer acceso y onboarding

| Video                                 | Audiencia     | Duración est. | Contenido                                              |
| ------------------------------------- | ------------- | ------------- | ------------------------------------------------------ |
| **Registro y primer login**           | Usuario nuevo | 3–5 min       | Registro, verificación email, login                    |
| **Elegir Demo vs Crear organización** | Usuario nuevo | 2–3 min       | Pantalla `/onboarding/choice`, qué implica cada opción |
| **Tour inicial del Dashboard**        | Usuario nuevo | 4–6 min       | KPIs, selector de sucursal, navegación principal       |

**Por qué:** Es el primer contacto. Un mal onboarding genera abandono.

---

### 1.2 POS (Punto de venta)

| Video                                  | Audiencia        | Duración est. | Contenido                                                                   |
| -------------------------------------- | ---------------- | ------------- | --------------------------------------------------------------------------- |
| **Abrir y cerrar caja**                | Cajero, Admin    | 4–5 min       | Flujo completo: monto inicial, cierre con resumen, efectivo real vs sistema |
| **Venta simple (producto físico)**     | Vendedor, Cajero | 5–7 min       | Buscar producto, agregar al carrito, seleccionar cliente, procesar pago     |
| **Split payment (efectivo + tarjeta)** | Cajero           | 3–4 min       | Cómo dividir el pago entre dos métodos                                      |
| **Saldo pendiente**                    | Cajero           | 3–4 min       | Orden con depósito parcial → cobrar resto vía PendingBalanceDialog          |
| **Presupuesto → POS**                  | Vendedor         | 4–5 min       | Cargar presupuesto aceptado al carrito, procesar venta                      |

**Por qué:** El POS es el corazón operativo. Errores aquí afectan caja e inventario.

---

### 1.3 Presupuestos (Quotes)

| Video                            | Audiencia       | Duración est. | Contenido                                                                   |
| -------------------------------- | --------------- | ------------- | --------------------------------------------------------------------------- |
| **Crear presupuesto completo**   | Vendedor        | 8–10 min      | Cliente, prescripción, marco, lente, presbicia (two_separate), tratamientos |
| **Enviar presupuesto por email** | Vendedor        | 2–3 min       | Enviar, variables en el template                                            |
| **Convertir a orden de trabajo** | Vendedor, Admin | 3–4 min       | Presupuesto aceptado → Convertir → Work order creado                        |
| **Cargar presupuesto al POS**    | Vendedor        | 2–3 min       | Botón "Cargar al POS", qué pasa con el quote                                |

**Por qué:** Flujo complejo con muchas opciones (marco propio, presbicia, matrices de precio).

---

### 1.4 Citas (Appointments)

| Video                                    | Audiencia     | Duración est. | Contenido                                                           |
| ---------------------------------------- | ------------- | ------------- | ------------------------------------------------------------------- |
| **Crear cita con cliente existente**     | Recepcionista | 4–5 min       | Buscar cliente, tipo de cita, slots disponibles                     |
| **Crear cita guest (sin cliente)**       | Recepcionista | 3–4 min       | Campos guest\_\*, validación RUT                                    |
| **Configurar horarios y disponibilidad** | Admin         | 5–6 min       | schedule_settings: horarios, almuerzo, slot_duration, blocked_dates |

**Por qué:** Citas guest y configuración son puntos de confusión frecuente.

---

## Prioridad 2: Importantes (segunda ronda)

### 2.1 CRM (Clientes)

| Video                        | Audiencia               | Duración est. | Contenido                                           |
| ---------------------------- | ----------------------- | ------------- | --------------------------------------------------- |
| **Crear y editar cliente**   | Recepcionista, Vendedor | 4–5 min       | Formulario, RUT chileno, validaciones               |
| **Prescripciones (recetas)** | Vendedor, Óptico        | 5–6 min       | Crear receta, OD/OS, esfera, cilindro, ADD, PD      |
| **Ficha de cliente**         | Todos                   | 3–4 min       | Datos, prescripciones, citas, presupuestos, órdenes |

---

### 2.2 Órdenes de trabajo (Lab Work Orders)

| Video                                               | Audiencia     | Duración est. | Contenido                               |
| --------------------------------------------------- | ------------- | ------------- | --------------------------------------- |
| **Ciclo de vida de un trabajo**                     | Admin, Taller | 6–8 min       | ordered → sent_to_lab → ... → delivered |
| **Cash-First: depósito insuficiente vs suficiente** | Admin, Cajero | 4–5 min       | on_hold_payment vs ordered, minDeposit  |
| **Entregar trabajo al cliente**                     | Recepcionista | 3–4 min       | Validación de saldo, entregar           |

---

### 2.3 Inventario

| Video                                       | Audiencia | Duración est. | Contenido                                 |
| ------------------------------------------- | --------- | ------------- | ----------------------------------------- |
| **Agregar producto y stock por sucursal**   | Admin     | 5–6 min       | Producto, categoría, product_branch_stock |
| **Ajuste de stock**                         | Admin     | 2–3 min       | Movimientos, auditoría                    |
| **Familias de lentes y matrices de precio** | Admin     | 6–8 min       | lens_families, lens_price_matrices        |

---

### 2.4 Admin Users

| Video                           | Audiencia   | Duración est. | Contenido                 |
| ------------------------------- | ----------- | ------------- | ------------------------- |
| **Registrar nuevo empleado**    | Super Admin | 4–5 min       | Rol, sucursales, permisos |
| **Asignar acceso a sucursales** | Super Admin | 3–4 min       | BranchAccessManager       |
| **Editar permisos granulares**  | Super Admin | 4–5 min       | PermissionsEditor         |

---

## Prioridad 3: Soporte y sistema (tercera ronda)

### 3.1 Soporte

| Video                         | Audiencia            | Duración est. | Contenido                         |
| ----------------------------- | -------------------- | ------------- | --------------------------------- |
| **Crear ticket de incidente** | Admin, Recepcionista | 3–4 min       | Formulario, prioridad, asignación |
| **Seguimiento de tickets**    | Admin                | 2–3 min       | Estados, mensajes, resolución     |

---

### 3.2 Sistema y configuración

| Video                       | Audiencia   | Duración est. | Contenido                                       |
| --------------------------- | ----------- | ------------- | ----------------------------------------------- |
| **Configurar sucursal**     | Super Admin | 5–6 min       | schedule_settings, quote_settings, pos_settings |
| **Restaurar backup**        | Super Admin | 4–5 min       | Sistema → Mantenimiento, seleccionar backup     |
| **Notificaciones y emails** | Admin       | 3–4 min       | Plantillas, variables, activación               |

---

## Resumen por rol

| Rol                | Videos prioritarios                                             |
| ------------------ | --------------------------------------------------------------- |
| **Usuario nuevo**  | Registro, Onboarding, Tour Dashboard                            |
| **Recepcionista**  | Citas (cliente + guest), Config horarios, Ficha cliente         |
| **Vendedor**       | Presupuestos (crear, enviar, convertir), CRM, Cargar al POS     |
| **Cajero**         | Abrir/cerrar caja, Venta simple, Split payment, Saldo pendiente |
| **Admin / Taller** | Órdenes de trabajo (ciclo, Cash-First, entregar)                |
| **Super Admin**    | Admin Users, Config sucursal, Restaurar backup                  |

---

## Formato sugerido para cada video

1. **Intro (10–15 s):** "En este video verás cómo [objetivo] en Opttius."
2. **Contexto (20–30 s):** Cuándo usar esta función.
3. **Paso a paso (principal):** Sin cortes innecesarios, con pausas en decisiones clave.
4. **Errores comunes (30 s):** Qué evitar.
5. **Cierre (10 s):** Resumen y siguiente paso.

**Duración ideal por video:** 3–6 minutos (máximo 10 para flujos muy complejos).

---

## Referencias

- `docs/TESTING_GUIDE.md` § 6 — Tutoriales sugeridos para soporte
- `docs/MANUAL_TESTING_GUIDE_COMPLETE.md` — Guía de testing manual
