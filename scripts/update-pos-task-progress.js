/**
 * Script para actualizar la tarea de Optimización del POS en Notion
 */

const https = require("https");

// Configuración
const NOTION_API_KEY = "ntn_N165381836479d6rgph8qix715k0rIcOuaARXOQ3Drf616";
const TASKS_DATABASE_ID = "33206293-43fc-8109-bee2-c6a36c73f4e6";
const TASK_ID = "33206293-43fc-81a8-bdd1-fca3aecf3920";

function notionRequest(endpoint, method = "GET", body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.notion.com",
      path: `/v1/${endpoint}`,
      method: method,
      headers: {
        Authorization: `Bearer ${NOTION_API_KEY}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
    };

    if (body) {
      options.headers["Content-Length"] = Buffer.byteLength(body);
    }

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on("error", reject);

    if (body) {
      req.write(body);
    }
    req.end();
  });
}

// Actualizar tarea con progreso
async function updateTaskProgress() {
  console.log("✏️  Actualizando tarea de Optimización del POS...\n");

  const updates = {
    Status: { select: { name: "In Progress" } },
    Notes: {
      rich_text: [
        {
          text: {
            content: `## Progreso Actual (Marzo 2026)

### ✅ COMPLETADO: Fases 1-3 (Arquitectura)

#### Fase 1: Consolidación de Tipos
- Creado \`src/app/admin/pos/types.ts\` con interfaces unificadas:
  - POSProduct, POSCartItem, POSCustomer, POSQuote, POSPaymentMethod
- Añadidos aliases de compatibilidad hacia atrás (Product, CartItem, etc.)
- Actualizado page.tsx para importar tipos desde types.ts
- Actualizado components/index.ts para re-exportar tipos

#### Fase 2: Custom Hooks Creados
- \`usePOSCart.ts\` - Gestión del carrito (add, update, remove, clear)
- \`usePOSCustomer.ts\` - Búsqueda y selección de clientes
- \`usePOSProducts.ts\` - Búsqueda de productos y código de barras
- \`usePOSPayment.ts\` - Métodos de pago, cálculos de vuelto, pagos parciales
- \`usePOSPrescription.ts\` - Recetas y presupuestos

#### Fase 3: Provider Global
- \`usePOSProvider.tsx\` - Provider unificado que combina todos los hooks
- Interfaz POSState expuesta para consumo via \`usePOS()\`

### 🔄 PRÓXIMOS PASOS (Fases 4-5)

#### Fase 4: Extracción de Componentes UI
1. Crear \`POSQuickSale.tsx\` - Componente de venta rápida
2. Crear \`POSAdvancedSale.tsx\` - Componente de venta con lentes
3. Crear \`POSPaymentDialog.tsx\` - Diálogo de pago
4. Crear \`POSCustomerPanel.tsx\` - Panel de búsqueda/selección de cliente
5. Crear \`POSPrescriptionPanel.tsx\` - Panel de recetas y presupuestos

#### Fase 5: Migración y Mejoras UX
1. Reemplazar estados inline en page.tsx con hook \`usePOS()\`
2. Migrar handlers uno por uno a los hooks
3. Añadir atajos de teclado
4. Implementar memoización para performance
5. Testing exhaustivo de cada flujo

### 📁 Archivos Modificados/Creados
- \`src/app/admin/pos/types.ts\` ✅
- \`src/app/admin/pos/hooks/usePOSCart.ts\` ✅
- \`src/app/admin/pos/hooks/usePOSCustomer.ts\` ✅
- \`src/app/admin/pos/hooks/usePOSProducts.ts\` ✅
- \`src/app/admin/pos/hooks/usePOSPayment.ts\` ✅
- \`src/app/admin/pos/hooks/usePOSPrescription.ts\` ✅
- \`src/app/admin/pos/hooks/usePOSProvider.tsx\` ✅

### ⚠️ Notas
- page.tsx aún tiene 7,360 líneas con errores TypeScript preexistentes
- La migración debe ser gradual para no romper funcionalidad existente
- Los hooks están listos para integración gradual`,
          },
        },
      ],
    },
  };

  try {
    const response = await notionRequest(
      `pages/${TASK_ID}`,
      "PATCH",
      JSON.stringify({
        properties: updates,
      }),
    );

    console.log("✅ Tarea actualizada exitosamente");
    console.log("\n📝 Estado cambiado a: In Progress");
    console.log(
      "📋 Notas actualizadas con detalle de progreso y próximos pasos",
    );
    return response;
  } catch (error) {
    console.error(`❌ Error actualizando tarea:`, error.message);
    return null;
  }
}

updateTaskProgress();
