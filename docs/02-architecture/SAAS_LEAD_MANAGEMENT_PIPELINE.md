# 🛰️ SaaS Lead Management Pipeline

Documentación técnica del módulo de gestión de leads y pipeline de ventas para Opttius SaaS. Este documento es una extensión del **SaaS Management Engine** y detalla la implementación del sistema de captura, seguimiento y conversión de leads.

## Resumen Ejecutivo

El **Lead Management Pipeline** es un sistema completo para la gestión del ciclo de vida de leads desde la solicitud inicial hasta la conversión en cliente paying. El sistema incluye tracking visual del funnel, scoring automatizado, historial de actividades, emails automatizados e inteligencia artificial para personalización de comunicaciones.

### Estado: 📋 EN DESARROLLO

> **Última actualización:** 2026-03-31
> **Testing local:** Script disponible en `scripts/create-demo-user.ts`

Este módulo forma parte del plan de expansión del SaaS Management Engine y se implementará en múltiples fases para mejorar la conversión de leads y automatizar el proceso de ventas.

---

## 🎯 Objetivos del Proyecto

1. **Visualizar** el pipeline de ventas con interface Kanban intuitiva
2. **Automatizar** el seguimiento de leads mediante scoring predictivo
3. **Rastrear** todas las interacciones con historial de actividades
4. **Personalizar** comunicaciones usando inteligencia artificial
5. **Medir** métricas de funnel con dashboards analíticos
6. **Integrar** emails automatizados con tracking de aperturas y clics

---

## 📊 Análisis del Estado Actual

### Tablas Existentes

| Tabla                    | Propósito                             | Estado    |
| ------------------------ | ------------------------------------- | --------- |
| `demo_requests`          | Solicitudes de demo con funnel stages | ✅ Activa |
| `organizations`          | Ópticas/tenants del SaaS              | ✅ Activa |
| `system_email_templates` | Plantillas de email SaaS (~25 tipos)  | ✅ Activa |
| `admin_users`            | Usuarios del sistema                  | ✅ Activa |

### Funcionalidades Actuales

| Funcionalidad         | Descripción                                                                                                                       |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Pipeline de 12 etapas | pending → approved → demo_expiring → demo_expired → meeting_scheduled → post_meeting → negotiation → migration → converted / lost |
| Métricas básicas      | pendingRequests, approvedThisMonth, activeDemos, conversionRate                                                                   |
| Emails automáticos    | demo_approved, demo_expiring, demo_expired, demo_post_meeting_followup                                                            |
| API REST              | CRUD completo para demo-requests con filtros                                                                                      |

### Limitaciones Identificadas

- ❌ Sin visualización Kanban del pipeline
- ❌ Sin historial de actividades por lead
- ❌ Sin scoring automatizado de leads
- ❌ Sin tracking de apertura/clic de emails
- ❌ Sin posibilidad de enviar emails manuales personalizados
- ❌ Sin integración de IA para generación de contenido
- ❌ Sin métricas avanzadas de funnel

---

## 🏗️ Arquitectura Propuesta

### Estructura de Relaciones

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        LEAD MANAGEMENT PIPELINE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   leads (1) ──────< lead_activities (N)                                     │
│        │                                                                       │
│        ├──────< lead_email_sequences (N)                                     │
│        │                                                                       │
│        └──────< lead_scoring_logs (N)                                       │
│                                                                             │
│   lead_scoring_rules                                                        │
│        │                                                                       │
│        └── Define puntos por actividad                                      │
│                                                                             │
│   leads ───────< organizations (cuando se convierte)                         │
│        │                                                                       │
│   leads ───────< admin_users (asignado_a)                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Capas del Sistema

| Capa             | Componente                               | Responsabilidad                      |
| ---------------- | ---------------------------------------- | ------------------------------------ |
| **Presentacion** | KanbanBoard, LeadCard, ActivityTimeline  | UI interactiva para gestión de leads |
| **API**          | REST endpoints para CRUD y acciones      | Endpoints para frontend y webhooks   |
| **Negocio**      | LeadScoringService, EmailSequenceService | Lógica de scoring y secuencias       |
| **Datos**        | Tablas leads, lead_activities, etc       | Persistencia multi-tenant            |
| **Integracion**  | Resend webhooks, AI service              | Emails, IA, tracking                 |

---

## 🗄️ Base de Datos

### Tablas Principales Propuestas

#### 1. leads (Ampliación de demo_requests)

```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),

  -- Informacion del lead
  email TEXT NOT NULL,
  full_name TEXT,
  optica_name TEXT,
  phone TEXT,
  source TEXT DEFAULT 'landing',
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,

  -- Pipeline
  status TEXT DEFAULT 'new',
  funnel_stage TEXT DEFAULT 'pending',
  assigned_to UUID REFERENCES admin_users(id),

  -- Fechas clave
  created_at TIMESTAMPTZ DEFAULT NOW(),
  first_contact_at TIMESTAMPTZ,
  last_contact_at TIMESTAMPTZ,
  next_followup_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  lost_at TIMESTAMPTZ,

  -- Scoring
  lead_score INT DEFAULT 0,
  score_last_calculated_at TIMESTAMPTZ,
  priority_level TEXT DEFAULT 'cold', -- hot, warm, cold

  -- Demo
  demo_started_at TIMESTAMPTZ,
  demo_expires_at TIMESTAMPTZ,
  organization_demo_id UUID REFERENCES organizations(id),

  -- Seguimiento
  notes TEXT,
  lost_reason TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',

  -- Soft delete
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT valid_funnel_stage CHECK (funnel_stage IN (
    'pending', 'contacted', 'qualified', 'demo_approved', 'demo_active',
    'demo_expiring', 'demo_expired', 'meeting_scheduled', 'post_meeting',
    'proposal', 'negotiation', 'won', 'lost'
  ))
);
```

#### 2. lead_activities

```sql
CREATE TABLE lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES admin_users(id),

  CONSTRAINT valid_activity_type CHECK (activity_type IN (
    'lead_created', 'email_sent', 'email_opened', 'email_clicked',
    'email_bounced', 'demo_accessed', 'demo_login', 'meeting_scheduled',
    'meeting_completed', 'call_logged', 'note_added', 'stage_changed',
    'score_updated', 'assigned', 'outbound_call', 'pricing_sent'
  ))
);
```

#### 3. lead_email_sequences

```sql
CREATE TABLE lead_email_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  sequence_type TEXT NOT NULL,
  step_number INT,
  email_type TEXT,
  subject_template TEXT,
  body_template TEXT,
  variables JSONB DEFAULT '{}',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',

  CONSTRAINT valid_sequence_type CHECK (sequence_type IN (
    'welcome', 'followup', 'nurture', 'proposal', 'negotiation'
  ))
);
```

#### 4. lead_scoring_rules

```sql
CREATE TABLE lead_scoring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_type TEXT NOT NULL UNIQUE,
  points INT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 5. lead_scoring_logs

```sql
CREATE TABLE lead_scoring_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  points_before INT NOT NULL,
  points_after INT NOT NULL,
  change_reason TEXT,
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Índices Recomendados

```sql
-- Pipeline y filtros
CREATE INDEX idx_leads_funnel_stage ON leads(funnel_stage);
CREATE INDEX idx_leads_priority ON leads(priority_level);
CREATE INDEX idx_leads_assigned ON leads(assigned_to);
CREATE INDEX idx_leads_score ON leads(lead_score DESC);
CREATE INDEX idx_leads_next_followup ON leads(next_followup_at)
  WHERE next_followup_at IS NOT NULL;

-- Actividades
CREATE INDEX idx_lead_activities_lead ON lead_activities(lead_id);
CREATE INDEX idx_lead_activities_type ON lead_activities(activity_type);
CREATE INDEX idx_lead_activities_created ON lead_activities(created_at DESC);

-- Secuencias
CREATE INDEX idx_lead_email_sequences_lead ON lead_email_sequences(lead_id);
CREATE INDEX idx_lead_email_sequences_scheduled ON lead_email_sequences(scheduled_at)
  WHERE status = 'pending';
```

### Políticas RLS

```sql
-- Leads: solo root/dev ven todos
CREATE POLICY "Leads full access for root" ON leads
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM admin_users WHERE role IN ('root', 'dev'))
  );

-- Actividades: mismo scope
CREATE POLICY "Activities full access for root" ON lead_activities
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM admin_users WHERE role IN ('root', 'dev'))
  );
```

---

## 📧 Catálogo de Emails del Funnel

### Emails Automáticos

| Etapa               | Tipo de Email                | Trigger              | Variables Clave                                     |
| ------------------- | ---------------------------- | -------------------- | --------------------------------------------------- |
| Nuevo lead          | `lead_welcome`               | Al crear lead        | {{lead_name}}, {{optica_name}}, {{demo_url}}        |
| Pendiente           | `lead_followup_1`            | 1 día sin contacto   | {{lead_name}}, {{followup_url}}                     |
| Aprobado            | `demo_approved`              | Al aprobar demo      | {{demo_url}}, {{days_valid}}, {{login_credentials}} |
| Por vencer (3 días) | `demo_expiring_3d`           | Cron 3 días antes    | {{days_left}}, {{renew_url}}                        |
| Por vencer (1 día)  | `demo_expiring_1d`           | Cron 1 día antes     | {{days_left}}, {{urgent_url}}                       |
| Expirado            | `demo_expired`               | Al expirar           | {{resurrect_url}}, {{offer_renewal}}                |
| Reunión agendada    | `meeting_confirmation`       | Al agendar           | {{meeting_url}}, {{meeting_time}}, {{meeting_date}} |
| Post-reunión        | `meeting_followup`           | 2h después reunión   | {{next_steps}}, {{materials_url}}                   |
| Propuesta enviada   | `proposal_sent`              | Al enviar pricing    | {{proposal_url}}, {{valid_until}}                   |
| En negociación      | `negotiation_followup`       | 3 días sin respuesta | {{lead_name}}, {{discount_code}}                    |
| Ganado              | `conversion_congratulations` | Al convertir         | {{onboarding_url}}, {{welcome_kit}}                 |
| Perdido             | `lead_lost_followup`         | Al marcar perdido    | {{feedback_url}}, {{future_contact}}                |

### Emails con IA (Manuales)

| Tipo              | Descripción                           | Prompt Base                                                                        |
| ----------------- | ------------------------------------- | ---------------------------------------------------------------------------------- |
| `ai_followup`     | Follow-up personalizado post-contacto | "Genera un follow-up profesional basado en la información del lead..."             |
| `ai_outbound`     | Primer contacto outbound              | "Crea un email de presentación para un lead potenciales en la industria óptica..." |
| `ai_proposal`     | Propuesta comercial personalizada     | "Genera una propuesta comercial para {{optica_name}} considerando..."              |
| `ai_case_story`   | Caso de éxito relevante               | "Busca un caso de éxito similar a {{optica_name}} y personalízalo..."              |
| `ai_reactivation` | Reactivación de lead frío             | "Crea un email de reactivación para leads sin actividad en {{days}} días..."       |

### Tracking de Engagement

| Evento           | Descripción         | Action                           |
| ---------------- | ------------------- | -------------------------------- |
| `email_sent`     | Email enviado       | Registrar en lead_activities     |
| `email_opened`   | Email abierto       | Webhook Resend → Update sequence |
| `email_clicked`  | Link clickeado      | Webhook Resend → Update sequence |
| `email_bounced`  | Email rechazado     | Marcar email como fallido        |
| `demo_accessed`  | Lead accedió a demo | +15 puntos, notificar asignado   |
| `pricing_viewed` | Lead vio propuesta  | +10 puntos                       |

---

## 📈 Sistema de Scoring

### Reglas de Puntuación

| Actividad                  | Puntos | Descripción                 |
| -------------------------- | ------ | --------------------------- |
| Solicitud de demo          | +10    | Lead nuevo                  |
| Teléfono proporcionado     | +5     | Datos de contacto completos |
| Reunión agendada           | +15    | Compromiso de contacto      |
| Reunión completada         | +20    | Interés demostrado          |
| Descarga pricing/propuesta | +10    | Interés en oferta           |
| Primer login en demo       | +15    | Engagement activo           |
| Login adicional en demo    | +5     | Cada login extra (max +15)  |
| Email abierto              | +1     | Engagement con comunicación |
| Link clickeado en email    | +3     | Interés específico          |
| Demo por vencer            | -5     | Riesgo de pérdida           |
| Sin actividad 7 días       | -10    | Lead enfriándose            |
| Sin actividad 14 días      | -15    | Lead frío                   |
| Demo expirada              | -10    | Oportunidad perdida         |
| Email bounce               | -5     | Datos inválidos             |

### Niveles de Prioridad

| Score | Nivel          | Color     | Acción                   |
| ----- | -------------- | --------- | ------------------------ |
| > 50  | 🔥 **Hot**     | `#ef4444` | Contactar inmediatamente |
| 25-50 | 🌡️ **Warm**    | `#f59e0b` | Seguimiento activo       |
| 0-24  | ❄️ **Cold**    | `#3b82f6` | Nurturing automático     |
| < 0   | 🧊 **At Risk** | `#6b7280` | Reactivación necesaria   |

---

## 🎨 Diseño e Interfaz

### Kanban Board

**Ubicación:** `src/app/admin/saas-management/leads/page.tsx`

#### Columnas del Kanban

```
┌────────────┬────────────┬────────────┬────────────┬────────────┬────────────┐
│ PENDIENTE  │CONTACTADO │ CALIFICADO │   DEMO     │  REUNIÓN   │  CIERRE    │
│            │            │            │            │            │            │
│  [lead]    │  [lead]   │  [lead]    │  [lead]    │  [lead]    │ [won/lost] │
│  [lead]    │  [lead]   │  [lead]    │  [lead]    │  [lead]    │            │
│  [lead]    │            │            │            │            │            │
│   (3)       │   (5)      │   (8)      │   (12)     │   (4)      │   (15)     │
└────────────┴────────────┴────────────┴────────────┴────────────┴────────────┘
```

#### Card de Lead

```
┌─────────────────────────────────────┐
│ 📧 juan@opticaandina.cl              │
│ 👤 Juan Pérez / Óptica Andina       │
│                                      │
│ 📊 Score: 35 (Warm)                  │
│ ⏰ Próximo follow-up: mañana         │
│                                      │
│ ──────────────────────────────────  │
│ 📞 +56 9 1234 5678                  │
│ 📍 Santiago, Chile                   │
│ 🌐 Landing / utm_campaign=spring     │
│                                      │
│ Etapa: qualified                     │
│ Creado: hace 5 días                  │
└─────────────────────────────────────┘
```

### Timeline de Actividades

```
┌──────────────────────────────────────────────────────────┐
│ HISTORIAL DE ACTIVIDADES                                  │
├──────────────────────────────────────────────────────────┤
│                                                           │
│ 📧 14:30 - Email "Propuesta enviada"                      │
│    └─ Enviado a juan@opticaandina.cl                     │
│                                                           │
│ 👁️ 14:45 - Email abierto                                 │
│    └─ Juan abrió el email                                 │
│                                                           │
│ 🖱️ 14:52 - Link clickeado                                │
│    └─ Clickeó en "Ver propuesta completa"               │
│    └─ Score +3 (ahora 35)                                 │
│                                                           │
│ 📞 15:30 - Llamada grabada                                │
│    └─ "Interesado en plan Premium, pide descuento"        │
│                                                           │
│ 📝 16:00 - Nota agregada                                  │
│    └─ "Cliente muy interesado, llamar el lunes"           │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

### Panel de Detalle de Lead

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DETALLE DEL LEAD                                │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  Informacion Principal                                                │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │ Email: juan@opticaandina.cl                                      │ │
│  │ Nombre: Juan Pérez                                               │ │
│  │ Óptica: Óptica Andina                                           │ │
│  │ Teléfono: +56 9 1234 5678                                        │ │
│  │ Fuente: landing / UTM: spring_sale                               │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  Pipeline                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │ Etapa: [Negociación ▼]                                           │ │
│  │ Score: [35] 🌡️ Warm                                              │ │
│  │ Asignado a: [María García ▼]                                    │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  Fechas Clave                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │ Creado: 20 Mar 2026                                              │ │
│  │ Último contacto: 25 Mar 2026                                    │ │
│  │ Próximo follow-up: 28 Mar 2026                                  │ │
│  │ Demo expira: 30 Mar 2026                                         │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  Acciones                                                               │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │ [📧 Enviar Email] [🤖 Generar con IA] [📅 Agendar] [📞 Llamar]  │ │
│  │ [✏️ Editar] [🗑️ Eliminar] [⭐ Convertir] [❌ Perder]            │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Flujos de Usuario

### Flujo 1: Captura de Lead

```
1. Usuario completa formulario en /solicitar-demo
                              ↓
2. API valida email (no duplicado)
                              ↓
3. Lead creado en DB con:
   - source: landing
   - funnel_stage: pending
   - lead_score: +10
   - priority_level: cold
                              ↓
4. Sistema envía email automático "lead_welcome"
                              ↓
5. Notificación a equipo (Slack/UI)
                              ↓
6. Lead aparece en Kanban columna "Pendiente"
```

### Flujo 2: Conversión a Demo

```
1. Admin revisa lead en Kanban
                              ↓
2. Click en "Contactar" o abre detalle
                              ↓
3. Agrega notas, registra llamada
                              ↓
4. Click en "Aprobar Demo"
                              ↓
5. Sistema:
   - Crea organización demo
   - Genera credenciales
   - Actualiza lead: funnel_stage = demo_active
   - Score +15
   - Envía email "demo_approved"
                              ↓
6. Lead en columna "Demo"
```

### Flujo 3: Seguimiento con IA

```
1. Admin selecciona lead
                              ↓
2. Click en "🤖 Generar con IA"
                              ↓
3. Modal muestra opciones:
   - Follow-up post-contacto
   - Presentación de pricing
   - Caso de éxito
   - Reactivación
                              ↓
4. Admin selecciona tipo
                              ↓
5. AI genera email personalizado:
   - Input: datos del lead, etapa, notas
   - Output: subject + body personalizado
                              ↓
6. Admin revisa, edita si quiere
                              ↓
7. Click "Enviar"
                              ↓
8. Sistema:
   - Envía email via Resend
   - Registra en lead_activities
   - Actualiza last_contact_at
   - Score +1 (email enviado)
```

### Flujo 4: Tracking de Engagement

```
1. Resend envía email
                              ↓
2. Usuario abre email → Resend webhook "opened"
                              ↓
3. API actualiza:
   - lead_activities: +email_opened
   - lead_email_sequences: opened_at = NOW()
   - lead_score: +1
                              ↓
4. Usuario clickea link → Resend webhook "clicked"
                              ↓
5. API actualiza:
   - lead_activities: +email_clicked
   - lead_email_sequences: clicked_at = NOW()
   - lead_score: +3
                              ↓
6. Si score > 50 → Notificar: "Lead Hot"
```

---

## 📁 Estructura de Archivos

### Nuevos Componentes

```
src/components/admin/saas-management/
├── leads/
│   ├── KanbanBoard.tsx          ← Tablero Kanban principal
│   ├── LeadCard.tsx             ← Card de lead en kanban
│   ├── LeadDetailPanel.tsx      ← Panel lateral de detalle
│   ├── LeadTimeline.tsx         ← Timeline de actividades
│   ├── LeadActions.tsx         ← Botones de acción
│   ├── AIGeneratorModal.tsx     ← Modal de generación IA
│   └── LeadFilters.tsx          ← Filtros del kanban
├── email-sequence/
│   ├── SequenceEditor.tsx      ← Editor de secuencias
│   └── EmailTemplatePicker.tsx  ← Selector de plantillas
└── scoring/
    ├── ScoreIndicator.tsx      ← Indicador visual de score
    └── ScoreBreakdown.tsx      ← Desglose de puntos
```

### Nuevas APIs

```
src/app/api/admin/saas-management/
├── leads/
│   ├── route.ts                ← GET list, POST create
│   └── [id]/
│       ├── route.ts            ← GET, PATCH, DELETE
│       ├── activities/
│       │   └── route.ts        ← GET activities, POST add
│       ├── score/
│       │   └── route.ts        ← GET score, recalculate
│       ├── assign/
│       │   └── route.ts        ← POST assign to user
│       ├── convert/
│       │   └── route.ts        ← POST convert to customer
│       └── email/
│           ├── send/
│           │   └── route.ts     ← POST send manual email
│           └── ai-generate/
│               └── route.ts    ← POST generate with AI
├── lead-sequences/
│   ├── route.ts                ← GET sequences
│   └── [id]/
│       └── route.ts            ← GET, PATCH, DELETE
├── lead-scoring/
│   ├── rules/
│   │   └── route.ts            ← CRUD scoring rules
│   └── recalculate/
│       └── route.ts            ← POST recalculate all
└── webhooks/
    └── resend/
        └── route.ts           ← Resend webhook handler
```

### Nuevos Servicios

```
src/lib/
├── lead/
│   ├── leadService.ts          ← Lógica de leads
│   ├── scoringService.ts        ← Cálculo de scores
│   └── sequenceService.ts       ← Secuencias de email
├── ai/
│   ├── leadPrompts.ts          ← Prompts para leads
│   └── leadGenerator.ts        ← Generación de emails
└── email/
    ├── leadEmailService.ts     ← Envío de emails a leads
    └── resendWebhook.ts         ← Manejo de webhooks
```

---

## 📋 Plan de Implementación por Fases

### Fase 1: Fundamentos (Semana 1-2)

| Tarea | Descripción                          | Estado       |
| ----- | ------------------------------------ | ------------ |
| 1.1   | Crear migraciones de base de datos   | ⏳ Pendiente |
| 1.2   | Implementar APIs REST básicas        | ⏳ Pendiente |
| 1.3   | Crear componentes UI base            | ⏳ Pendiente |
| 1.4   | Kanban board funcional               | ⏳ Pendiente |
| 1.5   | Integrar con demo_requests existente | ⏳ Pendiente |

**Entregable:** Kanban básico con listado de leads existentes

### Fase 2: Actividades y Scoring (Semana 3-4)

| Tarea | Descripción                       | Estado       |
| ----- | --------------------------------- | ------------ |
| 2.1   | Tabla lead_activities y APIs      | ⏳ Pendiente |
| 2.2   | Timeline de actividades UI        | ⏳ Pendiente |
| 2.3   | Sistema de scoring rules          | ⏳ Pendiente |
| 2.4   | Cálculo automático de score       | ⏳ Pendiente |
| 2.5   | Indicadores visuales de prioridad | ⏳ Pendiente |

**Entregable:** Sistema de scoring activo con timeline

### Fase 3: Emails y Tracking (Semana 5-6)

| Tarea | Descripción                     | Estado       |
| ----- | ------------------------------- | ------------ |
| 3.1   | Webhook de Resend               | ⏳ Pendiente |
| 3.2   | Tracking opens/clicks           | ⏳ Pendiente |
| 3.3   | Plantillas de email adicionales | ⏳ Pendiente |
| 3.4   | Cron jobs de follow-up          | ⏳ Pendiente |
| 3.5   | Notificaciones de lead hot      | ⏳ Pendiente |

**Entregable:** Tracking completo de engagement

### Fase 4: Inteligencia Artificial (Semana 7-8)

| Tarea | Descripción                | Estado       |
| ----- | -------------------------- | ------------ |
| 4.1   | Integración con AI service | ⏳ Pendiente |
| 4.2   | Prompts para leads         | ⏳ Pendiente |
| 4.3   | Modal de generación IA     | ⏳ Pendiente |
| 4.4   | Envío de email generado    | ⏳ Pendiente |
| 4.5   | Historial de generaciones  | ⏳ Pendiente |

**Entregable:** Generación de emails con IA

### Fase 5: Analytics y Reporting (Semana 9-10)

| Tarea | Descripción         | Estado       |
| ----- | ------------------- | ------------ |
| 5.1   | Dashboard de funnel | ⏳ Pendiente |
| 5.2   | Métricas por etapa  | ⏳ Pendiente |
| 5.3   | Conversion rates    | ⏳ Pendiente |
| 5.4   | Reportes por fuente | ⏳ Pendiente |
| 5.5   | Export a CSV/Excel  | ⏳ Pendiente |

**Entregable:** Dashboard analítico completo

---

## 📊 Métricas y KPIs

### Métricas de Funnel

| Métrica                   | Descripción                    | Fórmula                                 |
| ------------------------- | ------------------------------ | --------------------------------------- |
| Conversion Rate Global    | % leads convertidos            | (won / total_leads) \* 100              |
| Conversion Rate por Etapa | % que avanza a siguiente etapa | (siguiente_etapa / etapa_actual) \* 100 |
| Tiempo en Etapa           | Días promedio en cada etapa    | AVG(dias_en_etapa)                      |
| Lead Velocity             | Velocidad de conversión        | Días desde creation hasta won           |
| Lead Leakage              | Pérdida por etapa              | (lost_en_etapa / entrada_etapa) \* 100  |

### Métricas de Engagement

| Métrica          | Descripción            | Target |
| ---------------- | ---------------------- | ------ |
| Email Open Rate  | % emails abiertos      | > 30%  |
| Email Click Rate | % clicks en links      | > 10%  |
| Demo Activation  | % que accede a demo    | > 60%  |
| Meeting Rate     | % con reunión agendada | > 40%  |
| Response Rate    | % que responde         | > 25%  |

### Métricas de Equipo

| Métrica              | Descripción                 | Target |
| -------------------- | --------------------------- | ------ |
| Leads por vendedor   | Leads asignados por persona | 20-30  |
| Tiempo de respuesta  | Horas hasta primer contacto | < 4h   |
| Follow-up compliance | % con follow-up realizado   | > 80%  |
| Win Rate             | % de oportunidades ganadas  | > 25%  |

---

## 🔧 Configuración Técnica

### Variables de Entorno

```env
# Lead Management
LEAD_SCORING_ENABLED=true
LEAD_AUTO_ASSIGN_ENABLED=false
LEAD_DEFAULT_ASSIGNEE=

# AI
AI_EMAIL_GENERATION_ENABLED=true
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini
AI_MAX_TOKENS=500

# Email
RESEND_WEBHOOK_SECRET=whsec_xxx
EMAIL_SEQUENCE_DELAY_HOURS=24
FOLLOWUP_REMINDER_DAYS=3

# Notifications
SLACK_WEBHOOK_LEADS=
NOTIFY_LEAD_HOT=true
NOTIFY_LEAD_ASSIGNED=true
```

### Dependencias

```json
{
  "dependencies": {
    "@dnd-kit/core": "^6.1.0",
    "@dnd-kit/sortable": "^8.0.0",
    "@dnd-kit/utilities": "^3.2.2",
    "ai": "^3.4.0",
    "date-fns": "^3.6.0"
  }
}
```

---

## 🔄 Integración con SaaS Management Engine

### Actualización del Sidebar

El nuevo módulo "Leads" se agregará a la sección "Gestión de Clientes":

```markdown
## Grupos de Navegación (Actualizado)

1. **Principal** - Dashboard, Analíticas
2. **Gestión de Clientes** - Organizaciones, Usuarios Globales, **Leads** ⭐, Sucursales
3. **Suscripciones** - Suscripciones, Planes, Pagos
4. **Soporte** - Tickets, Demos
5. **Configuración** - Sistema, Emails, Backups, WhatsApp
```

### Rutas

```
/admin/saas-management/
├── dashboard/
├── organizations/
├── users/
├── subscriptions/
├── tiers/
├── support/
├── leads/                    ← NUEVO
│   ├── page.tsx             ← Kanban principal
│   ├── [id]/
│   │   └── page.tsx         ← Detalle de lead
│   └── analytics/
│       └── page.tsx         ← Métricas
├── new-users-flow/          ← Migrar a leads
├── config/
├── emails/
├── backups/
├── whatsapp/
└── payments/
```

### Reutilización de Componentes

- **Sidebar**: Reutilizar `SaasManagementSidebar.tsx`
- **Layout**: Reutilizar layout existente
- **Estilo**: Mantener consistencia con diseño dark (#0D1117)
- **UI Components**: Usar shadcn/ui existente

---

## ⚠️ Consideraciones de Migración

### Datos Existentes

Los datos actuales de `demo_requests` se migrarán a `leads`:

```sql
-- Migración de demo_requests a leads
INSERT INTO leads (
  id, email, full_name, optica_name, phone, source,
  funnel_stage, created_at, notes, lost_reason,
  demo_started_at, demo_expires_at, organization_demo_id,
  lead_score, metadata
)
SELECT
  id, email, full_name, optica_name, phone, source,
  COALESCE(funnel_stage, 'pending'), created_at, notes, lost_reason,
  demo_started_at, demo_expires_at, organization_id,
  0, metadata
FROM demo_requests;
```

### Compatibilidad

- Mantener `demo_requests` como vista o tabla histórica
- API backwards compatible durante transición
- Feature flags para nueva funcionalidad

---

## ✅ Checklist de Implementación

### Fase 1: Fundamentos

- [ ] Crear tabla leads con migración
- [ ] Crear tabla lead_activities
- [ ] Crear índices correspondientes
- [ ] Configurar políticas RLS
- [ ] API: GET /leads con filtros
- [ ] API: POST /leads
- [ ] API: PATCH /leads/[id]
- [ ] API: DELETE /leads/[id]
- [ ] UI: KanbanBoard con columnas
- [ ] UI: LeadCard con información básica
- [ ] UI: LeadFilters (stage, source, assignee)
- [ ] Integración con datos demo_requests existentes
- [ ] Testing unitario de APIs

### Fase 2: Actividades y Scoring

- [ ] API: GET /leads/[id]/activities
- [ ] API: POST /leads/[id]/activities
- [ ] UI: LeadTimeline component
- [ ] Crear tabla lead_scoring_rules
- [ ] Insertar reglas iniciales
- [ ] API: POST /leads/[id]/score/recalculate
- [ ] Cron job: calculate-scores (diario)
- [ ] UI: ScoreIndicator en LeadCard
- [ ] UI: LeadFilters por score/priority

### Fase 3: Emails y Tracking

- [ ] API: POST /webhooks/resend
- [ ] Implementar handling de webhooks
- [ ] Registrar opens/clicks en activities
- [ ] Actualizar scores por engagement
- [ ] Agregar plantillas de email
- [ ] Cron job: demo-expiring (3 días)
- [ ] Cron job: demo-expiring (1 día)
- [ ] Cron job: followup-reminder
- [ ] UI: Notificaciones de lead hot

### Fase 4: Inteligencia Artificial

- [ ] Crear prompts en leadPrompts.ts
- [ ] API: POST /leads/[id]/email/ai-generate
- [ ] UI: AIGeneratorModal
- [ ] Integración con LLM service
- [ ] Preview de email generado
- [ ] API: POST /leads/[id]/email/send
- [ ] Registrar email en activities
- [ ] Historial de generaciones

### Fase 5: Analytics

- [ ] Dashboard de funnel
- [ ] Métricas de conversion rate
- [ ] Métricas de engagement
- [ ] Reporte por fuente
- [ ] Reporte por vendedor
- [ ] Export a CSV

---

## 🚀 Acceso al Sistema

1. Iniciar sesión con usuario que tenga rol `root` o `dev`
2. Acceder a `/admin/saas-management/leads`
3. Verificar el nuevo Kanban de leads
4. Comenzar a gestionar el pipeline

---

## 📅 Información

- **Fecha de planificación:** 2026-03-30
- **Última actualización:** 2026-03-30
- **Responsable:** Equipo de Desarrollo Opttius
- **Dependencias:** SaaS Management Engine, AI Module, Email Service

---

## 🔗 Referencias

- **SaaS Management Engine:** `docs/02-architecture/SAAS_MANAGEMENT_ENGINE.md`
- **Demo Requests API:** `src/app/api/admin/saas-management/demo-requests/`
- **Email Service:** `src/lib/email/`
- **AI Module:** `src/lib/ai/`
- **Resend Webhooks:** https://resend.com/docs/api-reference/webhooks

---

## Tags

`saas-management` `leads` `pipeline` `sales-funnel` `lead-scoring` `ai-emails` `automation`
