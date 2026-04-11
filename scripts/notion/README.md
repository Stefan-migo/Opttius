# 📚 Scripts de Integración Notion

Scripts para sincronizar documentación entre el repositorio Opttius y Notion.

---

## 🚀 Uso Rápido

### Prerrequisitos

```bash
npm install @notionhq/client yargs
```

### Configurar Variables de Entorno

```bash
# En .env.local o exportar
export NOTION_API_KEY="your_notion_integration_token"
export NOTION_DATABASE_DOCS="your_docs_database_id"
export NOTION_DATABASE_TASKS="your_tasks_database_id"
```

### Sincronizar Documentación

```bash
# Dry run (sin cambios reales)
node scripts/notion/sync-docs-example.js \
  --database $NOTION_DATABASE_DOCS \
  --dry-run \
  --verbose

# Sincronización real
node scripts/notion/sync-docs-example.js \
  --database $NOTION_DATABASE_DOCS
```

---

## 📁 Scripts Disponibles

| Script                 | Descripción                             | Uso                                       |
| ---------------------- | --------------------------------------- | ----------------------------------------- |
| `sync-docs-example.js` | Sincroniza documentos markdown a Notion | `node sync-docs-example.js --database ID` |
| `create-databases.js`  | Crea bases de datos en Notion           | `node create-databases.js`                |
| `test-connection.js`   | Prueba conexión con API Notion          | `node test-connection.js`                 |

---

## 🔧 Configuración Detallada

### 1. Obtener API Key de Notion

1. Ir a [Notion Integrations](https://www.notion.so/my-integrations)
2. Crear nueva integración "Opttius Docs Sync"
3. Copiar **Internal Integration Token**
4. Compartir integración con tu workspace

### 2. Obtener Database IDs

1. Crear base de datos en Notion
2. Obtener ID desde URL: `https://www.notion.so/workspace/{database_id}?v=...`
3. Compartir base de datos con la integración

### 3. Configurar Permisos

La integración necesita permisos para:

- **Read content** (leer contenido)
- **Update content** (actualizar contenido)
- **Insert content** (insertar contenido)

---

## 🔄 Flujo de Sincronización

### Export desde Repo → Notion

```
docs/ (markdown files)
   ↓ Parse frontmatter & content
   ↓ Convert to Notion properties & blocks
   ↓ Create/update pages in Notion database
Notion Database
```

### Import desde Notion → Repo

```
Notion Database
   ↓ Query pages with filter
   ↓ Convert to markdown with frontmatter
   ↓ Write to docs/ directory
docs/ (updated markdown files)
```

---

## 📋 Frontmatter Esperado

Los documentos markdown deben incluir frontmatter:

```yaml
---
title: "Título del Documento"
description: "Descripción breve"
category: "modules" # getting-started, architecture, modules, etc.
module: "crm" # Módulo específico (opcional)
status: "draft" # draft, in_review, published, deprecated, archived
priority: "medium" # low, medium, high, critical
author: "Nombre"
lastUpdated: "2026-03-28"
tags: ["technical", "api"]
---
```

---

## 🧪 Testing

### Probar Conexión

```bash
node scripts/notion/test-connection.js
```

### Probar con un Documento

```bash
# Probar sincronización de un solo archivo
node scripts/notion/sync-docs-example.js \
  --database $NOTION_DATABASE_DOCS \
  --source docs/README.md \
  --dry-run
```

### Validar Estructura

```bash
# Validar que todos los documentos tienen frontmatter correcto
node scripts/notion/validate-docs.js --source docs/
```

---

## 🚨 Solución de Problemas

### Error: "API token is invalid"

1. Verificar que el token sea correcto
2. Verificar que la integración esté compartida con el workspace
3. Verificar que el workspace esté activo

### Error: "Database not found"

1. Verificar database_id en la URL
2. Verificar que la base de datos esté compartida con la integración
3. Verificar permisos de la integración

### Error: Rate Limiting

La API de Notion tiene rate limits:

- 3 requests por segundo por integración
- Implementar retry con exponential backoff

### Contenido No Se Muestra Correctamente

1. Verificar formato de blocks Notion
2. Probar con contenido simple primero
3. Revisar límites de tamaño por bloque

---

## 📈 Métricas y Monitoreo

### Logs Estructurados

Los scripts generan logs en formato:

```json
{
  "timestamp": "2026-03-28T15:30:00Z",
  "level": "INFO",
  "action": "sync",
  "file": "docs/README.md",
  "result": "created",
  "pageId": "abc123"
}
```

### Métricas a Monitorear

- Tiempo de sincronización promedio
- Tasa de éxito/error
- Número de documentos sincronizados
- Tiempo entre sincronizaciones

---

## 🔒 Seguridad

### Buenas Prácticas

1. **Nunca commitear tokens** en el repositorio
2. Usar variables de entorno o secret management
3. Rotar tokens periódicamente
4. Usar permisos mínimos necesarios
5. Monitorear actividad de la integración

### Configuración Segura

```bash
# Usar .env.local (en .gitignore)
echo "NOTION_API_KEY=your_token" >> .env.local

# O usar GitHub Secrets en Actions
# secrets.NOTION_API_KEY
```

---

## 🚀 GitHub Actions

### Workflow de Sincronización Automática

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
      - run: node scripts/notion/sync-docs-example.js
        env:
          NOTION_API_KEY: ${{ secrets.NOTION_API_KEY }}
          NOTION_DATABASE_DOCS: ${{ secrets.NOTION_DATABASE_DOCS }}
```

---

## 📚 Recursos Adicionales

- [Notion API Documentation](https://developers.notion.com/)
- [Notion JavaScript SDK](https://github.com/makenotion/notion-sdk-js)
- [Notion Markdown Import Examples](https://github.com/makenotion/notion-sdk-js/tree/main/examples/markdown-import)
- [Rate Limiting Guidelines](https://developers.notion.com/reference/request-limits)

---

**Última actualización:** 2026-03-28  
**Estado:** 🚧 En desarrollo
