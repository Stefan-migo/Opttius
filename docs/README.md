# 📚 Documentación Opttius — Índice Maestro

> **Última actualización:** 2026-09-05
> **Source of truth del repo:** README raíz + este índice + `docs/`
> **Estado:** Proyecto activo — SaaS multi-tenant para ópticas (Next.js 14 + Supabase)

---

## 🎯 Navegación Rápida

| Necesitas...                      | Ve a...                                                                          |
| --------------------------------- | -------------------------------------------------------------------------------- |
| Entender el proyecto en 5 minutos | [`01-getting-started/PROJECT_SUMMARY.md`](01-getting-started/PROJECT_SUMMARY.md) |
| Empezar a desarrollar             | [`01-getting-started/SETUP_GUIDE.md`](01-getting-started/SETUP_GUIDE.md)         |
| Stack, módulos y puesta en marcha | [`../README.md`](../README.md) (README raíz)                                     |
| Convención de migraciones de DB   | [`database/MIGRATION_CONVENTION.md`](database/MIGRATION_CONVENTION.md)           |
| CI/CD                             | [`../docs/CI-CD.md`](../docs/CI-CD.md)                                           |

---

## 📁 Estructura de Documentación

```
docs/
├── README.md                     ← Este archivo (Índice Maestro)
├── 01-getting-started/           ← 🚀 Inicio (setup, resumen, demo, videos)
├── 02-architecture/              ← 🏗️ Arquitectura, auth, SaaS engine
├── 03-modules/                   ← 📦 Módulos del sistema (crm, pos, ai, ...)
├── 04-integration/               ← 🔌 Supabase, Notion, NotebookLM, seeds
├── 05-devops/                    ← ⚙️ DevOps
├── 06-design/                    ← 🎨 Design system e identidad
├── 07-testing/                   ← 🧪 Testing (E2E, checklists)
├── 08-user-guide/                ← 👤 Guías de usuario
├── 09-marketing/                 ← 📢 Marketing, SEO/AIO, contenido
├── audits/                       ← 🔍 Auditorías de seguridad y código
├── database/                     ← 🗄️ Documentación de DB y migraciones
├── migrations/                   ← Migraciones y planes
├── plans/                        ← 📋 Planes de implementación
├── roadmap/                      ← 🗺️ Roadmaps y auditorías de fases
└── archive/                      ← 🗃️ Histórico (obsoleto, referencia)
```

---

## 🚀 Inicio Rápido (`01-getting-started`)

| Documento                                                             | Descripción                            |
| --------------------------------------------------------------------- | -------------------------------------- |
| [`SETUP_GUIDE.md`](01-getting-started/SETUP_GUIDE.md)                 | Guía de configuración local (completa) |
| [`PROJECT_SUMMARY.md`](01-getting-started/PROJECT_SUMMARY.md)         | Resumen ejecutivo del proyecto         |
| [`DEMO_OPTICA_README.md`](01-getting-started/DEMO_OPTICA_README.md)   | Guía de la demo de óptica              |
| [`VIDEOTUTORIALES_MAP.md`](01-getting-started/VIDEOTUTORIALES_MAP.md) | Mapa de videotutoriales                |

> El setup corto (stack + env + migraciones + scripts) vive en el [`README.md`](../README.md) raíz.

## 🏗️ Arquitectura (`02-architecture`)

- [`README.md`](02-architecture/README.md) — índice de arquitectura
- Auth, SaaS Management Engine, Lead pipeline, System Configuration

## 📦 Módulos (`03-modules`)

Cada módulo tiene su propio README bajo `03-modules/<modulo>/`. Índice: [`03-modules/README.md`](03-modules/README.md)

| Módulo             | Descripción                  |
| ------------------ | ---------------------------- |
| `crm`              | Clientes, recetas, historial |
| `appointments`     | Citas y calendario           |
| `quotes`           | Presupuestos                 |
| `pos`              | Punto de venta               |
| `inventory`        | Inventario y stock           |
| `work-orders`      | Trabajos de laboratorio      |
| `payments`         | Pasarelas de pago            |
| `agreements`       | Convenios institucionales    |
| `field-operations` | Operativos en terreno        |
| `ai`               | Agente IA, insights, memoria |
| `whatsapp`         | WhatsApp AI agent            |
| `support`          | Tickets B2B/B2C              |
| `analytics`        | Métricas y KPIs              |
| `admin`            | Panel de administración      |
| `saas`             | Gestión SaaS multi-tenant    |
| `user-profile`     | Perfiles de usuario          |
| `notifications`    | Notificaciones               |
| `emails`           | Emails transaccionales       |

## 🧪 Testing (`07-testing`)

| Documento                                                                         | Descripción             |
| --------------------------------------------------------------------------------- | ----------------------- |
| [`E2E_TESTING.md`](07-testing/E2E_TESTING.md)                                     | Suite E2E Playwright    |
| [`TESTING_GUIDE.md`](07-testing/TESTING_GUIDE.md)                                 | Guía general de testing |
| [`MANUAL_TESTING_GUIDE_COMPLETE.md`](07-testing/MANUAL_TESTING_GUIDE_COMPLETE.md) | Testing manual completo |
| `CHECKLISTS/`                                                                     | Checklists por módulo   |

> Convenciones de testing y data contract E2E también viven en `.opencode/skills/system/testing-optical-supabase`.

## 🔌 Integraciones (`04-integration`)

- [`NOTION.md`](04-integration/NOTION.md) — integración con Notion
- [`NOTEBOOKLM_SYNC.md`](04-integration/NOTEBOOKLM_SYNC.md) — sync NotebookLM
- Supabase, seeds y constraints de referencia

## 🎨 Design (`06-design`)

- [`README.md`](06-design/README.md) — índice de design system
- Identidad, frontend responsivo (Epoch)

---

## 📝 Convenciones de Documentación

- **Nomenclatura:** kebab-case para archivos nuevos.
- **Prefijos numéricos** (`01-...`, `02-...`) solo en carpetas que requieren orden.
- **Frontmatter** sugerido en documentos nuevos:

```markdown
---
title: Título
description: Breve descripción (1-2 líneas)
lastUpdated: 2026-09-05
author: Nombre del Autor
status: draft | reviewed | active | deprecated
---
```

- **Archivos históricos** van a `docs/archive/` (no se borran: referencia).

---

## 🔗 Recursos Externos

| Recurso                  | URL/ID                                 |
| ------------------------ | -------------------------------------- |
| **Vercel Production**    | https://opttius.vercel.app             |
| **Supabase Production**  | https://opttius.supabase.co            |
| **NotebookLM Principal** | `e071bebc-ce79-4b32-a040-61a6a9c331a3` |
| **NotebookLM Extendido** | `17302d9d-7d70-4c8d-a774-49fbfca3c09d` |

---

> ⚠️ **Estado de docs:** varias carpetas (`archive/`, secciones viejas) aún contienen documentación histórica que puede no reflejar el estado actual del código. El README raíz y este índice se actualizan contra el estado real del repo; si encontrás una doc interna contradictoria, el código manda.
