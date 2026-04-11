# Fase 2: Tratamientos - Sistema Simplificado

## Resumen

Este documento detalla la implementación de la Fase 2: el sistema de tratamientos para presupuestos y ventas.

**Decisión de diseño:** Después de analizar la realidad de las ópticas chilenas, se optó por un **enfoque simplificado** en lugar de la tabla treatments compleja. Los tratamientos se gestionan directamente desde `quote_settings`.

---

## 1. Análisis: Tratamientos Reales vs. Mythos

### 1.1 Tratamientos que VIENEN con el cristal (NO manipulables)

Estos tratamientos vienen incluidos en el material/base del lente desde fábrica:

| Tratamiento         | Por qué no es manipulable                                 |
| ------------------- | --------------------------------------------------------- |
| **Polarizado**      | Lámina interna (sándwich), se compra el bloque polarizado |
| **Fotocromático**   | Tecnología Transitions de fábrica                         |
| **Filtro Luz Azul** | Ya viene en el AR moderno                                 |
| **Protección UV**   | Ya es estándar (salvo CR39 muy básico)                    |

### 1.2 Tratamientos que se aplican en LABORATORIO LOCAL

Estos son los únicos tratamientos que realmente se pueden agregar en taller:

| Tratamiento               | Proceso                          | Precio típico (CLP) |
| ------------------------- | -------------------------------- | ------------------- |
| **Anti-reflejante (AR)**  | Cámara de vacío, capas múltiples | 15.000              |
| **Anti-rayas / Top Coat** | Baño de laca endurecedora + UV   | 12.000              |
| **Tinte / Teñido**        | Olla con tintura caliente        | 15.000              |

---

## 2. Arquitectura Implementada

### 2.1 Estructura de Datos

Los tratamientos se almacenan en `quote_settings.treatment_prices`:

```typescript
treatment_prices: {
  // Tratamientos de laboratorio local
  anti_reflective: number;    // Anti-reflejante
  scratch_resistant: number; // Anti-rayas
  tint: number;              // Tinte

  // Servicio personalizado
  custom_service?: {
    enabled: boolean;
    name: string;
    price: number;
  };
}
```

### 2.2 Servicio Personalizado

Se agregó la opción de crear un tratamiento/servicio personalizado con:

- **Nombre configurable** (ej: "Tintado especial", "Tratamiento premium")
- **Precio configurable**
- **Habilitar/Deshabilitar**

---

## 3. Módulos Actualizados

### 3.1 Quote Settings (`/admin/quotes/settings`)

**Ubicación:** `src/app/admin/quotes/settings/page.tsx`

**Características:**

- Configuración de precios por sucursal o global
- Toggle para mostrar/ocultar cada tratamiento
- Sección de servicio personalizado
- Manejo de valores por defecto

### 3.2 CreateQuoteForm

**Ubicación:** `src/components/admin/CreateQuoteForm.tsx`

**Tratamientos disponibles:**

- Anti-reflejante
- Anti-rayas
- Tinte
- Servicio personalizado (si está habilitado)
- Prisma (extra, siempre disponible sin costo)

### 3.3 POSAdvancedSale

**Ubicación:** `src/app/admin/pos/components/POSAdvancedSale.tsx`

**Igual que CreateQuoteForm** - usa la misma configuración de quote_settings.

---

## 4. Comparación: Antes vs. Ahora

### Antes (Sistema Original)

| treatment_key     | Precio |
| ----------------- | ------ |
| anti_reflective   | 15.000 |
| blue_light_filter | 20.000 |
| uv_protection     | 10.000 |
| scratch_resistant | 12.000 |
| anti_fog          | 8.000  |
| photochromic      | 35.000 |
| polarized         | 25.000 |
| tint              | 15.000 |

### Ahora (Sistema Simplificado)

| treatment_key         | Precio   | Notas             |
| --------------------- | -------- | ----------------- |
| anti_reflective       | 15.000   | ✅ De laboratorio |
| scratch_resistant     | 12.000   | ✅ De laboratorio |
| tint                  | 15.000   | ✅ De laboratorio |
| custom_service        | variable | ✅ Personalizable |
| ~~blue_light_filter~~ | -        | ❌ Ya viene en AR |
| ~~uv_protection~~     | -        | ❌ Ya es estándar |
| ~~anti_fog~~          | -        | ❌ Spray/gamuza   |
| ~~photochromic~~      | -        | ❌ Tipo de lente  |
| ~~polarized~~         | -        | ❌ Tipo de lente  |

---

## 5. Archivos Modificados

| Archivo                                            | Cambios                                     |
| -------------------------------------------------- | ------------------------------------------- |
| `src/lib/api/services/quoteSettingsService.ts`     | Actualizado tipo treatment_prices           |
| `src/app/admin/quotes/settings/page.tsx`           | UI simplificada con 3 tratamientos + custom |
| `src/components/admin/CreateQuoteForm.tsx`         | Treatments desde quoteSettings              |
| `src/app/admin/pos/components/POSAdvancedSale.tsx` | Treatments desde quoteSettings              |

---

## 6. Eliminados

| Componente                   | Razón                                     |
| ---------------------------- | ----------------------------------------- |
| `/admin/treatments` (página) | No necesaria, todo está en quote_settings |
| `treatmentService.ts`        | No se usa tabla treatments                |
| Tabla `treatments` en BD     | No se implementó (enfoque simplificado)   |
| Funciones RPC de treatments  | No necesarias                             |

---

## 7. Testing

### 7.1 Casos de Prueba

| #   | Escenario                        | Resultado                   |
| --- | -------------------------------- | --------------------------- |
| 1   | Crear quote con AR + Anti-rayas  | ✅ Válido                   |
| 2   | Crear quote con Tinte            | ✅ Válido                   |
| 3   | Habilitar servicio personalizado | ✅ Aparece en formulario    |
| 4   | Guardar precios en settings      | ✅ Se aplica en quotes      |
| 5   | Toggle tratamiento off           | ✅ No aparece en formulario |

### 7.2 Checklist de QA

- [ ] Quote Settings carga correctamente
- [ ] Cambios de precio se guardan
- [ ] Treatments aparecen en CreateQuoteForm
- [ ] Treatments aparecen en POSAdvancedSale
- [ ] Servicio personalizado funciona
- [ ] Valores por defecto si no hay settings

---

## 8. Notas para Futuro

Si en el futuro se necesita una tabla treatments más compleja (con validaciones de incompatibilidad), se puede implementar:

1. Crear tabla `treatments` en BD
2. Agregar campo `use_treatments_table` en quote_settings
3. Modificar frontend para cargar desde API si está habilitado

---

## Referencias

- Plan general: `docs/03-modules/INVENTORY_REFACTOR_PLAN.md`
- Quote Settings: `src/app/admin/quotes/settings/page.tsx`
- CreateQuoteForm: `src/components/admin/CreateQuoteForm.tsx`
- POSAdvancedSale: `src/app/admin/pos/components/POSAdvancedSale.tsx`

---

**Documento actualizado:** 2026-03-30
**Estado:** ✅ Implementado
