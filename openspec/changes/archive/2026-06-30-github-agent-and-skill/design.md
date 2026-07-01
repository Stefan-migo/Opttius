# Design: GitHub Agent & Skill Integration

## Overview

This design covers six deliverables (A–F) from the proposal: skill rewrite, agent creation, git safety protocol, Graphify integration, AGENTS.md update, and Graphify awareness in agent definitions.

## 1. Agent Architecture

### 1.1 `@github` vs `@devops` Boundary

| Agent       | Scope                 | Owns                                                                                                                        | Delegates To                            | Out of Scope                                     |
| ----------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------ |
| **@github** | Git/GitHub operations | Branching, commits, PRs, issues, releases, GitHub Actions workflows, git safety, conventional commits, code review via `gh` | —                                       | Vercel, Supabase, Docker, infra, DB ops          |
| **@devops** | Infrastructure/deploy | Vercel deploys, Supabase migrations push, Docker, CI/CD pipeline config, environment secrets, release orchestration         | `@github` for git/GitHub-specific tasks | Git branch strategy, PR creation, commit hygiene |

**Delegation rule:** When @devops encounters a pure git/GitHub operation (create branch, open PR, review commits), it delegates to @github via `task`. @devops retains CI/CD pipeline config and deployment orchestration.

### 1.2 Skill Loading

`@github` auto-loads on invocation:

```
skill({ name: "github" })           # The rewritten skill (safety, conventions, Graphify)
```

On-demand (when a specific workflow is needed, the skill name in the agent description tells the LLM to load it):

| Trigger                 | Skill to load                          |
| ----------------------- | -------------------------------------- |
| Creating/opening a PR   | `skill({ name: "branch-pr" })`         |
| Splitting a large PR    | `skill({ name: "chained-pr" })`        |
| Planning commits        | `skill({ name: "work-unit-commits" })` |
| Creating an issue       | `skill({ name: "issue-creation" })`    |
| Writing review comments | `skill({ name: "comment-writer" })`    |

These are referenced by name in the skill document — not copy-pasted. The agent loads them at runtime via `skill()`.

### 1.3 Invocation Model

`@github` can be invoked three ways:

1. **Direct @mention** — `@github create a branch for feature X`
2. **From orchestrator** — during SDD phases that produce git work (tasks → apply needs branch + commits)
3. **From Build agent** — when Build needs to commit, push, or open a PR

### 1.4 Permission Model

Following the existing `.opencode/agents/database.md` and `.opencode/agents/review.md` patterns:

```yaml
permission:
  bash:
    "*": ask # Everything else requires confirmation
    "git status*": allow # Read-only, safe
    "git log*": allow # Read-only, safe
    "git diff*": allow # Read-only, safe
    "git commit *": allow # Frequent, safe with pre-flight
    "git push": allow # Frequent, safe with pre-flight
    "git push origin *": allow # Normal pushes
    "git checkout -b *": allow # Branch creation (paired with push guard)
    "git stash *": allow # Needed for dirty WD guard
    "gh *": allow # GitHub CLI operations
    "npm run *": allow # Build/verify commands
```

**Dangerous ops** fall under `"*": ask` and always trigger pre-flight:

- `git push --force *`
- `git rebase *`
- `git reset --hard *`
- `git delete-branch` / `git branch -D`
- `git merge --no-ff` (ask when conflicts likely)

## 2. Skill Architecture

### 2.1 Structure of Rewritten `github` Skill

Target: **≤200 lines**, English, at `.opencode/skills/tools/github/SKILL.md`.

```
---
name: github
description: Expert guide for Git, GitHub operations, and git safety for Opttius.
---

# GitHub Skill

## When to Use
[Trigger contexts]

## Git Safety Protocol (CORE)
- **Dirty WD guard**: before checkout/rebase/reset → check `git status --porcelain`.
  If dirty + branch switch → `git stash push -m "auto-stash: <reason>"`, proceed, then `git stash pop`.
  If dirty + destructive op → refuse with message.
- **Branch creation protocol**: `git checkout -b <branch> && git push -u origin <branch>` — immediate push prevents local-only branches.
- **Pre-flight checklist** before destructive ops:
  - [ ] Working directory clean? (else stash or refuse)
  - [ ] Branch pushed to remote? (`git push -u origin`)
  - [ ] Commits follow conventional commits? (`feat:|fix:|refactor:|docs:|test:|chore:`)
  - [ ] Destructive operation confirmed by user?
- **Conventional commits**: `type(scope): description` — types: feat, fix, refactor, docs, test, chore, ci, perf, style, build, revert.

## Global Skills Integration
[Table: trigger → skill to load]

## Graphify Integration
[Per-SDD-phase query guidance — see §4]

## Commands
[gh CLI, git patterns, branch naming]
```

### 2.2 Global Skill Loading Pattern

All global skills live at `~/.config/opencode/skills/` and are loaded by name only:

```javascript
// Loading a global skill
skill({ name: "branch-pr" }); // PR creation workflow
skill({ name: "issue-creation" }); // Issue templates + workflow
skill({ name: "chained-pr" }); // Large PR splitting
skill({ name: "work-unit-commits" }); // Commit organization
skill({ name: "comment-writer" }); // Review comments
```

The skill document references these by trigger context, not by copying their content. This keeps the skill under 200 lines and maintains the global skills as the single source of truth.

### 2.3 Branch Naming Convention

```
^(feat|fix|refactor|docs|test|chore|ci|perf|style|build|revert)/[a-z0-9._-]+$
```

Enforced via git hooks or pre-commit checklist (documented in skill, hook implementation out of scope).

## 3. Git Safety Design

### 3.1 Permission Rules in `opencode.json`

New `@github` agent block in `.opencode/opencode.json`:

```json
"github": {
  "description": "Git and GitHub operations specialist. Branching, commits, PRs, issues, releases, git safety, and code review.",
  "mode": "subagent",
  "permission": {
    "bash": {
      "*": "ask",
      "git status*": "allow",
      "git log*": "allow",
      "git diff*": "allow",
      "git commit *": "allow",
      "git push": "allow",
      "git push origin *": "allow",
      "git checkout -b *": "allow",
      "git stash *": "allow",
      "git branch *": "allow",
      "gh *": "allow",
      "npm run *": "allow"
    }
  }
}
```

**Dangerous ops remain at `"*": ask`** — no need to list them explicitly since the default is `ask`.

### 3.2 Dirty Working Directory Guard

Implemented as a procedural check in the skill (not as automation):

1. Before `checkout`, `rebase`, `reset`, `stash drop`, or `branch -D`:
   - Run `git status --porcelain`
   - If output is non-empty:
     - For **branch switch** (`checkout`, `switch`): auto-stash with `git stash push -m "auto-stash: switching to <target-branch>"`, proceed, then notify user to `git stash pop` after confirming the switch
     - For **destructive ops** (`rebase`, `reset --hard`, `branch -D`): refuse, show dirty files, suggest `git stash` or `git commit` first

2. The guard is a **convention documented in the skill** — the agent follows it procedurally, not as a hook.

### 3.3 Branch Creation Protocol

Every `git checkout -b <name>` MUST be paired with an immediate push:

```bash
git checkout -b feat/my-feature
git push -u origin feat/my-feature    # ← non-negotiable
```

Rationale: Prevents local-only branches that get lost on WD reset, machine failure, or context switch. The 146-commit backlog confirms this failure mode.

### 3.4 Pre-Flight Checklist

Before **any** destructive git operation (`force-push`, `rebase`, `reset --hard`, `branch -D`, `merge --no-ff` with conflicts):

```
## Pre-flight Checklist
- [ ] Dirty WD? → stash or commit first
- [ ] Branch pushed? → `git push -u origin` if not
- [ ] All commits conventional? → `git log --oneline` check
- [ ] User confirmed? → showed command + risk, got explicit yes
```

The agent MUST present this checklist and wait for user confirmation on items that flag.

### 3.5 Global Permission Changes

The existing global permission in `.opencode/opencode.json` already handles destructive ops:

```json
"permission": {
  "bash": {
    "*": "allow",
    "git push --force *": "ask",
    "git rebase *": "ask",
    "git reset --hard *": "ask"
  }
}
```

This is sufficient — `@github`'s own `"*": ask` provides additional safety for that agent specifically. No global permission changes needed beyond adding the `@github` agent definition.

## 4. Graphify Integration Design

### 4.1 Per-SDD-Phase Graphify Queries

| SDD Phase   | Graphify Action | When                      | Query Pattern                                                       |
| ----------- | --------------- | ------------------------- | ------------------------------------------------------------------- |
| **explore** | Query           | Before exploring new area | `graphify query "What modules relate to [topic]?"`                  |
| **propose** | Query           | Before writing proposal   | `graphify path "[module A]" "[module B]"` to find cross-module deps |
| **design**  | Query + Path    | During design phase       | `graphify query "What are the dependencies of [component]?"`        |
| **tasks**   | Query           | When breaking down work   | `graphify query "Affected files in [module]"`                       |
| **apply**   | —               | No graphify needed        | —                                                                   |
| **verify**  | Query           | After changes applied     | `graphify query "Has [change] affected [related-module]?"`          |
| **archive** | —               | No graphify needed        | —                                                                   |

### 4.2 Stale Graph Detection

The graph lives at `graphify-out/graph.json` with HEAD commit hash stored in `graphify-out/.graphify_version`.

```
# At session start, agents check:
CURRENT_HASH=$(git rev-parse HEAD)
STORED_HASH=$(cat graphify-out/.graphify_version 2>/dev/null || echo "none")

if [ "$CURRENT_HASH" != "$STORED_HASH" ]; then
  # Stale — how stale?
  COMMITS_AHEAD=$(git rev-list --count "$STORED_HASH..HEAD" 2>/dev/null || echo "0")
  if [ "$COMMITS_AHEAD" -ge 5 ]; then
    # Auto-update: suggest `graphify --update`
  else
    # Mild staleness: note it, suggest —graphify update only when next graphify query is needed
  fi
fi
```

### 4.3 Update Decision Matrix

| Staleness          | Action                                            |
| ------------------ | ------------------------------------------------- |
| Same hash (fresh)  | Use as-is                                         |
| 1–4 commits behind | Note staleness, suggest update only on next query |
| 5+ commits behind  | Auto-suggest `graphify --update` before any query |
| No graph exists    | Suggest `graphify .` first time                   |

### 4.4 Agent Awareness (Item F)

Every agent `.md` file that currently loads skills should gain a Graphify-awareness section referencing when to query:

```markdown
## Graphify Awareness

Before starting work on any module, check if graphify-out/graph.json exists:

- If fresh (matches HEAD): query `graphify query "Find related modules to [topic]"`
- If stale: suggest `graphify --update` first
- If absent: note that graph is not built
```

Agents to update:

- `build.md` — add Graphify awareness section
- `opttius.md` — add Graphify to knowledge sources
- `backend.md` — add Graphify awareness
- `frontend.md` — add Graphify awareness
- `review.md` — already implicitly uses it via cortex-persona skill; explicit mention

## 5. Files to Touch

| File                                     | Action      | Content Summary                                                                                                                              |
| ---------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `.opencode/opencode.json`                | Modify      | Add `@github` agent definition with permissions                                                                                              |
| `.opencode/agents/github.md`             | **Create**  | New subagent, English description, loads `github` skill, git safety + Graphify awareness                                                     |
| `.opencode/skills/tools/github/SKILL.md` | **Rewrite** | English, ≤200 lines, git safety protocol, global skill refs, Graphify integration, conventional commits                                      |
| `AGENTS.md`                              | Modify      | Add `@github` to subagent table, update `@devops` description (remove GitHub-specific mention), add `github` to tools skills table           |
| `.opencode/agents/devops.md`             | Modify      | Remove GitHub-specific sections (workflows, gh commands, CI/CD details), add delegation note to `@github`, keep Vercel/Supabase/Docker focus |
| `.opencode/agents/build.md`              | Modify      | Add Graphify awareness section, add `@github` invocation guidance                                                                            |
| `.opencode/agents/opttius.md`            | Modify      | Add `@github` to subagent list, add Graphify to knowledge sources                                                                            |
| `.opencode/agents/backend.md`            | Modify      | Add Graphify awareness section                                                                                                               |
| `.opencode/agents/frontend.md`           | Modify      | Add Graphify awareness section                                                                                                               |
| `.opencode/agents/review.md`             | Modify      | Add explicit Graphify awareness section                                                                                                      |

### File: `.opencode/agents/github.md` (New)

Follows the `.opencode/agents/database.md` pattern:

```markdown
---
description: Git and GitHub operations specialist. Branching, commits, PRs, issues, releases, git safety, and code review.
mode: subagent
permission:
  bash:
    "*": ask
    "git status*": allow
    "git log*": allow
    "git diff*": allow
    "git commit *": allow
    "git push": allow
    "git push origin *": allow
    "git checkout -b *": allow
    "git stash *": allow
    "git branch *": allow
    "gh *": allow
    "npm run *": allow
---

# GitHub Agent

Git and GitHub operations specialist for Opttius.

## When to Use

- Create/manage branches
- Commit with conventional commits
- Create and review PRs
- Manage issues and milestones
- Create releases
- Git safety (dirty WD guard, pre-flight checks)
- GitHub Actions workflow management
- Code review via gh CLI

## Core Protocol

### Git Safety

Follow the Git Safety Protocol in the `github` skill for ALL operations:

1. Dirty WD guard: stash before branch switch, refuse before destructive ops
2. Branch creation: `git checkout -b <name> && git push -u origin <name>`
3. Pre-flight checklist before force-push, rebase, reset, branch -D

### Conventional Commits

`type(scope): description` — types: feat, fix, refactor, docs, test, chore, ci, perf, style, build, revert.

## Skills to Load

Always load:
```

skill({ name: "github" }) # Git safety, conventions, Graphify, commands

```

On demand:
```

skill({ name: "branch-pr" }) # PR creation workflow
skill({ name: "issue-creation" }) # Issue templates
skill({ name: "chained-pr" }) # Large PR splitting
skill({ name: "work-unit-commits" }) # Commit organization
skill({ name: "comment-writer" }) # Review comments

```

## Graphify Awareness

Before major git operations affecting multiple modules:
- Query `graphify query "Find modules related to [scope]"`
- If `graphify-out/graph.json` is stale (>5 commits behind), suggest `graphify --update`

## Boundary

| Area | Handle Here | Delegate To |
|------|------------|-------------|
| Git operations | ✅ All | — |
| GitHub CLI (PR, issue, release) | ✅ All | — |
| Code review via gh | ✅ All | — |
| GitHub Actions workflows | ✅ Config | — |
| Vercel deploy | ❌ | `@devops` |
| Supabase migrations | ❌ | `@database` |
| Docker/infra | ❌ | `@devops` |
```

## 6. Migration Path

### Phase 1 (SDD Apply)

1. Create `.opencode/agents/github.md`
2. Rewrite `.opencode/skills/tools/github/SKILL.md`
3. Add `@github` to `.opencode/opencode.json`
4. Update `AGENTS.md`
5. Update `.opencode/agents/devops.md` — trim GitHub sections

### Phase 2 (SDD Apply)

6. Update `.opencode/agents/build.md` — add Graphify + @github references
7. Update `.opencode/agents/opttius.md` — add @github to subagent list
8. Update `.opencode/agents/backend.md`, `frontend.md`, `review.md` — add Graphify awareness

## 7. Design Decisions Record

| Decision                     | Choice                     | Rationale                                                   |
| ---------------------------- | -------------------------- | ----------------------------------------------------------- |
| Skill language               | English                    | Design constraint — all tool skills in English              |
| Agent description            | English                    | Design constraint — @github is a tool agent                 |
| Permission base              | `"*": ask`                 | Safer than global `"*": allow`; follows database.md pattern |
| Dirty WD guard               | Procedural (in skill doc)  | No hooks needed; agent enforces protocol                    |
| Branch push                  | Immediate `push -u origin` | Prevents lost branches (146-commit backlog evidence)        |
| Global skill refs            | By name via `skill()`      | Single source of truth, no copy-paste                       |
| Graphify staleness threshold | 5 commits                  | Avoids unnecessary rebuilds on small changes                |
