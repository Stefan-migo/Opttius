# Roadmap de Recuperación y Puesta en Producción — Opttius

- Fecha: 2026-09-05
- Estado del repo: `main` = `origin/main` = `6f6c49b6` (2026-08-13), en sync tras fetch.
- Documento vivo: marcar checkboxes `[ ]` → `[x]` al completar.

---

## 0. Estado actual (baseline verificado)

| Ámbito                           | Estado                                                                                                                                                                                                                                   |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Código local / GitHub `main`     | Sync total. Último commit 2026-08-13. Worktree con cleanup a medio commitear (basura raíz eliminada staged, READMEs modificados, `openspec/` nuevo untracked).                                                                           |
| SDD                              | 1 cambio activo: `openspec/changes/active/ts-error-hardening`. 55 archivados (auditorías + refactors 06→08-2026 en `main`).                                                                                                              |
| Producción (opttius.cl / Vercel) | **RESTRINGIDO**: Supabase reporta `exceed_storage_size_quota`. Login root imposible por plataforma, no por código.                                                                                                                       |
| Supabase prod                    | Proyecto remoto `bakakylxkpztjrulrhnr` (alias documentado `opttius.supabase.co`). Ref aparece comentado en `.env.local`.                                                                                                                 |
| Supabase local                   | Stack local (`project_id = web`, PG 17) con 11/11 migraciones aplicadas (consolidación `20260701`). **Hoy caído** (Docker no corre).                                                                                                     |
| TypeScript                       | Baseline ~3,355 errores `tsc` (era 4,353 en julio). CI corre type-check ⇒ **CI debería estar fallando**; el flujo real fue push directo a main.                                                                                          |
| Tests                            | Unit/integration verdes según memoria. E2E Playwright 18 pass / 1 skip (requiere stack Supabase local + `.env.e2e`).                                                                                                                     |
| CI/CD                            | `ci.yml` (quality + e2e non-blocking), `pr-checks.yml`, `security-scan.yml`, `saas-daily-backup.yml` (pg_dump diario → bucket `saas-backups`). Sin workflow de deploy (Vercel auto-deploy desde `main`).                                 |
| Deuda documentada                | 129 god files >500 LOC (9 >1000), gaps de cobertura (supabase/utils 0%, quotes 38%, work-orders 34%), docs desactualizadas (`docs/CI-CD.md`, `docs/05-devops/`), **API key de Notion hardcodeada** en `scripts/verify-consolidation.js`. |

---

## Fase 0 — Restaurar el servicio de producción (BLOQUEANTE · manual · dueño)

> Sin esto nada más en producción funciona. Es una acción de plataforma/cuenta, no de código.

- [ ] 0.1 Entrar al dashboard de Supabase → proyecto `bakakylxkpztjrulrhnr` → **Billing / Project settings**.
- [ ] 0.2 Identificar qué superó la cuota: el aviso `exceed_storage_size_quota` normalmente refiere al **tamaño de la base de datos vs. plan**. Revisar Usage: DB size, Storage buckets, y qué creció en los ~2 meses de inactividad.
- [ ] 0.3 **Causa probable a verificar**: el backup automático (`saas-daily-backup.yml` pg_dump + cron Vercel semanal) escribe dumps en el bucket `saas-backups`. Si el backup siguió corriendo mientras el proyecto quedó abandonado, esos dumps acumulan cuota de Storage. Decidir: purgar dumps viejos, moverlos a R2, o excluir el bucket.
- [ ] 0.4 Resolver según decisión de plan: upgrade de plan / subir cuota / remover spend caps. (Nota: plan Hobby limita también crons < 1/día — ver Fase 5.)
- [ ] 0.5 Restaurar el proyecto desde el dashboard y **verificar login root** con las credenciales reales.
- [ ] 0.6 Registrar en memoria la decisión de plan/cuota tomada.

**Definición de done**: opttius.cl responde, login root OK, API Supabase sin error de restricción.

---

## Fase 1 — Inventario y diff real Prod vs Local

Objetivo: reemplazar suposiciones por hechos. Cada item termina con un dato registrado.

### 1.1 Código desplegado en producción

- [ ] 1.1.1 Vercel dashboard → Deployment logs: anotar **qué commit está live** en producción y fecha del último deploy exitoso.
- [ ] 1.1.2 Comparar contra `main` local (`git log --oneline <deploy-sha>..main`). Con eso se calcula el delta real de código a publicar.

### 1.2 Base de datos remota

- [ ] 1.2.1 Relink del CLI: `supabase link --project-ref bakakylxkpztjrulrhnr` (el link anterior se perdió: `supabase/.temp/` fue borrado).
- [ ] 1.2.2 Capturar migraciones aplicadas en prod: `supabase migration list --linked`.
- [ ] 1.2.3 Diff contra las 11 locales → **lista exacta de migraciones pendientes de prod**. Hipótesis: prod quedó en el sweep 07-01/02 (≈ `00012` o anterior); locales `00013`…`00018` (webhook role, MV daily KPIs, RLS wave 1/2, FK indexes, root admin role) probablemente nunca llegaron.
- [ ] 1.2.4 Diff de schema si hace falta: `supabase db diff --linked` (o `scripts/inspect-schema.ts` contra prod cuando esté restaurado).
- [ ] 1.2.5 Verificar contenido de datos: clientes/órdenes de prod existen y son los esperados (no un proyecto vacío/demo).

### 1.3 Configuración / entorno

- [ ] 1.3.1 Inventariar env vars en Vercel (producción) vs `.env.local` (local) — campo por campo.
- [ ] 1.3.2 Confirmar dominio `opttius.cl`: alias en Vercel, redirects, `NEXT_PUBLIC_APP_URL` correcto en prod.
- [ ] 1.3.3 Confirmar ref de proyecto y keys de prod (el `.env.local` actual apunta a `127.0.0.1:54321` con comentario del ref prod).
- [ ] 1.3.4 Estado de servicios externos usados en prod: Resend, Mercado Pago/Flow/PayPal/NOWPayments (sandbox vs live), WhatsApp, Cloudinary/R2, Sentry, proveedores IA, Redis.

**Definición de done**: un diff documentado de código + migraciones + env entre prod y local, con decisiones registradas.

---

## Fase 2 — Higiene previa al release (repo + gates)

- [ ] 2.1 Commitear el cleanup pendiente de hoy (borrado de basura raíz staged + READMEs actualizados) y abrir/cerrar el cambio activo `ts-error-hardening` (decidir: continuar en otro ciclo o archivar).
- [ ] 2.2 Quitar la **API key de Notion hardcodeada** de `scripts/verify-consolidation.js` → moverla a env/gitignore. (Seguridad: antes de tocar nada público.)
- [ ] 2.3 Decidir política de TypeScript: las 3,355 líneas de error NO pueden quedar como gate bloqueante si se quiere CI verde. Opciones: (a) seguir reduciendo hasta baseline 0 y activar type-check en CI, (b) aceptar baseline documentado y marcar CI como no-bloqueante explícitamente. **Decisión de dueño.**
- [ ] 2.4 Corregir drift de docs de CI (`docs/CI-CD.md` describe un e2e contra preview URL que no existe) y `docs/05-devops/` (links rotos).
- [ ] 2.5 Decidir el destino del bucket de backups y probar **restore drill** de un dump (nadie ha validado que el backup sirva — es el seguro de vida de la Fase 3).

---

## Fase 3 — Release por capas (DB primero, código después)

Regla: **nunca deployar código nuevo contra un schema viejo, ni schema nuevo con código viejo**. Ventana de mantención, backup verificado antes y rollback definido.

### 3.1 Base de datos

- [ ] 3.1.1 Backup verificado de prod (dump + drill de restore en un proyecto temporal).
- [ ] 3.1.2 Aplicar migraciones pendientes identificadas en 1.2.3: `supabase db push --linked` (o `npm run supabase:push:remote`). Incluye la migración `00018 create_root_admin_role` — crítica para el login root.
- [ ] 3.1.3 Post-migración: correr advisors (security/performance) y verificar RLS wave 1/2 aplicada en prod.
- [ ] 3.1.4 Crear/verificar el **usuario root** de prod y su rol (`root`), coherente con el login que el usuario intentó.

### 3.2 Código

- [ ] 3.2.1 Elegir ancla de release: candidato natural `main` actual (6f6c49b6). Si el delta contra el deploy live es enorme (≈40+ commits de refactor), evaluar **slicing por work-unit commits / chained PRs** en vez de un deploy monolítico. **Decisión de dueño.**
- [ ] 3.2.2 Verificación pre-deploy: `npm run lint`, tests (`npm run test:run`), build local `npm run build` con env de prod apuntando a Supabase remoto.
- [ ] 3.2.3 Deploy a Vercel (push a `main` o promote desde preview). Confirmar build exitoso en dashboard y revisar logs de runtime post-deploy (Sentry incluido).
- [ ] 3.2.4 Definir y documentar **rollback**: Vercel redeploy del commit anterior + migraciones con rollback manual documentado (convención de migraciones ya lo exige para cambios destructivos).

### 3.3 Datos / configuración de negocio

- [ ] 3.3.1 Verificar en prod: organizaciones, branches, config de sistema, tiers, plantillas de email, config de pagos — que no dependan de seeds locales.
- [ ] 3.3.2 Backfill de lo que el refactor cambió (p. ej. derivación de `organization_id`, service-role → cliente autenticado) si aplica a datos existentes.

**Definición de done**: prod con schema nuevo + código nuevo + login root OK + operación de negocio real (una venta/OT) pasando.

---

## Fase 4 — Smoke test en producción (checklist crítico)

Prioridad por riesgo de negocio. Ejecutar contra prod real con datos reales (o datos de prueba marcados y limpiables):

- [ ] 4.1 Auth: login root/super admin, login admin de organización, login empleado. Onboarding choice.
- [ ] 4.2 POS: venta completa (producto + lente + pago), cierre de caja. Confirmar RLS `organization_id` propagado (fix `process_pos_sale`).
- [ ] 4.3 Quote → Work Order: conversión con lentes/monturas default (fix reciente), sin 500.
- [ ] 4.4 Pagos: checkout Mercado Pago/Flow/PayPal en modo live controlado + recepción de webhook firmado.
- [ ] 4.5 Crons de Vercel (17 rutas): al menos backups semanales + reminders diarios.
- [ ] 4.6 WhatsApp: notificación B2B y agente B2C (si está en alcance de prod).
- [ ] 4.7 Email transaccional (Resend): confirmación de cita / OT lista.
- [ ] 4.8 IA: al menos un insight/chat real con el proveedor default configurado en prod.
- [ ] 4.9 Storage: subida de imagen de producto (R2 o fallback Supabase) — directamente ligado a la cuota que tumbó el servicio.

---

## Fase 5 — Endurecimiento post-recovery (siguiente milestone)

No bloquea la vuelta a producción, pero evita la siguiente caída:

- [ ] 5.1 CI real: decidir gate de type-check (ver 2.3) y hacer el e2e **bloqueante** o eliminarlo explícitamente del CI.
- [ ] 5.2 Vercel Pro (si el plan lo permite): restaurar crons sub-diarios (recordatorios 2h) y ganar límites de storage/builds.
- [ ] 5.3 Redis gestionado (Upstash) o documentar límite del rate-limiting actual (local Docker no sirve en prod; verificar qué usa prod hoy).
- [ ] 5.4 Restore drill programado (no solo dump): validar el backup de verdad, con métrica de tiempo de recuperación.
- [ ] 5.5 Alerta de cuota/utilización: monitorear tamaño de DB/storage para no volver a caer por silencio.
- [ ] 5.6 Continuar deuda técnica documentada (fase 6 del roadmap previo: god files, cobertura, `@deprecated`) — como ciclos SDD separados, no mezclados con el release.

---

## Fase 6 — Día 2 (producto, ya estable)

- [ ] 6.1 Retomar el cambio activo `ts-error-hardening` o archivarlo con decisión explícita.
- [ ] 6.2 Definir cadencia de releases (deploy continuo vs releases semanales) y congelar el proceso.
- [ ] 6.3 Re-evaluar roadmap de producto (CTO briefing archivado es de 2026-02; está desactualizado).

---

## Riesgos y decisiones abiertas (necesitan al dueño)

| #   | Decisión                                                                                          | Impacto                                     | ¿Quién? |
| --- | ------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------- |
| D1  | Plan/cuota de Supabase a contratar y si se purgan backups del bucket                              | Desbloquea Fase 0                           | Dueño   |
| D2  | Qué commit ancla se declara producción y si se hace deploy monolítico o por slices                | Tamaño/riesgo del release (Fase 3.2)        | Dueño   |
| D3  | Política de type-check en CI (baseline 3,355)                                                     | Verde de CI honesto                         | Dueño   |
| D4  | Destino y retención de backups + drill                                                            | Seguridad de datos (Fases 2.5/3.1)          | Dueño   |
| D5  | Cambio activo `ts-error-hardening`: continuar vs archivar                                         | Foco del siguiente ciclo                    | Dueño   |
| D6  | Confirmar que `bakakylxkpztjrulrhnr` == proyecto real de opttius.cl (alias `opttius.supabase.co`) | Evita migrar/pushear al proyecto equivocado | Dueño   |

## Orden de ejecución recomendado

1. **Fase 0** (bloqueante, manual) → 2. **Fases 1–2** (hechos + higiene, pueden correr en paralelo con la decisión D1) → 3. **Fase 3** (release) → 4. **Fase 4** (smoke prod) → 5. **Fases 5–6** (endurecimiento, iterativo).
