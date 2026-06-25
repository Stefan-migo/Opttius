# 🔌 Integración Notion MCP

Guía completa para configurar y utilizar la integración de Notion con Opttius.

---

## 🎯 Objetivos de la Integración

| Objetivo                   | Descripción                                   |
| -------------------------- | --------------------------------------------- |
| **Documentación Dinámica** | Notion como sistema de documentación dinámica |
| **Project Tracking**       | Gestión de tareas, sprints y bugs             |
| **Knowledge Base**         | Base de conocimiento centralizada             |
| **Decision Log**           | Registro de decisiones de arquitectura        |
| **Feature Tracking**       | Seguimiento de estado de features             |

---

## 🔧 Configuración de Notion

### 1. Crear Workspace en Notion

1. Ir a [Notion.so](https://www.notion.so)
2. Crear nuevo workspace "Opttius Team"
3. Configurar espacio de trabajo con estructura inicial

### 2. Obtener API Key

1. Ir a [Notion Integrations](https://www.notion.so/my-integrations)
2. Crear nueva integración:
   - **Nombre:** `Opttius Docs Sync`
   - **Permisos:** Read content, Update content, Insert content
   - **Capabilities:** Read content, Update content, Insert content
3. Copiar el **Internal Integration Token** (secret)

### 3. Configurar Variables de Entorno

Agregar al archivo `.env.local`:

```env
# Notion Integration
NOTION_API_KEY=<your_internal_integration_token>
NOTION_DATABASE_DOCS=<docs_database_id>
NOTION_DATABASE_TASKS=<tasks_database_id>
NOTION_DATABASE_FEATURES=<features_database_id>
```

### 4. Conectar con Claude MCP (Recomendado: Servidor Local)

Opttius incluye un servidor MCP local personalizado en `.mcp/notion/` con herramientas específicas para el proyecto.

#### Opción A: Servidor MCP Local (Recomendado)

```bash
# Instalar dependencias del servidor local
cd .mcp/notion
npm install

# Configurar variables de entorno (se sincronizan automáticamente)
npm run sync-env

# Configurar Claude Desktop
npm run setup-claude

# Probar conexión con Notion
npm run test-connection
```

Configuración automática para Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "opttius-notion": {
      "command": "node",
      "args": ["/ruta/absoluta/a/Opttius-app/.mcp/notion/start-server.js"],
      "env": {
        "NODE_ENV": "development",
        "NOTION_API_KEY": "${NOTION_API_KEY}",
        "NOTION_DATABASE_DOCS": "${NOTION_DATABASE_DOCS}",
        "NOTION_DATABASE_TASKS": "${NOTION_DATABASE_TASKS}",
        "NOTION_DATABASE_FEATURES": "${NOTION_DATABASE_FEATURES}"
      }
    }
  }
}
```

#### Opción B: Servidor MCP Global (Alternativa)

Si prefieres usar el servidor MCP oficial de Notion:

```json
{
  "mcpServers": {
    "notion": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-notion"],
      "env": {
        "NOTION_API_KEY": "<your_api_key>"
      }
    }
  }
}
```

**Ventajas del servidor local:**

- Herramientas personalizadas para Opttius
- Integración con bases de datos específicas del proyecto
- Sincronización automática de variables de entorno
- Mejor control de versiones y debugging

---

## 🛠️ Herramientas MCP Disponibles

El servidor MCP local de Notion proporciona 6 herramientas para interactuar con Notion:

| Herramienta            | Descripción                   | Uso común                           |
| ---------------------- | ----------------------------- | ----------------------------------- |
| `search_pages`         | Buscar páginas en Notion      | Encontrar documentación, tareas     |
| `get_page`             | Obtener página por ID         | Ver contenido completo de página    |
| `create_page`          | Crear nueva página            | Documentación nueva, notas          |
| `update_page`          | Actualizar página existente   | Actualizar estado, contenido        |
| `query_database`       | Consultar base de datos       | Filtrar tareas, docs por categoría  |
| `create_database_page` | Crear página en base de datos | Nueva tarea, documento estructurado |

### Ejemplos de Uso con Claude

```bash
# Buscar documentación sobre CRM
claude: "Buscar páginas sobre módulo CRM en Notion"

# Crear nueva tarea
claude: "Crear tarea para refactorizar sistema de pagos en la base de datos de tareas"

# Consultar documentos en revisión
claude: "Consultar base de datos de docs donde Status = 'review'"

# Actualizar estado de feature
claude: "Actualizar feature 'WhatsApp AI' a estado 'testing'"
```

### Estructura de Propiedades

Cada herramienta acepta parámetros específicos. Consulta `.mcp/notion/README.md` para detalles completos.

---

## 🗄️ Bases de Datos Recomendadas

### 1. **Docs Base** (`docs_`)

Propiedades recomendadas:

| Propiedad        | Tipo   | Descripción                                    |
| ---------------- | ------ | ---------------------------------------------- |
| **Title**        | Title  | Nombre del documento                           |
| **Category**     | Select | `architecture`, `modules`, `integration`, etc. |
| **Status**       | Select | `draft`, `reviewed`, `published`, `archived`   |
| **Last Updated** | Date   | Fecha última actualización                     |
| **Notion ID**    | Text   | ID de la página en Notion                      |
| **Repo Path**    | Text   | Ruta en repo (`docs/...`)                      |
| **Owner**        | Person | Responsable                                    |

### 2. **Tasks Board** (`tasks_`)

Propiedades para sprint management:

| Propiedad    | Tipo   | Descripción                             |
| ------------ | ------ | --------------------------------------- |
| **Task**     | Title  | Descripción de la tarea                 |
| **Status**   | Select | `todo`, `in_progress`, `review`, `done` |
| **Priority** | Select | `low`, `medium`, `high`, `critical`     |
| **Sprint**   | Select | Sprint actual                           |
| **Assignee** | Person | Responsable                             |
| **Module**   | Select | Módulo afectado                         |
| **Estimate** | Number | Estimación en horas                     |
| **Due Date** | Date   | Fecha límite                            |

### 3. **Features Tracking** (`features_`)

Propiedades para seguimiento de features:

| Propiedad      | Tipo     | Descripción                                 |
| -------------- | -------- | ------------------------------------------- |
| **Feature**    | Title    | Nombre de la feature                        |
| **Module**     | Select   | Módulo principal                            |
| **Status**     | Select   | `planned`, `in_progress`, `testing`, `done` |
| **Priority**   | Select   | `P0`, `P1`, `P2`, `P3`                      |
| **Complexity** | Select   | `small`, `medium`, `large`, `xlarge`        |
| **Epic**       | Relation | Epic relacionado                            |
| **Release**    | Select   | Release objetivo                            |

---

## 🔄 Flujo de Sincronización

### Export desde Repo → Notion

```bash
# Script de ejemplo: export-docs-to-notion.js
node scripts/export-docs-to-notion.js \
  --source docs/ \
  --database NOTION_DATABASE_DOCS \
  --category modules
```

**Reglas:**

- Solo exportar documentos con `status: reviewed` en frontmatter
- Mantener estructura de carpetas como tags
- Actualizar páginas existentes (no crear duplicados)

### Import desde Notion → Repo

```bash
# Script de ejemplo: import-notion-to-repo.js
node scripts/import-notion-to-repo.js \
  --database NOTION_DATABASE_DOCS \
  --output docs/notion-imports/ \
  --filter "Status = 'published'"
```

**Reglas:**

- Importar como Markdown con frontmatter
- Preservar relaciones entre documentos
- Mantener metadatos de Notion

---

## 🛠️ Scripts de Utilidad

### 1. Sync Single Document

```javascript
// scripts/sync-doc.js
const notion = require("@notionhq/client");
const fs = require("fs");

async function syncDocToNotion(filePath, databaseId) {
  const content = fs.readFileSync(filePath, "utf8");
  const { title, description, category } = parseFrontmatter(content);

  await notion.pages.create({
    parent: { database_id: databaseId },
    properties: {
      Title: { title: [{ text: { content: title } }] },
      Category: { select: { name: category } },
      Status: { select: { name: "draft" } },
      "Repo Path": { rich_text: [{ text: { content: filePath } }] },
    },
  });
}
```

### 2. Bulk Sync

```javascript
// scripts/bulk-sync.js
const glob = require("glob");

async function syncAllDocs() {
  const files = glob.sync("docs/**/*.md");

  for (const file of files) {
    await syncDocToNotion(file, process.env.NOTION_DATABASE_DOCS);
    console.log(`Synced: ${file}`);
  }
}
```

### 3. GitHub Action para Sync Automático

```yaml
# .github/workflows/sync-notion.yml
name: Sync Docs to Notion

on:
  push:
    paths:
      - "docs/**/*.md"
    branches: [main]

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install @notionhq/client
      - run: node scripts/sync-docs.js
        env:
          NOTION_API_KEY: ${{ secrets.NOTION_API_KEY }}
          NOTION_DATABASE_DOCS: ${{ secrets.NOTION_DATABASE_DOCS }}
```

---

## 🚀 Uso con Claude MCP

Con el servidor MCP local de Notion configurado, Claude puede acceder a las 6 herramientas para interactuar con tu workspace de Notion.

### Comandos Disponibles

```bash
# Buscar documentos en Notion
claude: "Buscar documentación sobre módulo CRM en Notion"

# Crear nueva tarea
claude: "Crear tarea para refactorizar sistema de pagos"

# Actualizar estado de feature
claude: "Actualizar estado de feature 'WhatsApp AI' a 'testing'"

# Generar reporte
claude: "Generar reporte de progreso del sprint actual"
```

### Templates para Agentes

```javascript
// Template para creación de documentación
const docTemplate = {
  title: "Título del Documento",
  properties: {
    Category: "modules",
    Module: "crm",
    Status: "draft",
    Owner: "agent-system",
  },
  content: `# ${title}\n\n## Resumen\n\n## Detalles\n\n## Referencias`,
};
```

---

## 🧪 Testing de la Integración

### Checklist de Validación

- [ ] **Conexión API:** Verificar que la API key funciona
- [ ] **Permisos:** Confirmar permisos de lectura/escritura
- [ ] **Bases de Datos:** Crear bases de datos requeridas
- [ ] **Sincronización:** Probar export/import básico
- [ ] **MCP:** Verificar conexión con Claude
- [ ] **Automation:** Probar GitHub Action

### Comandos de Prueba

```bash
# Probar conexión con Notion
node scripts/test-notion-connection.js

# Probar sync de un documento
node scripts/test-sync.js docs/README.md

# Probar import desde Notion
node scripts/test-import.js
```

---

## 🚨 Solución de Problemas

### Problemas Comunes

| Problema               | Solución                                      |
| ---------------------- | --------------------------------------------- |
| **API Error 401**      | Verificar API key y permisos                  |
| **Database Not Found** | Verificar database_id                         |
| **Rate Limiting**      | Implementar retry con exponential backoff     |
| **Content Formatting** | Usar `@notionhq/client` para formato correcto |
| **Sync Conflicts**     | Implementar sistema de versionado             |

### Logs y Monitoreo

```javascript
// Ejemplo de logging estructurado
const logger = require("../src/lib/logger");

async function syncWithRetry(operation, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      logger.error("Sync failed", {
        attempt: i + 1,
        error: error.message,
        operation: operation.name,
      });

      if (i < maxRetries - 1) {
        await sleep(1000 * Math.pow(2, i)); // Exponential backoff
      }
    }
  }
  throw new Error(`Sync failed after ${maxRetries} attempts`);
}
```

---

## 📈 Métricas y Reporting

### Dashboard Recomendado

1. **Documentation Health**
   - Total documentos
   - Por estado (draft/reviewed/published)
   - Por categoría
   - Última actualización

2. **Project Progress**
   - Tareas por sprint
   - Velocidad del equipo
   - Features completadas
   - Bugs pendientes

3. **Team Productivity**
   - Tareas por asignee
   - Tiempo promedio de resolución
   - Complejidad por módulo

### Exportar a Markdown para NotebookLM

```bash
# Exportar bases de datos completas para NotebookLM
node scripts/export-for-nlm.js \
  --databases docs,tasks,features \
  --output nlm-export/

# Importar a NotebookLM
nlm source add nlm-export/ --notebook-id <notebook-id>
```

---

## 📚 Recursos Adicionales

- [Notion API Documentation](https://developers.notion.com/)
- [Notion MCP Server](https://github.com/modelcontextprotocol/servers/tree/main/src/notion)
- [Example Sync Scripts](scripts/notion/)
- [Notion Database Templates](docs/04-integration/NOTION_DATABASES.md)
- [Notion Doc Templates](docs/04-integration/NOTION_TEMPLATES.md)

---

**Última actualización:** 2026-03-28  
**Estado:** ✅ Configuración local MCP disponible
