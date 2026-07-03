# Specification: fix-core-functionality-test

## Purpose

Stabilize the test suite by eliminating 52 vitest worker crashes, re-enabling 5 skipped test blocks with correct assertions, and removing placeholder matchers — without modifying any source code.

## Requirements

### R1: Vitest Worker Pool Configuration

The vitest config MUST specify `pool: 'forks'` and `maxWorkers: 3` to contain process-level crashes.

The config MUST assign `jsdom` environment to test files that render React components and `node` environment to pure-utility test files (under `src/__tests__/unit/`).

#### Scenario: Worker crash rate drops to zero

- GIVEN the full test suite runs with `npx vitest run --reporter=verbose`
- WHEN the run completes
- THEN there MUST be zero "Worker exited unexpectedly" errors
- AND all test files MUST report pass/fail normally

### R2: Duplicate and Corrupt File Removal

`src/tests/security/phase2-security.test.ts` MUST be deleted — it is a full duplicate of `src/__tests__/security/phase2-security.test.ts`.

The corrupt root-level file (encoding-damaged filename) MUST be deleted — vitest MAY attempt to process it and crash.

#### Scenario: Duplicate removal

- GIVEN the file `src/tests/security/phase2-security.test.ts` exists
- WHEN it is deleted
- THEN the test suite MUST NOT report any missing-module or discovery errors

### R3: Group A Skipped Test Fixes

The following 5 skipped test blocks MUST be un-skipped and updated with correct assertions:

| File | Line | Current Issue | Fix |
|------|------|---------------|-----|
| `InsightCard.test.tsx` | 63 | Empty test body; component passes extra arg | Match actual arguments |
| `schemas.test.ts` | 186 | Schema relaxed — old assertion fails | Update to match relaxed schema shape |
| `generator.test.ts` | 244 | No longer throws | Remove `toThrow`, assert return value |
| `insights-generation.test.ts` | 55 | Output format changed | Update assertion to match current output |
| `template-variables.test.ts` | 68 | Field names changed | Update `getDefaultVariables` field assertions |

#### Scenario: Each Group A test executes and passes

- GIVEN the test file is loaded without `.skip`
- WHEN the test suite runs
- THEN each previously-skipped test MUST pass with its updated assertion

### R4: Placeholder Assertion Replacement

Two `expect(true).toBe(true)` placeholders MUST be replaced with real assertions:

| File | Line | Replacement |
|------|------|-------------|
| `tier-config.test.ts` | 44 | Assert actual tier config properties |
| `phase1-security.test.ts` | 169 | Assert actual security behavior or response |

#### Scenario: No placeholder matchers remain

- GIVEN the full test suite
- WHEN a grep for `expect\(true\)\.toBe\(true\)` is run across all test files
- THEN the output MUST be empty

### R5: Import Test Timeout Reduction

Three `.import.test.tsx` files using `await import()` with 30s timeout MUST have their timeout reduced to 10s.

#### Scenario: Import tests complete quickly

- GIVEN each `.import.test.tsx` file
- WHEN the suite runs
- THEN each test MUST complete in under 15s

### R6: Opportunistic expect.any() Tightening

Files touched for Group A fixes (R3) SHOULD also tighten `expect.any(String)` and `expect.any(Number)` to specific expected values where the actual value is deterministic.

#### Scenario: Touched files have specific matchers

- GIVEN a file modified for R3
- WHEN `expect.any(String)` or `expect.any(Number)` appears in a touched test
- AND the expected value is deterministic (not random or timestamp-based)
- THEN the matcher SHOULD assert the specific value instead

## Non-goals

- NOT fixing Groups B+D skipped tests (12 blocks — deferred)
- NOT fixing all 28 `expect.any()` instances (only touched files)
- NOT splitting large `.char.test.ts` files to fix OOM
- NOT modifying any source code files
- NOT auditing mock-that-tests-itself patterns

## Acceptance Criteria

| Criterion | Verification |
|-----------|-------------|
| Zero worker crashes | `npx vitest run --reporter=verbose` — no "Worker exited unexpectedly" |
| Group A tests pass | Each of the 5 blocks executes (not skipped) and passes |
| No placeholder matchers | `grep -r 'expect(true).toBe(true)' src/__tests__/` returns empty |
| Suite count preserved | `npx vitest run` reports 2200+ passing tests |
| Import tests fast | Each `.import.test.tsx` completes in under 15s |

## Verification Criteria

| Requirement | How to Verify |
|-------------|---------------|
| R1 | Inspect `vitest.config.ts` for `pool: 'forks'`, `maxWorkers: 3`, per-env config |
| R2 | Confirm both deleted files are absent; `git status` shows deletion |
| R3 | Run each affected file: `npx vitest run --reporter=verbose <file-path>` |
| R4 | Grep for placeholder pattern; run affected files |
| R5 | Run each `.import.test.tsx` file and measure duration in vitest output |
| R6 | Inspect diff for `expect.any()` → specific value changes in touched files |
