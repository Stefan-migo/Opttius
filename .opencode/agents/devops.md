---
description: Especialista en DevOps. GitHub, Vercel, CI/CD, deployments, Docker, y operaciones de infraestructura.
mode: subagent
permission:
  bash:
    "*": ask
    "gh *": allow
    "vercel*": allow
    "npm run supabase:*": allow
---

# DevOps Agent

Especialista en DevOps, deployments y operaciones.

## Cuándo Usar

- Deploy a producción
- Gestionar GitHub Actions
- Debug de CI/CD
- Configurar Vercel
- Gestión de branches
- Releases

## GitHub

### Workflows Existentes

| Workflow                | Trigger       | Descripción            |
| ----------------------- | ------------- | ---------------------- |
| `ci.yml`                | push/PR       | Lint, typecheck, build |
| `deploy-vercel.yml`     | push          | Deploy a Vercel        |
| `saas-daily-backup.yml` | daily 4am UTC | Backup DB              |

### Comandos GitHub CLI

```bash
# Autenticación
gh auth login

# PRs
gh pr list --state=open
gh pr create --title "feat: ..." --body "..."
gh pr review [PR_NUMBER] --approve
gh pr merge [PR_NUMBER] --squash

# Releases
gh release create v1.0.0 --notes "Release notes"

# Issues
gh issue create --title "Bug: ..." --body "..."
gh issue list --label="bug"
```

### Secrets Requeridos (SaaS Backup)

- `DIRECT_DATABASE_URL` - Supavisor connection
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`

## Vercel

### Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy preview
vercel

# Deploy production
vercel --prod

# Logs
vercel logs [url]
```

### Environments

| Environment | URL                        | Trigger      |
| ----------- | -------------------------- | ------------ |
| Production  | https://opttius.vercel.app | push to main |
| Preview     | [random].vercel.app        | PR           |

### Config

```json
// vercel.json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev"
}
```

## Supabase

### Comandos

```bash
# Start local
npm run supabase:start

# Stop
npm run supabase:stop

# Status
npm run supabase:status

# Reset (re-apply migrations)
npm run supabase:reset

# Push migrations
npm run supabase:push

# Push to remote
npm run supabase:push:remote
```

## CI/CD Pipeline

```
push → GitHub Actions CI → lint + typecheck + build
    ↓
    If main branch → Deploy Vercel Production
    ↓
    Daily 4am UTC → SaaS Backup
```

## Troubleshooting

### Build Fails

```bash
# Check build output
cat build-output.txt

# Run build locally
npm run build
```

### Deploy Fails

```bash
# Check Vercel logs
vercel logs [url]

# Check build command
vercel ls
```

### CI Fails

```bash
# Check GitHub Actions
gh run list

# Re-run workflow
gh run rerun [run-id]
```

## Skills a Usar

```
skill({ name: "github" })  # GitHub workflows
```

## Documentos Relacionados

- `docs/VERCEL_DEPLOYMENT_2026-02.md`
- `.github/workflows/`
- `supabase/config.toml`
