# Unit Testing

<cite>
**Referenced Files in This Document**
- [vitest.config.ts](file://vitest.config.ts)
- [src/__tests__/setup.ts](file://src/__tests__/setup.ts)
- [src/__tests__/unit/components/ai/InsightCard.test.tsx](file://src/__tests__/unit/components/ai/InsightCard.test.tsx)
- [src/__tests__/unit/components/ai/SmartContextWidget.test.tsx](file://src/__tests__/unit/components/ai/SmartContextWidget.test.tsx)
- [src/__tests__/unit/api/upload.test.ts](file://src/__tests__/unit/api/upload.test.ts)
- [src/hooks/useAuth.ts](file://src/hooks/useAuth.ts)
</cite>

## Table of Contents

1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)
10. [Appendices](#appendices)

## Introduction

This document explains how to write effective unit tests for this project using Vitest and React Testing Library. It covers:

- Individual component testing with React Testing Library
- Mocking component dependencies and external integrations
- Isolated behavior validation for custom hooks and business logic
- Utility and library function validation
- Async operations, TypeScript interfaces, and error handling
- Test organization, naming conventions, and isolation strategies

## Project Structure

The project uses Vitest with JSDOM for DOM APIs, a global setup file for mocks, and a strict include pattern to discover tests. Tests are organized under src/**tests** with subfolders for unit and integration tests.

```mermaid
graph TB
A["Vitest Config<br/>vitest.config.ts"] --> B["Environment<br/>jsdom"]
A --> C["Setup File<br/>src/__tests__/setup.ts"]
A --> D["Include Pattern<br/>src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"]
C --> E["Router Mocks<br/>next/navigation"]
C --> F["matchMedia Mock"]
G["Unit Tests"] --> H["Components<br/>InsightCard, SmartContextWidget"]
G --> I["API Handlers<br/>/api/upload"]
G --> J["Custom Hooks<br/>useAuth"]
```

**Diagram sources**

- [vitest.config.ts](file://vitest.config.ts#L1-L32)
- [src/**tests**/setup.ts](file://src/__tests__/setup.ts#L1-L42)

**Section sources**

- [vitest.config.ts](file://vitest.config.ts#L1-L32)
- [src/**tests**/setup.ts](file://src/__tests__/setup.ts#L1-L42)

## Core Components

- Test runner and environment: Vitest with jsdom environment and global setup.
- Global mocks: Router mocks for Next.js and matchMedia polyfill.
- Test discovery: Glob pattern includes all TypeScript/TypeScript JSX files under src.
- Coverage: V8 provider with selective exclusion of types, configs, and test scaffolding.

Key behaviors validated in the existing unit tests:

- Rendering variants and user interactions for AI Insight components
- Async data fetching and error handling for AI widget
- API route validation for file upload with Supabase and R2 fallback
- Hook state transitions and lifecycle events

**Section sources**

- [vitest.config.ts](file://vitest.config.ts#L7-L12)
- [src/**tests**/setup.ts](file://src/__tests__/setup.ts#L6-L34)

## Architecture Overview

The unit testing architecture centers around isolated tests that:

- Render components under test with minimal providers
- Mock external dependencies (router, storage, network)
- Assert UI behavior and state transitions
- Validate API handlers and hook logic without side effects

```mermaid
graph TB
subgraph "Test Runtime"
V["Vitest Runner"]
J["JSDOM Environment"]
S["Global Setup<br/>Mock Router & matchMedia"]
end
subgraph "Tests"
T1["Component Tests<br/>InsightCard, SmartContextWidget"]
T2["API Handler Tests<br/>/api/upload"]
T3["Hook Tests<br/>useAuth"]
end
subgraph "SUT (System Under Test)"
C1["InsightCard Component"]
C2["SmartContextWidget Component"]
H1["useAuth Hook"]
A1["Upload API Route"]
end
V --> J
J --> S
S --> T1
S --> T2
S --> T3
T1 --> C1
T1 --> C2
T2 --> A1
T3 --> H1
```

**Diagram sources**

- [vitest.config.ts](file://vitest.config.ts#L7-L12)
- [src/**tests**/setup.ts](file://src/__tests__/setup.ts#L6-L34)
- [src/**tests**/unit/components/ai/InsightCard.test.tsx](file://src/__tests__/unit/components/ai/InsightCard.test.tsx#L1-L136)
- [src/**tests**/unit/components/ai/SmartContextWidget.test.tsx](file://src/__tests__/unit/components/ai/SmartContextWidget.test.tsx#L1-L205)
- [src/**tests**/unit/api/upload.test.ts](file://src/__tests__/unit/api/upload.test.ts#L1-L176)
- [src/hooks/useAuth.ts](file://src/hooks/useAuth.ts#L1-L377)

## Detailed Component Analysis

### Component Testing with React Testing Library

This section demonstrates how to test React components in isolation, simulate user interactions, and assert behavior.

- Rendering variants and user interactions
  - Example: Rendering different insight types and verifying presence of text and actions.
  - Example: Clicking dismiss and feedback controls and asserting callbacks are invoked.
  - Example: Verifying conditional rendering based on missing action URLs.

- Async rendering and error handling
  - Example: Simulating long-running fetch and asserting loading indicators.
  - Example: Handling empty insight lists and ensuring the widget does not render.
  - Example: Handling HTTP errors and ensuring graceful no-render behavior.

- Mocking external dependencies
  - Example: Using a QueryClient with disabled retries to stabilize async tests.
  - Example: Mocking global fetch to control API responses and verify requests.

```mermaid
sequenceDiagram
participant T as "Test"
participant RTL as "React Testing Library"
participant QC as "QueryClient"
participant W as "SmartContextWidget"
participant F as "global.fetch"
T->>RTL : "render(<QueryClientProvider><W section='dashboard'/>)"
T->>F : "mockResolvedValueOnce({ ok : true, json : () => ({insights : [...]}) })"
RTL->>W : "initial render"
W->>F : "fetch('/api/ai/insights')"
F-->>W : "response"
RTL->>RTL : "waitFor(() => expect(...))"
T->>RTL : "fireEvent.click(dismiss)"
RTL->>F : "POST /api/ai/insights/ : id/dismiss"
F-->>W : "ack"
RTL->>RTL : "assert widget hidden after dismissal"
```

**Diagram sources**

- [src/**tests**/unit/components/ai/SmartContextWidget.test.tsx](file://src/__tests__/unit/components/ai/SmartContextWidget.test.tsx#L31-L97)
- [src/**tests**/unit/components/ai/SmartContextWidget.test.tsx](file://src/__tests__/unit/components/ai/SmartContextWidget.test.tsx#L99-L146)

**Section sources**

- [src/**tests**/unit/components/ai/InsightCard.test.tsx](file://src/__tests__/unit/components/ai/InsightCard.test.tsx#L23-L135)
- [src/**tests**/unit/components/ai/SmartContextWidget.test.tsx](file://src/__tests__/unit/components/ai/SmartContextWidget.test.tsx#L19-L97)
- [src/**tests**/unit/components/ai/SmartContextWidget.test.tsx](file://src/__tests__/unit/components/ai/SmartContextWidget.test.tsx#L99-L203)

### API Handler Validation

This section focuses on validating server-side routes in isolation, including authentication checks, input validation, and storage fallback logic.

- Authentication and input validation
  - Example: Returning unauthorized for missing auth.
  - Example: Returning bad request for missing or invalid file types.
  - Example: Returning payload too large for oversized files.

- Storage integration and fallback
  - Example: Uploading via R2 when configured and verifying response and client invocation.
  - Example: Falling back to Supabase storage when R2 is not configured and verifying URL construction.

```mermaid
flowchart TD
Start(["POST /api/upload"]) --> CheckAuth["Check Auth"]
CheckAuth --> |Unauthorized| Return401["Return 401"]
CheckAuth --> |Authorized| ParseBody["Parse FormData"]
ParseBody --> ValidateSize{"File <= Max Size?"}
ValidateSize --> |No| Return413["Return 413 Payload Too Large"]
ValidateSize --> |Yes| ValidateType{"Allowed Type?"}
ValidateType --> |No| Return400Type["Return 400 Invalid Type"]
ValidateType --> |Yes| CheckR2{"R2 Configured?"}
CheckR2 --> |Yes| UploadR2["Upload to R2"]
UploadR2 --> Return200R2["Return 200 with R2 URL"]
CheckR2 --> |No| UploadSB["Upload to Supabase"]
UploadSB --> Return200SB["Return 200 with Supabase URL"]
```

**Diagram sources**

- [src/**tests**/unit/api/upload.test.ts](file://src/__tests__/unit/api/upload.test.ts#L62-L174)

**Section sources**

- [src/**tests**/unit/api/upload.test.ts](file://src/__tests__/unit/api/upload.test.ts#L62-L174)

### Custom Hooks Testing Patterns

Testing custom hooks requires isolating side effects and mocking external clients. The useAuth hook demonstrates:

- Initial session retrieval and profile fetch with timeouts and error handling
- Auth state change subscriptions and cleanup
- Sign-up, sign-in, sign-out, profile updates, and password reset flows

Recommended patterns:

- Mock the Supabase client factory to return deterministic responses.
- Use fake timers if applicable to test timeouts.
- Assert state transitions and error handling paths.
- Verify cleanup of subscriptions and timeouts on unmount.

```mermaid
sequenceDiagram
participant T as "Test"
participant H as "useAuth Hook"
participant SC as "Supabase Client"
participant RT as "Auth State Change"
T->>H : "initialize hook"
H->>SC : "getSession()"
SC-->>H : "session or error"
alt "session present"
H->>SC : "fetchProfile(userId)"
SC-->>H : "profile or error"
else "no session"
H-->>T : "loading=false, user=null"
end
SC-->>RT : "auth event"
RT-->>H : "SIGNED_IN/SIGNED_OUT/TOKEN_REFRESHED"
H-->>T : "updated state"
T->>H : "cleanup (unmount)"
H-->>T : "unsubscribe, clear timeout"
```

**Diagram sources**

- [src/hooks/useAuth.ts](file://src/hooks/useAuth.ts#L27-L130)

**Section sources**

- [src/hooks/useAuth.ts](file://src/hooks/useAuth.ts#L18-L377)

### Utility and Library Function Validation

Guidance for validating utility and library functions:

- Keep utilities pure when possible; isolate impure parts (e.g., network, storage) behind injectable dependencies or factories.
- Mock external libraries (e.g., AWS SDK clients) to control behavior and assert invocations.
- Validate TypeScript interfaces by passing strongly typed inputs and asserting outputs meet expected shapes.
- For async utilities, use promises and controlled mocks to simulate success/failure paths.

[No sources needed since this section provides general guidance]

### TypeScript Interfaces and Strictness

- Use strongly typed props and return values in tests to catch interface mismatches early.
- Leverage type inference from React Testing Library helpers to ensure assertions align with component contracts.
- When mocking, maintain type fidelity to avoid silent failures.

[No sources needed since this section provides general guidance]

### Async Operations and Error Handling

- Use waitFor and async helpers to assert UI updates after async operations settle.
- Mock asynchronous resources (fetch, storage) to simulate various outcomes (success, network error, timeout).
- Assert error boundaries and graceful fallbacks (e.g., empty renders on failure).

**Section sources**

- [src/**tests**/unit/components/ai/SmartContextWidget.test.tsx](file://src/__tests__/unit/components/ai/SmartContextWidget.test.tsx#L19-L97)
- [src/**tests**/unit/components/ai/SmartContextWidget.test.tsx](file://src/__tests__/unit/components/ai/SmartContextWidget.test.tsx#L99-L203)

## Dependency Analysis

This section maps test dependencies and how they are mocked to maintain isolation.

```mermaid
graph LR
subgraph "Tests"
TC1["InsightCard.test.tsx"]
TC2["SmartContextWidget.test.tsx"]
TA["upload.test.ts"]
end
subgraph "Mocks"
M1["next/navigation"]
M2["window.matchMedia"]
M3["global.fetch"]
M4["@/utils/supabase/server"]
M5["@/lib/r2/client"]
M6["@/lib/logger"]
end
TC1 --> M1
TC1 --> M2
TC2 --> M1
TC2 --> M2
TC2 --> M3
TA --> M4
TA --> M5
TA --> M6
```

**Diagram sources**

- [src/**tests**/setup.ts](file://src/__tests__/setup.ts#L6-L34)
- [src/**tests**/unit/components/ai/SmartContextWidget.test.tsx](file://src/__tests__/unit/components/ai/SmartContextWidget.test.tsx#L19-L97)
- [src/**tests**/unit/api/upload.test.ts](file://src/__tests__/unit/api/upload.test.ts#L8-L32)

**Section sources**

- [src/**tests**/setup.ts](file://src/__tests__/setup.ts#L6-L34)
- [src/**tests**/unit/components/ai/SmartContextWidget.test.tsx](file://src/__tests__/unit/components/ai/SmartContextWidget.test.tsx#L19-L97)
- [src/**tests**/unit/api/upload.test.ts](file://src/__tests__/unit/api/upload.test.ts#L8-L32)

## Performance Considerations

- Prefer deterministic mocks over real network calls to keep tests fast and reliable.
- Disable retries for external clients in tests to avoid flakiness.
- Use minimal providers (e.g., QueryClient with defaultOptions) to reduce overhead.
- Keep test suites focused and avoid unnecessary re-renders.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide

Common issues and resolutions:

- Router-related errors: Ensure next/navigation is mocked globally via setup.
- matchMedia errors: Confirm the matchMedia polyfill is applied in setup.
- Stale state in async tests: Use QueryClient with retry disabled and waitFor assertions.
- External client failures: Mock factories (e.g., Supabase, R2) and assert invocation counts and arguments.
- Timeout warnings: Adjust timeouts in tests or increase tolerance in the hook under test.

**Section sources**

- [src/**tests**/setup.ts](file://src/__tests__/setup.ts#L6-L34)
- [src/**tests**/unit/components/ai/SmartContextWidget.test.tsx](file://src/__tests__/unit/components/ai/SmartContextWidget.test.tsx#L9-L17)
- [src/hooks/useAuth.ts](file://src/hooks/useAuth.ts#L31-L37)

## Conclusion

This guide outlined practical patterns for unit testing in this project:

- Use React Testing Library to render components in isolation
- Mock Next.js router and browser APIs globally
- Validate component behavior for rendering, interactions, and async flows
- Test API handlers with realistic inputs and storage fallbacks
- Validate custom hooks with deterministic state transitions and cleanup
- Maintain test isolation and reliability through targeted mocks and controlled environments

## Appendices

### Test Organization and Naming Conventions

- Place unit tests alongside source files under src/**tests**/unit with appropriate subfolders (components, hooks, api, lib).
- Name test files with a .test.ts or .test.tsx suffix and use descriptive describe blocks.
- Group related tests with it(...) statements that read like specifications.
- Keep tests self-contained; avoid cross-test dependencies.

[No sources needed since this section provides general guidance]
