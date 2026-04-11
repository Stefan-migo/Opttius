# 📚 Documentación Opttius - Índice Maestro

> **Última actualización:** 2026-03-28
> **Versión:** 5.0 - Reorganización + Notion Integration
> **Source of Truth:** [Notion Workspace](https://notion.so/opttius)

---

## 🎯 Navegación Rápida

| Necesitas...                      | Ve a...                                                                 |
| --------------------------------- | ----------------------------------------------------------------------- |
| Entender el proyecto en 5 minutos | [`PROJECT_SUMMARY.md`](PROJECT_SUMMARY.md)                              |
| Empezar a desarrollar             | [`SETUP_GUIDE.md`](../SETUP_GUIDE.md)                                   |
| Revisar estado de features        | [Notion - Feature Tracking](https://notion.so/opttius/feature-tracking) |
| Revisar bugs y tareas             | [Notion - Sprint Board](https://notion.so/opttius/sprint-board)         |
| Ver documentación dinámica        | [Notion - Docs Base](https://notion.so/opttius/docs-base)               |

---

## 📁 Estructura de Documentación

```
docs/
├── README.md                          ← Este archivo (Índice Maestro)
├── PROJECT_SUMMARY.md                ← Resumen ejecutivo del proyecto
├── SETUP_GUIDE.md                    ← Guía de configuración (en raíz)
│
├── 01-getting-started/                ← 🚀 Inicio Rápido
│   ├── README.md
│   ├── QUICK_START.md
│   ├── ENVIRONMENT.md
│   └── TROUBLESHOOTING.md
│
├── 02-architecture/                 ← 🏗️ Arquitectura
│   ├── README.md
│   ├── SYSTEM_OVERVIEW.md
│   ├── DATA_MODEL.md
│   ├── API_SPEC.md
│   └── SECURITY.md
│
├── 03-modules/                      ← 📦 Módulos del Sistema
│   ├── README.md
│   ├── crm/
│   ├── appointments/
│   ├── quotes/
│   ├── pos/
│   ├── inventory/
│   ├── work-orders/
│   ├── payments/
│   ├── ai/
│   ├── whatsapp/
│   ├── agreements/
│   ├── support/
│   └── analytics/
│
├── 04-integration/                  ← 🔌 Integraciones
│   ├── README.md
│   ├── SUPABASE.md
│   ├── NOTION.md
│   ├── PAYMENT_GATEWAYS.md
│   └── AI_PROVIDERS.md
│
├── 05-devops/                       ← 🛠️ DevOps
│   ├── README.md
│   ├── DEPLOYMENT.md
│   ├── CI_CD.md
│   └── MONITORING.md
│
├── 06-design/                      ← 🎨 Design System
│   ├── README.md
│   ├── EPOCH_DESIGN.md
│   ├── COMPONENTS.md
│   └── RESPONSIVE.md
│
├── 07-testing/                      ← 🧪 Testing
│   ├── README.md
│   ├── E2E_TESTS.md
│   ├── UNIT_TESTS.md
│   └── CHECKLISTS/
│
├── 08-user-guide/                   ← 👤 Guías de Usuario
│   ├── README.md
│   └── flujos/
│
├── 09-marketing/                   ← 📢 Marketing
│   ├── README.md
│   ├── BRAND.md
│   ├── SEO.md
│   ├── CONTENT_PLAN.md
│   └── SOCIAL_MEDIA.md
│
├── archive/                         ← 📦 Archivo (obsoleto)
│   ├── README.md
│   └── (archivos descontinuados)
│
├── API/                           ← Estado de APIs (generado)
│   └── SPEC.md
│
└── database/                     ← Documentación de DB (legacy)
    └── SUPABASE_DATABASE_DOCUMENTATION.md
```

---

## 🔗 Integración con Notion

### Bases de Datos Principales

| Base                 | Propósito                                     | Link                                             |
| -------------------- | --------------------------------------------- | ------------------------------------------------ |
| **Docs Base**        | Documentación dinámica y referencias cruzadas | [Notion](https://notion.so/opttius/docs-base)    |
| **Feature Tracking** | Estado de features por módulo                 | [Notion](https://notion.so/opttius/features)     |
| **Sprint Board**     | Tareas y bugs activos                         | [Notion](https://notion.so/opttius/sprint-board) |
| **Knowledge Base**   | Resúmenes de investigación                    | [Notion](https://notion.so/opttius/knowledge)    |
| **Decision Log**     | Decisiones de arquitectura                    | [Notion](https://notion.so/opttius/decisions)    |

### Flujo de Documentación

```
Repo (docs/) ──────────────> Notion
   │                        │
   │  [Export]            [Import]
   │                        │
   ▼                        ▼
Static Docs             Dynamic Docs
(Tech Specs)            (Planning, Tracking)
```

**Regla:**

- Docs técnicos principales siempre en repo (`docs/02-architecture/`, `docs/03-modules/`)
- Notion para planificación, tracking y documentación dinámica
- Mantener bidireccionalidad con exports regulares

---

## 📋 Por Área

### 🚀 Inicio Rápido

- [`01-getting-started/QUICK_START.md`](01-getting-started/QUICK_START.md)
- [`01-getting-started/ENVIRONMENT.md`](01-getting-started/ENVIRONMENT.md)
- [`01-getting-started/TROUBLESHOOTING.md`](01-getting-started/TROUBLESHOOTING.md)

### 🏗️ Arquitectura

- [`02-architecture/SYSTEM_OVERVIEW.md`](02-architecture/SYSTEM_OVERVIEW.md)
- [`02-architecture/DATA_MODEL.md`](02-architecture/DATA_MODEL.md)
- [`02-architecture/API_SPEC.md`](02-architecture/API_SPEC.md)
- [`02-architecture/SECURITY.md`](02-architecture/SECURITY.md)
- [`02-architecture/SAAS_MANAGEMENT_ENGINE.md`](02-architecture/SAAS_MANAGEMENT_ENGINE.md)
- [`02-architecture/SAAS_LEAD_MANAGEMENT_PIPELINE.md`](02-architecture/SAAS_LEAD_MANAGEMENT_PIPELINE.md) ← **NUEVO**

### 📦 Módulos

| Módulo       | Documentación                                                            | Estado    |
| ------------ | ------------------------------------------------------------------------ | --------- |
| CRM          | [`03-modules/crm/README.md`](03-modules/crm/README.md)                   | ✅ Activo |
| Appointments | [`03-modules/appointments/README.md`](03-modules/appointments/README.md) | ✅ Activo |
| Quotes       | [`03-modules/quotes/README.md`](03-modules/quotes/README.md)             | ✅ Activo |
| POS          | [`03-modules/pos/README.md`](03-modules/pos/README.md)                   | ✅ Activo |
| Inventory    | [`03-modules/inventory/README.md`](03-modules/inventory/README.md)       | ✅ Activo |
| Work Orders  | [`03-modules/work-orders/README.md`](03-modules/work-orders/README.md)   | ✅ Activo |
| Payments     | [`03-modules/payments/README.md`](03-modules/payments/README.md)         | ✅ Activo |
| AI           | [`03-modules/ai/README.md`](03-modules/ai/README.md)                     | ✅ Activo |
| WhatsApp     | [`03-modules/whatsapp/README.md`](03-modules/whatsapp/README.md)         | ✅ Activo |
| Agreements   | [`03-modules/agreements/README.md`](03-modules/agreements/README.md)     | ✅ Activo |
| Support      | [`03-modules/support/README.md`](03-modules/support/README.md)           | ✅ Activo |
| Analytics    | [`03-modules/analytics/README.md`](03-modules/analytics/README.md)       | ✅ Activo |

### 🔌 Integraciones

- [`04-integration/SUPABASE.md`](04-integration/SUPABASE.md)
- [`04-integration/NOTION.md`](04-integration/NOTION.md)
- [`04-integration/PAYMENT_GATEWAYS.md`](04-integration/PAYMENT_GATEWAYS.md)
- [`04-integration/AI_PROVIDERS.md`](04-integration/AI_PROVIDERS.md)

### 🎨 Design System

- [`06-design/EPOCH_DESIGN.md`](06-design/EPOCH_DESIGN.md)
- [`06-design/COMPONENTS.md`](06-design/COMPONENTS.md)
- [`06-design/RESPONSIVE.md`](06-design/RESPONSIVE.md)

### 🧪 Testing

- [`07-testing/E2E_TESTS.md`](07-testing/E2E_TESTS.md)
- [`07-testing/UNIT_TESTS.md`](07-testing/UNIT_TESTS.md)
- [`07-testing/CHECKLISTS/`](07-testing/CHECKLISTS/)

---

## 🎯 Recursos Externos

| Recurso                  | ID/URL                                 |
| ------------------------ | -------------------------------------- |
| **NotebookLM Principal** | `e071bebc-ce79-4b32-a040-61a6a9c331a3` |
| **NotebookLM Extendido** | `17302d9d-7d70-4c8d-a774-49fbfca3c09d` |
| **Vercel Production**    | https://opttius.vercel.app             |
| **Supabase Production**  | https://opttius.supabase.co            |

---

## 📝 Convenciones de Documentación

### Nomenclatura de Archivos

- **Kebab-case:** `system-overview.md` (no `systemOverview.md`)
- **Prefijos numéricos:** `01-getting-started/` para control de orden
- **Mayúsculas solo en英文:** `README.md`, `API.md`

### Frontmatter

Todos los documentos deben incluir:

```markdown
---
title: Título del Documento
description: Breve descripción (1-2 líneas)
lastUpdated: 2026-03-28
author: Nombre del Autor
status: draft | reviewed | active | deprecated
notionId: (opcional) ID de Notion para referencia cruzada
---
```

### Tags de Estado

| Tag                | Significado                          |
| ------------------ | ------------------------------------ |
| `✅ Estable`       | Documento completo y actualizado     |
| `🔄 En Desarrollo` | Documento en progreso                |
| `⚠️ Legacy`        | Documento obsoleto pero referenciado |
| `🗃️ Archivo`       | Documento movido a archive/          |

---

## 🔄 Sincronización con Notion

### Export a Markdown

```bash
# Exportar página de Notion a Markdown
notion export <page-id> --format markdown --output docs/
```

### Import desde Repo

```bash
# Importar a Notion
nlm source add --path docs/
```

**Frecuencia:**

- Docs de arquitectura: export manual después de cambios significativos
- Sprint boards: sincronización diaria
- Feature tracking: sincronización en merge de features

---

## 📞 Soporte

¿Necesitas ayuda con la documentación?

1. **Revisa el índice above** para encontrar lo que buscas
2. **Consulta Notion** para información dinámica
3. **Abre un issue** en GitHub si hay errores o sugerencias

---

**Nota:** Este índice se actualiza automáticamente en cada release. La versión más reciente está siempre en este archivo.
