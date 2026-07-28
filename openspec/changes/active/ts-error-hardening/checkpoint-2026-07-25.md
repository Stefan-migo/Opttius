# Checkpoint: ts-error-hardening — 25 Julio 2026

## Estado general

| Indicador | Valor |
|---|---|
| Errores TS originales | **4,353** |
| Errores TS restantes | **3,368** |
| Reducción | **−985 (23%)** |
| PRs completados | **11 / 12** |
| Sesiones necesarias | **1 de ~3-4 estimadas** |

## Progreso por tipo de error

| Error | Antes | Ahora | Reducción |
|---|---|---|---|
| TS18046 (`'x' is unknown`) | 1,624 | 1,030 | −594 (37%) |
| TS2339 (property not in type) | 1,437 | 1,252 | −185 (13%) |
| TS2345 (argument mismatch) | 580 | 544 | −36 (6%) |
| TS2571 (object is unknown) | 180 | 38 | −142 (79%) |
| TS2322 (type not assignable) | 126 | 119 | −7 (6%) |
| TS2769 (overload mismatch) | 129 | 114 | −15 (12%) |
| Otros | 277 | 271 | −6 (2%) |

## Archivos con TS18046: 203 → 139 (−64)

## PRs completados

| PR | Fase | Scope | Estado |
|----|------|-------|--------|
| 1 | Phase 2 | `createClient<T>` generic en server.ts | ✅ |
| 2 | Phase 4 | `validatedData: unknown` → Record en middleware.ts | ✅ |
| 3 | Phase 1 | Services batch 1 — top 4 tóxicos (−138 errors) | ✅ |
| 4 | Phase 1 | Services restantes + branch-middleware `any` (−110) | ✅ |
| 5 | Phase 1 | AI module — tools + insights + agent (11 files, 0 as unknown) | ✅ |
| 6 | Phase 1 | Admin components — 78 casts en 13 archivos | ✅ |
| 7 | Phase 1 | App/admin + app/api routes — 56 archivos, ~216 cambios | ✅ |
| 8 | Phase 5 | `fromTable()` helper + API routes batch 1 | ✅ |
| 9 | Phase 5 | backup-service + utils/server.ts generic fix | ✅ |
| 10 | Phase 6 | Non-AI standalone — catch blocks + 66 casts | ✅ |
| 11 | Phase 6 | AI module standalone — 400→0 errors en AI | ✅ |
| **12** | **Phase 6** | **Remove ignoreBuildErrors + final tsc** | **⬜** |

## Cambios estructurales realizados

### Archivos creados
- `src/types/supabase-helpers.ts` — `fromTable()` helper para dynamic `.from()` calls

### Archivos modificados (infraestructura)
- `src/lib/supabase/server.ts` — `<T = Database>` generic en `createClient()` y `createClientFromRequest()`
- `src/utils/supabase/server.ts` — mismo fix (duplicado)
- `src/lib/validation/middleware.ts` — `validatedData: unknown` → `Record<string, unknown>`
- `src/lib/api/branch-middleware.ts` — `query: unknown` → `query: any`

### Archivos de especificaciones
- `openspec/changes/active/ts-error-hardening/proposal.md`
- `openspec/changes/active/ts-error-hardening/spec.md`
- `openspec/changes/active/ts-error-hardening/design.md`
- `openspec/changes/active/ts-error-hardening/tasks.md`

## Lo que queda por hacer (PR 12 no alcanza aún)

### Patrón 1: `validatedBody: unknown` (114 TS18046)
**Archivo**: `src/lib/api/services/adminQuoteService.ts`
**Causa**: La función `parseAndValidateBody()` devuelve `unknown`, no el tipo inferido de Zod.
**Fix**: Tipar `parseAndValidateBody` con el schema generic, o tipar `validatedBody` con `z.infer<typeof createQuoteSchema>`.
**Esfuerzo**: ~1 archivo, pero requiere entender el helper de validación.

### Patrón 2: `updateData: unknown` (105 TS18046)
**Archivos**: AI memory/indexer (`memory/long-term.ts`, `memory/indexer/index-products.ts`, etc.)
**Causa**: Declaran `let updateData: unknown` antes de un upsert, y después acceden propiedades.
**Fix**: Tipar con el tipo correcto de la tabla o usar `as Record<string, unknown>` con acceso controlado.
**Esfuerzo**: ~5-10 archivos.

### Patrón 3: TS2339 (1,252 errores)
**Causa**: Property access en tipos donde la propiedad no existe. E.j.: `matrix.addition_min` donde `LensPriceMatrix` no tiene `addition_min`.
**Fix**: Agregar propiedades faltantes a los tipos, o castear inline.
**Esfuerzo**: Distribuido — requiere auditoría por módulo.

### Patrón 4: Iteración con `: unknown` (scattered)
**Causa**: Callbacks de `.map()`, `.filter()` donde el array upstream sigue sin tipo.
**Fix**: Cadenas de tipos que no se completaron porque el `as unknown` original estaba más arriba en la cadena.
**Esfuerzo**: ~30-50 archivos.

### Patrón 5: `SupabaseClient<unknown>` residual
**Causa**: Algunas funciones reciben `SupabaseClient<unknown>` (no `<Database>`) y los queries devuelven `never`.
**Fix**: Cambiar `<unknown>` → `<any>` o `<Database>`.
**Esfuerzo**: ~20 archivos (AI tools + services).

## Cómo continuar en la próxima sesión

1. Leer este checkpoint: `openspec/changes/active/ts-error-hardening/checkpoint-2026-07-25.md`
2. Buscar en Engram: `mem_search(query: "sdd/ts-error-hardening/apply-progress", project: "opttius")`
3. Evaluar si conviene:
   - **Opción A**: Un SDD cycle por patrón (validatedBody → updateData → TS2339)
   - **Opción B**: Un solo SDD cycle grande con PRs más cortos
   - **Opción C**: Atacar los 1,030 TS18046 primero con un `sdd-apply` directo, y después evaluar los TS2339

## Commit SHAs de referencia
- PR 1-2: En rama `fix/thread-supabase-generic` (commit inicial)
- PR 3-11: Commits secuenciales en stacked branches
- Todos los cambios están en working tree, sin pushear
