---
type: concept
title: Authentication and Navigation
status: stable
---

# Authentication and Navigation

## Session Lifecycle

`UserProvider` initializes the Supabase session and subscribes to auth-state changes. Route guards wait for this initialization before deciding whether to show an authenticated screen or redirect.

The Settings page exposes a local-device logout action. `UserContext.signOut` calls Supabase Auth with `scope: "local"`, so other devices stay signed in. Successful auth-state transition drives the existing native session teardown and account projection cleanup; cloud data is retained. Failures keep the session available for retry and expose a sanitized message to the UI. The obsolete settings-file choice is independent of sign-out and is persisted in the new account-state store.

On desktop startup, the established native session claims the matching `account:<userId>:snapshot` cache before any PhoneApp request. Automatic cloud upload is an explicit per-account opt-in: startup never reads or compares cloud state. An enabled dirty local outbox may upload in the background; a clean cache remains local. Cloud data is read only after the user explicitly confirms “Restore from cloud”, which replaces cloud-represented stocks/categories while preserving local navigation and indicator preferences. Cloud requests use `uuid`/`email` and do not send an access token.

Desktop native-session transitions are strictly increasing within a WebView and begin at the current epoch for every WebView reload, so a surviving native `AccountManager` cannot reject a fresh UI as a stale transition. Native session failures shown in the retry notice are allowlisted diagnostic codes only; they are distinct from recoverable cloud-sync errors, which remain owned by `Stock.store`.

Local account edits enforce structural validity at their commit boundary, while the PhoneApp payload capacity remains a cloud-write constraint. An oversized local snapshot stays dirty, automatically turns upload off, and remains editable so the user can reduce it; upload never resumes until the user enables it again. Legacy dirty caches repair stocks that no category references before retrying the cloud write; any remaining structural invalidity stays local and is not sent.

Authentication state is not the same as authorization. Future authorization must be enforced by its authoritative backend/RLS boundary rather than inferred from a client session.

## OAuth Across Browser and Desktop

- Supabase Auth uses PKCE with persisted sessions and token refresh.
- In Tauri, OAuth returns through the `slistening://auth/callback` deep link.
- The callback hook handles both cold-start URLs and URLs delivered while the application is already running.
- The service deduplicates in-flight and completed authorization-code exchanges to prevent repeated callback processing.
- Browser and desktop redirects differ; preserve both paths when changing callback behavior.

## Navigation Guards

`RequireAuth` protects application routes. `RedirectAuthenticated` keeps signed-in users out of login and registration screens. Intended destinations must pass the navigation helper, which accepts safe internal paths and rejects protocol-relative paths and auth-loop destinations.

The authenticated Home shell has four bottom-navigation destinations: watchlist (`/dashboard`), market (`/dashboard/market`), MCP (`/dashboard/mcp`), and settings (`/dashboard/setting`). The MCP item includes a non-color status label and dot derived from the shared in-memory `mcp.store`: unavailable when the local gateway is absent, ready when it is available without a successful authenticated request in the last 60 seconds, and active when such activity is recent. BottomBar owns the immediate refresh and five-second polling lifecycle; the MCP page renders setup instructions and generated stdio configurations without exposing the bearer token.

## Authorization Caveat

Frontend publishable Supabase credentials are expected to be public. Real data authorization belongs in trusted server/database policy. The repository currently does not contain enough authoritative policy material to document its row-level security behavior, so do not infer those guarantees from UI guards.

## Change Checklist

- Test signed-out, initializing, signed-in, OAuth-error, and profile-load failure states.
- Verify both browser and Tauri deep-link callback paths.
- Keep redirect destinations internal and loop-free.
- Treat plan enforcement or database policy changes as security-sensitive architecture work and document the actual trusted boundary.
- Keep local logout behavior centralized in `UserContext`; do not clear account data as part of sign-out.

## Source Anchors

- [`src/context/UserContext.tsx`](../../src/context/UserContext.tsx)
- [`src/auth/service.ts`](../../src/auth/service.ts)
- [`src/auth/navigation.ts`](../../src/auth/navigation.ts)
- [`src/auth/useTauriOAuthCallback.ts`](../../src/auth/useTauriOAuthCallback.ts)
- [`src/supabase.ts`](../../src/supabase.ts)
- [`src/App.tsx`](../../src/App.tsx)
- [`src/pages/Home/layout/BottomBar.tsx`](../../src/pages/Home/layout/BottomBar.tsx)
- [`src/pages/Home/Mcp/index.tsx`](../../src/pages/Home/Mcp/index.tsx)
- [`src/store/mcp.store.ts`](../../src/store/mcp.store.ts)
