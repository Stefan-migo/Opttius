# E2E Testing con Playwright

Guía para ejecutar y configurar tests end-to-end en Opttius.

---

## ¿Cómo funciona el E2E testing?

Los tests E2E (End-to-End) simulan un **usuario real** usando un navegador: abren la app, hacen clic, rellenan formularios y verifican que la aplicación responde correctamente.

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Playwright     │     │  Next.js (dev)   │     │  Supabase local  │
│  (navegador)    │ ──► │  localhost:3000  │ ──► │  localhost:54321 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

- **Playwright** lanza un navegador (Chromium por defecto) y ejecuta los tests.
- **Next.js** debe estar corriendo (o Playwright lo inicia con `webServer`).
- **Supabase** debe estar corriendo localmente con datos demo.

---

## ¿Qué debo hacer manualmente?

### 1. Primera vez: instalar navegadores de Playwright

```bash
npx playwright install
```

Solo hace falta una vez. Descarga Chromium, Firefox y WebKit.

### 2. Levantar Supabase local

```bash
npm run supabase:start
```

Espera a que esté listo. Verifica con `npm run supabase:status`.

### 3. (Opcional) Crear usuario de test para tests con auth

Los tests **sin credenciales** (login page, redirects) funcionan sin configuración.

Los tests **con login** (auth.spec.ts) necesitan un usuario válido. Crea uno con:

```bash
DEMO_ADMIN_EMAIL=e2e-test@example.com DEMO_ADMIN_PASSWORD=TestPass123! node scripts/create-demo-super-admin.js
```

Luego configura las variables en `.env.local` (o `.env.e2e`):

```
DEMO_ADMIN_EMAIL=e2e-test@example.com
DEMO_ADMIN_PASSWORD=TestPass123!
```

Los tests de auth usan `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` o, si no existen, `DEMO_ADMIN_EMAIL` / `DEMO_ADMIN_PASSWORD`.

---

## ¿Debo entregar credenciales de test?

**No es obligatorio.** Hay dos niveles:

| Nivel        | Credenciales       | Tests que corren               |
| ------------ | ------------------ | ------------------------------ |
| **Básico**   | No                 | Login page, redirects, landing |
| **Completo** | Sí (DEMO*ADMIN*\*) | + Login exitoso, login fallido |

Si no configuras credenciales, los tests que las requieren se **saltan** automáticamente (`test.skip`).

---

## Ejecutar tests

### Todos los tests E2E

```bash
npm run test:e2e
```

Playwright inicia `npm run dev` si no hay servidor en marcha (excepto en CI).

Si el servidor ya está corriendo:

```bash
npm run test:e2e:server
```

O: `PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test`

### Con interfaz visual

```bash
npm run test:e2e:ui
```

### Con navegador visible (headed)

```bash
npm run test:e2e:headed
```

### Solo un archivo

```bash
npx playwright test e2e/onboarding.spec.ts
```

---

## Estructura

```
e2e/
├── global.setup.ts    # Validación de entorno antes de los tests
├── onboarding.spec.ts # Tests sin auth (login, redirects)
└── auth.spec.ts      # Tests con auth (requieren credenciales)
```

---

## Variables de entorno

| Variable              | Uso                                       |
| --------------------- | ----------------------------------------- |
| `PLAYWRIGHT_BASE_URL` | URL base (default: http://localhost:3000) |
| `E2E_TEST_EMAIL`      | Email para tests de login                 |
| `E2E_TEST_PASSWORD`   | Contraseña para tests de login            |
| `DEMO_ADMIN_EMAIL`    | Fallback si no hay E2E*TEST*\*            |
| `DEMO_ADMIN_PASSWORD` | Fallback si no hay E2E*TEST*\*            |

---

## Flujo recomendado

1. `npm run supabase:start`
2. `DEMO_ADMIN_EMAIL=... DEMO_ADMIN_PASSWORD=... node scripts/create-demo-super-admin.js`
3. Añadir DEMO*ADMIN*\* a `.env.local`
4. `npm run test:e2e`

---

## Referencias

- [Playwright docs](https://playwright.dev/)
- `docs/TESTING_GUIDE.md` — Guía general de testing
- `scripts/create-demo-super-admin.js` — Crear usuario demo
