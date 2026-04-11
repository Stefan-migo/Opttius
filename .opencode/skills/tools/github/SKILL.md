---
name: github
description: Expert guide for managing GitHub repositories, workflows, pull requests, issues, releases, and CI/CD pipelines for Opttius. Use when managing GitHub Actions, creating release workflows, reviewing PRs, automating tasks via GitHub API, or coordinating team contributions.
---

# GitHub Integration for Opttius

Expert guide for GitHub workflows, PRs, issues, and automation.

## Cuándo Usar Este Skill

- Revisar y crear GitHub Actions workflows
- Gestionar pull requests y code reviews
- Crear y gestionar releases
- Coordinar issues y milestones
- Automatizar tareas via GitHub API

## Estructura del Repositorio

```
.github/
├── workflows/
│   ├── ci.yml           # CI principal
│   ├── deploy-vercel.yml # Deploy a Vercel
│   ├── saas-backup.yml  # Backup diario DB
│   └── sync-notebooklm.yml
├── ISSUE_TEMPLATE/
├── PULL_REQUEST_TEMPLATE.md
└── README.md
```

## Workflows Existentes

### CI Pipeline

```yaml
name: CI
on: [push, pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run build
```

### Vercel Deployment

```yaml
name: Deploy to Vercel
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
```

### SaaS Backup (GitHub Actions)

Ubicación: `.github/workflows/saas-daily-backup.yml`

Secrets requeridos:

- `DIRECT_DATABASE_URL` - Conexión Supabase via Supavisor
- `SUPABASE_URL` - URL del proyecto
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key
- `CRON_SECRET` - Secreto para endpoint de backup

## Issues y Labels

### Labels Principales

| Label              | Color  | Uso                        |
| ------------------ | ------ | -------------------------- |
| `bug`              | red    | Bugs reportados            |
| `enhancement`      | green  | Nuevas features            |
| `documentation`    | blue   | Docs a actualizar          |
| `priority:high`    | orange | Alta prioridad             |
| `good first issue` | purple | Para nuevos contribuidores |

### Templates de Issue

```markdown
## Descripción

[Descripción clara del problema]

## Pasos para Reproducir

1.
2.
3.

## Comportamiento Esperado

[Qué debería pasar]

## Comportamiento Actual

[Qué pasa actualmente]

## Screenshots/Logs

[Si aplica]
```

## Pull Requests

### PR Checklist

- [ ] Tests agregados/actualizados
- [ ] Lint pasa
- [ ] Typecheck pasa
- [ ] Build succeed
- [ ] Documentación actualizada
- [ ] Labels asignados

### Merge Strategy

Usar **Squash and Merge** para mantener historial limpio.

## GitHub CLI

```bash
# Autenticación
gh auth login

# Listar PRs
gh pr list --state=open --repo=Stefan-migo/Opttius

# Revisar PR
gh pr review [PR_NUMBER] --approve

# Crear PR
gh pr create --title "feat: nueva funcionalidad" --body "Descripción"

# Ver status
gh pr status

# Gestionar releases
gh release create v1.0.0 --notes "Release notes"
```

## Automatización con GitHub API

### Crear Issue desde Script

```bash
curl -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -d '{
    "title": "Bug: descripción del bug",
    "body": "Detalles del bug",
    "labels": ["bug"]
  }' \
  https://api.github.com/repos/Stefan-migo/Opttius/issues
```

## Documentación Relacionada

- `docs/VERCEL_DEPLOYMENT_2026-02.md` - Configuración de deploy
- `.github/workflows/` - Workflows existentes
- `AGENTS.md` - Contexto del proyecto
