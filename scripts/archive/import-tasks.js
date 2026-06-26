/**
 * Script para importar las 13 tareas a la nueva database de Tasks
 */

const https = require("https");

const NOTION_API_KEY = "ntn_N165381836479d6rgph8qix715k0rIcOuaARXOQ3Drf616";
const TASKS_DB_ID = "33206293-43fc-8109-bee2-c6a36c73f4e6";

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

// Las 13 tareas a importar
const tasks = [
  {
    name: "[UX-1] Simplificar Sidebar - Reducir items visibles",
    type: "Improvement",
    priority: "P0 - Critical",
    module: "design",
    labels: ["ui-ux"],
  },
  {
    name: "[UX-2] Rediseñar Dashboard - KPIs claros, menos ruido visual",
    type: "Improvement",
    priority: "P0 - Critical",
    module: "analytics",
    labels: ["ui-ux"],
  },
  {
    name: "[UX-3] Simplificar flujos de trabajo - Reducir pasos para tareas comunes",
    type: "Improvement",
    priority: "P1 - High",
    module: "design",
    labels: ["ui-ux"],
  },
  {
    name: "[UX-4] Organizar menú Configuración - Agrupar opciones admin en submenús",
    type: "Improvement",
    priority: "P1 - High",
    module: "design",
    labels: ["ui-ux"],
  },
  {
    name: "[UX-5] Mejorar navegación móvil - Bottom nav optimizado",
    type: "Improvement",
    priority: "P2 - Medium",
    module: "design",
    labels: ["ui-ux", "frontend"],
  },
  {
    name: "[UX-6] Consistencia visual - Unificar estilos entre módulos",
    type: "Improvement",
    priority: "P2 - Medium",
    module: "design",
    labels: ["ui-ux"],
  },
  {
    name: "[UX-7] Mejorar Header Admin - Logo y BranchSelector",
    type: "Improvement",
    priority: "P1 - High",
    module: "design",
    labels: ["ui-ux", "frontend"],
  },
  {
    name: "[UX-8] Unificar modal de Crear Cita - Inconsistencia visual entre dashboard y citas",
    type: "Improvement",
    priority: "P1 - High",
    module: "appointments",
    labels: ["ui-ux", "frontend"],
  },
  {
    name: "[UX] Reestructuración global del UI/UX - Sistema sobrecargado y poco intuitivo",
    type: "Improvement",
    priority: "P0 - Critical",
    module: "design",
    labels: ["ui-ux"],
  },
  {
    name: "[BUG-CAJA-1] Mensaje Selecciona una sucursal al entrar a caja en modo global",
    type: "Bug",
    priority: "P1 - High",
    module: "system",
    labels: ["frontend"],
  },
  {
    name: "[BUG-CONVENIOS-1] Generar orden de trabajo aunque copago no llegue al mínimo (Cash-First)",
    type: "Bug",
    priority: "P1 - High",
    module: "work-orders",
    labels: ["backend"],
  },
  {
    name: "[BUG-POS-2] Agregar opción Aplicar descuento total al carrito",
    type: "Bug",
    priority: "P1 - High",
    module: "pos",
    labels: ["frontend"],
  },
  {
    name: "[BUG-POS-3] Botón Crear presupuesto en flujo Cliente+Receta externa",
    type: "Bug",
    priority: "P1 - High",
    module: "pos",
    labels: ["frontend"],
  },
];

async function main() {
  console.log("📦 Importando 13 tareas...\n");

  for (const task of tasks) {
    const properties = {
      Task: {
        title: [{ text: { content: task.name } }],
      },
      Status: {
        select: { name: "Backlog" },
      },
      Priority: {
        select: { name: task.priority },
      },
      Type: {
        select: { name: task.type },
      },
      Module: {
        select: { name: task.module },
      },
      Labels: {
        multi_select: task.labels.map((l) => ({ name: l })),
      },
    };

    const response = await notionRequest(
      "pages",
      "POST",
      JSON.stringify({
        parent: { database_id: TASKS_DB_ID },
        properties: properties,
      }),
    );

    if (response.id) {
      console.log(`   ✅ ${task.name.slice(0, 40)}...`);
    } else {
      console.log(`   ❌ Error: ${task.name.slice(0, 40)}...`);
    }

    await new Promise((r) => setTimeout(r, 300));
  }

  console.log("\n✅ Tareas importadas!");
}

main().catch(console.error);
