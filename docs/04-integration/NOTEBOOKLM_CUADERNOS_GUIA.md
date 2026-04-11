# Guía de Cuadernos NotebookLM - Proyecto Opttius

Esta guía explica cuándo usar cada cuaderno de NotebookLM según el tipo de consulta o tarea que necesites realizar.

---

## Resumen de cuadernos

| Cuaderno                              | ID                                     | Fuentes | Propósito                                                            |
| ------------------------------------- | -------------------------------------- | ------- | -------------------------------------------------------------------- |
| **Opttius - Cerebro**                 | `e071bebc-ce79-4b32-a040-61a6a9c331a3` | 50/50   | Documentación principal: sistemas, arquitectura, flujos core (lleno) |
| **Opttius - Documentación Extendida** | `17302d9d-7d70-4c8d-a774-49fbfca3c09d` | ~44/50  | Análisis, implementación, changelogs, guías técnicas, docs nuevas    |
| **Opttius - Docs Anexo**              | `19de09c1-37ae-4832-a17b-dd326c613ce3` | 50/50   | Overflow: docs que no caben en Extendido, referencias AI             |
| **Opttius - Docs Anexo 2**            | `2084f3bf-70df-4dd4-a0b3-3cfe0d6c9cff` | 0/50    | Overflow adicional (SEO, marketing, etc.)                            |
| **Opttius - Docs Anexo 3**            | `d2a862dc-a6de-46f2-bacc-c483d1f31b32` | 0/50    | Overflow adicional                                                   |
| **Opttius - Docs Anexo 4**            | `2c8b8292-bc96-4697-84a3-801306784619` | 0/50    | Overflow adicional                                                   |
| **Opttius - Docs Anexo 5**            | `f7d4d9c4-de38-4020-a069-e485aa64d792` | 0/50    | Overflow adicional                                                   |

---

## ¿Cuándo usar cada cuaderno?

### Usa el **Cuaderno principal (Cerebro)** cuando:

| Situación                     | Ejemplo de consulta                                      |
| ----------------------------- | -------------------------------------------------------- |
| **Arquitectura y diseño**     | "¿Cómo está estructurado el módulo de CRM?"              |
| **Flujos de negocio**         | "¿Cómo funciona el flujo de checkout y pagos?"           |
| **Decisiones de sistema**     | "¿Qué patrones usa el sistema de configuración?"         |
| **Reglas de dominio**         | "¿Cómo se calculan los precios en presupuestos?"         |
| **Integración entre módulos** | "¿Cómo se relacionan cotizaciones y órdenes de trabajo?" |
| **Autenticación y permisos**  | "¿Cómo funciona el RLS y los roles de admin?"            |
| **SaaS y multi-tenant**       | "¿Cómo se gestionan organizaciones y suscripciones?"     |
| **Identidad visual**          | "¿Cuál es la paleta Epoch y los tokens de diseño?"       |
| **Onboarding de agentes**     | Necesitas que un agente entienda el proyecto completo    |
| **Debugging de flujos**       | "¿Por qué falla el proceso de venta en POS?"             |

**Contenido:** CRM, Auth, Appointments, Inventory, POS, Work Orders, Quotes, Support, Notifications, Metrics, SaaS Management, User Profile, Payment Workflow, System Configuration, AI, Identity, etc.

---

### Usa el **Cuaderno Extendido** cuando:

| Situación                          | Ejemplo de consulta                                             |
| ---------------------------------- | --------------------------------------------------------------- |
| **Análisis y evaluaciones**        | "¿Qué recomendaciones hay en el análisis de inventario?"        |
| **Estado de implementación**       | "¿Qué integraciones están implementadas?"                       |
| **Changelogs y mejoras**           | "¿Qué cambios se hicieron en el POS en 2026?"                   |
| **Guías de setup**                 | "¿Cómo configurar el entorno de desarrollo?"                    |
| **Planes de corrección**           | "¿Cuál es el plan de bugs pendientes?"                          |
| **Documentación de archivo**       | "¿Qué pasó en el proceso de salvataje?"                         |
| **Bases de datos**                 | "¿Qué restricciones tiene el seed?"                             |
| **Integraciones técnicas**         | "¿Qué APIs externas están implementadas?"                       |
| **Formularios y emails**           | "¿Qué templates de email existen?"                              |
| **Búsqueda de contexto histórico** | "¿Cómo evolucionó el sistema de identidad?"                     |
| **Testing y QA**                   | "¿Qué flujos críticos debo verificar?" "¿Cómo validar backups?" |

**Contenido:** Archive (salvataje, CTO briefing), estado de implementación (setup, API, AI, payments, integrations, forms, email, analysis), evaluaciones (database, inventory, brain), guías (Supabase, typography, identity audit), testing (TESTING_GUIDE, skill testing), NOTEBOOKLM_CUADERNOS_GUIA, PROJECT_SUMMARY, **AGREEMENTS_SYSTEM** (Gestión de Convenios).

---

### Usa el **Cuaderno Anexo** (o **Anexo 2**) cuando:

| Situación                          | Ejemplo de consulta                             |
| ---------------------------------- | ----------------------------------------------- |
| **Docs que no caben en Extendido** | Referencias de tools del agente, checklists     |
| **Overflow de sincronización**     | El sync añade aquí cuando Extendido está lleno  |
| **Documentación AI detallada**     | AGENT_TOOLS_REFERENCE, AGENT_TRAINING_ROADMAP   |
| **SEO, marketing, identidad**      | Estrategia SEO AIO, MARKETING_IDENTITY_STRATEGY |

**Contenido:** Docs de overflow, referencias técnicas del agente IA, SEO, marketing. **Anexo 2** se usa cuando Anexo está lleno (50/50).

---

## Flujo de decisión rápida

```
¿Necesitas entender CÓMO funciona algo o QUÉ decisiones tomar?
    → Cuaderno principal (Cerebro)

¿Necesitas contexto histórico, implementación o guías técnicas?
    → Cuaderno Extendido

¿Buscas referencias de tools del agente, SEO, marketing o docs de overflow?
    → Cuaderno Anexo (o Anexo 2 si Anexo está lleno)

¿No estás seguro?
    → Empieza por el Cuaderno principal
```

---

## Comandos de referencia

```bash
# Verificar sesión
nlm login --check

# Listar fuentes
nlm source list e071bebc-ce79-4b32-a040-61a6a9c331a3   # Cerebro
nlm source list 17302d9d-7d70-4c8d-a774-49fbfca3c09d   # Extendido
nlm source list 19de09c1-37ae-4832-a17b-dd326c613ce3   # Anexo
nlm source list 2084f3bf-70df-4dd4-a0b3-3cfe0d6c9cff   # Anexo 2
nlm source list d2a862dc-a6de-46f2-bacc-c483d1f31b32   # Anexo 3
nlm source list 2c8b8292-bc96-4697-84a3-801306784619   # Anexo 4
nlm source list f7d4d9c4-de38-4020-a069-e485aa64d792   # Anexo 5

# Sincronizar (fallback: Extendido → Anexo → Anexo 2-5)
npm run notebooklm:sync
npm run notebooklm:sync-extended
npm run notebooklm:sync-anexo

# Añadir fuente manualmente a cualquier anexo
export PYTHONIOENCODING=utf-8
nlm source add 2084f3bf-70df-4dd4-a0b3-3cfe0d6c9cff --file docs/<archivo>.md --title "Título"
```

---

## Aliases (opcional)

Para simplificar los comandos:

```bash
nlm alias set opttius-brain e071bebc-ce79-4b32-a040-61a6a9c331a3
nlm alias set opttius-ext 17302d9d-7d70-4c8d-a774-49fbfca3c09d
nlm alias set opttius-anexo 19de09c1-37ae-4832-a17b-dd326c613ce3
nlm alias set opttius-anexo2 2084f3bf-70df-4dd4-a0b3-3cfe0d6c9cff
nlm alias set opttius-anexo3 d2a862dc-a6de-46f2-bacc-c483d1f31b32
nlm alias set opttius-anexo4 2c8b8292-bc96-4697-84a3-801306784619
nlm alias set opttius-anexo5 f7d4d9c4-de38-4020-a069-e485aa64d792

# Uso
nlm source list opttius-brain
nlm source add opttius-anexo2 --file docs/archivo.md --title "Título"
```

---

## Poblar los cuadernos

Ejecuta tras `nlm login`:

```bash
# Sync principal (Extendido + Anexo, Cerebro está lleno)
npm run notebooklm:sync

# Sync extendido (archive, implementación, análisis)
npm run notebooklm:sync-extended

# Sync anexo (referencias AI, overflow)
npm run notebooklm:sync-anexo
```

- **notebooklm:sync** → Docs clave (Extendido → Anexo → Anexo 2-5)
- **notebooklm:sync-extended** → ~38 fuentes: archive, implementación, análisis (mismo fallback)
- **notebooklm:sync-anexo** → Referencias del agente IA, tools, roadmap (Anexo → Anexo 2-5)

**Capacidad total:** Cerebro (50) + Extendido (50) + Anexo (50) + Anexo 2-5 (50×4=200) = **400 fuentes**
