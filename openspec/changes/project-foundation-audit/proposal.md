# Proposal: project-foundation-audit

## Intent

Rescue the Opttius codebase from years of accumulated structural debt across 5 AI agent eras. 30 files over 1000 lines, 96 failing tests, mixed service layers, and orphaned config dirs create a high-risk foundation for any new feature. This change rescues what works and incrementally restructures the rest — no big bang, no rewrites.

## Scope

### In Scope

- **Phase 0 — Stabilize baseline**: Fix 96 failing tests (env-specific, import errors, stale snapshots). Characterization tests for files being refactored.
- **Phase 1 — Slay megafiles**: Break down POS (3 files, ~13k lines combined) + top 5 megafiles outside auto-gen. Strict Boy Scout Rule.
- **Phase 2 — Unify service layers**: Collapse `lib/api/services/` into `lib/services/` or vice versa. Eliminate import cycles (2 detected).
- **Phase 3 — Update docs**: Refresh 162 .md files — remove stale agent-era docs, update architecture docs to reflect current state.
- **Phase 4 — Professionalize workflows**: Clean orphaned dirs (`.agent/`, `.qoder/`, `.mcp/`). Establish engram architecture decision capture. Tune SDD workflow based on lessons learned.

### Out of Scope

- Feature development of any kind
- Schema or migration changes
- Rewriting auto-generated files (supabase.ts)
- GSD system recovery (confirmed lost)
- Full test coverage targets (characterization only for refactored files)

## Capabilities

> Spec-level behavior does NOT change — this is pure restructuring. No new or modified capabilities.

### New Capabilities

None.

### Modified Capabilities

None.

## Approach

Incremental per-phase with characterization tests as safety net before each refactor. Each phase produces a complete, shippable state — no partial refactors left in-flight.

| Phase | Strategy | Safety |
|-------|----------|--------|
| 0 | Fix test env, update snapshots, isolate integration tests | Green CI baseline |
| 1 | Extract cohesive modules from megafiles, one file at a time | Characterization test before each extraction |
| 2 | Consolidate service directories, deduplicate, fix cycles | Extract+rename, run full suite |
| 3 | Delete stale docs, update architecture diagrams, prune orphaned dirs | Manual review |
| 4 | Add engram save triggers, tune SDD config | Built on Phase 0-3 completion |

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/app/(pos)/` | Modified | Megafile extraction (Phase 1) |
| `src/lib/services/` | Modified | Consolidation with `lib/api/services/` (Phase 2) |
| `src/lib/api/services/` | Modified | Consolidation target (Phase 2) |
| `src/__tests__/` | Modified | Test fixes + characterization tests (Phase 0,1) |
| `docs/`, `brain/`, `*.md` | Modified | Doc pruning + updates (Phase 3) |
| `.agent/`, `.qoder/`, `.mcp/` | Removed | Orphaned agent-era dirs (Phase 4) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Megafile extraction breaks POS checkout | Medium | Characterization tests before each extraction + manual POS smoke test |
| Test fixes introduce false positives | Low | Only fix env/snapshot/import issues, never change test logic |
| Service consolidation creates merge conflicts | Low | Do in dedicated branch, coordinate with any parallel work |
| Documentation drift continues post-update | Medium | Enforce engram save triggers for architecture decisions (Phase 4) |
| Scope creep into feature work | Medium | Phase gates — each phase must ship before next starts |

## Rollback Plan

Per-phase rollback: each phase ships as its own PR. If a phase breaks production:

- **Phase 0**: `git revert` the test fix PR — tests go back to 96 failures but prod behavior unchanged.
- **Phase 1**: `git revert` the megafile extraction PR. Original file is untouched until extraction is 100% complete.
- **Phase 2**: `git revert` service consolidation PR. Old service paths remain as aliases until next phase.
- **Phase 3**: `git revert` doc pruning PR — deleted files are recoverable from git.
- **Phase 4**: `git revert` config cleanup PR — no runtime impact.

No migration or data rollback needed — this is pure code restructuring.

## Dependencies

- Phase 0 must complete before Phase 1 (test baseline required)
- Phase 1-4 are sequential but could ship independently if needed
- Requires `experimental` environment for POS smoke testing

## Success Criteria

- [ ] Phase 0: `npm run test:run` passes 100% (0 failures, 0 errors)
- [ ] Phase 1: Top 6 megafiles reduced below 500 lines each. POS checkout workflow works identically.
- [ ] Phase 2: Single `lib/services/` directory. Zero import cycles. All existing tests pass.
- [ ] Phase 3: Architecture docs reflect current state. Orphaned agent-era dirs removed.
- [ ] Phase 4: Engram has >= 5 architecture memory entries. SDD config is tuned.
- [ ] Cross-cutting: No regressions found in any phase. `npm run build` passes at every phase.
