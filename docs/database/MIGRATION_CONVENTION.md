# Convención de Migraciones — Opttius Database

## 1. Naming Convention

```
YYYYMMDDHHMMSS_descripcion_corta.sql
```

| Componente          | Regla                                                        |
| ------------------- | ------------------------------------------------------------ |
| `YYYYMMDD`          | Fecha del cambio (ej. `20260715`)                            |
| `HHMMSS`            | Timestamp opcional para desambiguar (ej. `000000`, `120530`) |
| `descripcion_corta` | Snake_case, ≤40 chars, describe el cambio                    |

**Ejemplos**:

| Correcto                                                   | Incorrecto                              |
| ---------------------------------------------------------- | --------------------------------------- |
| `20260715_add_prescription_expiry_alert.sql`               | `migration_1.sql`                       |
| `20260715120000_fix_customers_rls_policy.sql`              | `fix_stuff.sql`                         |
| `20260801000001_add_customer_own_frame_to_work_orders.sql` | `2026-08-01_add_customer_own_frame.sql` |

**Regla de timestamp**: No repetir timestamps. Si dos migraciones se crean el mismo día, usar HHMMSS creciente (`000001`, `000002`...).

---

## 2. Template de Migración

```sql
-- Migration: YYYYMMDDHHMMSS_descripcion_corta.sql
-- Description: <qué hace esta migración y por qué>
--
-- Rollback:
--   <comandos SQL para revertir>
--   Si es destructivo: documentar procedimiento manual
--
BEGIN;

-- <migration logic here — statements con IF NOT EXISTS / IF EXISTS>

COMMIT;
```

### Tipos por operación

**CREATE TABLE / ALTER TABLE**:

```sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema = 'public' AND table_name = 'tabla') THEN
    CREATE TABLE public.tabla ( ... );
  END IF;
END $$;
```

**ADD COLUMN**:

```sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'tabla'
                 AND column_name = 'columna') THEN
    ALTER TABLE public.tabla ADD COLUMN columna TEXT;
  END IF;
END $$;
```

**CREATE INDEX** (fuera de transacción si se usa CONCURRENTLY):

```sql
-- CONCURRENTLY no bloquea escrituras pero requiere ejecución fuera de transacción
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tabla_columna
  ON public.tabla(columna);
```

**CREATE OR REPLACE FUNCTION**:

```sql
CREATE OR REPLACE FUNCTION public.mi_funcion(...)
RETURNS ...
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  ...
$$;
```

---

## 3. Reglas

### 3.1 Idempotencia

Cada migración **MUST** poder ejecutarse múltiples veces sin errores.

| Operación              | Técnica                        |
| ---------------------- | ------------------------------ |
| CREATE TABLE           | `IF NOT EXISTS`                |
| CREATE INDEX           | `IF NOT EXISTS`                |
| CREATE FUNCTION        | `CREATE OR REPLACE`            |
| ALTER TABLE ADD COLUMN | `DO $$` block con verificación |
| INSERT datos           | `ON CONFLICT (id) DO NOTHING`  |
| DROP                   | `IF EXISTS`                    |

### 3.2 Transacciones explícitas

- Toda migración **MUST** usar `BEGIN;` / `COMMIT;`
- Excepción: `CREATE INDEX CONCURRENTLY` — **NO** puede ir dentro de transacción
- Si un paso falla, la transacción revierte completamente (no hay medio-cambio)

### 3.3 SECURITY DEFINER

Toda función con `SECURITY DEFINER` **MUST** incluir `SET search_path = 'public'` para prevenir schema injection.

```sql
CREATE OR REPLACE FUNCTION public.mi_funcion()
RETURNS ...
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$ ... $$;
```

### 3.4 Rollback documentado

- Migraciones no-destructivas: rollback simple en comentario (`DROP TABLE IF EXISTS ...`)
- Migraciones destructivas (DROP column, DROP table con datos): **MUST** documentar procedimiento manual
- No borrar archivos de migración del historial. Mover a `archive/` si es necesario.

### 3.5 Comentarios

- Tablas y columnas críticas: usar `COMMENT ON TABLE` / `COMMENT ON COLUMN`
- Propósito de la columna, valores esperados, restricciones de negocio

### 3.6 Una migración = un cambio atómico

- No mezclar cambios no relacionados en un mismo archivo
- Separar por dominio: schema, datos, funciones, índices
- Si dos cambios son independientes, van en archivos separados

---

## 4. Pre-merge Checklist

Antes de mergear una rama con migraciones nuevas:

- [ ] `supabase db reset` funciona sin errores
- [ ] `npm run test:run` pasa con 0 failures
- [ ] `npm run build` compila sin errores
- [ ] No hay `FIXME` / `TODO` en la migración
- [ ] `supabase_get_advisors(type: "security")` = clean (sin warnings de seguridad)
- [ ] `supabase_get_advisors(type: "performance")` = clean (sin warnings de performance)
- [ ] Si modifica schema existente: verificar `pg_dump --schema-only` diff pre/post

---

## 5. Comandos Útiles

```bash
# Nueva migración
supabase migration new descripcion_corta

# Reset local (aplica migraciones + seed)
supabase db reset

# Ver estado de migraciones
supabase migration list

# Reparar estado (si una migración falló y se aplicó manualmente)
supabase migration repair --status applied <version>

# Push a remote (staging/production)
supabase db push

# Vincular proyecto remoto
supabase link --project-ref <project-ref>
```

### Verificación post-cambio

```bash
# Schema diff contra estado anterior
pg_dump --schema-only > after.sql
diff before.sql after.sql

# Ver funciones SECURITY DEFINER sin search_path
psql -U postgres -d postgres -c "
  SELECT p.proname FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.prosecdef = true
    AND (p.proconfig IS NULL OR NOT (p.proconfig @> '{search_path=public}'::text[]));
"

# Ver FKs sin índice
psql -U postgres -d postgres -c "
  SELECT
    conrelid::regclass AS table_name,
    conname AS fk_name,
    (SELECT string_agg(a.attname, ', ' ORDER BY u.attposition)
     FROM pg_attribute a
     JOIN unnest(conkey) WITH ORDINALITY u(attnum, attposition) ON a.attnum = u.attnum
     WHERE a.attrelid = conrelid) AS fk_columns
  FROM pg_constraint
  WHERE contype = 'f'
    AND connamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    AND NOT EXISTS (
      SELECT 1 FROM pg_index i
      WHERE i.indrelid = conrelid
        AND i.indkey::text LIKE (SELECT string_agg(attnum::text, ' ') || '%'
                                 FROM unnest(conkey) AS attnum)
    );
"
```

---

## 6. Workflow de Deploy

### 6.1 Flujo Local

```
supabase migration new <desc>   →  Crea archivo SQL en supabase/migrations/
      ↓
Editar migración               →  Escribir SQL con reglas de idempotencia
      ↓
supabase db reset              →  Aplica migraciones + seed en DB local
      ↓
npm run test:run               →  Verifica que tests pasan
      ↓
npm run build                  →  Verifica que compila
```

### 6.2 Flujo CI / Test

- Las migraciones se aplican automáticamente via `supabase db push` en CI
- El pipeline ejecuta `supabase db reset` → `npm run test:run` → `npm run build`
- Si falla, bloquea el merge

### 6.3 Flujo Remote (Production)

```
1. Verificar pre-push:
   - pg_dump --schema-only diff contra staging
   - supabase_get_advisors(type: "security")
   - supabase_get_advisors(type: "performance")

2. Push:
   supabase db push --linked

3. Post-push:
   - Verificar estado: supabase migration list
   - Ejecutar smoke tests en producción
```

**Importante**: En producción, migraciones destructivas (DROP column, cambios irreversibles) **MUST** ejecutarse en ventana de mantenimiento con backup verificado previo.

---

## 7. Historial de Cambios a esta Convención

| Fecha      | Cambio                                                             |
| ---------- | ------------------------------------------------------------------ |
| 2026-07-05 | Creación inicial — basada en migraciones consolidadas del proyecto |
