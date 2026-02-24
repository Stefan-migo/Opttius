# Guía de Cuadernos NotebookLM - Proyecto Opttius

Esta guía explica cuándo usar cada cuaderno de NotebookLM según el tipo de consulta o tarea que necesites realizar.

---

## Resumen de cuadernos

| Cuaderno                              | ID                                     | Fuentes | Propósito                                                    |
| ------------------------------------- | -------------------------------------- | ------- | ------------------------------------------------------------ |
| **Opttius - Cerebro**                 | `e071bebc-ce79-4b32-a040-61a6a9c331a3` | 50/50   | Documentación principal: sistemas, arquitectura, flujos core |
| **Opttius - Documentación Extendida** | `17302d9d-7d70-4c8d-a774-49fbfca3c09d` | ~28/50  | Análisis, implementación, changelogs, guías técnicas         |

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

**Contenido:** Archive (salvataje, CTO briefing), estado de implementación (setup, API, AI, payments, integrations, forms, email, analysis), evaluaciones (database, inventory, brain), guías (Supabase, typography, identity audit), testing (TESTING_GUIDE, skill testing), NOTEBOOKLM_CUADERNOS_GUIA, PROJECT_SUMMARY.

---

## Flujo de decisión rápida

```
¿Necesitas entender CÓMO funciona algo o QUÉ decisiones tomar?
    → Cuaderno principal (Cerebro)

¿Necesitas contexto histórico, implementación o guías técnicas?
    → Cuaderno Extendido

¿No estás seguro?
    → Empieza por el Cuaderno principal
```

---

## Comandos de referencia

```bash
# Verificar sesión
nlm login --check

# Listar fuentes del cuaderno principal
nlm source list e071bebc-ce79-4b32-a040-61a6a9c331a3

# Listar fuentes del cuaderno extendido
nlm source list 17302d9d-7d70-4c8d-a774-49fbfca3c09d

# Añadir fuente al cuaderno extendido
export PYTHONIOENCODING=utf-8
nlm source add 17302d9d-7d70-4c8d-a774-49fbfca3c09d --file docs/<archivo>.md --title "Título"
```

---

## Aliases (opcional)

Para simplificar los comandos:

```bash
nlm alias set opttius-brain e071bebc-ce79-4b32-a040-61a6a9c331a3
nlm alias set opttius-ext 17302d9d-7d70-4c8d-a774-49fbfca3c09d

# Uso
nlm source list opttius-brain
nlm source add opttius-ext --file docs/archivo.md --title "Título"
```

---

## Poblar el cuaderno extendido

Ejecuta tras `nlm login`:

```bash
npm run notebooklm:sync-extended
```

O directamente:

```bash
bash scripts/sync-notebooklm-extended.sh
```

El script añade ~28 fuentes: archive, implementación, análisis, guías técnicas.
