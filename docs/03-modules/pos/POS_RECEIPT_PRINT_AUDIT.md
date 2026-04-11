# Auditoría: Impresión de Boleta en POS

**Fecha:** 2026-03-02  
**Alcance:** Flujo de impresión de boleta tras venta POS o pago de saldo pendiente (modo auditoría).

**Actualización 2026-03-02:** Se implementó impresión vía iframe oculto (sin popups) para evitar bloqueo del navegador. Los usuarios no necesitan configurar permisos de popups.

---

## 2. Flujo Actual

```
processSale → setLastProcessedOrder(orderToPrint) → setTimeout(printReceipt, 400)
                    ↓
              Portal re-render con POSReceipt
                    ↓
              400ms después: printReceipt()
                    ↓
              window.open("", "_blank") → write HTML → w.print() → w.close()
```

**Si `window.open` falla (bloqueado):** fallback a `window.print()` → imprime el documento actual.

---

## 3. Hallazgos

### 3.1 Alta probabilidad: Bloqueo de popups por el navegador

**Causa:** Cada impresión usa `window.open("", "_blank")` para abrir una ventana con el HTML de la boleta. Tras varias ventanas (3–5 típicamente), el navegador bloquea popups.

**Evidencia:** El patrón es coherente con “deja de generar tras varias ventas”.

**Código afectado:**

```528:547:src/app/admin/pos/page.tsx
  const printReceipt = (retryCount = 0) => {
    const el = printRef.current;
    if (!lastProcessedOrder) {
      window.print();
      return;
    }
    if (!el || !el.innerHTML?.trim()) {
      if (retryCount < 1) {
        setTimeout(() => printReceipt(retryCount + 1), 200);
        return;
      }
      window.print();
      return;
    }
    const html = el.innerHTML;
    const w = window.open("", "_blank");
    if (!w) {
      window.print();  // ← Fallback: imprime todo el documento
      return;
    }
```

**Fallback:** Cuando `w` es `null`, se llama a `window.print()` sobre el documento actual. El portal tiene `hidden print:block`, pero el resto de la página puede imprimirse también.

---

### 3.2 Media probabilidad: Closure bug en primera venta

**Causa:** `printReceipt` usa `lastProcessedOrder` del closure. Si se ejecuta antes de que React haya re-renderizado:

- En la primera venta: `lastProcessedOrder` puede ser `null` → se ejecuta `window.print()` y retorno.
- En ventas siguientes: `lastProcessedOrder` puede ser la orden anterior, pero el DOM ya tiene la nueva.

**Impacto:** En la primera venta podría imprimirse la página completa en lugar de solo la boleta.

---

### 3.3 Baja probabilidad: Retry insuficiente

**Causa:** El retry solo se hace una vez tras 200 ms:

```js
if (retryCount < 1) {
  setTimeout(() => printReceipt(retryCount + 1), 200);
  return;
}
```

Si el DOM aún no está listo (por ejemplo, en dispositivos lentos), se puede imprimir contenido vacío.

---

### 3.4 Rate limit (POS)

**Config:** 20 requests / 5 minutos.

**Impacto:** Afecta al proceso de venta (`processSale`), no a la impresión. Si la venta falla por rate limit, no se llega a imprimir.

---

### 3.5 Estructura de datos

La API devuelve `order` con `order_items`, `order_payments`, etc. El `POSReceipt` espera esa estructura y coincide:

- `order.order_items` o `order.items` o `order.order?.order_items`
- `order.order_payments`
- `order.total_amount`, etc.

No se detectan problemas de estructura.

---

## 4. Recomendaciones

### 4.1 Evitar uso de popups (prioridad alta)

**Opción A:** Usar `window.print()` en el documento actual sin popups:

- Usar `@media print` para ocultar todo excepto el contenido de la boleta.
- Añadir un contenedor con `id="print-receipt-only"` que solo se muestre en impresión.
- Asegurar que el contenido principal tenga `print:hidden`.

**Opción B:** Usar un iframe oculto en lugar de `window.open`:

- Crear un iframe, escribir el HTML en el iframe, llamar a `iframe.contentWindow.print()`.
- Evita el bloqueo de popups.

### 4.2 Corregir el closure bug

Pasar la orden explícitamente a `printReceipt`:

```ts
setTimeout(() => printReceiptWithOrder(orderToPrint), 400);
```

O usar un ref para la orden a imprimir:

```ts
orderToPrintRef.current = orderToPrint;
setTimeout(printReceipt, 400);
```

### 4.3 Mejorar el fallback

Cuando `window.open` falle:

- No llamar a `window.print()` directamente.
- Mostrar un toast: “Por favor, permite ventanas emergentes para imprimir” o “Impresión bloqueada por el navegador”.
- Ofrecer un botón “Imprimir boleta” que abra el diálogo de impresión del navegador.

### 4.4 Aumentar retries

Si el DOM está vacío, aumentar el número de reintentos (por ejemplo, 3–5) y el intervalo (por ejemplo, 300–500 ms).

---

## 5. Verificación en entorno local

Para comprobar si el problema es de entorno:

1. **Bloqueo de popups:**
   - Comprobar si el navegador muestra un icono de bloqueo en la barra de direcciones.
   - Permitir popups para `localhost` o el dominio de desarrollo.

2. **Consola de desarrollador:**
   - Comprobar si hay errores tras varias ventas.
   - Ver si `window.open` retorna `null`.

3. **Modo incógnito:**
   - Probar en modo incógnito para descartar extensiones.

4. **Otro navegador:**
   - Probar en Chrome, Firefox, Edge para ver si el comportamiento es distinto.

---

## 6. Conclusión

El comportamiento de “deja de generar tras varias ventas” es coherente con el bloqueo de popups del navegador. El fallback actual (`window.print()`) no es adecuado para imprimir solo la boleta.

**Recomendación principal:** Cambiar de `window.open` a un iframe oculto o a imprimir directamente en el documento con `@media print` correctamente configurado para evitar el bloqueo de popups.
