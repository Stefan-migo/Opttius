# Instrucciones para solucionar Supabase Local

## Problema original

El contenedor `supabase_db_web` fallaba con:

- **Error 1:** `could not open configuration directory "/etc/postgresql-custom/conf.d"` + `postgresql.conf contains errors`
- **Error 2 (tras reset):** `StorageBackendError: Migration fix-optimized-search-function not found`

## Acciones ya realizadas

1. **Supabase CLI actualizado** a la última versión (`npm install supabase@latest --save-dev`)
2. **Volumen corrupto eliminado** con `supabase stop --no-backup`
3. **Imágenes Docker antiguas eliminadas** para forzar descarga de versiones compatibles

## Pasos para completar manualmente

El comando `supabase start` tarda **5-10 minutos** la primera vez (descarga ~700MB de imágenes). Ejecuta en tu terminal:

```bash
cd d:/proyect/Opttius-app
npx supabase start --yes
```

**Importante:** Usa `--yes` para evitar prompts interactivos (ej. overwrite de buckets).

**Espera hasta que termine.** No interrumpas el proceso. Deberías ver al final algo como:

```
Started supabase local development setup.

         API URL: http://127.0.0.1:54321
     GraphQL URL: http://127.0.0.1:54321/graphql/v1
          DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
      Studio URL: http://127.0.0.1:54323
    Inbucket URL: http://127.0.0.1:54324
```

## Errores comunes y soluciones

| Error                                                      | Solución                                                                                                       |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `supabase_vector_web already in use`                       | Ejecuta `npx supabase stop` y luego `npx supabase start --yes`                                                 |
| `supabase\storage\images: The system cannot find the path` | Crea los directorios: `supabase/storage/images`, `supabase/storage/uploads`, `supabase/storage/product-images` |
| Prompts de bucket overwrite                                | Usa `--yes` en el comando start                                                                                |

## Si sigue fallando

1. **Verifica que Docker Desktop esté corriendo** y tenga recursos suficientes (mínimo 4GB RAM).

2. **Prueba con más tiempo de espera:**

   ```bash
   npx supabase start --debug
   ```

3. **Revisa los logs del contenedor que falle:**

   ```bash
   docker ps -a
   docker logs <container_name>
   ```

4. **Reporta el issue en GitHub** si el error persiste:
   - [supabase/cli](https://github.com/supabase/cli/issues)
   - [supabase/storage](https://github.com/supabase/storage/issues)

## Comandos útiles

```bash
# Ver estado
npx supabase status

# Ver logs de la base de datos
docker logs supabase_db_web

# Reset completo (borra datos locales)
npx supabase stop --no-backup
npx supabase start
```
