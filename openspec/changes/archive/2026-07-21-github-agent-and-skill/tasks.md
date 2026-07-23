# Tasks: GitHub Agent & Skill

## Review Workload Forecast

| Field                   | Value                                                          |
| ----------------------- | -------------------------------------------------------------- |
| Estimated changed lines | ~520 (200 add + 170 del in skill, ~150 add across other files) |
| 400-line budget risk    | High                                                           |
| Chained PRs recommended | Yes                                                            |
| Suggested split         | PR 1 (Foundation) → PR 2 (Awareness)                           |
| Delivery strategy       | ask-on-risk                                                    |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal                                                         | Likely PR | Notes                                                      |
| ---- | ------------------------------------------------------------ | --------- | ---------------------------------------------------------- |
| 1    | Foundation: skill, agent, config, AGENTS.md, devops boundary | PR 1      | Base = main. Bulk of change (~470 lines).                  |
| 2    | Awareness: graphify awareness in agent defs                  | PR 2      | Base = main (independent of PR 1). Small diff (~50 lines). |

---

## Phase 1: Foundation

- [ ] 1.1 Rewrite `.opencode/skills/tools/github/SKILL.md` — English, ≤200 lines, git safety protocol, global skill refs (branch-pr, issue-creation, chained-pr, work-unit-commits, comment-writer), conventional commits, branch naming, Graphify integration, SDD phase integration, @github/@devops boundary
- [ ] 1.2 Create `.opencode/agents/github.md` — frontmatter (description, mode: subagent, permissions with `"*": ask` + allowlist for git/gh/npm), prompt with skill loading, responsibilities table, boundary table, Graphify awareness
- [ ] 1.3 Add `@github` agent block to `.opencode/opencode.json` — agent def with permissions: `"*": ask` + allowlist for `git status*`, `git log*`, `git diff*`, `git commit *`, `git push`, `git push origin *`, `git checkout -b *`, `git stash *`, `git branch *`, `gh *`, `npm run *`
- [ ] 1.4 Update `AGENTS.md` — add `@github` row to sub-agents table; update `@devops` description to "Infra, Vercel, CI/CD pipelines, deployments"; add `github` skill to Tools table
- [ ] 1.5 Update `.opencode/agents/devops.md` — remove GitHub-specific sections (Commands, Workflows), add delegation note to `@github`, keep Vercel/Supabase/Docker/CI pipeline focus

## Phase 2: Graphify Awareness

- [ ] 2.1 Update `.opencode/agents/build.md` — add Graphify awareness section (when to query, staleness check), add `@github` invocation guidance for git/GitHub ops
- [ ] 2.2 Update `.opencode/agents/opttius.md` — add `@github` to subagent invocation list, add Graphify to knowledge sources
- [ ] 2.3 Update `.opencode/agents/backend.md` — add Graphify awareness section
- [ ] 2.4 Update `.opencode/agents/frontend.md` — add Graphify awareness section
- [ ] 2.5 Update `.opencode/agents/review.md` — add explicit Graphify awareness section

## Implementation Order

Phase 1 first — foundation must exist before awareness references it. Within Phase 1, tasks are file-independent and can be done in any order (skill, agent, config, AGENTS.md, devops all modify different files). Within Phase 2, tasks are also independent of each other.

PR 1 covers all of Phase 1 (~470 changed lines). If the 400-line budget is a hard constraint, split into PR 1a (skill rewrite + agent creation = ~290 lines) and PR 1b (config + AGENTS.md + devops = ~180 lines). PR 2 covers Phase 2 (~50 lines, trivially within budget).

## Dependency Graph

```
Phase 1 (PR 1):
  1.1 skill rewrite ─┐
  1.2 agent creation ─┤
  1.3 opencode.json ──┤── all file-independent
  1.4 AGENTS.md ──────┤
  1.5 devops update ──┘

Phase 2 (PR 2, depends on Phase 1 conceptually):
  2.1 build.md ─┐
  2.2 opttius.md ┤
  2.3 backend.md ┤── all file-independent
  2.4 frontend.md┤
  2.5 review.md ─┘
```

PR 1 and PR 2 are independent (can merge to main in any order), since Phase 2 adds awareness sections that reference existing tools — they don't import from PR 1 files.
