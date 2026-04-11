# Plan de Testing - Inventory Refactor Plan

**Fecha:** 2026-03-31  
**Proyecto:** Opttius - Sistema SaaS para Ópticas  
**Estado:** Testing Pendiente

---

## Resumen Ejecutivo

Las 3 fases del Inventory Refactor Plan han sido implementadas pero **no han sido probadas**. Este documento detalla el plan de testing manual y automatizado necesario antes de usar en producción.

---

## Tareas de Testing por Fase

### ✅ Fase 1: Lentes de Contacto como Inventario Físico

#### Migración de Datos

| Test Case                                | Pasos                                                                                                                       | Resultado Esperado                                                                        |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **1.1** Migración de familias a products | Ejecutar migración SQL                                                                                                      | Verificar que productos LC aparecen en tabla `products` con `product_type='contact_lens'` |
| **1.2** Stock inicial creado             | Query: `SELECT * FROM product_branch_stock WHERE product_id IN (SELECT id FROM products WHERE product_type='contact_lens')` | Debe mostrar stock = 20 por sucursal                                                      |
| **1.3** Backward compatibility           | Query: `SELECT * FROM products WHERE contact_lens_family_id IS NOT NULL`                                                    | Debe mostrar productos con referencia a familia original                                  |

#### Flujo POS - Venta de LC

| Test Case                       | Pasos                                        | Resultado Esperado                             |
| ------------------------------- | -------------------------------------------- | ---------------------------------------------- |
| **1.4** Buscar LC en POS        | 1. Ir a POS <br>2. Buscar "Acuvue"           | Debe mostrar productos LC en resultados        |
| **1.5** Reducir stock al vender | 1. Agregar LC al cart <br>2. Completar venta | Stock debe reducirse en 1 (o cantidad Vendida) |
| **1.6** Stock insuficiente      | 1. Poner stock = 0 <br>2. Intentar vender    | Debe mostrar error "Sin stock"                 |

#### Sistema de Encargos

| Test Case             | Pasos                                                            | Resultado Esperado                             |
| --------------------- | ---------------------------------------------------------------- | ---------------------------------------------- |
| **1.7** Crear encargo | 1. Intentar vender LC sin stock <br>2. Click "Solicitar encargo" | Debe crear registro en `contact_lens_encargos` |

---

### ✅ Fase 2: Sistema de Treatments (Simplificado)

| Test Case                     | Pasos                                                      | Resultado Esperado                                  |
| ----------------------------- | ---------------------------------------------------------- | --------------------------------------------------- |
| **2.1** Configurar treatments | 1. Ir a Settings → Quotes <br>2. Agregar precio AR = 15000 | Debe guardarse en `quote_settings.treatment_prices` |
| **2.2** Treatments en Quote   | 1. Crear quote <br>2. Agregar treatments                   | Debe calcular total correctamente                   |
| **2.3** Treatments en POS     | 1. Ir a POS <br>2. Agregar lente + treatments              | Debe incluir treatments en total                    |

---

### ✅ Fase 3: Cristales Stock vs Tallado

#### Configuración de Familia

| Test Case                          | Pasos                                                                                                      | Resultado Esperado                       |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| **3.1** Habilitar stock en familia | 1. Ir a Admin → Lenses → Families <br>2. Editar CR39 Single Vision <br>3. Activar "Tiene stock disponible" | Debe guardar `is_stock_available = TRUE` |
| **3.3** Configurar rangos stock    | 1. Agregar: sphere -6.00 a 2.00, cylinder 0 a -2.00                                                        | Debe guardar en lens_families            |

#### Flujo en Quotes

| Test Case                         | Pasos                                                | Resultado Esperado                                 |
| --------------------------------- | ---------------------------------------------------- | -------------------------------------------------- |
| **3.4** Selector Stock vs Tallado | 1. Crear quote <br>2. Seleccionar CR39 Single Vision | Si familia tiene stock, debe mostrar radio buttons |
| **3.5** Seleccionar Stock         | 1. Click "Stock (Entrega inmediata)"                 | Debe guardar `lens_sourcing_type = 'stock'`        |
| **3.6** Seleccionar Tallado       | 1. Click "Tallado a pedido"                          | Debe guardar `lens_sourcing_type = 'surfaced'`     |

#### Flujo en POS

| Test Case                      | Pasos                                               | Resultado Esperado                                      |
| ------------------------------ | --------------------------------------------------- | ------------------------------------------------------- |
| **3.7** Selector en POS        | 1. Cargar quote con selection <br>2. Ver en POS     | Debe mantener selección Stock vs Tallado                |
| **3.8** Procesar venta Stock   | 1. Procesar venta con lens_sourcing_type='stock'    | NO debe crear work order (entrega inmediata)            |
| **3.9** Procesar venta Tallado | 1. Procesar venta con lens_sourcing_type='surfaced' | Debe crear work order con lens_sourcing_type='surfaced' |

---

## Scripts de Verificación SQL

### Verificar Migraciones Aplicadas

```sql
-- 1. Verificar contact_lens en product_type
SELECT DISTINCT product_type FROM products;

-- 2. Verificar productos LC migrados
SELECT id, name, product_type, contact_lens_family_id
FROM products
WHERE product_type = 'contact_lens';

-- 3. Verificar stock LC en product_branch_stock
SELECT p.name, pbs.branch_id, pbs.quantity
FROM product_branch_stock pbs
JOIN products p ON p.id = pbs.product_id
WHERE p.product_type = 'contact_lens';

-- 4. Verificar campos de stock en lens_families (Fase 3)
SELECT name, is_stock_available, stock_sphere_min, stock_sphere_max
FROM lens_families
WHERE is_stock_available = TRUE;

-- 5. Verificar lens_sourcing_type en lab_work_orders
SELECT id, lens_sourcing_type FROM lab_work_orders
WHERE lens_sourcing_type IS NOT NULL LIMIT 10;
```

---

## Credenciales de Testing

```
Demo Óptica:
- URL: http://localhost:3000
- Email: demo-admin@optica-demo.cl
- Password: DemoAdmin123!

Org ID: 00000000-0000-0000-0000-000000000001
Branch ID: 00000000-0000-0000-0000-000000000002 (Casa Matriz)
```

---

## Checklist de Testing

- [ ] **Fase 1 - LC Inventario**
  - [ ] 1.1 Migración aplicada
  - [ ] 1.2 Stock inicial creado
  - [ ] 1.3 Backward compatibility
  - [ ] 1.4 Buscar LC en POS
  - [ ] 1.5 Reducir stock al vender
  - [ ] 1.6 Stock insuficiente muestra error
  - [ ] 1.7 Crear encargo cuando sin stock

- [ ] **Fase 2 - Treatments**
  - [ ] 2.1 Configurar treatments en settings
  - [ ] 2.2 Treatments en Quote
  - [ ] 2.3 Treatments en POS

- [ ] **Fase 3 - Stock vs Tallado**
  - [ ] 3.1 Habilitar stock en familia
  - [ ] 3.2 Configurar rangos stock
  - [ ] 3.3 Selector en Quote visible
  - [ ] 3.4 Guardar selección Stock/Tallado
  - [ ] 3.5 Mantener selección en POS
  - [ ] 3.6 Venta Stock no crea Work Order
  - [ ] 3.7 Venta Tallado crea Work Order

---

## Notas

- Las migraciones fueron creadas pero NO aplicadas a la DB de producción
- Se requiere ejecutar migraciones antes de testing
- Testing debe realizarse en entorno demo primero

---

**Documento actualizado:** 2026-03-31  
**Estado:** Plan creado - Pendiente ejecución
