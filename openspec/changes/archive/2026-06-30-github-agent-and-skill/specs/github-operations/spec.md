# GitHub Operations — Specification

## Purpose

Define the GitHub agent, skill, git safety protocol, Graphify integration points, and agent awareness that together form the `@github` sub-agent's operating model for the Opttius project. This spec covers six coordinated deliverables: (A) skill rewrite, (B) agent definition, (C) safety protocol, (D) Graphify integration, (E) AGENTS.md update, (F) graphify awareness in agent definitions.

---

## Requirements

### Requirement: GitHub Skill Rewrite

The skill at `.opencode/skills/tools/github/SKILL.md` MUST be rewritten in English. It MUST reference the following global skills by name:

- `branch-pr` — for PR workflow, branch naming, conventional commits, template rules, type labels
- `issue-creation` — for issue templates, label system, maintainer approval workflow
- `chained-pr` — for splitting PRs over 400 lines into reviewable slices
- `work-unit-commits` — for commit discipline, work-unit organization, SDD workload guard
- `comment-writer` — for PR review and issue comment voice

The skill MUST document:

- **Conventional commits standard**: `type(scope): description` format, allowed types, breaking change marker (`!`)
- **Branch naming convention**: `type/description` — lowercase, `a-z0-9._-` only, type prefix from conventional commits
- **PR workflow**: issue-first (must link an approved issue), type label required, squash-merge default, automated checks
- **Git safety protocol**: dirty WD guard, push-on-branch-create, pre-flight checklist before destructive ops
- **Graphify integration**: when to query graphify for codebase context, when to suggest graph update after structural changes
- **SDD phase integration**: per-phase guidance on when to involve `@github` (PR creation in archive, branch management in apply, etc.)
- **Boundary vs @devops**: `@github` owns git/GitHub operations; `@devops` owns infra/deploy/CI-pipeline configuration

The skill MUST be under 250 lines and MUST reference itself as the authoritative skill for `@github`.

#### Scenario: New contributor opens a PR

- GIVEN a contributor invokes `@github` to create a PR
- WHEN `@github` loads the `github` skill
- THEN the skill provides branch naming, conventional commit format, issue-linking rules, and PR template requirements
- AND the skill references `branch-pr` for full PR workflow, `issue-creation` for issue-linking rules, and `work-unit-commits` for commit discipline

#### Scenario: Agent checks if rebase is safe

- GIVEN an agent considers `git rebase` or `git push --force`
- WHEN the agent consults the skill's git safety protocol section
- THEN the skill presents the pre-flight checklist: dirty WD check, push-on-branch-create verification, recent backup confirmation

#### Scenario: SDD archive phase needs a PR

- GIVEN the SDD archive phase is complete and needs a PR to persist the change
- WHEN the orchestrator delegates PR creation to `@github`
- THEN `@github` loads the `github` skill and follows the PR workflow section to create an issue-linked, conventionally committed PR

---

### Requirement: @github Sub-Agent

A sub-agent definition MUST be created at `.opencode/agents/github.md` with:

- **Frontmatter**: `description`, `mode: subagent`, `permission` block
- **Permission**: `bash` — `gh *` allowed, `git *` allowed (with `ask` for destructive ops: `reset`, `rebase`, `push --force`, `branch -D`)
- **Skills load**: MUST load `github` skill automatically; SHOULD reference `branch-pr`, `issue-creation`, `chained-pr`, `work-unit-commits`, `comment-writer` in its prompt
- **Responsibilities**: issues, PRs, branches, commits, releases, GitHub Actions debugging
- **Boundary**: infra/deploy/CI-pipeline configuration stays with `@devops`; `@github` may debug CI failures but must not modify workflows

#### Scenario: User invokes @github to create an issue

- GIVEN the user types `@github create a bug report for login failure`
- WHEN `@github` agent is activated
- THEN it loads the `github` skill and uses `issue-creation` patterns to create a properly formatted issue with `status:needs-review` label

#### Scenario: User asks @github to force-push

- GIVEN the user asks `@github force push the current branch`
- WHEN `@github` processes the request
- THEN the agent checks the permission boundary: `git push --force` is `ask` level
- AND the agent prompts the user for confirmation with a pre-flight checklist before executing

#### Scenario: User asks @github to deploy

- GIVEN the user asks `@github deploy to production`
- WHEN `@github` evaluates the request against its responsibility boundary
- THEN the agent MUST decline and redirect to `@devops` with a clear explanation

---

### Requirement: Git Safety Protocol

The following safety rules MUST be documented in the `github` skill and enforced via `opencode.json` permissions:

| Rule                          | Enforcement                                        | Description                                                                                                                                                                                 |
| ----------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dirty WD guard**            | Skill documentation + agent prompt                 | Before any git operation, check `git status --porcelain`. If dirty, stash or commit before proceeding.                                                                                      |
| **Push-on-branch-create**     | Agent workflow                                     | `git push -u origin <branch>` MUST follow branch creation before any commits are applied to the new branch.                                                                                 |
| **Destructive op pre-flight** | `opencode.json` permission `ask` + skill checklist | `git reset --hard`, `git rebase`, `git push --force`, `git branch -D` MUST trigger a pre-flight check: confirm intent, verify recent backup exists, check no unpushed commits will be lost. |
| **Commit discipline**         | Skill documentation                                | Per `work-unit-commits`: commit by work unit, keep tests with code, tell a story, rollback-safe.                                                                                            |
| **Stash management**          | Skill documentation                                | `git stash` before switching contexts; `git stash list` to review; `git stash drop` only after confirming stash is no longer needed.                                                        |

The `opencode.json` permission block SHALL already contain `"git commit *": "ask"`, `"git push": "ask"`, `"git push --force *": "ask"`, `"git rebase *": "ask"`, `"git reset --hard *": "ask"`. These MUST NOT be removed. Additional SHALL NOT be added without explicit justification.

#### Scenario: Agent considers a hard reset

- GIVEN an agent determines a `git reset --hard` is needed
- WHEN the agent consults the safety protocol
- THEN the agent MUST first run `git status --porcelain` to check for dirty state
- AND the agent MUST prompt the user: "This will discard uncommitted changes. Current branch: <branch>. Unpushed commits: <N>. Proceed?"
- AND execution MUST NOT proceed without explicit user confirmation

#### Scenario: Agent creates a new feature branch

- GIVEN an agent creates a branch `feat/new-module` from `main`
- WHEN the branch is created
- THEN the agent MUST immediately push: `git push -u origin feat/new-module`
- AND the first commit on the new branch triggers no additional safety checks beyond the standard commit `ask` permission

---

### Requirement: Graphify Integration

The `github` skill MUST document when agents should query Graphify and when to suggest a graph update.

| Context                                                  | Action                                                          | Frequency                                          |
| -------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------- |
| Codebase question before PR/issue creation               | Query Graphify: `graphify query "<question>"`                   | Always when agent needs codebase context           |
| After structural changes (new files, renames, deletions) | Suggest update: `graphify update`                               | After apply phase, before archive                  |
| Before proposing refactors                               | Query Graphify for dependency graph                             | When SDD explore phase identifies merge candidates |
| SDD explore phase — codebase discovery                   | Query Graphify: `graphify query "relationship between X and Y"` | When investigating codebase structure              |
| SDD design phase — architecture decisions                | Query Graphify: `graphify query "all consumers of module X"`    | When assessing impact of changes                   |
| SDD verify phase — completeness check                    | Query Graphify: `graphify query "files affected by change Z"`   | When verifying implementation matches scope        |
| SDD archive phase — final update                         | Suggest update: `graphify update`                               | After PR merge, to keep graph current              |

**Freshness check**: Before querying Graphify, agents MUST run `git rev-parse HEAD` and compare with the graph's recorded commit. If they differ, the graph is stale — suggest `graphify update` before querying.

#### Scenario: SDD explore phase needs to understand module relationships

- GIVEN the SDD explore phase is investigating a change that affects multiple modules
- WHEN the agent needs to understand file relationships
- THEN the agent queries Graphify: `graphify query "relationship between inventory and orders"`
- AND the agent checks freshness: `git rev-parse HEAD` before querying
- AND if HEAD differs from graph commit, the agent suggests `graphify update` first

#### Scenario: After a structural code change

- GIVEN the apply phase created new files and renamed others
- WHEN the achieve phase begins
- THEN the agent suggests `graphify update` to keep the knowledge graph in sync with the new file structure

---

### Requirement: AGENTS.md Update

The `AGENTS.md` file MUST be updated to:

- Add `@github` to the sub-agents table with description and usage column
- Add `github` to the skills table under the Tools section
- Keep existing `@devops` entry but update its description to remove GitHub operations scope (now scoped to infra/deploy/CI-pipelines only)

| Subagent  | Usage     | Description                                                                   |
| --------- | --------- | ----------------------------------------------------------------------------- |
| `@github` | `@github` | Git/GitHub operations: branches, commits, issues, PRs, releases, CI debugging |

| Skill    | Description                                                                |
| -------- | -------------------------------------------------------------------------- |
| `github` | Git/GitHub operations, git safety, conventional commits, PR/issue workflow |

#### Scenario: User reviews AGENTS.md after change

- GIVEN a user opens `AGENTS.md`
- WHEN they find the sub-agents table
- THEN they see `@github` listed with description "Git/GitHub operations: branches, commits, issues, PRs, releases, CI debugging"
- AND `@devops` description no longer mentions GitHub operations (now "Infra, Vercel, CI/CD pipelines, deployments")

---

### Requirement: Graphify Awareness in Agent Definitions

The `@github` agent definition (`.opencode/agents/github.md`) MUST mention Graphify as an available MCP tool in the prompt. The instruction SHALL state:

- When receiving codebase questions, consider querying Graphify before answering
- Graphify is available via the `graphify` MCP server (not via `gh` or bash)
- If unsure about codebase structure, use `graphify query "<question>"` to get structured answers

Primary agents (Opttius, Build) in `.opencode/agents/` SHOULD also reference Graphify availability for codebase-awareness questions.

#### Scenario: Agent receives a codebase question

- GIVEN a user asks `@github what files are affected by the last three commits`
- WHEN the agent checks its instructions
- THEN the agent sees Graphify is available as an MCP tool
- AND the agent queries Graphify rather than parsing git log manually for file impact analysis
