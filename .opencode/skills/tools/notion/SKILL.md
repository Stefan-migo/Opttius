---
name: notion
description: Expert guide for managing Notion workspaces, pages, databases, and templates for Opttius project documentation. Use when organizing team knowledge, creating documentation templates, managing project tracking, or integrating Notion with the development workflow.
---

# Notion Integration for Opttius

Expert guide for managing Notion workspaces, pages, databases, and templates.

## Cuándo Usar Este Skill

- Organizar documentación de equipo en Notion
- Crear templates de documentación
- Gestionar project tracking con Notion
- Sincronizar información entre Notion y el proyecto
- Crear bases de datos para seguimiento de tareas

## Principios

### Estructura de Workspace

- Usar jerarquía clara: Team Space > Project > Sub-pages
- Nomenclatura consistente con el proyecto
- Tags y propiedades estandarizadas

### Integración con Opttius

- Notion como "second brain" del equipo
- Docs técnicos principales en repo (`docs/`)
- Notion para planeación, tracking, brainstorm
- Mantener referencia cruzadas actualizadas

## Comandos y Herramientas

### Notion CLI (si disponible)

```bash
# Autenticación
notion login

# Sincronización de páginas
notion sync [page-id]

# Exportar a Markdown
notion export [page-id] --format markdown
```

### API de Notion

```typescript
// Integración via API
const { Client } = require("@notionhq/client");

const notion = new Client({ auth: process.env.NOTION_TOKEN });

// Buscar páginas
await notion.search({ query: "Opttius" });

// Obtener contenido de página
await notion.pages.retrieve({ page_id: "..." });

// Actualizar propiedades de base de datos
await notion.pages.update({
  page_id: "...",
  properties: { Status: { select: { name: "Done" } } },
});
```

## Templates Comunes

### Template: Sprint Planning

```markdown
## Sprint [N] - [Fecha]

### Objetivo del Sprint

[Descripción del objetivo principal]

### Tareas

- [ ] [Tarea 1]
- [ ] [Tarea 2]

### Métricas

- Velocidad:
- Tasks completadas:
- Bloqueadores:
```

### Template: Documentación Técnica

```markdown
## [Nombre del Documento]

**Fecha:** [Fecha]
**Autor:** [Nombre]
**Última actualización:** [Fecha]

### Resumen

[Breve descripción del documento]

### Detalles

[Contenido técnico]

### Referencias

- [Link a repo]
- [Link a docs]
```

## Integración con NotebookLM

Para research y síntesis de documentos:

1. Exportar desde Notion a Markdown
2. Importar a NotebookLM via `nlm source add`
3. Generar podcast/report para revisión del equipo

## Mejores Prácticas

1. **Siempre exportar** a Markdown para guardar en repo
2. **Usar templates** para consistencia
3. **Vincular con Notion IDs** en comentarios del código
4. **Sincronizar cambios** de docs técnicos bidireccionalmente
5. **No duplicar información** - Notion para tracking, docs/ para source of truth

## Documentación Relacionada

- Skill `nlm-skill` - Para sincronización con NotebookLM
- `docs/NOTEBOOKLM_SYNC.md` - Configuración de sincronización
