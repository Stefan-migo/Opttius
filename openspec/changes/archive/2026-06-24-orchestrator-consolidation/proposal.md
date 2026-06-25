# Proposal: orchestrator-consolidation

## Intent

Unify the agent/skill infrastructure across gentle-ai, Cortex, and SDD into a single source of truth. Currently, 3 agent frameworks coexist with conflicting definitions, stale skill copies, and orphaned agents — creating cognitive load and risk of drift.

## Scope

### In Scope

1. Rename `gentle-orchestrator` → `opttius-orchestrator` in `opencode.json` agent definitions
2. Define orchestrator + SDD sub-agents (sdd-{explore,propose,design,spec,tasks,apply,verify,archive}) as project agents
3. Replace `opencode.json` with updated config including agent permissions and MCP
4. Rewrite `AGENTS.md` as unified reference (gentle-ai + Cortex + Opttius + SDD)
5. Copy 6 authoritative skills from `~/.config/opencode/skills/{cortex-persona,ponytail*}/` — replaces 6 stale copies in `.opencode/skills/`
6. Delete agent files: `.opencode/agents/{explore,debug}.md`
7. Delete agent file: `.opencode/agents/plan.md`
8. Update `.opencode/agents/review.md` — add SDD/cortex skills + Engram protocol
9. Update `.opencode/agents/{opttius,build}.md` — reference SDD flow, cortex persona, Engram
10. Refresh `.atl/skill-registry.md`

### Out of Scope

- Renaming `opencode.json` to different format or location
- Deleting any domain/system/security skills
- Changing actual application code or tests
- Migrating SDD init artifacts or openspec config

## Capabilities

> No application capabilities change — pure infrastructure consolidation. All specs remain unchanged.

**New Capabilities**: None
**Modified Capabilities**: None

## Approach

1. **Phase A — Cleanup**: delete 3 agent files (explore, debug, plan), delete 6 stale skill directories under `.opencode/skills/`
2. **Phase B — Config**: write new `opencode.json` with orchestrator + all SDD sub-agents + permissions
3. **Phase C — Skills**: copy authoritative cortex/ponytail skills from `~/.config/opencode/skills/`
4. **Phase D — Agents**: update review, opttius, build agent definitions (SDD + cortex + Engram)
5. **Phase E — Docs**: rewrite AGENTS.md, refresh skill registry
6. **Phase F — Verify**: `npm run build`, check opencode.json loads, sub-agent @mentions resolve

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `.opencode/opencode.json` | Modified | Add orchestrator + SDD sub-agent definitions |
| `.opencode/agents/explore.md` | Removed | Redundant — SDD explore covers this |
| `.opencode/agents/debug.md` | Removed | Redundant — general tool access suffices |
| `.opencode/agents/plan.md` | Removed | Replaced by SDD propose/design pipeline |
| `.opencode/agents/review.md` | Modified | Updated with SDD skills, cortex, Engram |
| `.opencode/agents/opttius.md` | Modified | SDD + cortex + Engram references |
| `.opencode/agents/build.md` | Modified | SDD + cortex + Engram references |
| `.opencode/skills/cortex-persona/` | Replaced | Copy from `~/.config/opencode/skills/` |
| `.opencode/skills/ponytail-*/` (5 dirs) | Replaced | Copy from `~/.config/opencode/skills/` |
| `.opencode/skills/ponytail-plan/` | Removed | Does not exist in authoritative source |
| `AGENTS.md` | Modified | Unified reference for all 3 ecosystems |
| `.atl/skill-registry.md` | Modified | Refresh to reflect new agent/skill set |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| opencode.json schema rejects agent defs | Low | Validate against `https://opencode.ai/config.json` |
| Broken @mention references during transition | Low | Delete stale files AFTER config is ready |
| Skill content drift (project vs authoritative) | Low | Copy verifiably from `~/.config/opencode/skills/` |

## Rollback Plan

`git checkout` on all changed files, OR individually: restore deleted agent `.md` files from git, revert `opencode.json`, revert `AGENTS.md`, remove copied skills, restore stale copies from git.

## Success Criteria

- [ ] `opencode.json` loads without errors (no schema violations)
- [ ] All SDD sub-agents resolve via @mention
- [ ] `explore`, `debug`, `plan` agents no longer present
- [ ] `review` agent loads SDD + cortex + Engram skills
- [ ] AGENTS.md documents all 3 frameworks with accurate agent list
- [ ] Skill registry matches actual `.opencode/skills/` directory
- [ ] `npm run build` passes
