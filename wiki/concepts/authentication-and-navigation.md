---
type: concept
title: Authentication and Navigation
status: stable
---

# Authentication and Navigation

## Session Lifecycle

`UserProvider` initializes the Supabase session, subscribes to auth-state changes, and loads profile data such as `plan_tier`. Route guards wait for this initialization before deciding whether to show an authenticated screen or redirect.

The Settings page exposes a local-device logout action. `UserContext.signOut` calls Supabase Auth with `scope: "local"`, so other devices stay signed in. Successful auth-state transition drives the existing native session teardown and account projection cleanup; cloud and legacy data are retained. Failures keep the session available for retry and expose a sanitized message to the UI.

Authentication state is not the same as authorization. The current `isPaid` behavior is intentionally permissive for compatibility and is not a trustworthy premium-access boundary.

## OAuth Across Browser and Desktop

- Supabase Auth uses PKCE with persisted sessions and token refresh.
- In Tauri, OAuth returns through the `slistening://auth/callback` deep link.
- The callback hook handles both cold-start URLs and URLs delivered while the application is already running.
- The service deduplicates in-flight and completed authorization-code exchanges to prevent repeated callback processing.
- Browser and desktop redirects differ; preserve both paths when changing callback behavior.

## Navigation Guards

`RequireAuth` protects application routes. `RedirectAuthenticated` keeps signed-in users out of login and registration screens. Intended destinations must pass the navigation helper, which accepts safe internal paths and rejects protocol-relative paths and auth-loop destinations.

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
