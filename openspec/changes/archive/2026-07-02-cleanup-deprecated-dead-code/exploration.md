# Exploration: cleanup-deprecated-dead-code

> Generated: 2026-07-02
> Priority: Low
> Phase: 5 (remaining cleanup)

---

## Complete Inventory of `@deprecated` Markers

### Group 1: AI Agent Files — "Migrate to agent_conversations/agent_messages after database-reformation"

All file-level `// @deprecated` headers. These are **forward-looking migration notes**, not current deletion targets. The entire chain is actively used:

```
app/api/agent/chat/route.ts → core.ts → agent.ts → memory-init.ts → memory/manager.ts → memory/indexer.ts, memory/session.ts
                                                     → usage-logger.ts
                                                     → knowledge-context.ts
                                                     → tools/memory.ts (memoryTools export)
```

| # | File | Line | Item | Status |
|---|------|------|------|--------|
| 1 | `src/lib/ai/agent/agent.ts` | 1 | file-level (`Agent` class) | ❓ Still used via `core.ts` |
| 2 | `src/lib/ai/agent/core.ts` | 1 | file-level (`createAgent`) | ❓ Still used by agent chat route |
| 3 | `src/lib/ai/agent/session.ts` | 1 | file-level (`buildSession`) | ❓ Still used by agent chat route |
| 4 | `src/lib/ai/agent/memory-init.ts` | 1 | file-level (`initializeMemoryManager`) | ❓ Still used by `agent.ts` |
| 5 | `src/lib/ai/agent/knowledge-context.ts` | 1 | file-level (`getKnowledgeBaseContext`) | ❓ Still used by `agent.ts` |
| 6 | `src/lib/ai/memory/session.ts` | 1 | file-level (`SessionMemory`) | ❓ Still used via `manager.ts` |
| 7 | `src/lib/ai/memory/indexer.ts` | 1 | file-level (`MemoryIndexer`) | ❓ Still used via `manager.ts` |
| 8 | `src/lib/ai/tools/memory.ts` | 1 | file-level (`memoryTools`) | ❓ Still used via tools index → agent |
| 9 | `src/lib/ai/usage-logger.ts` | 1 | file-level (`logAIUsage`, `logTokenUsage`) | ❓ Still used by `agent.ts` |
| 10 | `src/lib/whatsapp/webhook-handler.ts` | 1 | file-level (`handleWebhookPayload`) | ❓ Still used by webhook route |
| 11 | `src/lib/whatsapp/session-manager.ts` | 1 | file-level (`getOrCreateWhatsAppSession`) | ❓ Still used by webhook handler |
| 12 | `src/lib/backup-service.ts` | 1 | file-level (`BackupService`) | ❓ Still used by cron backup route |

### Group 2: API Routes — "Migrate to agent_conversations/agent_messages after database-reformation"

| # | File | Line | Item | Status |
|---|------|------|------|--------|
| 13 | `src/app/api/onboarding/activate-real-org/route.ts` | 1 | `POST /api/onboarding/activate-real-org` | ❓ Still called by onboarding page |
| 14 | `src/app/api/ai/insights/route.ts` | 1 | `GET /api/ai/insights` | ❓ Still has sub-routes in use |
| 15 | `src/app/api/admin/chat/sessions/route.ts` | 1 | `POST /api/admin/chat/sessions` | ❓ Still called by `useChatSession.ts` |
| 16 | `src/app/api/admin/chat/route.ts` | 1 | `POST /api/admin/chat` | ❓ Still called by chatbot components |
| 17 | `src/app/api/admin/chat/messages/route.ts` | 1 | `POST /api/admin/chat/messages` | ❓ Still called by `useChatSession.ts` |
| 18 | `src/app/api/admin/chat/history/route.ts` | 1 | `GET /api/admin/chat/history` | ❓ Still called by `ChatHistorySidebar.tsx` |
| 19 | `src/app/api/admin/saas-management/whatsapp/conversations/[sessionId]/messages/route.ts` | 1 | `GET .../messages` | ❓ Still called by WhatsApp page |
| 20 | `src/app/api/admin/saas-management/whatsapp/conversations/route.ts` | 1 | `GET .../conversations` | ❓ Still called by WhatsApp page |

### Group 3: AI Components — "Use AgentBubble + Agent chat instead"

| # | File | Line | Item | Status |
|---|------|------|------|--------|
| 21 | `src/components/ai/InsightDetailDialog.tsx` | 1 | `InsightDetailDialog` component | ✅ **Safe to delete — unused** |
| 22 | `src/components/ai/InsightCard.tsx` | 1 | `InsightCard` component | ✅ **Safe to delete — unused** |
| 23 | `src/components/ai/GenerateInsightsButton.tsx` | 1 | `GenerateInsightsButton` component | ✅ **Safe to delete — unused** |
| 24 | `src/components/ai/AgentBubbleContainer.tsx` | 24 | `SmartContextWidget` (shim export) | ✅ **Safe to delete — unused** |

### Group 4: Quote Service — Flat model (no quote_items table)

| # | File | Line | Item | Status |
|---|------|------|------|--------|
| 25 | `src/lib/api/services/quoteService.ts` | 340 | `addQuoteItem()` | ✅ **Safe to delete — unused** by app code |
| 26 | `src/lib/api/services/quoteService.ts` | 360 | `updateQuoteItem()` | ✅ **Safe to delete — unused** by app code |
| 27 | `src/lib/api/services/quoteService.ts` | 381 | `removeQuoteItem()` | ✅ **Safe to delete — unused** by app code |

### Group 5: Product Service — Backward compat

| # | File | Line | Item | Status |
|---|------|------|------|--------|
| 28 | `src/lib/api/services/productService.ts` | 441 | `importProductsJson()` | ✅ **Safe to delete — unused** (not exported from barrel) |

### Group 6: AI Tool Resolvers — Legacy table

| # | File | Line | Item | Status |
|---|------|------|------|--------|
| 29 | `src/lib/ai/tools/resolvers.ts` | 83 | `resolveTicketByNumber()` | ✅ **Safe to delete — unused** externally |

### Group 7: POS Types — Backward compat type aliases

| # | File | Line | Item | Status |
|---|------|------|------|--------|
| 30 | `src/app/admin/pos/types.ts` | 79 | `type Product = POSProduct` | ✅ **Safe to delete — unused** |
| 31 | `src/app/admin/pos/types.ts` | 84 | `type CartItem = POSCartItem` | ✅ **Safe to delete — unused** |
| 32 | `src/app/admin/pos/types.ts` | 89 | `type Customer = POSCustomer` | ✅ **Safe to delete — unused** |
| 33 | `src/app/admin/pos/types.ts` | 94 | `type Quote = POSQuote` | ✅ **Safe to delete — unused** |
| 34 | `src/app/admin/pos/types.ts` | 99 | `type PaymentMethod = POSPaymentMethod` | ✅ **Safe to delete — unused** |

### Group 8: Internal `@deprecated` comments in `usage-logger.ts` (inline)

| # | File | Line | Item | Status |
|---|------|------|------|--------|
| 35 | `src/lib/ai/usage-logger.ts` | 75 | Inline comment in `logTokenUsage` | 🗑️ Dead annotation — file stays, comment can be cleaned |
| 36 | `src/lib/ai/usage-logger.ts` | 90 | Inline comment in `logTokenUsage` | 🗑️ Dead annotation — file stays, comment can be cleaned |

---

## Categorization Summary

### ✅ Safe to Delete (12 items)
| # | Item | Reason |
|---|------|--------|
| 21 | `InsightDetailDialog` component | Not imported by any app/component code |
| 22 | `InsightCard` component | Not imported by any app/component code |
| 23 | `GenerateInsightsButton` component | Not imported by any app/component code |
| 24 | `SmartContextWidget` shim export | Not imported by any code |
| 25 | `addQuoteItem()` | Not used by app code; only re-exported from barrel |
| 26 | `updateQuoteItem()` | Not used by app code; only re-exported from barrel |
| 27 | `removeQuoteItem()` | Not used by app code; only re-exported from barrel |
| 28 | `importProductsJson()` | Not used or re-exported from barrel |
| 29 | `resolveTicketByNumber()` | Not used externally; suggested replacement exists |
| 30-34 | 5 POS type aliases | Not imported; all consumers use POS* prefixed types |
| 35-36 | 2 inline deprecated comments | Just comments, no code |

### 🔄 Replace Callers Then Delete (0 items)
None in this category — all "replace" items are forward-looking notes for after a database migration.

### ❓ Needs Discussion (20 items)
Items 1-20 (Group 1 + Group 2). All marked `@deprecated` but **still actively used**. Deprecation refers to a future migration after "database-reformation" that hasn't happened yet. Cannot be removed until:
- Agent conversations are migrated to `agent_conversations`/`agent_messages` tables
- New API routes replace the old admin chat endpoints
- WhatsApp webhook processing is moved to the new agent messaging system

### 🗑️ Dead Annotations (2 items)
Items 35-36 in `usage-logger.ts` — inline comments that annotate code using `chat_messages`/`chat_sessions` which still exist and are in active use. The annotation itself is stale.

---

## Affected Files

### Files with deprecated code slated for deletion (12 deletions):
- `src/components/ai/InsightDetailDialog.tsx` — entire file
- `src/components/ai/InsightCard.tsx` — entire file
- `src/components/ai/GenerateInsightsButton.tsx` — entire file
- `src/components/ai/AgentBubbleContainer.tsx` — only `SmartContextWidget` export (file stays)
- `src/lib/api/services/quoteService.ts` — 3 function exports
- `src/lib/api/services/productService.ts` — `importProductsJson` export
- `src/lib/ai/tools/resolvers.ts` — `resolveTicketByNumber` export
- `src/app/admin/pos/types.ts` — 5 type alias exports
- `src/lib/ai/usage-logger.ts` — 2 inline comments (cosmetic)

### Files that reference the deprecated code (these need updates or verification):
- `src/lib/api/services/index.ts` — re-exports `addQuoteItem`, `updateQuoteItem`, `removeQuoteItem` (remove re-exports)
- `src/__tests__/unit/lib/api/services/quoteService.test.ts` — tests for deprecated functions (delete tests too)
- `src/__tests__/unit/components/ai/InsightCard.test.tsx` — test for `InsightCard` (delete test too)

---

## Approaches

### Approach A: Delete Only Safe-to-Delete Items (Low Risk)

Delete the 12 confirmed-unused items. Leave deprecated-but-used items with their `@deprecated` markers for the future database-reformation migration.

**What gets deleted:**
- 3 unused components (files)
- 4 unused functions (exports from 3 files)
- 5 unused type aliases (exports from 1 file)
- 2 stale inline comments
- 2 test files (quoteService test, InsightCard test)
- Remove stale re-exports from services barrel

**Effort**: Low (~15 deletions, well-defined boundary)
**Risk**: Very low — nothing deleted is referenced by production code
**Lines removed**: ~700-800

### Approach B: Delete + Replace Callers (Medium Risk)

Approach A plus: update callers for any deprecated items that ARE still used but have viable replacements. However, after analysis, **there are no items in this category** — all deprecated-but-used items depend on a database migration that hasn't been executed.

**Risk**: Same as A — none of the "needs replacement" items exist yet.

### Approach C: Add TODO/Remove-by-Date (Defer)

Add `TODO(remove-by)` comments to all deprecated markers specifying a future date (e.g., "remove after DB migration complete"). Defer all actual deletion.

**Risk**: Negligible, but nothing actually gets cleaned up.
**Downside**: Technical debt lingers indefinitely.

---

## Recommendation

**Approach A — Delete safe-to-delete items only.**

Rationale:
1. 12 items are confirmed 100% unused — zero risk
2. Deleting ~700+ lines of dead code is a net positive with no downside
3. The remaining 20 deprecated items are legitimate forward-looking markers for a future database migration — removing them would lose information
4. Approach C just procrastinates; the safe deletions cost nothing now

### What to delete (exact list):

**Files (entire):**
- `src/components/ai/InsightDetailDialog.tsx`
- `src/components/ai/InsightCard.tsx`
- `src/components/ai/GenerateInsightsButton.tsx`
- `src/__tests__/unit/components/ai/InsightCard.test.tsx`
- `src/__tests__/unit/lib/api/services/quoteService.test.ts` (tests for deprecated functions)

**Exports to remove:**
- `src/components/ai/AgentBubbleContainer.tsx` — remove `SmartContextWidget` export
- `src/lib/api/services/quoteService.ts` — remove `addQuoteItem`, `updateQuoteItem`, `removeQuoteItem`
- `src/lib/api/services/quoteService.ts` — remove `QuoteItem` type (no longer needed)
- `src/lib/api/services/productService.ts` — remove `importProductsJson`
- `src/lib/ai/tools/resolvers.ts` — remove `resolveTicketByNumber`
- `src/app/admin/pos/types.ts` — remove backward-compat type aliases (5 lines)
- `src/lib/api/services/index.ts` — remove re-exports of addQuoteItem, updateQuoteItem, removeQuoteItem

**Comments to clean:**
- `src/lib/ai/usage-logger.ts` — lines 75 and 90: replace inline `// @deprecated` with a note that these tables are still active

### What to leave alone:
- All 20 items in Groups 1 & 2 — still actively used, deprecation notes are valuable
- All file-level `@deprecated` headers in AI agent/lib files

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Deleting `resolveTicketByNumber` breaks something that imports it dynamically | Very Low | Low | Grep confirmed zero external references |
| Deleting quote item functions breaks a route that calls the non-existent `/quotes/[id]/items` endpoint | None | — | The endpoint doesn't exist (deprecation says this). Nothing calls these functions. |
| Deleting `SmartContextWidget` breaks dynamic import from old code | Very Low | Low | Confirmed zero references |
| Test suite loses coverage for deleted functions | Low | Very Low | The functions are dead; coverage was self-referential |
| Future migration to `agent_conversations` forgets about the deprecated-but-used files | Low | Medium | The `@deprecated` markers remain — information is preserved |

---

## Ready for Proposal

**Yes.** The safe-to-delete items have clear boundaries and zero risk. The remaining deprecated items should stay with their markers.

Recommended next phase: **sdd-propose** with Approach A.
