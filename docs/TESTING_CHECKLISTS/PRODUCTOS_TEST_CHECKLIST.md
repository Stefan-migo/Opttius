# Checklist de Pruebas Manuales — Productos

**Fecha:** 2026-02-22  
**Módulo:** Inventario (Productos y stock)

---

## 1. Listado de productos

- [ ] **Página de productos**: `/admin/products` carga correctamente.
- [ ] **Vista lista/grilla**: Cambiar entre vista tabla y grilla (si aplica). Verificar visualización.
- [ ] **Filtros**: Filtrar por categoría, tipo (frame, lens, accessory, service), estado (activo/inactivo).
- [ ] **Filtro stock bajo**: `?filter=low_stock` o similar. Verificar que solo muestra productos bajo umbral.
- [ ] **Búsqueda**: Buscar por nombre, SKU, código de barras. Verificar resultados.
- [ ] **Paginación**: Si hay muchos productos, verificar paginación.
- [ ] **Selector de sucursal**: Cambiar sucursal. Verificar que el stock mostrado es por sucursal.

---

## 2. Crear producto

- [ ] **Formulario crear**: `/admin/products/add` o botón "Agregar producto".
- [ ] **Campos obligatorios**: name, product_type (frame, lens, accessory, service). Verificar validación.
- [ ] **SKU**: Ingresar SKU único. Verificar que rechaza duplicados.
- [ ] **Código de barras**: (Si aplica) Para escaneo en POS.
- [ ] **Precio**: price, cost. Verificar formato numérico.
- [ ] **Categoría**: Asignar categoría (marcos, lentes-de-sol, accesorios, servicios).
- [ ] **Stock inicial**: Si es producto físico, ingresar stock por sucursal. Verificar que crea `product_branch_stock`.
- [ ] **Producto servicio**: product_type=service. Verificar que NO crea product_branch_stock.
- [ ] **Guardar**: Crear producto. Verificar que aparece en listado y en POS (si aplica).

---

## 3. Editar producto

- [ ] **Formulario editar**: `/admin/products/edit/[id]` carga datos actuales.
- [ ] **Modificar nombre, precio, descripción**: Guardar. Verificar persistencia.
- [ ] **Modificar stock**: Ajustar quantity en product_branch_stock. Verificar que se actualiza.
- [ ] **low_stock_threshold**: Configurar umbral de alerta. Verificar que productos bajo umbral aparecen en filtro.
- [ ] **Desactivar producto**: Cambiar is_active a false. Verificar que no aparece en POS (o aparece como inactivo).

---

## 4. Stock por sucursal

- [ ] **Stock independiente**: Producto con stock en sucursal A. Verificar que sucursal B tiene su propio stock (puede ser 0).
- [ ] **Ajuste manual**: Aumentar o disminuir stock manualmente. Verificar que product_branch_stock se actualiza.
- [ ] **Reducción en venta**: Vender producto en POS. Verificar que el stock de la sucursal disminuye.
- [ ] **available_quantity**: Verificar que available = quantity - reserved_quantity (si aplica reservas).

---

## 5. Operaciones bulk

- [ ] **Página bulk**: `/admin/products/bulk` (si existe). Cargar productos para operaciones masivas.
- [ ] **Ajuste de inventario**: Seleccionar productos, aplicar ajuste por cantidad o porcentaje. Verificar que se actualiza stock.
- [ ] **Actualizar estado**: Activar/desactivar múltiples productos. Verificar cambios.
- [ ] **Importar**: (Si existe) Importar CSV con productos y stock. Verificar que se crean/actualizan correctamente.

---

## 6. Categorías

- [ ] **Listar categorías**: Ver categorías existentes (marcos, lentes-de-sol, accesorios, servicios).
- [ ] **Crear categoría**: (Si permitido) Crear nueva categoría. Verificar que productos pueden asignarse.
- [ ] **Productos por categoría**: Filtrar por categoría. Verificar resultados.

---

## 7. Familias de lentes

- [ ] **Lens families**: `/admin/products?tab=lens-families` o `/admin/lens-families`. Listar familias de lentes.
- [ ] **Crear familia**: Nombre, matriz de precios (esfera, cilindro, adición). Verificar que se usa en presupuestos.
- [ ] **Matriz de precios**: Editar precios por combinación. Verificar cálculo en presupuesto.
- [ ] **Contact lens families**: (Si aplica) Similar para lentes de contacto.

---

## 8. Multi-sucursal y organización

- [ ] **Catálogo compartido**: Productos de la organización visibles en todas las sucursales.
- [ ] **Stock por sucursal**: Cada sucursal tiene su propio stock (product_branch_stock).
- [ ] **organization_id**: Productos pertenecen a la organización. Verificar aislamiento multi-tenant.

---

## Resumen rápido

| Área    | Casos críticos                                       |
| ------- | ---------------------------------------------------- |
| Listado | Filtros, búsqueda, stock bajo                        |
| Crear   | name, type, SKU, precio, stock inicial por branch    |
| Editar  | Persistencia, ajuste stock, umbral bajo stock        |
| Stock   | Por sucursal, reducción en venta, available_quantity |
| Bulk    | Ajuste inventario, import                            |
| Lentes  | Familias, matrices de precio                         |
