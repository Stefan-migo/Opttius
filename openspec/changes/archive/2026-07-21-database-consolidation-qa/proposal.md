# Proposal: database-consolidation-qa

## Intent

Las 12 migraciones consolidadas + 12 SDD phase files en `supabase/migrations/consolidated/` jamas se probaron con `supabase db reset`. Tienen errores de orden (FKs antes que tablas, triggers antes que funciones), sintaxis invalida (`CREATE POLICY IF NOT EXISTS` no existe en PG), funciones truncadas (faltan `END;`), delimitadores rotos (`$$$`), y redefiniciones conflictivas. Necesitamos reordenar y fixear estos archivos para que pasen `supabase db reset` produciendo un schema IDENTICO al de las 264 migraciones originales.

## Scope

### In Scope

- Reordenar los 12 archivos consolidados (CREATE TABLE → FUNCTION → TRIGGER → FK → POLICY → INDEX → COMMENT)
- Fixear sintaxis invalida: `CREATE POLICY IF NOT EXISTS` → `DO $$` blocks, `$$$` → `$$`, `END;` faltantes
- Eliminar redefiniciones conflictivas de funciones entre archivos
- Diagnosticar y reordenar los 12 SDD phase files (security, indexes, normalization) que tambien estan en consolidated/
- Probar: `supabase db reset` limpio + `pg_dump --schema-only` diff contra las 264 originales
- Si pasa: archivar las 264 originales, mover los 12 consolidados + 12 phase files a `supabase/migrations/` como activas

### Out of Scope

- Cambiar logica de negocio, nombres de tablas/columnas, o entidades del schema
- Agregar/quitar RLS policies o modificar su logica
- Refactorizar seed.sql o datos demo
- Cambios en `docs/` (MIGRATION_CONVENTION.md ya existe)

## Capabilities

None — this is a QA/refactor of existing SQL files. No spec-level behavior changes.

## Approach

**Fase 0 — Diagnostico**: Para cada archivo consolidado, mapear orden actual vs requerido. Identificar statements problematicos.

**Fase 1 — Reestructuracion por archivo**: Extraer y reordenar statements en cada archivo: CREATE TABLE → FUNCTION → TRIGGER → FK → POLICY → INDEX → COMMENT.

**Fase 2 — Fixes de sintaxis**: `CREATE POLICY IF NOT EXISTS` → `DO $$ BEGIN...`, completar `END;` faltantes, `$$$` → `$$`.

**Fase 3 — Verificacion**:

1. Mover las 264 originales a `supabase/migrations/archive/`
2. Mover consolidados + phase files a `supabase/migrations/`
3. `supabase db reset` — debe pasar sin errores
4. `pg_dump --schema-only > after.sql`
5. Restaurar originales desde archive, resetear, `pg_dump --schema-only > before.sql`
6. `diff before.sql after.sql` — debe ser VACIO

**Fase 4 — Swap**: Si diff es 0, archivar las 264 originales definitivamente.

## Affected Areas

| Area                                                     | Impact   | Description                                                    |
| -------------------------------------------------------- | -------- | -------------------------------------------------------------- |
| `supabase/migrations/consolidated/20260701000001-12.sql` | Modified | 12 grupos consolidados reordenados y fixeados                  |
| `supabase/migrations/consolidated/20260702*-05*`         | Modified | 12 SDD phase files reordenados y fixeados                      |
| `supabase/migrations/`                                   | Modified | Swap de archivos (originales → archive, consolidados → active) |
| `supabase/migrations/archive/`                           | Modified | Se mueven las 264 originales aqui si el diff pasa              |

## Risks

| Risk                                                              | Likelihood | Mitigation                                                                   |
| ----------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------- |
| Diff no es 0 — consolidados no replican schema exacto             | Low        | Investigar que cambio; fixear hasta diff = 0                                 |
| Archivos phase (20260702-05) dependen de consolidados (20260701)  | Low        | Numerar migraciones en orden correcto (consolidados primero, phases despues) |
| Seed.sql (20260701000011) depende de datos creados por originales | Low        | Seed es idempotente — se ejecuta al final del reset                          |

## Rollback Plan

| Escenario                              | Accion                                                                    |
| -------------------------------------- | ------------------------------------------------------------------------- |
| Consolidado fixeado no pasa `db reset` | Revertir cambios en ese archivo; debuggear con `supabase db dump --local` |
| Diff no es 0                           | No hacer el swap. Dejar originales como activas. Debuggear diff.          |
| Swap ya hecho y algo falla             | Restaurar originales desde archive ZIP + `supabase db reset`              |

## Dependencies

- `supabase db reset` funcional (conexion local a Postgres)
- `pg_dump` disponible (Postgres CLI)
- Las 264 originales ya existen y aplican correctamente (baseline conocido)

## Success Criteria

- [ ] `supabase db reset` pasa sin errores con los archivos consolidados + phases
- [ ] `diff` entre `pg_dump --schema-only` de originales vs consolidados es VACIO
- [ ] Las 264 originales archivadas, consolidados activos en `supabase/migrations/`
