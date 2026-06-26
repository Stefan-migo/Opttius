# Tasks: orchestrator-consolidation

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~250 (deletions are bulk rm -rf, not diff lines) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

## Phase 1: Cleanup — Delete obsolete files

- [x] 1.1 Delete agent files: `plan.md`, `explore.md`, `debug.md` from `.opencode/agents/`
- [x] 1.2 Delete skill directories: `cortex-persona`, `ponytail-audit`, `ponytail-debt`, `ponytail-help`, `ponytail-plan`, `ponytail-review` from `.opencode/skills/`

## Phase 2: Config — Move orchestrator + SDD infrastructure to project

- [x] 2.1 Add `opttius-orchestrator` (primary, SDD task permissions) and 10 SDD sub-agents (apply, archive, design, explore, init, onboard, propose, spec, tasks, verify) from global config into `.opencode/opencode.json`
- [x] 2.2 Add `mcp.engram` block to project config
- [x] 2.3 Add `permission` block (bash with commit/push/rebase guards, read with secrets deny)
- [x] 2.4 Keep existing `mcp.graphify` as-is

## Phase 3: Agents — Update agent definitions

- [x] 3.1 `review.md`: Add skills section referencing cortex-persona, ponytail-review, judgment-day, engram, bash build
- [x] 3.2 `opttius.md`: Remove refs to deleted agents (plan, explore), add SDD sub-agents
- [x] 3.3 `build.md`: Add cortex-persona to skills list

## Phase 4: Docs & Registry

- [x] 4.1 Rewrite `AGENTS.md` as unified source covering all agents (primary + SDD sub-agents) and skills
- [x] 4.2 Run skill-registry refresh
