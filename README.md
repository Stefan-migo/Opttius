# Opttius — Sistema de Gestión Óptica (SaaS)

SaaS multi-tenant para ópticas y laboratorios ópticos chilenos. Next.js 14 (App Router), TypeScript, Tailwind CSS y Supabase (base de datos, auth, storage, edge). Gestión completa: CRM, citas, presupuestos, trabajos de laboratorio, inventario, POS, pagos, convenios institucionales y agente IA.

## Módulos

### Operación de la óptica (`/admin`)

| Módulo          | Ruta                                               | Descripción                                                    |
| --------------- | -------------------------------------------------- | -------------------------------------------------------------- |
| Dashboard       | `/admin`                                           | KPIs, citas del día, alertas de stock, acceso rápido           |
| CRM / Clientes  | `/admin/customers`                                 | Perfiles con recetas e historial, búsqueda por RUT             |
| Citas           | `/admin/appointments`                              | Calendario semanal/mensual, slots, clientes no registrados     |
| Presupuestos    | `/admin/quotes`                                    | Marcos/lentes/tratamientos, expiración, email/PDF, conversión  |
| Work Orders     | `/admin/work-orders`                               | Ciclo de laboratorio completo con timeline y estados           |
| POS             | `/admin/pos`                                       | Venta rápida, carga de presupuestos, múltiples métodos de pago |
| Caja            | `/admin/cash-register`                             | Sesiones de caja, apertura/cierre, arqueo                      |
| Inventario      | `/admin/products`                                  | Catálogo, stock por sucursal, opciones configurables           |
| Óptica avanzada | `/admin/lens-matrices`, `contact-lens-*`, `lens-*` | Matrices de precio de lentes, familias, lentes de contacto     |
| Órdenes         | `/admin/orders`                                    | Pedidos/ventas                                                 |
| Operativos      | `/admin/field-operations`                          | Operativos en terreno con inventario móvil                     |
| Convenios       | `/admin/agreements`                                | Convenios B2B institucionales, OC, cobranza                    |
| Recetas         | `/admin/prescriptions`                             | Libro de recetas digital, cumplimiento                         |

### Administración del SaaS (`/admin`)

| Módulo          | Ruta                     | Descripción                                               |
| --------------- | ------------------------ | --------------------------------------------------------- |
| Usuarios admin  | `/admin/admin-users`     | Roles, acceso por sucursal, super admin                   |
| Sucursales      | `/admin/branches`        | Multi-sucursal por organización                           |
| SaaS Management | `/admin/saas-management` | Organizaciones, planes, telemetría, backups               |
| Analítica       | `/admin/analytics`       | Métricas y KPIs avanzados                                 |
| Soporte         | `/admin/support`         | Tickets B2B/B2C                                           |
| Sistema         | `/admin/system`          | Config global vs. por sucursal, email, notificaciones     |
| IA              | `/admin/chat`            | Agente con tool calling, insights, memoria organizacional |
| Notificaciones  | `/admin/notifications`   | Config y log de notificaciones                            |

### Público

Login, registro, onboarding, perfil, checkout, `productos` (storefront), soporte al cliente, `solicitar-demo`, `acceso-opticas`, legal.

## Integraciones

- **Supabase**: auth, PostgreSQL con RLS org-scoped, storage, cron, webhooks
- **Pagos**: Mercado Pago, Flow (Chile), PayPal, NOWPayments (crypto), Stripe
- **Email**: Resend (transaccionales + webhooks firmados)
- **IA**: OpenAI, Anthropic, Google Gemini, DeepSeek — con fallback automático y tool calling
- **WhatsApp**: Meta Cloud API (B2B notificaciones + B2C agente)
- **Almacenamiento**: Cloudflare R2 con fallback a Supabase Storage
- **Observabilidad**: Sentry, telemetría propia, pino

## Stack técnico

- **Next.js 14.2** (App Router), React 18, TypeScript
- **Tailwind CSS** + Radix UI + shadcn/ui
- **Supabase** (`@supabase/ssr`, clientes tipados con `<Database>`)
- **TanStack Query**, React Hook Form + Zod, Recharts
- **Testing**: Vitest (unit/integration), Playwright (E2E), ESLint + Prettier + Husky
- **Node.js ≥ 18** (recomendado: 20 LTS / 22+)

## Requisitos previos

- **Node.js** ≥ 18 y npm
- **Docker Desktop** corriendo (Supabase local)
- Supabase CLI incluido como devDependency (`npx supabase`)

## Puesta en marcha local

```bash
# 1. Instalar dependencias
npm install

# 2. Levantar Supabase local (Docker Desktop debe estar corriendo)
npm run supabase:start      # primera vez: descarga imágenes (5-10 min); luego 10-30 s

# 3. Copiar y completar variables de entorno
cp env.example .env.local
npm run supabase:status     # copiar API URL, anon key y service_role key a .env.local
```

Variables mínimas en `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key_del_status>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key_del_status>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

```bash
# 4. Aplicar migraciones y seed (crea todo el schema + RLS + funciones)
npm run supabase:reset

# 5. Arrancar la app
npm run dev
```

Accesos útiles:

- App: http://localhost:3000
- Admin: http://localhost:3000/admin
- Supabase Studio: http://127.0.0.1:54323
- Mailpit (emails de prueba): http://127.0.0.1:54324

## Crear el primer usuario administrador

1. Regístrate en http://localhost:3000/signup (o `/onboarding`).
2. Edita `scripts/sql-utils/grant-admin-access.sql` con tu email y ejecuta:

```bash
docker exec -i supabase_db_web psql -U postgres -d postgres < scripts/sql-utils/grant-admin-access.sql
```

Alternativa en Supabase Studio → SQL Editor (reemplaza el email):

```sql
DO $$
DECLARE user_id uuid;
BEGIN
  SELECT id INTO user_id FROM auth.users WHERE email = 'tu-email@ejemplo.com';
  IF user_id IS NULL THEN RAISE EXCEPTION 'Usuario no encontrado';
  END IF;
  INSERT INTO public.admin_users (id, email, role, is_active, created_at, updated_at)
  VALUES (user_id, 'tu-email@ejemplo.com', 'admin', true, now(), now())
  ON CONFLICT (id) DO UPDATE SET role = 'admin', is_active = true, updated_at = now();
END $$;
```

## Testing

```bash
npm run type-check          # tsc --noEmit (⚠️ baseline con errores históricos, ver abajo)
npm run lint                # ESLint
npm run test:unit           # tests unitarios (Vitest)
npm run test:integration    # tests de integración
npm run test:security       # integración de seguridad
npm run test:e2e            # Playwright E2E completo (usa .env.e2e + stack local)

npx playwright test --project=public   # solo auth/onboarding
npx playwright test --project=setup    # regenerar storageState de admin
```

> **E2E**: usa `.env.e2e` y asume `http://127.0.0.1:3000` (auto-inicia `npm run dev` si no hay servidor). Antes de correrlo, verifica con `npm run supabase:status` que el stack local sea el de Opttius (project id `web`) — otro stack Supabase en los puertos 54321-54324 produce fallos de auth en cascada.

## Scripts útiles

| Comando                              | Acción                                          |
| ------------------------------------ | ----------------------------------------------- |
| `npm run dev` / `build` / `start`    | Next.js dev / build / producción                |
| `npm run supabase:start/stop/status` | Ciclo de vida Supabase local                    |
| `npm run supabase:reset`             | Re-aplicar migraciones desde cero               |
| `npm run supabase:push`              | Empujar migraciones locales al stack local      |
| `npm run type-check`                 | Verificación de tipos                           |
| `npm run tunnel`                     | ngrok para webhooks de pago en dev              |
| `npm run redis:setup`                | Redis local (rate limiting distribuido)         |
| `npm run seed:test-data`             | Datos de prueba                                 |
| `npm run test:all`                   | Unit + integración + API + DB + security + perf |

## Estructura

```
src/
├── app/              # App Router: /admin (panel), /api (rutas API), páginas públicas
├── components/       # UI y componentes de dominio
├── lib/              # Clientes Supabase tipados, servicios, utils, AI, email
├── hooks/            # Hooks compartidos
├── utils/            # Utilidades (supabase server/client)
├── types/            # Tipos y supabase-types
├── middleware.ts     # Auth + sesión
e2e/                  # Tests Playwright (setup, public, admin)
supabase/
├── migrations/       # Migraciones SQL (schema, RLS, funciones, triggers)
└── config.toml       # Configuración Supabase local
openspec/             # Artefactos SDD (changes activos/archivados, specs)
docs/                 # Documentación del proyecto (índice: docs/README.md)
```

## Estado y deuda conocida

- **TypeScript**: el baseline de `type-check` arrastra errores históricos concentrados en rutas API y servicios (`src/app/api`, `src/lib/api`). Se redujo de ~4,353 (julio) a ~3,355. Trabajo en curso por campañas; no es un bloqueante para `dev`, pero CI corre type-check.
- **Documentación completa**: ver [docs/README.md](docs/README.md) (índice maestro) y `docs/01-getting-started/` para guías de setup y resumen ejecutivo.

## Documentación

- [Guía de configuración local](docs/01-getting-started/SETUP_GUIDE.md)
- [Resumen ejecutivo](docs/01-getting-started/PROJECT_SUMMARY.md)
- [Índice maestro de docs](docs/README.md)
- [Convención de migraciones](docs/database/MIGRATION_CONVENTION.md)
- [CI/CD](docs/CI-CD.md)
