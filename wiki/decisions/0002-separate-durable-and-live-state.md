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
- Zustand as the account projection. Authenticated desktop writes durable stocks, categories, and memberships through native account commands to the PhoneApp Google Sheet row keyed by the Supabase `user.id`. The cloud wire format is the strict PhoneApp-compatible ordered `WatchlistGroup[]` data string; legacy desktop snapshots are rejected. PhoneApp sync is last-write-wins and has no revision/operation-id protocol. Active/recent category navigation and pinned order are kept in `account-state.json`, indicator settings in `preferences.json`, and the device catalog in `catalog.json`; none are sent through cloud sync.
- A separate in-memory Zustand store for latest market ticks and freshness timestamps.
- No relational local database is initialized by the app. Account data uses the Google Sheet, Tauri Store provides local recovery, and live market data remains in memory.
- Feature-local browser or window persistence for view preferences where already implemented.

The obsolete app-data `settings.json` is outside every normal persistence path.
If it is present, the app offers one localized, explicit keep/delete decision;
it never reads the old values and records the disposition in
`account-state.json`.

Choose a boundary from data lifetime and ownership; do not merge stores merely because features consume the same symbol.

## Alternatives

- **Persist the entire Zustand tree:** rejected because high-frequency market ticks would create unnecessary writes and migration burden.
- **Make Supabase canonical for all state:** not adopted for this MVP because the requested shared storage is the existing PhoneApp Google Sheet endpoint; the Web App uses the caller's uuid/email identity and optional shared token posture.
- **Put all local state in browser storage:** rejected because it weakens native persistence and local recovery boundaries.

## Consequences

- Durable store mutations remain serialized and normalized. Local navigation writes use the account-state queue, while indicator writes use the shared Rust preference manager so frontend and agent updates cannot overwrite one another. Neither path blocks the UI or issues a cloud write.
- Live market data is intentionally lost on restart and must expose loading/freshness state.
- Data crossing boundaries needs explicit synchronization rather than implicit shared state.
- Existing `schoice.db` files are outside the current persistence contract; the app leaves them in place but does not create or read them.

## Source Anchors

- [`src/context/UserContext.tsx`](../../src/context/UserContext.tsx)
- [`src/store/Stock.store.ts`](../../src/store/Stock.store.ts)
- [`src/store/MarketData.store.ts`](../../src/store/MarketData.store.ts)
