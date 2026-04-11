# Plan de Implementación - Módulo POS Opttius

**Fecha:** 29 de marzo de 2026  
**Prioridad:** P0 - Crítica (refactorización arquitectural primero)  
**Estado:** En planificación

## 📋 Resumen Ejecutivo

Implementar las 4 tareas del POS identificadas en Notion, priorizando la refactorización arquitectural (P0) para habilitar soluciones sostenibles a los bugs identificados.

### Tareas a Implementar

1. **[P0] 🎯 Optimización del POS – Mejoras UI/UX y Arquitectura** (Refactorización urgente)
2. **[P1] [BUG-CAJA-1] Mensaje Selecciona una sucursal al entrar a caja en modo global** ✅ COMPLETADO
3. **[P2] [BUG-POS-2] Agregar opción Aplicar descuento total al carrito** ✅ COMPLETADO
4. **[P3] [BUG-POS-3] Botón Crear presupuesto en flujo Cliente+Receta externa** ✅ COMPLETADO

---

## 🏗️ Estado Actual del Código

### Problemas Identificados

#### 1. Arquitectura Monolítica

- **`page.tsx`**: 6928 líneas (violación de SRP)
- **Acoplamiento alto**: Lógica de negocio, UI y estado mezclados
- **Estado complejo**: 100+ variables de estado en componente principal
- **Reutilización limitada**: Hooks existentes subutilizados

#### 2. Gestión de Descuentos

- Solo implementados en formulario "Crear Orden Completa"
- No hay interfaz para aplicar descuentos al carrito regular
- Lógica de descuento acoplada a formulario específico

#### 3. Flujo Receta Externa

- Diálogo crea cliente y receta pero NO presupuesto
- Falta integración con generación de presupuestos
- Usuario debe salir del flujo para crear presupuesto manualmente

#### 4. Selección de Sucursal

- Validación solo en backend (`process-sale/route.ts`)
- Super admins pueden intentar procesar ventas sin sucursal
- Mensaje de error aparece tarde (al intentar pagar)

---

## 🎯 Objetivos de Implementación

### Principios Arquitectónicos

1. **SRP (Single Responsibility Principle)**: Componentes < 200 líneas
2. **Separación de preocupaciones**: Lógica de negocio → servicios/hooks
3. **Reutilización máxima**: Reusar componentes y hooks existentes
4. **Mantenibilidad**: Código auto-documentado, tipos TypeScript estrictos
5. **Performance**: React.memo(), useMemo(), lazy loading

### Criterios de Éxito

1. ✅ `page.tsx` reducido a < 500 líneas (extrayendo 5-7 componentes)
2. ✅ Descuentos aplicables desde interfaz del carrito
3. ✅ Botón "Crear Presupuesto" visible en flujo receta externa
4. ✅ Mensaje claro de selección de sucursal para super admins
5. ✅ Todas las pruebas pasan (`npm run lint && npm run type-check && npm run test`)

---

## 📊 Plan de Fases

### Fase 1: Análisis y Planificación ✅

- [x] Investigación arquitectural completa
- [x] Identificación de problemas específicos
- [x] Creación de plan detallado
- [x] Establecimiento de criterios de éxito

### Fase 2: Refactorización Arquitectural (P0) ⚠️

**Objetivo**: Extraer 5-7 componentes de `page.tsx`, crear arquitectura modular.

#### Componentes a Extraer:

1. **`POSPaymentProcessor`** - Flujo de pago completo
2. **`POSCustomerManager`** - Gestión de clientes y recetas
3. **`POSCartManager`** - Carrito y descuentos
4. **`POSOrderForm`** - Formulario "Crear Orden Completa"
5. **`POSBranchSelector`** - Selector de sucursal (nuevo)
6. **`POSProductSearch`** - Ya existe, optimizar
7. **`POSReceiptManager`** - Gestión de recibos/impresión

#### Hooks a Crear/Extender:

1. **`usePOSDiscount`** - Gestión de descuentos
2. **`usePOSQuote`** - Creación de presupuestos
3. **`usePOSBranch`** - Extender `useBranch` para validación
4. **`usePOSValidation`** - Validaciones de negocio

#### Servicios a Extender:

1. **`posService.applyDiscount()`** - Validación de descuentos
2. **`quoteService.createFromExternal()`** - Presupuesto desde receta externa

### Fase 3: BUG-CAJA-1 - Selección de Sucursal 🔧

**Objetivo**: Mensaje claro para super admins en modo global.

#### Implementación:

1. **Componente `BranchSelectorAlert`**
   - Mostrar cuando `currentBranchId` es null y `isSuperAdmin` es true
   - Diseño: Alert con icono y botón para seleccionar sucursal
   - Ubicación: Encima del carrito en vista POS

2. **Validación en frontend**
   - Deshabilitar botón "Cobrar" sin sucursal seleccionada
   - Mostrar tooltip explicativo: "Selecciona una sucursal para habilitar la caja"

3. **Integración con `useBranch` hook**
   - Extender hook para incluir validación visual
   - Añadir callback para cuando se selecciona sucursal

### Fase 4: BUG-POS-2 - Descuentos en Carrito 💰

**Objetivo**: Interfaz para aplicar descuentos totales al carrito.

#### Implementación:

1. **Componente `POSDiscountInput`**
   - Input para porcentaje o monto fijo
   - Selector tipo descuento (porcentaje/monto)
   - Botón "Aplicar" con validación

2. **Extensión de `POSCart`**
   - Sección "Descuentos" en resumen del carrito
   - Mostrar descuento aplicado como ítem negativo
   - Botón "Eliminar descuento"

3. **Lógica de negocio**
   - Reutilizar lógica existente de `discountType`, `discount_percentage`, `discount_amount`
   - Validar que descuento no exceda total
   - Integrar con cálculos fiscales (IVA)

4. **Servicio `posService`**
   - Método `validateDiscount(amount, type, total)`
   - Validación contra límites configurados (si aplica)

### Fase 5: BUG-POS-3 - Botón Crear Presupuesto 📝

**Objetivo**: Botón para crear presupuesto desde flujo receta externa.

#### Implementación:

1. **Extensión diálogo receta externa**
   - Añadir botón "Crear Presupuesto" junto a "Guardar"
   - Funcionalidad: `handleCreateQuoteFromExternalPrescription`

2. **Función de creación**
   - Reutilizar `quoteService.createQuote()`
   - Pasar datos de cliente, receta y contexto actual
   - Redirigir a vista de presupuesto o mantener en POS

3. **Integración con formulario**
   - Cargar presupuesto creado en formulario "Crear Orden Completa"
   - Opción de editar antes de agregar al carrito

### Fase 6: Validación y Pruebas 🧪

**Objetivo**: Garantizar calidad y funcionamiento.

#### Pruebas por Módulo:

1. **Refactorización**
   - Componentes renderizan correctamente
   - Estado se mantiene entre extracciones
   - Performance mejorada (React.memo, useMemo)

2. **Selección de sucursal**
   - Alert aparece correctamente para super admins
   - Botones se deshabilitan sin sucursal
   - Mensajes claros y útiles

3. **Descuentos**
   - Cálculos correctos (porcentaje/monto)
   - No excede total
   - Se refleja en IVA y total final

4. **Presupuesto desde receta externa**
   - Botón visible y funcional
   - Presupuesto se crea con datos correctos
   - Integración con flujo POS

#### Validaciones Técnicas:

- [ ] `npm run lint` - Sin errores ESLint
- [ ] `npm run type-check` - Sin errores TypeScript
- [ ] `npm run test` - Todas las pruebas pasan
- [ ] `npm run build` - Build exitoso
- [ ] Componentes < 200 líneas (donde aplica)

---

## 🛠️ Stack Técnico y Herramientas

### Frontend

- **Framework**: Next.js 14 + TypeScript
- **Estilos**: Tailwind CSS + shadcn/ui
- **Estado**: React hooks (useState, useContext)
- **Optimización**: React.memo, useMemo, useCallback
- **Formularios**: React controlled components

### Backend (APIs existentes)

- **Servicios**: `posService`, `quoteService`, `customerService`
- **Validación**: Zod schemas en endpoints
- **Autenticación**: Supabase Auth + RLS

### Herramientas de Desarrollo

- **Testing**: Vitest + Playwright (E2E)
- **Linting**: ESLint con config estándar
- **Type checking**: TypeScript strict mode
- **Build**: Vercel + Next.js

---

## ⚠️ Riesgos y Mitigaciones

### Riesgo 1: Breaking changes en refactorización

- **Mitigación**: Extraer componentes gradualmente, mantener compatibilidad
- **Pruebas**: Validar después de cada extracción
- **Rollback**: Git commits atómicos, fácil revertir

### Riesgo 2: Cálculos fiscales incorrectos

- **Mitigación**: Reutilizar funciones existentes (`calculateSubtotal`, etc.)
- **Validación**: Tests unitarios para cálculos
- **Verificación**: Comparar con versión anterior

### Riesgo 3: Performance en componentes extraídos

- **Mitigación**: React.memo para componentes puros
- **Optimización**: useMemo para cálculos costosos
- **Profiling**: React DevTools para identificar bottlenecks

### Riesgo 4: Integración con servicios existentes

- **Mitigación**: Extender servicios, no reemplazar
- **Compatibilidad**: Mantener interfaces existentes
- **Testing**: Pruebas de integración con APIs

---

## 📅 Cronograma Estimado

| Fase                             | Duración Estimada | Dependencias     | Estado        |
| -------------------------------- | ----------------- | ---------------- | ------------- |
| 1. Análisis y planificación      | 1 hora            | -                | ✅ COMPLETADO |
| 2. Refactorización arquitectural | 4-6 horas         | Fase 1           | PENDIENTE     |
| 3. BUG-CAJA-1 (Sucursal)         | 1-2 horas         | Fase 2           | ✅ COMPLETADO |
| 4. BUG-POS-2 (Descuentos)        | 2-3 horas         | Fase 2           | ✅ COMPLETADO |
| 5. BUG-POS-3 (Presupuesto)       | 2-3 horas         | Fase 2, 4        | ✅ COMPLETADO |
| 6. Validación y pruebas          | 1-2 horas         | Todas anteriores | PENDIENTE     |

**Total estimado**: 11-17 horas | **BUG FIXES COMPLETADOS** ✅

---

## 🔄 Flujo de Trabajo

### Para cada fase:

1. **Planificar incrementos** (< 100 líneas por commit)
2. **Implementar incremento**
3. **Ejecutar validaciones** (`npm run lint && npm run type-check && npm run test`)
4. **Commit** (si todas pasan)
5. **Actualizar TodoWrite** (marcar completado)

### Reglas de Calidad:

- ✅ Nunca romper el build
- ✅ Tests pasan después de cada incremento
- ✅ Componentes < 200 líneas (ideal)
- ✅ TypeScript strict mode
- ✅ Accesibilidad WCAG 2.1 AA

---

## 🧪 Estrategia de Testing

### Unit Tests

- **Componentes**: Renderizado, interacciones, props
- **Hooks**: Estado, efectos, devoluciones
- **Servicios**: Llamadas API, transformaciones de datos

### Integration Tests

- **Flujos completos**: Cliente → Productos → Pago
- **Descuentos**: Aplicación y cálculo
- **Presupuestos**: Creación desde receta externa

### E2E Tests (Playwright)

- **Happy path**: Venta exitosa
- **Edge cases**: Descuentos máximos, sucursal no seleccionada
- **Validación**: Mensajes de error apropiados

---

## 📁 Estructura de Archivos Propuesta

```
src/app/admin/pos/
├── page.tsx                    # Componente principal (< 500 líneas)
├── components/
│   ├── POSPaymentProcessor.tsx # Flujo de pago completo
│   ├── POSCustomerManager.tsx  # Clientes y recetas
│   ├── POSCartManager.tsx      # Carrito y descuentos
│   ├── POSOrderForm.tsx        # Formulario orden completa
│   ├── POSBranchSelector.tsx   # Selector de sucursal (nuevo)
│   ├── POSDiscountInput.tsx    # Input de descuentos (nuevo)
│   ├── POSCart.tsx             # Existente, extendido
│   ├── POSCustomerSearch.tsx   # Existente
│   ├── POSProductSearch.tsx    # Existente
│   └── POSReceiptManager.tsx   # Gestión recibos
├── hooks/
│   ├── usePOSCart.ts           # Existente
│   ├── usePOSDiscount.ts       # Nuevo: gestión descuentos
│   ├── usePOSQuote.ts          # Nuevo: creación presupuestos
│   ├── usePOSBranch.ts         # Nuevo: validación sucursal
│   ├── usePOSValidation.ts     # Nuevo: validaciones negocio
│   ├── usePOSCashStatus.ts     # Existente
│   └── usePOSPendingBalance.ts # Existente
├── context/
│   └── POSContext.tsx          # Existente, posible extensión
├── services/
│   └── posDiscountService.ts   # Nuevo: lógica descuentos
└── types/
    └── index.ts                # Tipos extendidos
```

---

## 🚀 Siguientes Pasos

1. **Iniciar Fase 2**: Refactorización arquitectural
   - Extraer `POSPaymentProcessor` primero (mayor ganancia)
   - Validar después de cada extracción
   - Mantener tests pasando

2. **Secuencia recomendada**:

   ```
   POSPaymentProcessor → POSCustomerManager → POSCartManager
   → POSOrderForm → POSBranchSelector → POSDiscountInput
   ```

3. **Validación continua**:
   - Ejecutar `npm run lint && npm run type-check && npm run test` después de cada componente
   - Verificar renderizado en navegador (si posible)
   - Revisar cálculos de montos (crítico)

---

## 📞 Puntos de Contacto

- **Documentación técnica**: `docs/03-modules/pos/POS_SYSTEM.md`
- **Servicios API**: `src/lib/api/services/`
- **Componentes UI**: Sistema de diseño Epoch (`docs/FRONTEND_IDENTITY.md`)
- **Testing**: `src/__tests__/` y Playwright tests

---

## ✅ Checklist Final

### Antes de Comenzar

- [ ] Entendimiento completo de arquitectura actual
- [ ] Plan aprobado por stakeholders
- [ ] Entorno de desarrollo configurado
- [ ] Tests existentes pasando

### Durante Implementación

- [ ] Incrementos pequeños (< 100 líneas)
- [ ] Tests después de cada incremento
- [ ] Commits atómicos y descriptivos
- [ ] Documentación actualizada

### Después de Implementación

- [ ] Todas las pruebas pasan
- [ ] Build exitoso
- [ ] Performance aceptable
- [ ] Código review completado
- [ ] Documentación actualizada

---

**Nota**: Este plan es dinámico y puede ajustarse basado en hallazgos durante la implementación. La prioridad es mantener el sistema funcionando mientras se implementan mejoras.
