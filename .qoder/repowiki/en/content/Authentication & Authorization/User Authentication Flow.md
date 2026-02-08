# User Authentication Flow

<cite>
**Referenced Files in This Document**
- [AuthContext.tsx](file://src/contexts/AuthContext.tsx)
- [useAuth.ts](file://src/hooks/useAuth.ts)
- [supabase.ts](file://src/lib/supabase.ts)
- [client.ts](file://src/utils/supabase/client.ts)
- [server.ts](file://src/utils/supabase/server.ts)
- [middleware.ts](file://src/middleware.ts)
- [login/page.tsx](file://src/app/login/page.tsx)
- [signup/page.tsx](file://src/app/signup/page.tsx)
- [reset-password/page.tsx](file://src/app/reset-password/page.tsx)
- [layout.tsx](file://src/app/layout.tsx)
- [admin/layout.tsx](file://src/app/admin/layout.tsx)
- [admin/page.tsx](file://src/app/admin/page.tsx)
</cite>

## Table of Contents

1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Security Considerations](#security-considerations)
9. [Troubleshooting Guide](#troubleshooting-guide)
10. [Practical Implementation Examples](#practical-implementation-examples)
11. [Conclusion](#conclusion)

## Introduction

This document provides comprehensive documentation for the user authentication flow in Opttius, covering the complete lifecycle from login/signup to session management and password reset. It explains the AuthContext provider implementation, authentication state management, and user session handling, including integration with Supabase Auth for JWT token management, automatic session refresh, and secure cookie handling. The guide also covers authentication guards, redirect mechanisms, protected route handling, and security considerations such as CSRF protection, session timeout handling, and secure password storage. Practical examples demonstrate authentication usage across different scenarios, along with troubleshooting common authentication issues.

## Project Structure

Opttius implements authentication using a layered architecture:

- Supabase client utilities for browser and server environments
- A custom React context and hook for centralized authentication state
- Page-level authentication flows for login, signup, and password reset
- Middleware-based route protection for admin areas
- Admin layout with role-based access control and organization verification

```mermaid
graph TB
subgraph "Client Layer"
A["AuthContext Provider<br/>AuthProvider"]
B["useAuth Hook<br/>AuthState + Actions"]
C["Login Page<br/>signIn + redirects"]
D["Signup Page<br/>signUp + confirmation flow"]
E["Reset Password Page<br/>resetPassword + update"]
end
subgraph "Supabase Integration"
F["createClient()<br/>Browser Client"]
G["createServiceRoleClient()<br/>Service Role Client"]
H["createClientFromRequest()<br/>Server Client"]
end
subgraph "Middleware & Guards"
I["middleware.ts<br/>Route Protection"]
J["Admin Layout<br/>Role + Org Checks"]
end
A --> B
C --> B
D --> B
E --> B
B --> F
I --> J
J --> H
```

**Diagram sources**

- [AuthContext.tsx](file://src/contexts/AuthContext.tsx#L28-L36)
- [useAuth.ts](file://src/hooks/useAuth.ts#L18-L376)
- [client.ts](file://src/utils/supabase/client.ts#L3-L8)
- [server.ts](file://src/utils/supabase/server.ts#L6-L33)
- [middleware.ts](file://src/middleware.ts#L14-L95)
- [admin/layout.tsx](file://src/app/admin/layout.tsx#L165-L800)

**Section sources**

- [AuthContext.tsx](file://src/contexts/AuthContext.tsx#L1-L71)
- [useAuth.ts](file://src/hooks/useAuth.ts#L1-L377)
- [client.ts](file://src/utils/supabase/client.ts#L1-L8)
- [server.ts](file://src/utils/supabase/server.ts#L1-L110)
- [middleware.ts](file://src/middleware.ts#L1-L109)
- [admin/layout.tsx](file://src/app/admin/layout.tsx#L1-L1200)

## Core Components

This section details the core authentication components and their responsibilities.

- AuthContext Provider
  - Wraps the application with authentication state and exposes convenient hooks for authentication actions and profile access.
  - Provides sign-up, sign-in, sign-out, profile updates, and password reset capabilities.

- useAuth Hook
  - Centralizes authentication state management with loading, error, user, profile, and session fields.
  - Implements Supabase auth listeners for automatic session refresh and state synchronization.
  - Handles profile fetching with timeouts and graceful error handling for missing profiles.

- Supabase Clients
  - Browser client creation for client-side operations with auto-refresh and persisted sessions.
  - Service role client for server-side operations bypassing Row Level Security.
  - Server client creation supporting cookie-based and Bearer token authentication for API routes.

- Middleware and Admin Guards
  - Route protection middleware checks for authentication cookies and redirects unauthenticated users to login.
  - Admin layout performs role and organization verification, with safeguards against race conditions and redundant checks.

**Section sources**

- [AuthContext.tsx](file://src/contexts/AuthContext.tsx#L28-L71)
- [useAuth.ts](file://src/hooks/useAuth.ts#L18-L376)
- [supabase.ts](file://src/lib/supabase.ts#L1-L36)
- [client.ts](file://src/utils/supabase/client.ts#L1-L8)
- [server.ts](file://src/utils/supabase/server.ts#L1-L110)
- [middleware.ts](file://src/middleware.ts#L14-L95)
- [admin/layout.tsx](file://src/app/admin/layout.tsx#L501-L732)

## Architecture Overview

The authentication architecture integrates Supabase Auth with Next.js routing and middleware to provide seamless user experiences and robust security.

```mermaid
sequenceDiagram
participant Client as "Client App"
participant AuthHook as "useAuth Hook"
participant Supabase as "Supabase Client"
participant Server as "Server Client"
participant Middleware as "Middleware"
participant AdminLayout as "Admin Layout"
Client->>AuthHook : Initialize auth state
AuthHook->>Supabase : getSession()
Supabase-->>AuthHook : Session data
AuthHook->>Supabase : onAuthStateChange(listener)
Note over AuthHook,Supabase : Automatic token refresh and session updates
Client->>AuthHook : signIn(email, password)
AuthHook->>Supabase : auth.signInWithPassword()
Supabase-->>AuthHook : Auth result
AuthHook-->>Client : Auth state updated
Client->>Middleware : Navigate to protected route
Middleware->>Server : Verify auth cookie
Server-->>Middleware : Auth status
Middleware-->>Client : Allow or redirect to login
Client->>AdminLayout : Access admin area
AdminLayout->>Server : Check admin role + org status
Server-->>AdminLayout : Role + org data
AdminLayout-->>Client : Render protected content
```

**Diagram sources**

- [useAuth.ts](file://src/hooks/useAuth.ts#L27-L130)
- [client.ts](file://src/utils/supabase/client.ts#L3-L8)
- [server.ts](file://src/utils/supabase/server.ts#L43-L91)
- [middleware.ts](file://src/middleware.ts#L42-L92)
- [admin/layout.tsx](file://src/app/admin/layout.tsx#L501-L732)

## Detailed Component Analysis

### AuthContext Provider and Hooks

The AuthContext provider exposes a typed authentication context and convenient hooks for authentication actions and profile access.

```mermaid
classDiagram
class AuthContextType {
+user : User | null
+profile : Profile | null
+session : Session | null
+loading : boolean
+error : AuthError | null
+signUp(email, password, userData) Promise
+signIn(email, password) Promise
+signOut() Promise
+updateProfile(updates) Promise
+resetPassword(email) Promise
+refetchProfile() Promise
}
class AuthProvider {
+children : ReactNode
+render() ReactNode
}
class useAuthContext {
+return : AuthContextType
}
class useRequireAuth {
+user : User | null
+loading : boolean
+isAuthenticated : boolean
+isLoading : boolean
}
class useProfile {
+profile : Profile | null
+user : User | null
+loading : boolean
+hasProfile : boolean
+isProfileLoading : boolean
}
AuthProvider --> AuthContextType : "provides"
useAuthContext --> AuthContextType : "returns"
useRequireAuth --> AuthContextType : "reads"
useProfile --> AuthContextType : "reads"
```

**Diagram sources**

- [AuthContext.tsx](file://src/contexts/AuthContext.tsx#L9-L20)
- [AuthContext.tsx](file://src/contexts/AuthContext.tsx#L28-L46)
- [AuthContext.tsx](file://src/contexts/AuthContext.tsx#L49-L71)

**Section sources**

- [AuthContext.tsx](file://src/contexts/AuthContext.tsx#L1-L71)

### Authentication State Management with useAuth

The useAuth hook manages authentication state, integrates with Supabase auth listeners, and provides actions for user operations.

```mermaid
flowchart TD
Start(["Initialize useAuth"]) --> GetSession["Get Initial Session"]
GetSession --> SetLoading["Set loading = true"]
SetLoading --> Subscribe["Subscribe to onAuthStateChange"]
Subscribe --> Event{"Auth Event"}
Event --> |SIGNED_IN| FetchProfile["Fetch User Profile"]
Event --> |SIGNED_OUT| ClearState["Clear Auth State"]
Event --> |TOKEN_REFRESHED| UpdateSession["Update Session in State"]
FetchProfile --> SetState["Set Auth State with User + Profile"]
ClearState --> End(["Idle"])
UpdateSession --> End
SetState --> End
```

**Diagram sources**

- [useAuth.ts](file://src/hooks/useAuth.ts#L27-L130)
- [useAuth.ts](file://src/hooks/useAuth.ts#L132-L192)

**Section sources**

- [useAuth.ts](file://src/hooks/useAuth.ts#L18-L376)

### Supabase Client Utilities

Supabase client utilities provide consistent client creation across browser and server environments with appropriate authentication configurations.

```mermaid
classDiagram
class SupabaseClient {
+createClient() : SupabaseClient
+autoRefreshToken : boolean
+persistSession : boolean
+detectSessionInUrl : boolean
}
class ServiceRoleClient {
+createServiceRoleClient() : SupabaseClient
+autoRefreshToken : false
+persistSession : false
}
class ServerClient {
+createClient() : SupabaseClient
+createClientFromRequest(request) : {client, getUser}
+createServiceRoleClient() : SupabaseClient
}
SupabaseClient <.. ServiceRoleClient : "configured differently"
SupabaseClient <.. ServerClient : "configured differently"
```

**Diagram sources**

- [supabase.ts](file://src/lib/supabase.ts#L11-L17)
- [supabase.ts](file://src/lib/supabase.ts#L20-L33)
- [server.ts](file://src/utils/supabase/server.ts#L6-L33)
- [server.ts](file://src/utils/supabase/server.ts#L43-L91)
- [server.ts](file://src/utils/supabase/server.ts#L95-L110)

**Section sources**

- [supabase.ts](file://src/lib/supabase.ts#L1-L36)
- [client.ts](file://src/utils/supabase/client.ts#L1-L8)
- [server.ts](file://src/utils/supabase/server.ts#L1-L110)

### Login Flow

The login flow validates credentials, authenticates via Supabase, determines user roles and onboarding requirements, and redirects appropriately.

```mermaid
sequenceDiagram
participant User as "User"
participant LoginPage as "Login Page"
participant AuthHook as "useAuth.signIn"
participant Supabase as "Supabase Client"
participant RPC as "RPC Functions"
participant Router as "Next Router"
User->>LoginPage : Submit login form
LoginPage->>AuthHook : signIn(email, password)
AuthHook->>Supabase : auth.signInWithPassword()
Supabase-->>AuthHook : Auth result
AuthHook-->>LoginPage : Auth state updated
LoginPage->>Supabase : auth.getUser()
LoginPage->>RPC : is_admin(user_id)
RPC-->>LoginPage : isAdmin flag
LoginPage->>RPC : admin_users lookup
RPC-->>LoginPage : adminUser data
alt Needs Onboarding
LoginPage->>Router : Redirect to /onboarding/choice
else Is Root/Dev
LoginPage->>Router : Redirect to /admin/saas-management/dashboard
else Is Admin
LoginPage->>Router : Redirect to /admin
else Regular User
LoginPage->>Router : Redirect to /profile
end
```

**Diagram sources**

- [login/page.tsx](file://src/app/login/page.tsx#L87-L241)
- [useAuth.ts](file://src/hooks/useAuth.ts#L267-L296)

**Section sources**

- [login/page.tsx](file://src/app/login/page.tsx#L1-L508)

### Signup Flow

The signup flow creates a new user, handles email confirmation requirements, and guides users through onboarding or immediate redirection.

```mermaid
flowchart TD
Start(["User submits signup form"]) --> CallSignUp["Call useAuth.signUp()"]
CallSignUp --> SupabaseSignUp["Supabase auth.signUp()"]
SupabaseSignUp --> AnalyzeUser["Analyze user timestamps"]
AnalyzeUser --> CheckEmailConf["Check email confirmation status"]
CheckEmailConf --> |New User| RequireConfirmation["Require email confirmation"]
CheckEmailConf --> |Existing Confirmed| ExistingUser["Existing confirmed user"]
RequireConfirmation --> ShowConfirmation["Show confirmation message"]
ExistingUser --> ShowRedirect["Redirect to onboarding"]
ShowConfirmation --> SignOut["Sign out user to prevent auto-redirect"]
SignOut --> End(["Done"])
ShowRedirect --> End
```

**Diagram sources**

- [signup/page.tsx](file://src/app/signup/page.tsx#L115-L254)
- [useAuth.ts](file://src/hooks/useAuth.ts#L194-L265)

**Section sources**

- [signup/page.tsx](file://src/app/signup/page.tsx#L1-L734)

### Password Reset Flow

The password reset flow supports requesting password reset emails and updating passwords securely.

```mermaid
sequenceDiagram
participant User as "User"
participant ResetPage as "Reset Password Page"
participant AuthHook as "useAuth.resetPassword"
participant Supabase as "Supabase Client"
User->>ResetPage : Enter email and submit
ResetPage->>AuthHook : resetPassword(email)
AuthHook->>Supabase : auth.resetPasswordForEmail()
Supabase-->>AuthHook : Reset initiated
AuthHook-->>ResetPage : Success
User->>ResetPage : Click recovery link
ResetPage->>Supabase : Listen for PASSWORD_RECOVERY
ResetPage->>Supabase : updateUser({password})
Supabase-->>ResetPage : Password updated
ResetPage-->>User : Redirect to login
```

**Diagram sources**

- [reset-password/page.tsx](file://src/app/reset-password/page.tsx#L105-L135)
- [useAuth.ts](file://src/hooks/useAuth.ts#L338-L364)

**Section sources**

- [reset-password/page.tsx](file://src/app/reset-password/page.tsx#L1-L423)

### Middleware-Based Authentication Guards

Middleware enforces authentication for protected routes by checking for authentication cookies and redirecting unauthorized users.

```mermaid
flowchart TD
Request["Incoming Request"] --> CheckExcluded["Check excluded paths"]
CheckExcluded --> |Excluded| Allow["Allow request"]
CheckExcluded --> |Not Excluded| CheckAdmin["Check /admin routes"]
CheckAdmin --> |Not /admin| Allow
CheckAdmin --> |/admin| ExtractCookie["Extract auth cookie"]
ExtractCookie --> HasCookie{"Has auth cookie?"}
HasCookie --> |No| Redirect["Redirect to /login"]
HasCookie --> |Yes| Allow
```

**Diagram sources**

- [middleware.ts](file://src/middleware.ts#L14-L95)

**Section sources**

- [middleware.ts](file://src/middleware.ts#L1-L109)

### Admin Layout Role and Organization Verification

The admin layout performs role and organization verification with safeguards against race conditions and redundant checks.

```mermaid
flowchart TD
LoadAdminLayout["Load Admin Layout"] --> CheckAuth["Check auth state"]
CheckAuth --> |Loading| ShowLoading["Show loading state"]
CheckAuth --> |Loaded| CheckAdmin["Check admin role via RPC"]
CheckAdmin --> AdminResult{"Is admin?"}
AdminResult --> |No| RedirectLogin["Redirect to /login"]
AdminResult --> |Yes| CheckOrg["Check organization status"]
CheckOrg --> OrgResult{"Has organization?"}
OrgResult --> |No & Not Root| RedirectOnboarding["Redirect to onboarding"]
OrgResult --> |Yes| Render["Render admin content"]
```

**Diagram sources**

- [admin/layout.tsx](file://src/app/admin/layout.tsx#L501-L732)

**Section sources**

- [admin/layout.tsx](file://src/app/admin/layout.tsx#L1-L1200)

## Dependency Analysis

This section analyzes dependencies between authentication components and their relationships.

```mermaid
graph TB
AuthContext["AuthContext.tsx"] --> useAuth["useAuth.ts"]
useAuth --> SupabaseClient["client.ts"]
useAuth --> SupabaseLib["supabase.ts"]
LoginPage["login/page.tsx"] --> AuthContext
LoginPage --> useAuth
SignupPage["signup/page.tsx"] --> AuthContext
SignupPage --> useAuth
ResetPage["reset-password/page.tsx"] --> AuthContext
ResetPage --> useAuth
Middleware["middleware.ts"] --> ServerClient["server.ts"]
AdminLayout["admin/layout.tsx"] --> ServerClient
AdminLayout --> AuthContext
RootLayout["layout.tsx"] --> AuthContext
```

**Diagram sources**

- [AuthContext.tsx](file://src/contexts/AuthContext.tsx#L1-L71)
- [useAuth.ts](file://src/hooks/useAuth.ts#L1-L377)
- [client.ts](file://src/utils/supabase/client.ts#L1-L8)
- [supabase.ts](file://src/lib/supabase.ts#L1-L36)
- [login/page.tsx](file://src/app/login/page.tsx#L1-L508)
- [signup/page.tsx](file://src/app/signup/page.tsx#L1-L734)
- [reset-password/page.tsx](file://src/app/reset-password/page.tsx#L1-L423)
- [middleware.ts](file://src/middleware.ts#L1-L109)
- [server.ts](file://src/utils/supabase/server.ts#L1-L110)
- [admin/layout.tsx](file://src/app/admin/layout.tsx#L1-L1200)
- [layout.tsx](file://src/app/layout.tsx#L30-L55)

**Section sources**

- [AuthContext.tsx](file://src/contexts/AuthContext.tsx#L1-L71)
- [useAuth.ts](file://src/hooks/useAuth.ts#L1-L377)
- [client.ts](file://src/utils/supabase/client.ts#L1-L8)
- [supabase.ts](file://src/lib/supabase.ts#L1-L36)
- [login/page.tsx](file://src/app/login/page.tsx#L1-L508)
- [signup/page.tsx](file://src/app/signup/page.tsx#L1-L734)
- [reset-password/page.tsx](file://src/app/reset-password/page.tsx#L1-L423)
- [middleware.ts](file://src/middleware.ts#L1-L109)
- [server.ts](file://src/utils/supabase/server.ts#L1-L110)
- [admin/layout.tsx](file://src/app/admin/layout.tsx#L1-L1200)
- [layout.tsx](file://src/app/layout.tsx#L30-L55)

## Performance Considerations

- Session Initialization Timeout: The useAuth hook applies a 10-second timeout for session initialization to prevent indefinite loading states.
- Profile Fetch Timeout: Profile retrieval includes an 8-second timeout to handle slow connections and new users without blocking the UI.
- Auth State Change Listener: Uses Supabase's onAuthStateChange to keep state synchronized without manual polling.
- Middleware Optimization: Middleware checks are scoped to specific paths (/admin) and use cookie extraction to minimize overhead.
- Admin Layout Debouncing: Prevents redundant admin checks by tracking checked user IDs and using atomic state updates.

[No sources needed since this section provides general guidance]

## Security Considerations

- Secure Cookie Handling: Supabase Auth uses secure cookies with automatic refresh and persistence configured in the Supabase client.
- CSRF Protection: Supabase Auth inherently mitigates CSRF risks through secure cookie management and token-based authentication.
- Session Timeout Handling: Automatic token refresh is enabled to maintain session validity without manual intervention.
- Password Storage: Passwords are handled server-side by Supabase; client-side flows focus on authentication and session management.
- Protected Routes: Middleware enforces authentication for protected routes, redirecting unauthorized users to the login page.
- Role-Based Access Control: Admin layout verifies user roles and organization membership before rendering protected content.

**Section sources**

- [supabase.ts](file://src/lib/supabase.ts#L11-L17)
- [middleware.ts](file://src/middleware.ts#L42-L92)
- [admin/layout.tsx](file://src/app/admin/layout.tsx#L501-L732)

## Troubleshooting Guide

Common authentication issues and their resolutions:

- Authentication Initialization Timeout
  - Symptom: Loading spinner remains indefinitely on login/signup pages.
  - Cause: Supabase session initialization taking longer than expected.
  - Resolution: The useAuth hook applies a 10-second timeout and sets loading to false if exceeded.

- Profile Fetch Timeout
  - Symptom: Users can log in but profile data does not load immediately.
  - Cause: Network latency or missing profile for new users.
  - Resolution: The useAuth hook applies an 8-second timeout and logs warnings; profile loading continues asynchronously.

- Admin Check Failures
  - Symptom: Admin users redirected to login unexpectedly.
  - Cause: Race conditions or rapid token refresh events.
  - Resolution: Admin layout tracks checked user IDs and uses atomic state updates to prevent redundant checks.

- Middleware Redirect Loops
  - Symptom: Infinite redirects between login and admin pages.
  - Cause: Missing or invalid auth cookies.
  - Resolution: Middleware extracts auth cookies and redirects to login when absent; ensure cookies are properly set.

- Password Reset Issues
  - Symptom: Recovery email not received or password update fails.
  - Cause: Incorrect email or expired reset link.
  - Resolution: Verify email address and ensure the recovery link is clicked; the reset page listens for PASSWORD_RECOVERY events.

**Section sources**

- [useAuth.ts](file://src/hooks/useAuth.ts#L32-L91)
- [useAuth.ts](file://src/hooks/useAuth.ts#L132-L192)
- [admin/layout.tsx](file://src/app/admin/layout.tsx#L544-L649)
- [middleware.ts](file://src/middleware.ts#L71-L80)
- [reset-password/page.tsx](file://src/app/reset-password/page.tsx#L82-L95)

## Practical Implementation Examples

Below are practical examples demonstrating authentication usage across different scenarios:

- Using AuthContext in Components
  - Access authentication state and actions via the provided hooks.
  - Example paths:
    - [AuthContext Provider](file://src/contexts/AuthContext.tsx#L28-L36)
    - [useRequireAuth Hook](file://src/contexts/AuthContext.tsx#L49-L58)
    - [useProfile Hook](file://src/contexts/AuthContext.tsx#L61-L71)

- Implementing Login in Pages
  - Handle form submission, call signIn, and manage redirects based on user roles.
  - Example path: [Login Page](file://src/app/login/page.tsx#L87-L241)

- Implementing Signup with Confirmation
  - Manage new user creation, email confirmation requirements, and onboarding redirection.
  - Example path: [Signup Page](file://src/app/signup/page.tsx#L115-L254)

- Handling Password Reset
  - Request reset emails and update passwords securely.
  - Example path: [Reset Password Page](file://src/app/reset-password/page.tsx#L105-L135)

- Protecting Admin Routes
  - Use middleware and admin layout for role-based access control.
  - Example paths:
    - [Middleware](file://src/middleware.ts#L42-L92)
    - [Admin Layout](file://src/app/admin/layout.tsx#L501-L732)

- Accessing Supabase Clients
  - Use browser client for client-side operations and service role client for server-side bypass.
  - Example paths:
    - [Browser Client](file://src/utils/supabase/client.ts#L3-L8)
    - [Service Role Client](file://src/lib/supabase.ts#L20-L33)
    - [Server Client](file://src/utils/supabase/server.ts#L6-L33)

**Section sources**

- [AuthContext.tsx](file://src/contexts/AuthContext.tsx#L28-L71)
- [login/page.tsx](file://src/app/login/page.tsx#L87-L241)
- [signup/page.tsx](file://src/app/signup/page.tsx#L115-L254)
- [reset-password/page.tsx](file://src/app/reset-password/page.tsx#L105-L135)
- [middleware.ts](file://src/middleware.ts#L42-L92)
- [admin/layout.tsx](file://src/app/admin/layout.tsx#L501-L732)
- [client.ts](file://src/utils/supabase/client.ts#L3-L8)
- [supabase.ts](file://src/lib/supabase.ts#L20-L33)
- [server.ts](file://src/utils/supabase/server.ts#L6-L33)

## Conclusion

Opttius implements a robust and secure authentication system leveraging Supabase Auth for JWT token management, automatic session refresh, and secure cookie handling. The AuthContext provider and useAuth hook centralize authentication state management, while page-level flows for login, signup, and password reset provide seamless user experiences. Middleware and admin layout enforce authentication and role-based access control, protecting sensitive routes and data. The system includes comprehensive error handling, performance optimizations, and security measures to ensure reliable operation across diverse scenarios.
