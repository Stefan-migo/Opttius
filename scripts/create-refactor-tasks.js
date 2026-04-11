/**
 * Script para crear el plan detallado de refactorización en Notion
 */

const https = require("https");

const NOTION_API_KEY =
  process.env.NOTION_API_KEY ||
  "ntn_N165381836479d6rgph8qix715k0rIcOuaARXOQ3Drf616";
const DATABASE_ID = "33106293-43fc-8110-a810-d26d78113a30";

function notionRequest(endpoint, method = "GET", body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.notion.com",
      path: "/v1/" + endpoint,
      method: method,
      headers: {
        Authorization: "Bearer " + NOTION_API_KEY,
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
    if (body) req.write(body);
    req.end();
  });
}

// Tareas detalladas del plan
const tasks = [
  // === FASE 1 ===
  {
    title: "[FASE 1] Agregar contact_lens como product_type válido",
    type: "refactor",
    priority: "P0-critical",
    module: "inventory",
    labels: ["database", "backend"],
    description:
      "Agregar contact_lens como valor válido en el enum product_type. Scripts SQL: ALTER TYPE product_type ADD VALUE contact_lens",
  },
  {
    title: "[FASE 1] Script migración: contact_lens_families → products",
    type: "feature",
    priority: "P0-critical",
    module: "inventory",
    labels: ["database", "backend"],
    description:
      "Crear script SQL para migrar datos de contact_lens_families a tabla products con product_type = contact_lens. Mantener datos originales como backup.",
  },
  {
    title: "[FASE 1] Crear product_branch_stock para lentes contacto",
    type: "feature",
    priority: "P0-critical",
    module: "inventory",
    labels: ["database", "backend"],
    description:
      "Crear registros en product_branch_stock para marcas populares de LC (Acuvue, Biofinity, FreshKon) con quantities iniciales. Configurar low_stock_threshold.",
  },
  {
    title: "[FASE 1] Actualizar POS para buscar LC desde products",
    type: "feature",
    priority: "P0-critical",
    module: "pos",
    labels: ["backend", "frontend"],
    description:
      "Modificar POSAdvancedSale y process-sale/route.ts para buscar lentes de contacto tanto en products (nuevo) como en contact_lens_families (backward compatibility).",
  },
  {
    title: "[FASE 1] Actualizar Quotes para LC desde products",
    type: "feature",
    priority: "P0-critical",
    module: "quotes",
    labels: ["backend", "frontend"],
    description:
      "Modificar CreateQuoteForm y quotes/route.ts para buscar lentes de contacto desde tabla products (product_type = contact_lens).",
  },
  {
    title: "[FASE 1] Mantener backward compatibility con contact_lens_families",
    type: "task",
    priority: "P1-high",
    module: "system",
    labels: ["backend"],
    description:
      "Mantener contact_lens_families como catálogo de referencia para lentes de contacto especiales (fuera de stock). API debe buscar primero en products y luego en contact_lens_families.",
  },

  // === FASE 2 ===
  {
    title: "[FASE 2] Crear tabla treatments con treatment_type",
    type: "feature",
    priority: "P1-high",
    module: "quotes",
    labels: ["database"],
    description:
      "Crear tabla treatments con campos: treatment_type (included/lab_applied/both), material_compatibility, exclusions, default_price, price_override.",
  },
  {
    title: "[FASE 2] Migrar tratamientos de quote_settings a treatments",
    type: "feature",
    priority: "P1-high",
    module: "quotes",
    labels: ["database"],
    description:
      "Migrar tratamientos existentes de quote_settings.treatment_prices a nueva tabla treatments. Clasificar cada tratamiento: polarizado/fotocromático = included, tinte = lab_applied, antirreflejo = both.",
  },
  {
    title: "[FASE 2] Agregar campos material_compatibility y exclusions",
    type: "feature",
    priority: "P1-high",
    module: "quotes",
    labels: ["database"],
    description:
      "Agregar columnas material_compatibility (TEXT[]) y exclusions (JSONB) a tabla treatments. Definir reglas: Polarizado excluye Fotocromático, Tinte excluye Alto Índice 1.67/1.74.",
  },
  {
    title: "[FASE 2] Crear función RPC validate_treatment_compatibility",
    type: "feature",
    priority: "P1-high",
    module: "quotes",
    labels: ["backend", "database"],
    description:
      "Crear función RPC en Supabase que valide compatibilidad de tratamientos. Input: array de treatment_keys. Output: valid, conflicts, recommendations.",
  },
  {
    title: "[FASE 2] Actualizar Quotes para validar tratamientos",
    type: "feature",
    priority: "P1-high",
    module: "quotes",
    labels: ["frontend", "backend"],
    description:
      "Modificar CreateQuoteForm para llamar validate_treatment_compatibility antes de guardar. Mostrar errores en UI si hay conflictos. Deshabilitar tratamientos incompatibles.",
  },
  {
    title: "[FASE 2] Actualizar POS para validar tratamientos",
    type: "feature",
    priority: "P1-high",
    module: "pos",
    labels: ["frontend", "backend"],
    description:
      "Modificar POSAdvancedSale para validar tratamientos con la misma lógica de quotes. Validar en process-sale/route.ts antes de crear orden.",
  },

  // === FASE 3 ===
  {
    title: "[FASE 3] Agregar is_stock_available a lens_families",
    type: "feature",
    priority: "P2-medium",
    module: "work-orders",
    labels: ["database"],
    description:
      "Agregar columnas is_stock_available (BOOLEAN), stock_sphere_max (DECIMAL), stock_cylinder_max (DECIMAL) a lens_families. Valores por defecto: sphere_max=4, cylinder_max=2.",
  },
  {
    title: "[FASE 3] Crear lógica stock vs tallado en Quotes",
    type: "feature",
    priority: "P2-medium",
    module: "quotes",
    labels: ["frontend", "backend"],
    description:
      "Implementar lógica en CreateQuoteForm: Si receta cumple criterios mostrar opción Stock vs Tallado.",
  },
  {
    title: "[FASE 3] Crear lógica stock vs tallado en POS",
    type: "feature",
    priority: "P2-medium",
    module: "pos",
    labels: ["frontend", "backend"],
    description:
      "Implementar misma lógica de Stock vs Tallado en POSAdvancedSale. Usar datos de receta para determinar disponibilidad de stock.",
  },
  {
    title: "[FASE 3] Actualizar Work Orders con sourcing_type",
    type: "feature",
    priority: "P2-medium",
    module: "work-orders",
    labels: ["backend", "database"],
    description:
      "Agregar campo sourcing_type (stock/surfaced) a lab_work_orders. Guardar tipo de cristal seleccionado.",
  },

  // === PLANIFICACIÓN ===
  {
    title: "[PLAN] Testing integral de Fase 1 (LC inventario)",
    type: "task",
    priority: "P0-critical",
    module: "system",
    labels: ["testing"],
    description:
      "Test plan: Crear producto contact_lens → Agregar stock → Vender desde POS → Verificar reducción de stock → Verificar Quotes con LC.",
  },
  {
    title: "[PLAN] Testing integral de Fase 2 (Treatments)",
    type: "task",
    priority: "P1-high",
    module: "system",
    labels: ["testing"],
    description:
      "Test plan: CRUD treatments → Validar exclusión Polarizado+Fotocromático → Validar exclusión Tinte+Alto Índice.",
  },
  {
    title: "[PLAN] Testing integral de Fase 3 (Stock vs Tallado)",
    type: "task",
    priority: "P2-medium",
    module: "system",
    labels: ["testing"],
    description:
      "Test plan: Receta estándar → Verificar opción stock disponible → Receta especial → Verificar solo opción tallado.",
  },
  {
    title: "[PLAN] Documentar estrategia de rollback",
    type: "task",
    priority: "P3-low",
    module: "system",
    labels: ["database"],
    description:
      "Crear documento de estrategia de rollback: Mantener tablas antiguas como backup, feature flags, scripts de reversión.",
  },
];

async function createTask(task) {
  const body = {
    parent: { database_id: DATABASE_ID },
    properties: {
      Task: { title: [{ text: { content: task.title } }] },
      Type: { select: { name: task.type } },
      Priority: { select: { name: task.priority } },
      Module: { select: { name: task.module } },
      Labels: { multi_select: task.labels.map((l) => ({ name: l })) },
      Status: { select: { name: "todo" } },
    },
    children: [
      {
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [{ text: { content: task.description } }],
        },
      },
    ],
  };

  const result = await notionRequest("pages", "POST", JSON.stringify(body));
  return result;
}

async function main() {
  console.log("📋 Creando plan de refactorización en Notion...\n");

  let created = 0;
  for (const task of tasks) {
    try {
      await createTask(task);
      console.log("✅", task.title.slice(0, 60));
      await new Promise((r) => setTimeout(r, 300));
      created++;
    } catch (e) {
      console.log(
        "❌ Error:",
        task.title.slice(0, 40),
        e.message?.slice(0, 50),
      );
    }
  }

  console.log(
    "\n✅ Completado: " + created + "/" + tasks.length + " tareas creadas",
  );
  console.log("🔗 https://notion.so/33106293-43fc-8110-a810-d26d78113a30");
}

main().catch(console.error);
