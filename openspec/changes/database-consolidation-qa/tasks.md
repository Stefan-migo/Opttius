# Tasks: database-consolidation-qa

## Review Workload Forecast

| Field                   | Value                                                                                                 |
| ----------------------- | ----------------------------------------------------------------------------------------------------- |
| Estimated changed lines | 2000–3000                                                                                             |
| 400-line budget risk    | High                                                                                                  |
| Chained PRs recommended | Yes                                                                                                   |
| Suggested split         | PR1 (Diagnosis) → PR2 (Restructure 00001-06) → PR3 (Restructure 00007-12) → PR4 (SDD phases + Verify) |
| Delivery strategy       | ask-on-risk                                                                                           |
| Chain strategy          | stacked-to-main                                                                                       |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal                                         | Likely PR | Notes                                        |
| ---- | -------------------------------------------- | --------- | -------------------------------------------- |
| 1    | Phase 0 scripts + Phase 1 files 00001-06     | PR 1      | Read-only analysis scripts + reorder 6 files |
| 2    | Phase 1 files 00007-12                       | PR 2      | Reorder remaining 6 consolidated files       |
| 3    | Phase 2: SDD phase files + duplicate removal | PR 3      | Fix 20260703 redundancy, reorder indexes     |
| 4    | Phase 3-4: Verification + Swap               | PR 4      | db reset, diff, archive originals            |

## Phase 0: Diagnostic (read-only)

- [ ] T-001: Parse `00001_core_schema.sql` — map current order vs required (TABLES→FUNCTIONS→TRIGGERS→FKs→POLICIES→INDEXES). Report lines out of order.
- [ ] T-002: Parse `00002_optical_conversion.sql` — same structural audit.
- [ ] T-003: Parse `00003_lens_systems.sql` — same structural audit.
- [ ] T-004: Parse `00004_branches_multitenancy.sql` — same structural audit.
- [ ] T-005: Parse `00005_pos_payments.sql` — same structural audit.
- [ ] T-006: Parse `00006_work_orders.sql` — same structural audit.
- [ ] T-007: Parse `00007_communications.sql` — same structural audit.
- [ ] T-008: Parse `00008_support_systems.sql` — same structural audit.
- [ ] T-009: Parse `00009_agreements_fieldops.sql` — same structural audit.
- [ ] T-010: Parse `00010_ai_telemetry.sql` — same structural audit.
- [ ] T-011: Parse `00011_demo_seed.sql` — same structural audit.
- [ ] T-012: Parse `00012_final_fixes.sql` — map nurture tables + policies; detect duplicate with `03000001`.
- [ ] T-013: Audit SDD phase files (`20260702000001-03`, `20260703000001-02`, `20260704000001-06`, `20260705000001`) for dependency order and duplicate policies.

## Phase 1: Restructure consolidated files

**Target pattern per file**: `BEGIN;` → ENUMS → EXTENSIONS → TABLES (topological order) → FUNCTIONS → TRIGGERS → FK CONSTRAINTS → POLICIES → INDEXES/COMMENTS → `COMMIT;`

- [ ] T-101: Reorder `00001_core_schema.sql` — move 31 functions after tables, group triggers/FKs/policies per table section.
- [ ] T-102: Reorder `00002_optical_conversion.sql` — ~30 functions after ~10 tables. Inline policies→grouped.
- [ ] T-103: Reorder `00003_lens_systems.sql` — lens/contact_lens tables first, functions after.
- [ ] T-104: Reorder `00004_branches_multitenancy.sql` — 3 tables, 3 functions, inline policies→grouped.
- [ ] T-105: Reorder `00005_pos_payments.sql` — ~12 tables (orders, payments, sessions), ~6 functions after.
- [ ] T-106: Reorder `00006_work_orders.sql` — quotes, work_orders tables first, 4 functions after.
- [ ] T-107: Reorder `00007_communications.sql` — notification/email tables first, functions after.
- [ ] T-108: Reorder `00008_support_systems.sql` — support tickets + chat tables first, functions after.
- [ ] T-109: Reorder `00009_agreements_fieldops.sql` — agreements, field_ops tables first, ~20 functions after.
- [ ] T-110: Reorder `00010_ai_telemetry.sql` — AI/insights tables first, functions after.
- [ ] T-111: Reorder `00011_demo_seed.sql` — keep seed data inserts last; functions before seed data.
- [ ] T-112: Reorder `00012_final_fixes.sql` — nurture tables first, then policies/indexes.

## Phase 2: Cross-file fixes

- [ ] T-201: Delete `20260703000001_rls_nurture_campaigns.sql` — all 4 policies are duplicates of those in `00012_final_fixes.sql`. Empty file = no-op.
- [ ] T-202: Verify `20260703000002_fix_security_definer_search_path.sql` — confirm `handle_organization_delete` bodies match `00001` exactly (else `CREATE OR REPLACE` would silently change behavior). Mark as redundant if identical.
- [ ] T-203: Reorder SDD index files (`20260704000001-06`) to use `CREATE INDEX IF NOT EXISTS` — wrap each in `DO $$ BEGIN ... EXCEPTION WHEN duplicate_table THEN NULL; END $$;` if table may not exist (safety net).
- [ ] T-204: Reorder SDD normalization files (`20260702000001-03`) after consolidated — no changes needed if they already use `CREATE OR REPLACE FUNCTION`.
- [ ] T-205: Reorder `20260705000001_idx_missing_fks.sql` last — depends on all tables existing.

## Phase 3: Verification

- [ ] T-301: Backup all 264 original migrations + 42 consolidated files: `tar -czf supabase/migrations/archive/pre_qa_$(date +%Y%m%d).tar.gz supabase/migrations/`
- [ ] T-302: Copy the 12 reordered consolidated files + 8 SDD phase files to `supabase/migrations/` with timestamps: `20260701000001-12` (consolidated), `20260702000001-03` (normalization), `20260703000002` (security fix only), `20260704000001-06` (indexes), `20260705000001` (missing FKs).
- [ ] T-303: Create `supabase/migrations/20260703000001_skip_duplicate_rls.sql` — single `-- SKIP: RLS already in 00012_final_fixes` comment, no-op migration. Prevents gap in sequence.
- [ ] T-304: Move all 264 original `.sql` files from `supabase/migrations/` to `supabase/migrations/archive/`.
- [ ] T-305: Run `supabase db reset` — must pass without errors.
- [ ] T-306: `pg_dump --schema-only > after.sql` from the reset database.
- [ ] T-307: Restore original 264 files, `supabase db reset`, `pg_dump --schema-only > before.sql`.
- [ ] T-308: `diff before.sql after.sql` — must be empty. If not, debug and fix the delta.
- [ ] T-309: `npm run test:run` — 0 failures against the new schema.

## Phase 4: Swap

- [ ] T-401: Move original 264 files to `supabase/migrations/archive/` definitively (if diff passed).
- [ ] T-402: Ensure the 12 consolidated + 8 SDD phase files are the ONLY files in `supabase/migrations/`.
- [ ] T-403: Update `seed.sql` pointer if needed — verify demo seed runs correctly in `20260701000011`.
- [ ] T-404: Verify `config.toml` seed section is active and points to correct seed file.
- [ ] T-405: Final verification: `supabase db reset` + `npm run build` + `npm run test:run` — all green.
- [ ] T-406: Create archive ZIP of the 264 original migrations at `supabase/migrations/archive/originals-264.zip` for rollback.
