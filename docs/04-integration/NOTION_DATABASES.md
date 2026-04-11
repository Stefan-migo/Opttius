# 🗄️ Bases de Datos Notion para Opttius

Plantillas y configuraciones de bases de datos Notion para gestión del proyecto.

---

## 📋 Bases de Datos Principales

### 1. **Docs Base** (`docs_`)

**Propósito:** Gestión centralizada de documentación técnica.

#### Propiedades

| Propiedad          | Tipo         | Opciones                                                                                                                                     | Requerido | Descripción                 |
| ------------------ | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | --------- | --------------------------- |
| **Title**          | Title        | -                                                                                                                                            | ✅        | Nombre del documento        |
| **Category**       | Select       | `getting-started`, `architecture`, `modules`, `integration`, `devops`, `design`, `testing`, `user-guide`, `marketing`                        | ✅        | Categoría principal         |
| **Subcategory**    | Select       | Depende de Category                                                                                                                          | ❌        | Subcategoría específica     |
| **Module**         | Select       | `crm`, `appointments`, `quotes`, `pos`, `inventory`, `work-orders`, `payments`, `ai`, `whatsapp`, `agreements`, `support`, `analytics`, etc. | ❌        | Módulo relacionado          |
| **Status**         | Select       | `draft`, `in_review`, `published`, `deprecated`, `archived`                                                                                  | ✅        | Estado del documento        |
| **Priority**       | Select       | `low`, `medium`, `high`, `critical`                                                                                                          | ✅        | Prioridad de revisión       |
| **Owner**          | Person       | -                                                                                                                                            | ✅        | Responsable del documento   |
| **Reviewer**       | Person       | -                                                                                                                                            | ❌        | Revisor asignado            |
| **Last Updated**   | Date         | -                                                                                                                                            | ✅        | Fecha última actualización  |
| **Next Review**    | Date         | -                                                                                                                                            | ❌        | Próxima revisión programada |
| **Notion ID**      | Text         | -                                                                                                                                            | ✅        | ID interno de la página     |
| **Repo Path**      | Text         | -                                                                                                                                            | ✅        | Ruta en el repositorio      |
| **Notion URL**     | URL          | -                                                                                                                                            | ✅        | Link directo a la página    |
| **GitHub URL**     | URL          | -                                                                                                                                            | ✅        | Link al archivo en GitHub   |
| **Tags**           | Multi-select | `technical`, `user-guide`, `api`, `database`, `security`, `devops`, `design`                                                                 | ❌        | Tags para filtrado          |
| **Word Count**     | Number       | -                                                                                                                                            | ❌        | Conteo de palabras          |
| **Est. Read Time** | Formula      | `ceil(prop("Word Count") / 200)`                                                                                                             | ❌        | Tiempo estimado lectura     |

#### Views Recomendadas

| Vista                | Filtros              | Sorts                                   | Propósito                   |
| -------------------- | -------------------- | --------------------------------------- | --------------------------- |
| **All Docs**         | -                    | `Last Updated` (descending)             | Vista completa              |
| **By Category**      | -                    | `Category`, `Title`                     | Navegación por categoría    |
| **By Module**        | -                    | `Module`, `Title`                       | Vista por módulo            |
| **Needs Review**     | `Status = draft`     | `Priority` (descending), `Last Updated` | Docs pendientes de revisión |
| **Published**        | `Status = published` | `Category`, `Module`                    | Docs disponibles            |
| **By Owner**         | -                    | `Owner`, `Last Updated` (descending)    | Responsabilidad             |
| **Recently Updated** | -                    | `Last Updated` (descending)             | Últimos cambios             |

---

### 2. **Tasks Board** (`tasks_`)

**Propósito:** Gestión de tareas, sprints y bugs.

#### Propiedades

| Propiedad        | Tipo         | Opciones                                                                                                                                                             | Requerido | Descripción               |
| ---------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------- |
| **Task**         | Title        | -                                                                                                                                                                    | ✅        | Descripción de la tarea   |
| **Status**       | Select       | `backlog`, `todo`, `in_progress`, `review`, `done`, `blocked`, `cancelled`                                                                                           | ✅        | Estado actual             |
| **Type**         | Select       | `task`, `bug`, `feature`, `improvement`, `documentation`, `refactor`, `maintenance`                                                                                  | ✅        | Tipo de tarea             |
| **Priority**     | Select       | `P0-critical`, `P1-high`, `P2-medium`, `P3-low`                                                                                                                      | ✅        | Prioridad                 |
| **Module**       | Select       | `crm`, `appointments`, `quotes`, `pos`, `inventory`, `work-orders`, `payments`, `ai`, `whatsapp`, `agreements`, `support`, `analytics`, `system`, `devops`, `design` | ✅        | Módulo afectado           |
| **Sprint**       | Select       | `Sprint 1`, `Sprint 2`, etc.                                                                                                                                         | ✅        | Sprint asignado           |
| **Assignee**     | Person       | -                                                                                                                                                                    | ✅        | Responsable               |
| **Reporter**     | Person       | -                                                                                                                                                                    | ✅        | Creador de la tarea       |
| **Estimate**     | Number       | -                                                                                                                                                                    | ❌        | Estimación en horas       |
| **Time Spent**   | Number       | -                                                                                                                                                                    | ❌        | Tiempo consumido          |
| **Due Date**     | Date         | -                                                                                                                                                                    | ❌        | Fecha límite              |
| **Start Date**   | Date         | -                                                                                                                                                                    | ❌        | Fecha de inicio           |
| **Done Date**    | Date         | -                                                                                                                                                                    | ❌        | Fecha de completado       |
| **Parent Task**  | Relation     | Tasks                                                                                                                                                                | ❌        | Tarea padre (epic)        |
| **Related Docs** | Relation     | Docs                                                                                                                                                                 | ❌        | Documentación relacionada |
| **Labels**       | Multi-select | `frontend`, `backend`, `database`, `api`, `ui-ux`, `testing`, `security`, `performance`                                                                              | ❌        | Etiquetas técnicas        |
| **GitHub Issue** | URL          | -                                                                                                                                                                    | ❌        | Link a issue en GitHub    |
| **PR Link**      | URL          | -                                                                                                                                                                    | ❌        | Link a PR                 |
| **Blocked By**   | Relation     | Tasks                                                                                                                                                                | ❌        | Dependencias              |

#### Views Recomendadas

| Vista             | Filtros                                        | Sorts                               | Propósito               |
| ----------------- | ---------------------------------------------- | ----------------------------------- | ----------------------- |
| **Sprint Board**  | `Sprint = [current sprint]`                    | `Status`, `Priority` (descending)   | Vista Kanban del sprint |
| **Backlog**       | `Status = backlog`                             | `Priority` (descending), `Module`   | Tareas pendientes       |
| **In Progress**   | `Status = in_progress`                         | `Assignee`, `Due Date`              | Tareas activas          |
| **By Module**     | -                                              | `Module`, `Status`, `Priority`      | Tareas por módulo       |
| **My Tasks**      | `Assignee = @me`                               | `Priority` (descending), `Due Date` | Mis tareas asignadas    |
| **High Priority** | `Priority = P0-critical OR Priority = P1-high` | `Status`, `Due Date`                | Tareas críticas         |
| **Blocked Tasks** | `Status = blocked`                             | `Priority` (descending), `Module`   | Tareas bloqueadas       |

---

### 3. **Features Tracking** (`features_`)

**Propósito:** Seguimiento de features y roadmap.

#### Propiedades

| Propiedad               | Tipo     | Opciones                                                                                                                                                             | Requerido | Descripción              |
| ----------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------ |
| **Feature**             | Title    | -                                                                                                                                                                    | ✅        | Nombre de la feature     |
| **Module**              | Select   | `crm`, `appointments`, `quotes`, `pos`, `inventory`, `work-orders`, `payments`, `ai`, `whatsapp`, `agreements`, `support`, `analytics`, `system`, `devops`, `design` | ✅        | Módulo principal         |
| **Status**              | Select   | `idea`, `planned`, `in_progress`, `testing`, `done`, `released`, `postponed`, `cancelled`                                                                            | ✅        | Estado del desarrollo    |
| **Priority**            | Select   | `P0-must-have`, `P1-should-have`, `P2-nice-to-have`, `P3-future`                                                                                                     | ✅        | Prioridad del negocio    |
| **Complexity**          | Select   | `small (1-3 days)`, `medium (1-2 weeks)`, `large (2-4 weeks)`, `xlarge (1+ month)`                                                                                   | ✅        | Complejidad estimada     |
| **Epic**                | Relation | Features                                                                                                                                                             | ❌        | Epic relacionado         |
| **Release**             | Select   | `v1.0`, `v1.1`, `v1.2`, `v2.0`, etc.                                                                                                                                 | ❌        | Release objetivo         |
| **Product Owner**       | Person   | -                                                                                                                                                                    | ✅        | Dueño del producto       |
| **Tech Lead**           | Person   | -                                                                                                                                                                    | ✅        | Líder técnico            |
| **Start Date**          | Date     | -                                                                                                                                                                    | ❌        | Fecha de inicio          |
| **Target Date**         | Date     | -                                                                                                                                                                    | ❌        | Fecha objetivo           |
| **Actual Date**         | Date     | -                                                                                                                                                                    | ❌        | Fecha real de completado |
| **Related Tasks**       | Relation | Tasks                                                                                                                                                                | ❌        | Tareas relacionadas      |
| **Related Docs**        | Relation | Docs                                                                                                                                                                 | ❌        | Documentación            |
| **GitHub Milestone**    | URL      | -                                                                                                                                                                    | ❌        | Milestone en GitHub      |
| **User Story**          | Text     | -                                                                                                                                                                    | ❌        | Historia de usuario      |
| **Acceptance Criteria** | Text     | -                                                                                                                                                                    | ❌        | Criterios de aceptación  |
| **Impact**              | Select   | `high`, `medium`, `low`                                                                                                                                              | ❌        | Impacto en usuarios      |
| **Risk**                | Select   | `high`, `medium`, `low`                                                                                                                                              | ❌        | Riesgo técnico           |

#### Views Recomendadas

| Vista              | Filtros                                    | Sorts                                 | Propósito                |
| ------------------ | ------------------------------------------ | ------------------------------------- | ------------------------ |
| **Roadmap**        | `Status != cancelled AND Status != done`   | `Release`, `Priority`, `Module`       | Vista de roadmap         |
| **By Module**      | -                                          | `Module`, `Priority`, `Status`        | Features por módulo      |
| **Current Sprint** | `Status = in_progress OR Status = testing` | `Priority` (descending), `Module`     | Features en progreso     |
| **Backlog**        | `Status = idea OR Status = planned`        | `Priority` (descending), `Complexity` | Features planificadas    |
| **Completed**      | `Status = done OR Status = released`       | `Actual Date` (descending), `Module`  | Features completadas     |
| **High Impact**    | `Impact = high`                            | `Priority` (descending), `Status`     | Features de alto impacto |

---

### 4. **Knowledge Base** (`knowledge_`)

**Propósito:** Base de conocimiento, decisiones de arquitectura, investigación.

#### Propiedades

| Propiedad            | Tipo         | Opciones                                                                                                            | Requerido | Descripción             |
| -------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------- | --------- | ----------------------- |
| **Title**            | Title        | -                                                                                                                   | ✅        | Título del conocimiento |
| **Type**             | Select       | `decision`, `research`, `pattern`, `best-practice`, `tutorial`, `reference`, `cheatsheet`                           | ✅        | Tipo de contenido       |
| **Topic**            | Select       | `architecture`, `database`, `frontend`, `backend`, `security`, `devops`, `performance`, `testing`, `ai`, `payments` | ✅        | Tópico principal        |
| **Status**           | Select       | `draft`, `reviewed`, `approved`, `deprecated`                                                                       | ✅        | Estado                  |
| **Owner**            | Person       | -                                                                                                                   | ✅        | Creador                 |
| **Created Date**     | Date         | -                                                                                                                   | ✅        | Fecha de creación       |
| **Updated Date**     | Date         | -                                                                                                                   | ✅        | Fecha de actualización  |
| **Related Features** | Relation     | Features                                                                                                            | ❌        | Features relacionadas   |
| **Related Tasks**    | Relation     | Tasks                                                                                                               | ❌        | Tareas relacionadas     |
| **Tags**             | Multi-select | `technical-debt`, `optimization`, `scalability`, `security`, `migration`, `refactor`                                | ❌        | Tags adicionales        |
| **Impact**           | Select       | `team`, `project`, `company`                                                                                        | ❌        | Alcance del impacto     |
| **NotebookLM ID**    | Text         | -                                                                                                                   | ❌        | ID en NotebookLM        |

#### Views Recomendadas

| Vista              | Filtros                | Sorts                                        | Propósito              |
| ------------------ | ---------------------- | -------------------------------------------- | ---------------------- |
| **Decisions Log**  | `Type = decision`      | `Created Date` (descending)                  | Registro de decisiones |
| **Research**       | `Type = research`      | `Topic`, `Created Date` (descending)         | Investigaciones        |
| **Best Practices** | `Type = best-practice` | `Topic`, `Status`                            | Mejores prácticas      |
| **By Topic**       | -                      | `Topic`, `Type`, `Created Date` (descending) | Organizado por tópico  |
| **Recent**         | -                      | `Updated Date` (descending)                  | Conocimiento reciente  |

---

## 🚀 Scripts de Creación

### Crear Base de Datos Docs

```javascript
// scripts/create-notion-databases.js
const { Client } = require("@notionhq/client");

const notion = new Client({ auth: process.env.NOTION_API_KEY });

async function createDocsDatabase(parentPageId) {
  return await notion.databases.create({
    parent: { page_id: parentPageId },
    title: [{ type: "text", text: { content: "Opttius Docs" } }],
    properties: {
      Title: { title: {} },
      Category: {
        select: {
          options: [
            { name: "getting-started", color: "blue" },
            { name: "architecture", color: "green" },
            // ... más opciones
          ],
        },
      },
      Status: {
        select: {
          options: [
            { name: "draft", color: "gray" },
            { name: "in_review", color: "yellow" },
            { name: "published", color: "green" },
            { name: "deprecated", color: "red" },
            { name: "archived", color: "brown" },
          ],
        },
      },
      // ... más propiedades
    },
  });
}
```

### Template para Importación Inicial

```json
{
  "databases": [
    {
      "name": "Opttius Docs",
      "template": "docs",
      "parent_page_id": "MAIN_PAGE_ID"
    },
    {
      "name": "Opttius Tasks",
      "template": "tasks",
      "parent_page_id": "MAIN_PAGE_ID"
    },
    {
      "name": "Opttius Features",
      "template": "features",
      "parent_page_id": "MAIN_PAGE_ID"
    },
    {
      "name": "Opttius Knowledge",
      "template": "knowledge",
      "parent_page_id": "MAIN_PAGE_ID"
    }
  ]
}
```

---

## 🔗 Relaciones entre Bases de Datos

### Estructura de Relaciones

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Features      │◄──►│     Tasks       │◄──►│      Docs       │
│   (Roadmap)     │    │   (Execution)   │    │ (Documentation) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Knowledge     │    │   Sprints       │    │   Releases      │
│   (Decisions)   │    │   (Planning)    │    │   (Delivery)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Propiedades de Relación

1. **Features ↔ Tasks:** Una feature tiene múltiples tasks
2. **Tasks ↔ Docs:** Cada task puede crear/actualizar docs
3. **Features ↔ Docs:** Cada feature debe tener docs asociados
4. **Knowledge ↔ All:** Knowledge referencia todos los otros tipos

---

## 🧪 Validación de Configuración

### Checklist de Validación

- [ ] Todas las bases de datos creadas
- [ ] Propiedades configuradas correctamente
- [ ] Views establecidas
- [ ] Relaciones funcionando
- [ ] Permisos configurados
- [ ] API access funcionando
- [ ] Templates disponibles
- [ ] Backup configurado

### Comandos de Validación

```bash
# Verificar conexión con API
node scripts/verify-notion-connection.js

# Validar estructura de bases de datos
node scripts/validate-database-structure.js

# Probar creación de páginas
node scripts/test-page-creation.js

# Probar relaciones
node scripts/test-relations.js
```

---

## 📈 Métricas y Reporting

### Dashboard de Métricas

1. **Documentation Health**

   ```javascript
   // Métricas clave
   const metrics = {
     totalDocs: await countDocs(),
     publishedRatio: await getPublishedRatio(),
     avgUpdateAge: await getAverageUpdateAge(),
     docsWithoutOwner: await countDocsWithoutOwner(),
     reviewBacklog: await countDocsNeedingReview(),
   };
   ```

2. **Project Velocity**

   ```javascript
   const velocity = {
     tasksCompleted: await countCompletedTasks("currentSprint"),
     avgCompletionTime: await getAverageCompletionTime(),
     burndownRate: await calculateBurndownRate(),
     blockerCount: await countBlockedTasks(),
   };
   ```

3. **Feature Progress**
   ```javascript
   const progress = {
     featuresInProgress: await countFeaturesByStatus("in_progress"),
     completionRate: await calculateCompletionRate(),
     riskScore: await calculateOverallRiskScore(),
     roadmapHealth: await assessRoadmapHealth(),
   };
   ```

---

## 🚨 Troubleshooting

### Problemas Comunes

| Problema               | Causa Probable           | Solución                       |
| ---------------------- | ------------------------ | ------------------------------ |
| **Missing Properties** | Database mal configurada | Revisar propiedades requeridas |
| **Broken Relations**   | IDs inválidos o permisos | Verificar IDs y permisos       |
| **API Rate Limits**    | Demasiadas requests      | Implementar rate limiting      |
| **Sync Conflicts**     | Updates simultáneos      | Implementar sistema de locks   |
| **Permission Denied**  | API key sin permisos     | Actualizar integración         |

### Logs Recomendados

```javascript
const logger = {
  info: (message, metadata) =>
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "INFO",
        message,
        ...metadata,
      }),
    ),
  error: (message, error, metadata) =>
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "ERROR",
        message,
        error: error.message,
        stack: error.stack,
        ...metadata,
      }),
    ),
};
```

---

**Última actualización:** 2026-03-28  
**Estado:** 🚧 Templates listos para implementación
