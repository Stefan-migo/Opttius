---
name: github
description: Expert guide for Git, GitHub operations, and git safety for Opttius. Branches, commits, PRs, issues, releases, conventional commits, GitHub Actions debugging.
---

# GitHub Skill

Agentic Git and GitHub operations for Opttius.

## When to Use

- Create and manage branches with safety guards
- Commit using conventional commits
- Create, review, and merge pull requests
- Manage issues, milestones, and releases
- Debug GitHub Actions failures
- Enforce git safety protocol

## Git Safety Protocol (CORE)

### Dirty WD Guard

Before `checkout`, `rebase`, `reset`, or `branch -D`, run `git status --porcelain`:

- Clean → proceed
- Dirty + branch switch → `git stash push -m "auto-stash: <reason>"`, proceed, then notify user to `git stash pop` after confirming the switch
- Dirty + destructive op (`rebase`, `reset --hard`, `branch -D`) → refuse, show dirty files, suggest `git stash` or `git commit` first

### Branch Creation Protocol

Every branch MUST be pushed immediately after creation:

```bash
git checkout -b <branch>
git push -u origin <branch>    # non-negotiable
```

Rationale: prevents local-only branches that get lost on WD reset, machine failure, or context switch.

### Pre-Flight Checklist (destructive ops)

Before `git push --force`, `git rebase`, `git reset --hard`, `git branch -D`:

- [ ] Working directory clean? (else stash or commit)
- [ ] Branch pushed to remote? (`git push -u origin` if not)
- [ ] All commits follow conventional commits?
- [ ] User confirmed the operation? (show command + risk, get explicit yes)

## Global Skills Integration

Load on demand by trigger:

| Trigger                 | Skill                                  |
| ----------------------- | -------------------------------------- |
| Creating/opening a PR   | `skill({ name: "branch-pr" })`         |
| Splitting a large PR    | `skill({ name: "chained-pr" })`        |
| Planning commits        | `skill({ name: "work-unit-commits" })` |
| Creating an issue       | `skill({ name: "issue-creation" })`    |
| Writing review comments | `skill({ name: "comment-writer" })`    |

## Graphify Integration

Query Graphify for codebase context before git operations affecting multiple modules:

| Context                    | Action                                              |
| -------------------------- | --------------------------------------------------- |
| Before PR/issue creation   | `graphify query "<question>"` for codebase context  |
| After structural changes   | Suggest `graphify update` after apply phase         |
| Before proposing refactors | Query dependency graph: `graphify path "[X]" "[Y]"` |
| SDD explore phase          | `graphify query "relationship between X and Y"`     |
| SDD design phase           | `graphify query "all consumers of module X"`        |
| SDD verify phase           | `graphify query "files affected by change Z"`       |

**Freshness check**: Before querying, run `git rev-parse HEAD` and compare with the stored graph commit. If they differ, the graph is stale — suggest `graphify update` before querying.

## Conventional Commits

```
type(scope): description
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `ci`, `perf`, `style`, `build`, `revert`.
Add `!` after type+scope for breaking changes: `feat!(scope): description`.

Examples:

```
feat(quotes): add payment plan support
fix(pos): correct tax calculation on discounts
docs(api): update endpoint examples
refactor(db): extract shared RLS function
```

## Branch Naming

```
^(feat|fix|refactor|docs|test|chore|ci|perf|style|build|revert)/[a-z0-9._-]+$
```

Format: `type/description` — lowercase, no spaces, only `a-z0-9._-`.

Examples: `feat/user-login`, `fix/zsh-glob-error`, `refactor/extract-auth`.

## PR Workflow

1. Must link an approved issue (`Closes #N`, `Fixes #N`, `Resolves #N`)
2. Must have exactly one `type:*` label
3. Squash-merge default for clean history
4. Automated checks must pass (CI, lint, typecheck)

## SDD Phase Integration

The @github sub-agent is used at specific SDD phases:

| Phase       | @github Involvement                                                         |
| ----------- | --------------------------------------------------------------------------- |
| **Explore** | Not directly involved                                                       |
| **Propose** | Not directly involved                                                       |
| **Design**  | Review branching strategy for the change                                    |
| **Tasks**   | Validate task breakdown matches commit planning (work-unit-commits)         |
| **Apply**   | Branch creation, frequent commits, push, intermediate PRs for review slices |
| **Verify**  | Ensure all commits are pushed, PR is ready for review                       |
| **Archive** | Create final PR from completed tasks, manage merge, cleanup branches        |

## GitHub CLI Commands

```bash
# PRs
gh pr list --state=open
gh pr create --title "type(scope): description" --body "Closes #N"
gh pr review <PR> --approve
gh pr merge <PR> --squash

# Issues
gh issue create --title "Bug: ..." --body "..."
gh issue list --label bug

# Releases
gh release create v1.0.0 --notes "Release notes"

# Actions
gh run list
gh run rerun <run-id>
gh run view <run-id> --log
```

## GitHub Actions Debugging

```bash
# List recent workflow runs
gh run list --limit 5

# View logs for a failed run
gh run view <run-id> --log | grep -i error

# Re-run a failed job
gh run rerun <run-id>

# Check workflow file before committing
# GitHub validates on push — verify YAML syntax locally first
```

## Boundary vs @devops

| Area                              | Handled By             |
| --------------------------------- | ---------------------- |
| Git operations, branches, commits | `@github` (this skill) |
| PRs, issues, releases             | `@github` (this skill) |
| GitHub Actions debugging          | `@github` (this skill) |
| CI/CD pipeline configuration      | `@devops`              |
| Vercel / Supabase deployments     | `@devops`              |
| Code review                       | `@github` + `@review`  |
