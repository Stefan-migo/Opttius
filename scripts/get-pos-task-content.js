/**
 * Script para obtener el contenido detallado de la tarea POS desde Notion
 */

const https = require("https");

const NOTION_API_KEY = "ntn_N165381836479d6rgph8qix715k0rIcOuaARXOQ3Drf616";

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

function extractText(richTextArray) {
  if (!richTextArray || !Array.isArray(richTextArray)) return "";
  return richTextArray.map((t) => t.plain_text).join("");
}

async function getTaskContent() {
  const taskId = "33206293-43fc-81a8-bdd1-fca3aecf3920";

  console.log("📄 Obteniendo contenido de la tarea desde Notion...\n");

  // Obtener bloques de la página
  const blocks = await notionRequest(`blocks/${taskId}/children?page_size=100`);

  console.log("═══════════════════════════════════════");
  console.log("📋 CONTENIDO DETALLADO DE LA TAREA");
  console.log("═══════════════════════════════════════\n");

  if (blocks.results && blocks.results.length > 0) {
    blocks.results.forEach((block) => {
      if (block.type === "heading_1") {
        console.log("\n# " + extractText(block.heading_1.rich_text));
      } else if (block.type === "heading_2") {
        console.log("\n## " + extractText(block.heading_2.rich_text));
      } else if (block.type === "heading_3") {
        console.log("\n### " + extractText(block.heading_3.rich_text));
      } else if (block.type === "paragraph") {
        const text = extractText(block.paragraph.rich_text);
        if (text.trim()) console.log(text);
      } else if (block.type === "bulleted_list_item") {
        console.log("• " + extractText(block.bulleted_list_item.rich_text));
      } else if (block.type === "numbered_list_item") {
        console.log("\n1. " + extractText(block.numbered_list_item.rich_text));
      } else if (block.type === "to_do") {
        const checked = block.to_do.checked ? "✅" : "⬜";
        console.log(checked + " " + extractText(block.to_do.rich_text));
      } else if (block.type === "code") {
        console.log(
          "```" +
            block.code.language +
            "\n" +
            extractText(block.code.rich_text) +
            "```",
        );
      } else if (block.type === "callout") {
        console.log("💡 " + extractText(block.callout.rich_text));
      } else if (block.type === "divider") {
        console.log("\n---");
      } else if (block.type === "quote") {
        console.log("> " + extractText(block.quote.rich_text));
      }
    });
  } else {
    console.log(
      "⚠️  La página no tiene contenido en bloques (solo propiedades)",
    );
    console.log("\n📝 Obteniendo propiedades de la tarea...");

    const page = await notionRequest(`pages/${taskId}`);
    console.log("\nPropiedades:");
    console.log(JSON.stringify(page.properties, null, 2));
  }
}

getTaskContent().catch(console.error);
