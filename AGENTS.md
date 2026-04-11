# Agentes OpenCode - Opttius

Sistema de agentes OpenCode para el proyecto Opttius.

## Agentes Principales (Primary)

Cambia entre ellos con **TAB**:

| Agente      | Descripción                                         |
| ----------- | --------------------------------------------------- |
| **Opttius** | Agente principal con contexto completo del proyecto |
| **Plan**    | Análisis readonly, sin edits                        |
| **Build**   | Desarrollo activo, full tool access                 |

## Subagentes (@)

Invócalos con **@mention**:

| Subagente      | Uso          | Descripción                          |
| -------------- | ------------ | ------------------------------------ |
| **@explore**   | `@explore`   | Investigación read-only del codebase |
| **@database**  | `@database`  | Supabase, schema, RLS, migrations    |
| **@frontend**  | `@frontend`  | UI/UX, diseño Epoch, componentes     |
| **@backend**   | `@backend`   | APIs, business logic, servicios      |
| **@qa**        | `@qa`        | Testing, checklists, E2E             |
| **@devops**    | `@devops`    | GitHub, Vercel, CI/CD                |
| **@docs**      | `@docs`      | Documentación, guías                 |
| **@marketing** | `@marketing` | Estrategia, contenido, SEO           |

## Skills Disponibles

Skills de dominio para cargar con tool `skill`:

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

| Skill       | Descripción        |
| ----------- | ------------------ |
| `nlm-skill` | NotebookLM CLI     |
| `notion`    | Notion integration |
| `github`    | GitHub workflows   |

### Security (`.opencode/skills/security/`)

| Skill            | Descripción  |
| ---------------- | ------------ |
| `security-audit` | OWASP audit  |
| `code-reviewer`  | Code quality |

## Cómo Usar

### 1. Cambiar entre Agentes Principales

```
Presiona TAB para ciclar entre Opttius, Plan, y Build
```

### 2. Invocar Subagente

```
@database help me understand the RLS policies for customers table
```

### 3. Cargar Skill

```javascript
skill({ name: "database-optical-supabase" });
```

## Source of Truth

Todo el conocimiento del proyecto está en **NotebookLM**:

- **Notebook Principal:** `e071bebc-ce79-4b32-a040-61a6a9c331a3`
- **Notebook Extendido:** `17302d9d-7d70-4c8d-a774-49fbfca3c09d`

Ver `docs/NOTEBOOKLM_CUADERNOS_GUIA.md` para cuándo usar cada uno.

## Configuración

- Agentes: `.opencode/agents/`
- Skills: `.opencode/skills/`
- Config: `.opencode/opencode.json`
