# Agentes OpenCode — Opttius

Sistema de agentes para el proyecto Opttius — SaaS multi-tenant para ópticas.

## Agentes Principales (Primary)

Cambiá entre ellos con **TAB**:

| Agente      | Descripción                                                                                |
| ----------- | ------------------------------------------------------------------------------------------ |
| **Opttius** | Agente principal. Contexto completo del proyecto, NotebookLM, skills de dominio.           |
| **Build**   | Desarrollo activo. Full tool access para implementar features, fixes, y refactorizaciones. |

## Agente Orchestrator

| Agente                    | Descripción                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------ |
| **@opttius-orchestrator** | SDD Orchestrator. Coordina sub-agentes, nunca hace trabajo inline. Usá `/sdd-new` para arrancar. |

## Subagentes de Dominio (@)

Invocables con **@mention** directa:

| Subagente      | Uso          | Descripción                                                                   |
| -------------- | ------------ | ----------------------------------------------------------------------------- |
| **@database**  | `@database`  | Supabase, schema, RLS, migrations                                             |
| **@frontend**  | `@frontend`  | UI/UX, diseño Epoch, componentes                                              |
| **@backend**   | `@backend`   | APIs, business logic, servicios                                               |
| **@qa**        | `@qa`        | Testing, checklists, E2E                                                      |
| **@devops**    | `@devops`    | Infra, Vercel, CI/CD, deployments                                             |
| **@github**    | `@github`    | Git/GitHub operations: branches, commits, issues, PRs, releases, CI debugging |
| **@docs**      | `@docs`      | Documentación, guías                                                          |
| **@marketing** | `@marketing` | Estrategia de marketing, contenido, SEO                                       |
| **@review**    | `@review`    | Auditoría de código, PR reviews, judgment-day                                 |

## Subagentes SDD (vía Orchestrator)

Gestionados automáticamente por `@opttius-orchestrator`. No invocar directamente salvo que sepas lo que hacés.

| Subagente     | Fase SDD       | Descripción                          |
| ------------- | -------------- | ------------------------------------ |
| `sdd-explore` | Exploration    | Investigar ideas y codebase          |
| `sdd-propose` | Proposal       | Crear propuestas de cambio           |
| `sdd-spec`    | Specification  | Escribir especificaciones detalladas |
| `sdd-design`  | Design         | Diseñar arquitectura técnica         |
| `sdd-tasks`   | Tasks          | Dividir en tareas implementables     |
| `sdd-apply`   | Implementation | Implementar código desde tasks       |
| `sdd-verify`  | Verification   | Validar implementación contra specs  |
| `sdd-archive` | Archive        | Archivar cambios completados         |
| `sdd-init`    | Init           | Bootstrap SDD context                |
| `sdd-onboard` | Onboarding     | Walkthrough guiado del ciclo SDD     |

## Skills Disponibles

Skills de dominio para cargar con `skill()`:

### Domain (`.opencode/skills/domain/`)

| Skill                                   | Módulo            |
| --------------------------------------- | ----------------- |
| `admin-users-optical-supabase`          | Admin users       |
| `agreements-optical-supabase`           | Convenios         |
| `ai-optical-supabase`                   | Chat IA, insights |
| `analytics-optical-supabase`            | Métricas, KPIs    |
| `appointments-optical-supabase`         | Citas             |
| `crm-optical-supabase`                  | Clientes          |
| `dashboard-optical-supabase`            | Dashboard         |
| `database-optical-supabase`             | Schema, RLS       |
| `emails-optical-supabase`               | Emails            |
| `field-operations-optical-supabase`     | Operativos        |
| `inventory-optical-supabase`            | Inventario        |
| `libro-recetas-digital-optical`         | Libro recetas     |
| `notifications-optical-supabase`        | Notificaciones    |
| `payment-workflow-optical-supabase`     | Pagos             |
| `pos-optical-supabase`                  | POS               |
| `quotes-optical-supabase`               | Presupuestos      |
| `saas-management-optical-supabase`      | SaaS management   |
| `support-optical-supabase`              | Soporte           |
| `system-configuration-optical-supabase` | Config sistema    |
| `tiers-optical-supabase`                | Tiers             |
| `user-profile-optical-supabase`         | Perfiles          |
| `whatsapp-agent-training-optical`       | Training WhatsApp |
| `whatsapp-ai-agent-optical`             | WhatsApp IA       |
| `work-orders-optical-supabase`          | Work orders       |

### System (`.opencode/skills/system/`)

| Skill                         | Descripción        |
| ----------------------------- | ------------------ |
| `frontend-design-modern`      | Diseño Epoch       |
| `opttius-identity`            | Identidad de marca |
| `responsive-frontend-optical` | Responsive         |
| `seo-aio-optical-discovery`   | SEO/AIO            |
| `supabase-auth`               | Auth, RLS          |
| `testing-optical-supabase`    | Testing            |

### Tools (`.opencode/skills/tools/`)

| Skill       | Descripción                                                                |
| ----------- | -------------------------------------------------------------------------- |
| `nlm-skill` | NotebookLM CLI                                                             |
| `notion`    | Notion integration                                                         |
| `github`    | Git/GitHub operations, git safety, conventional commits, PR/issue workflow |

### Security (`.opencode/skills/security/`)

| Skill            | Descripción  |
| ---------------- | ------------ |
| `security-audit` | OWASP audit  |
| `code-reviewer`  | Code quality |

### Skills Globales (autoritativas desde `~/.config/opencode/`)

Cargables via `skill()`. No tienen copia local en el proyecto — las globales son la fuente de verdad.

| Skill             | Descripción                                   |
| ----------------- | --------------------------------------------- |
| `cortex-persona`  | Senior Architect persona, Ponytail minimalism |
| `ponytail`        | YAGNI-first code generation (plugin)          |
| `ponytail-review` | Over-engineering audit en diffs               |
| `ponytail-audit`  | Over-engineering audit full repo              |
| `ponytail-debt`   | Harvest shortcuts ledger                      |
| `judgment-day`    | Adversarial dual review protocol              |
| `sdd-apply`       | SDD apply phase implementation                |
| `sdd-archive`     | SDD archive phase                             |
| `sdd-design`      | SDD design phase                              |
| `sdd-explore`     | SDD explore phase                             |
| `sdd-init`        | SDD init phase                                |
| `sdd-onboard`     | SDD onboarding                                |
| `sdd-propose`     | SDD proposal phase                            |
| `sdd-spec`        | SDD spec phase                                |
| `sdd-tasks`       | SDD tasks phase                               |
| `sdd-verify`      | SDD verify phase                              |

## Cómo Usar

### 1. Cambiar entre Agentes Principales

```
Presioná TAB para alternar entre Opttius y Build.
```

### 2. Invocar Subagente Directo

```
@database help me understand the RLS policies for customers table
```

### 3. Usar SDD (recomendado para cambios complejos)

```
/sdd-new implementar modulo de facturacion electronica
```

El orchestrator guía el flujo: proposal → specs → design → tasks → apply → verify → archive.

### 4. Cargar Skill

```javascript
skill({ name: "database-optical-supabase" });
```

## Source of Truth

- **Engram**: memoria persistente entre sesiones (decisiones, bugs, patrones)
- **AGENTS.md**: fuente unificada de agentes y skills
- **`docs/`**: documentación adicional

## Arquitectura de Agentes

```
opencode.json                   ← Config principal (agent defs, MCP, permissions)
.opencode/agents/               ← Defs de subagentes en .md
.opencode/skills/               ← Skills de dominio/sistema/seguridad
.opencode/plugins/              ← Plugins (ponytail, etc.)
AGENTS.md                       ← Documentación unificada (este archivo)
openspec/                       ← SDD artifacts (cambios activos/completados)
~/.config/opencode/agents/      ← Agentes globales (SDD sub-agents)
~/.config/opencode/skills/      ← Skills globales (cortex, SDD skills)
```

## Configuración

- Agentes proyecto: `.opencode/agents/`
- Skills proyecto: `.opencode/skills/domain/` | `system/` | `security/` | `tools/`
- Skills globales: `~/.config/opencode/skills/`
- Config: `.opencode/opencode.json`
- SDD changes: `openspec/changes/`

## Flujo de Trabajo Típico

1. **Idea o bug** → usá `/sdd-new <change-name>` para arrancar un ciclo SDD
2. **Cambio simple** → trabajá directo con **Build** y cargá la skill relevante
3. **Review** → invocá `@review` para auditoría de PR o judgment-day
