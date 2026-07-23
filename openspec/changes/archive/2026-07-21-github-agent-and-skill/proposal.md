# Proposal: GitHub Agent & Skill Integration

## Intent

The `@github` skill at `.opencode/skills/tools/github/SKILL.md` is outdated (169 lines, Spanish, no references to global skills like `branch-pr`, `issue-creation`, `chained-pr`, `work-unit-commits`, `comment-writer`). No dedicated `@github` sub-agent exists — GitHub operations are conflated into `@devops` alongside infra/Vercel/Supabase. There is no git safety protocol: working directories are unprotected, push-on-branch-create is not enforced, and code loss has already occurred from uncommitted work being destroyed. The 146-commit backlog confirms a broken sync workflow. Graphify (13k nodes, matches HEAD) exists but no agent references it. We need a focused agent, a rewritten skill, and safety controls that prevent recurring damage.

## Scope

### In Scope

- **A.** Rewrite `github` skill — English, integrate global skills, git safety, conventional commits, branch naming, PR/issue workflow, SDD integration, Graphify awareness
- **B.** Create `@github` sub-agent — focused on Git/GitHub operations, clean boundary from `@devops`
- **C.** Git safety protocol — dirty WD guard, push-on-branch-create, pre-flight checks before destructive ops, permission rules
- **D.** Graphify integration into SDD phases — document when agents should query and when to suggest update
- **E.** Update `AGENTS.md` — add `@github` agent entry
- **F.** Graphify awareness in agent definitions referencing the skill

### Out of Scope

- Creating `.github/ISSUE_TEMPLATE/` or `PULL_REQUEST_TEMPLATE.md` (content, not config)
- Modifying existing GitHub Actions workflows (app-level)
- Pushing the 146-commit backlog (separate sync operation)
- Rewriting `@devops` agent (only boundary clarification)

## Capabilities

### New Capabilities

- `github-operations`: GitHub agent definition, skill rewrite, workflow conventions, git safety protocol, global skill integration

### Modified Capabilities

- None — no existing specs to modify

## Approach

| #   | Deliverable          | How                                                                                                                                                                                                                         |
| --- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A   | Skill rewrite        | Rewrite `.opencode/skills/tools/github/SKILL.md` in English. Add integrated refs to global skills. Document git safety, conventional commits, branch naming, PR/issue flow, SDD phase integration, Graphify query patterns. |
| B   | `@github` agent      | Create `.opencode/agents/github.md` referencing the skill, scoped to Git/GitHub only.                                                                                                                                       |
| C   | Safety protocol      | Permission rules in `.opencode/opencode.json` — deny destructive ops without confirm. Pre-flight check.                                                                                                                     |
| D   | Graphify integration | Add Graphify query/update guidance to skill and agent instructions.                                                                                                                                                         |
| E   | AGENTS.md            | Add `@github` entry to agent table.                                                                                                                                                                                         |
| F   | Agent awareness      | Include Graphify awareness in agent defs referencing the skill.                                                                                                                                                             |

## Affected Areas

| Area                                       | Impact   | Description                                  |
| ------------------------------------------ | -------- | -------------------------------------------- |
| `.opencode/skills/tools/github/SKILL.md`   | Rewrite  | English, global skill refs, safety, Graphify |
| `.opencode/agents/github.md`               | New      | `@github` sub-agent definition               |
| `.opencode/opencode.json`                  | Modified | Permission rules for git safety              |
| `AGENTS.md`                                | Modified | Add `@github` entry, update agent table      |
| `openspec/specs/github-operations/spec.md` | New      | Capability spec for future SDD               |

## Risks

| Risk                                              | Likelihood | Mitigation                                                                  |
| ------------------------------------------------- | ---------- | --------------------------------------------------------------------------- |
| `@devops` / `@github` overlap confusion           | Med        | Clear boundary doc: @devops = infra/deploy, @github = git/GitHub ops        |
| Permission rules break dev workflow               | Low        | Start with warnings, block only destructive ops (force-push, delete-branch) |
| Global skill integration creates dependency chain | Low        | Reference by name only, no hard imports                                     |

## Rollback Plan

Revert each artifact individually: restore `SKILL.md` via `git checkout`, delete `github.md`, revert `opencode.json` changes, revert `AGENTS.md` additions.

## Dependencies

- Global skills installed: `branch-pr`, `issue-creation`, `chained-pr`, `work-unit-commits`, `comment-writer`
- Graphify available in agents runtime

## Success Criteria

- [ ] `.opencode/skills/tools/github/SKILL.md` is English, under 200 lines, references all global skills, documents git safety and Graphify
- [ ] `.opencode/agents/github.md` exists, references the skill, clear scope boundary from `@devops`
- [ ] Git safety rules documented and permission-denied tests pass for destructive ops without confirm
- [ ] Graphify query/update patterns documented in skill
- [ ] `AGENTS.md` lists `@github` with description
