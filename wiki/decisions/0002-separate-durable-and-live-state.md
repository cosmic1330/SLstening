---
type: decision
title: "ADR 0002: Separate Durable and Live State"
status: stable
---

# ADR 0002: Separate Durable and Live State

## Context

The application combines identity, user-curated configuration, high-frequency quotes, and view preferences. These data classes have different lifetimes, write rates, ownership, and migration needs.

## Decision

Use separate state and persistence boundaries:

- Supabase session handling for identity and profile information.
- Zustand as the account projection; authenticated desktop writes complete snapshots through native account commands to the Google Sheet `SLstening_UserData` row keyed by the verified Supabase user ID. A namespaced Tauri Store cache and the old global keys are retained only for local recovery and explicit one-time import.
- A separate in-memory Zustand store for latest market ticks and freshness timestamps.
- No relational local database is initialized by the app. Account data uses the Google Sheet, Tauri Store provides local recovery, and live market data remains in memory.
- Feature-local browser or window persistence for view preferences where already implemented.

Choose a boundary from data lifetime and ownership; do not merge stores merely because features consume the same symbol.

## Alternatives

- **Persist the entire Zustand tree:** rejected because high-frequency market ticks would create unnecessary writes and migration burden.
- **Make Supabase canonical for all state:** not adopted for this MVP because the requested shared storage is the existing Google Sheet endpoint; the native repository still verifies Supabase identity before every cloud operation.
- **Put all local state in browser storage:** rejected because it weakens native persistence and local recovery boundaries.

## Consequences

- Durable store mutations must remain serialized and normalized for backward compatibility.
- Live market data is intentionally lost on restart and must expose loading/freshness state.
- Data crossing boundaries needs explicit synchronization rather than implicit shared state.
- Existing `schoice.db` files are outside the current persistence contract; the app leaves them in place but does not create or read them.

## Source Anchors

- [`src/context/UserContext.tsx`](../../src/context/UserContext.tsx)
- [`src/store/Stock.store.ts`](../../src/store/Stock.store.ts)
- [`src/store/MarketData.store.ts`](../../src/store/MarketData.store.ts)
