# Proposal: Phase 3 — Data & RLS Hardening

**Source**: `openspec/audits/ROADMAP.md` — Phase 3
**Date**: 2026-07-19

## Intent

Hardening de la capa de datos multi-tenant: eliminar accesos service_role innecesarios, asegurar que las ~98 tablas tengan RLS org-scoped, remover backward-compat legacy, y agregar FK indexes faltantes.

## Scope

### In Scope

| ID  | Task                                                                                                                          | Est. Effort | Dependencies |
| --- | ----------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------ |
| 3.1 | **Audit remaining service-role reads** — reemplazar ~15 servicios `createServiceRoleClient()` con auth client + verificar RLS | 1-2 days    | None         |
| 3.2 | **Fix org-blind RLS on remaining ~15 tables** — lens matrices, contact lenses, support, system tables                         | 1-2 days    | None         |
| 3.3 | **Remove `organization_id IS NULL` backward compat** en políticas RLS                                                         | 1 day       | 3.2          |
| 3.4 | **Add missing FK indexes** en tablas nuevas (agreement*\*, telemetry*_, operativo\__)                                         | 1 hour      | None         |

### Out of Scope

- Performance optimization de dashboards (es item separado del roadmap anterior)
- React Query migration (es item separado)
- Split de componentes monolíticos
- Cambios en esquema de tablas existentes (solo agregar índices y RLS)

## Approach

### Chain Strategy: Stacked PRs to main

Cada task es un PR independiente ≤ 400 líneas:

```
main ← PR #1 (3.4 — FK indexes, tiny)
main ← PR #2 (3.1 — service-role reduction)
main ← PR #3 (3.2 — RLS wave-2)
main ← PR #4 (3.3 — remove backward compat)
```

3.4 y 3.1 pueden hacerse en cualquier orden (sin dependencias). 3.3 requiere 3.2 primero.

## Success Criteria

- [ ] Service role usado SOLO para webhooks/cron/admin — cero service-role en API routes y server actions
- [ ] Las ~98 tablas del schema tienen políticas RLS org-scoped (sin `EXISTS (SELECT 1 FROM admin_users WHERE ...)` sin org check)
- [ ] Cero políticas con `organization_id IS NULL` como fallback
- [ ] `EXPLAIN ANALYZE` muestra index scans en agreement*\*, telemetry*_, operativo\__
- [ ] Todos los tests existentes siguen pasando (`npm run test:run`)

## Risks

| Risk                                                    | Level  | Mitigation                                                                 |
| ------------------------------------------------------- | ------ | -------------------------------------------------------------------------- |
| Reemplazar service_role rompe endpoints                 | Medium | Probar cada ruta después del cambio; arrancar por las de solo-lectura      |
| RLS nueva más restrictiva que la anterior rompe queries | Medium | Nuevas policies deben ser superset de las viejas; test con datos multi-org |
| Migraciones concurrentes con Phase 2                    | Low    | Phase 2 toca archivos de código (splitting, API layer), no migraciones     |

## Rollback Plan

Por PR individual: revert el migration file o el cambio de import y redeploy.
