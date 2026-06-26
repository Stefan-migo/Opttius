# Spec: agent-harness

## Purpose

Define behavioral requirements, interaction scenarios, and invariants for the Agent Harness — a persistent contextual copilot that floats across the entire Opttius admin UI, replacing the fragmented chat page and insight widgets with a unified Agent Bubble that renders structured block responses, executes tools by role, and remembers organizational context.

## Requirements

### Phase 1 — Agent Bubble UI

The Agent Bubble SHALL be a floating UI component available on every admin layout page.

#### Bubble States

- GIVEN the user is on any admin page
- WHEN the Agent Bubble has no unread activity
- THEN it SHALL render as a collapsed circle in the bottom-right corner with no badge
- AND it SHALL NOT obstruct interactive elements (z-index controlled, collide detection)

- GIVEN the collapsed bubble is clicked
- WHEN it opens in repose mode
- THEN it SHALL display a contextual greeting based on the current screen route and role
- AND it SHALL NOT show chat history yet

- GIVEN the user types a message or clicks "Ask"
- WHEN the bubble enters conversation mode
- THEN it SHALL display full chat input, message history, and structured responses
- AND the input SHALL accept text only (no voice)

- GIVEN the agent has an unsolicited notification (background event)
- WHEN the bubble is collapsed
- THEN a badge with a count SHALL appear on the circle
- AND a subtle pulse animation SHALL indicate new content

- GIVEN the user prefers a persistent agent panel
- WHEN they toggle the dock option
- THEN the bubble SHALL expand into a fixed side panel (400px width)
- AND the panel SHALL remain visible across page navigation

#### Block Renderer

The Agent Bubble MUST render all agent responses as structured block arrays, never as raw markdown.

- GIVEN the agent responds with a `text` block
- WHEN the BlockRenderer receives `{ type: "text", content: "..." }`
- THEN it SHALL render formatted text in the conversation stream

- GIVEN the agent responds with a `preview` block
- WHEN BlockRenderer receives `{ type: "preview", entity, id, title, subtitle, actions }`
- THEN it SHALL render a rich preview card with entity name, identifier, and action buttons

- GIVEN the agent responds with an `action` block
- WHEN BlockRenderer receives `{ type: "action", label, variant, action, params }`
- THEN it SHALL render a clickable button with the specified variant (primary | danger | ghost)

- GIVEN the agent responds with a `navigation` block
- WHEN BlockRenderer receives `{ type: "navigation", label, path }`
- THEN it SHALL render a link that navigates the user via `next/navigation` `useRouter`

- GIVEN the agent is processing a tool call
- WHEN BlockRenderer receives a `loading` block
- THEN it SHALL render a spinner with the loading label

- GIVEN a tool execution fails
- WHEN BlockRenderer receives an `error` block
- THEN it SHALL render the error message with appropriate visual styling

- GIVEN a tool execution succeeds
- WHEN BlockRenderer receives a `success` block
- THEN it SHALL render a success confirmation with the provided content

#### Context Provider

The AgentContextProvider MUST expose current route, branch, role, and org ID to all consuming components.

- GIVEN the user navigates between admin pages
- WHEN the route changes
- THEN AgentContextProvider SHALL update the active route via `usePathname`
- AND SHALL push the new context to the agent on the next request (not as a stream)

- GIVEN the user switches branches in the global state
- WHEN the branch selection changes
- THEN AgentContextProvider SHALL reflect the active branch ID and name

- GIVEN the AuthContext updates the user's role
- WHEN role changes (e.g., admin elevates a vendedor)
- THEN AgentContextProvider SHALL propagate the updated role and available tools

### Phase 2 — Agent Chat Endpoint

A new endpoint `POST /api/agent/chat` MUST be added in parallel to the existing `/api/admin/chat`.

#### Endpoint Contract

- GIVEN a request to `/api/agent/chat`
- WHEN the body contains `{ message, session_id, context: { route, branch_id, role, org_id } }`
- THEN the endpoint SHALL return a structured response with `{ blocks: Block[], session_id, tool_calls?: ToolCall[] }`
- AND the response SHALL be an SSE stream or JSON body as determined by the `Accept` header

- GIVEN the request lacks required context fields (branch_id, role, org_id)
- WHEN the endpoint validates the payload
- THEN it SHALL return 400 with an error message indicating which context fields are missing

- GIVEN the endpoint is called by an unauthenticated request
- WHEN the Supabase session check fails
- THEN it SHALL return 401

- GIVEN the org has exceeded its tier quota for AI requests
- WHEN the endpoint checks tier limits
- THEN it SHALL return 429 with a retry-after header

#### 4-Layer System Prompt

The endpoint MUST construct a system prompt from 4 layers on every request: base identity, role personality, dynamic screen context, and retrieved memory.

- GIVEN any request to `/api/agent/chat`
- WHEN building the prompt
- THEN layer 1 (base) SHALL contain the agent's core identity and behavioral constraints
- AND layer 2 (role) SHALL inject role-specific personality (dueño/admin/vendedor)
- AND layer 3 (context) SHALL inject current screen route, branch name, and any active alerts
- AND layer 4 (memory) SHALL inject the output of the memory loop (getRecentContext + searchOrgMemory)

#### Role-Filtered Tools

The tool registry MUST filter available tools by the user's role before sending them to the LLM.

- GIVEN a user with role `vendedor`
- WHEN the system builds the tool list for an LLM call
- THEN `getAllTools("vendedor")` MUST return only tools where `minRole` is `vendedor` or lower
- AND tools like `deleteCustomer`, `getFinancialReport`, `updateOrgConfig` SHALL NOT be included

- GIVEN a user with role `admin`
- WHEN the system builds the tool list
- THEN tools with `minRole: "dueño"` (e.g., `updateOrgConfig`) SHALL be excluded
- AND tools with `minRole: "vendedor"` or `minRole: "admin"` SHALL be included

- GIVEN a user with role `dueño`
- WHEN the system builds the tool list
- THEN all tools SHALL be included regardless of `minRole`

#### Memory Loop

Every user interaction MUST execute a memory retrieval loop before the LLM call.

- GIVEN a new user message
- WHEN entering the memory loop
- THEN `getRecentContext(org_id, 5)` SHALL fetch the 5 most recent memory facts for the org
- AND `searchOrgMemory(message)` SHALL perform semantic search on `agent_memories` using on-device Transformers.js embeddings (384d)
- AND both results SHALL be injected into layer 4 of the system prompt

- GIVEN the user closes the agent session (minimizes or navigates away)
- WHEN the session timeout fires
- THEN `saveSessionSummary` SHALL be called to persist a summary of the interaction
- AND the summary SHALL be stored in `agent_memories` with type `summary`

#### Navigation Tools

The agent MUST have tools that can navigate the user to any route or entity.

- GIVEN the agent invokes `navigateTo(path)`
- WHEN the tool executes
- THEN the response block SHALL include `{ type: "navigation", label, path }`
- AND the frontend SHALL execute `router.push(path)` — the backend MUST NOT perform server-side redirects

- GIVEN the agent invokes `openEntity(entity, id)`
- WHEN the tool executes
- THEN it SHALL return a navigation block to the entity's detail page (e.g., `/admin/customers/{id}`)

- GIVEN the agent invokes `reopenLastScreen()`
- WHEN the tool executes
- THEN it SHALL navigate to the user's previous route via `router.back()` if available

#### Context Tools

The agent MUST have tools to query the current screen's state.

- GIVEN the agent invokes `getScreenContext()`
- WHEN the tool executes
- THEN it SHALL return current route, section name, branch, and user role from AgentContextProvider

- GIVEN the agent invokes `getActiveFormData()`
- WHEN the tool executes
- THEN it SHALL return serialized form data from any active form on the current page (if accessible)
- AND it SHALL return `null` if no form is active

- GIVEN the agent invokes `getSelectedCustomer()`
- WHEN a customer is selected in the current context (e.g., from appointments, quotes, POS)
- THEN it SHALL return `{ id, name, rut, email, phone }`
- AND it SHALL return `null` if no customer is selected

- GIVEN the agent invokes `getCartContents()`
- WHEN the current page has a POS cart with items
- THEN it SHALL return `{ items: CartItem[], total: number, branch_id }`
- AND it SHALL return `null` if no cart is active

### Phase 3 — Migration

SmartContextWidget MUST be replaced by AgentBubble across all consuming layouts.

#### Component Replacement

- GIVEN any layout that currently imports `SmartContextWidget`
- WHEN Phase 3 executes
- THEN `SmartContextWidget` SHALL be removed and replaced with `AgentBubbleContainer`
- AND all layout tests MUST pass after replacement
- AND `npm run type-check` MUST pass with zero references to the removed component

- GIVEN code elsewhere in the codebase imports `SmartContextWidget`
- WHEN a grep finds remaining references
- THEN those files SHALL be updated to import `AgentBubble` or its equivalent

#### Deprecation Marking

- GIVEN the API route `/api/ai/insights/*`
- WHEN Phase 3 executes
- THEN the route file SHALL be annotated with a deprecation comment: `// @deprecated Use /api/agent/chat instead. Remove after database-reformation.`
- AND the route SHALL remain functional — backward compatibility MUST NOT break

- GIVEN the `chat_sessions` and `chat_messages` tables are used by the legacy chat
- WHEN Phase 3 touches any code referencing these tables
- THEN a `// @deprecated` comment SHALL be added: `// @deprecated Migrate to agent_conversations/agent_messages after database-reformation`
- AND no new queries to these tables SHALL be added

#### Migration Plan

- GIVEN Phase 3 completes
- WHEN the migration plan is written
- THEN it SHALL be saved as `docs/migrations/agent-tables-migration-plan.md`
- AND it SHALL document exact column mapping from `chat_sessions` → `agent_conversations` and `chat_messages` → `agent_messages`
- AND it SHALL enumerate all 100+ reference points in the codebase that consume the legacy tables

### Phase 4 — Auto-Mode and Cost Tracking

#### Auto Mode

The automated mode MUST be opt-in per user.

- GIVEN a user has `auto_mode: true` in their preferences
- WHEN the agent detects a trigger event (stock below threshold, appointment within 24h, work order overdue)
- THEN the agent SHALL present a notification bubble with a proposal action
- AND SHALL NOT execute any irreversible action without explicit user confirmation

- GIVEN the agent proposes an irreversible action (e.g., reordering stock, canceling an order)
- WHEN the user has auto-mode enabled
- THEN the agent SHALL render a confirmation block with `{ type: "action", variant: "danger" }`
- AND the action SHALL NOT execute until the user clicks the confirm button

- GIVEN the agent proposes a reversible action (e.g., rearranging an appointment)
- WHEN the user has auto-mode enabled
- THEN the agent MAY execute the action and report the result as a success block
- AND the user SHALL be able to undo within a configurable window

- GIVEN the user has auto-mode disabled
- WHEN a trigger event occurs
- THEN the agent SHALL NOT present proactive notifications
- AND existing manual interaction patterns SHALL remain unchanged

#### User Preferences UI

- GIVEN the user opens the agent preferences
- WHEN they interact with the settings panel
- THEN they SHALL be able to toggle `auto_mode` (on/off)
- AND SHALL be able to set `bubble_position` (fixed floating | docked right)
- AND SHALL be able to set `agent_tone` (professional | casual | concise)

#### Cost Tracking

- GIVEN a multi-turn conversation in `/api/agent/chat`
- WHEN each LLM call completes
- THEN the system SHALL record `tokens` (input + output) and `model` for that turn
- AND `token_count` SHALL be accumulated per conversation session
- AND the data SHALL be persisted in the available tables (legacy `chat_messages` or new `agent_messages` when created)

- GIVEN a conversation is summarized at session end
- WHEN `saveSessionSummary` runs
- THEN `token_count` SHALL be included in the summary metadata

### Invariants

The following invariants MUST hold across all phases.

#### No Schema Mutations

- GIVEN any Phase of agent-harness
- WHEN the codebase is modified
- THEN NO existing database table SHALL be altered, dropped, or have columns added
- AND NO migration file SHALL be created or modified
- AND all data persistence SHALL use existing tables (`chat_sessions`, `chat_messages`, `memory_facts`)
- The new tables (`agent_conversations`, `agent_messages`, `agent_memories`, `agent_prompts`, `agent_user_prefs`) SHALL be designed but MUST NOT be created — they MUST wait for `database-reformation`

#### RLS Multi-Tenant Invariant

- GIVEN any backend tool or endpoint introduced by agent-harness
- WHEN it queries Supabase
- THEN it MUST use the authenticated `supabaseClient` of the requesting user
- AND RLS policies SHALL be the final authorization barrier — the application layer filtr SHALL NOT be the sole protection
- AND queries MUST scope to the user's organization (`org_id`) and branch (`branch_id`) per existing RLS policies

#### Structured Events Invariant

- GIVEN any response from `/api/agent/chat`
- WHEN the response is sent to the frontend
- THEN it MUST be an array of `Block` objects — raw markdown strings SHALL NOT be sent as top-level responses
- AND the frontend BlockRenderer MUST be the sole renderer of agent responses

#### Legacy Endpoint Invariant

- GIVEN the existing `/api/admin/chat` endpoint
- WHEN agent-harness Phase 2 is deployed
- THEN `/api/admin/chat` MUST continue functioning identically
- AND its response format MUST NOT change
- AND its tests MUST continue to pass

#### Rollback Invariant

- GIVEN any single Phase of agent-harness is merged
- WHEN a rollback is required
- THEN reverting the Phase's PR SHALL restore the system to the pre-merge state without data migration or schema changes

## Quality Gates Summary

| Phase | Gate                                               | Measure                                                             |
| ----- | -------------------------------------------------- | ------------------------------------------------------------------- |
| 1     | Bubble renders in all admin layouts                | Visual review + type-check pass                                     |
| 1     | BlockRenderer handles all 7 block types            | Unit tests per block type                                           |
| 1     | AgentContextProvider exposes route/branch/role/org | Component test with mock                                            |
| 2     | POST /api/agent/chat returns blocks                | Integration test with mocked LLM                                    |
| 2     | Tools filtered by role                             | Unit test: getAllTools("vendedor") excludes protected tools         |
| 2     | Memory loop injects context                        | Integration test verifying prompt construction                      |
| 2     | Legacy /api/admin/chat unchanged                   | Identical response snapshot test                                    |
| 3     | SmartContextWidget removed                         | Grep zero references + type-check pass                              |
| 3     | Insights routes deprecated, not broken             | Integration test still passes on /api/ai/insights                   |
| 4     | Auto-mode notification triggered                   | Integration test with mock trigger event                            |
| 4     | Token count persisted                              | Unit test on usage-logger                                           |
| Cross | No regressions                                     | `npm run build` + `npm run test:all` pass at every phase exit state |
