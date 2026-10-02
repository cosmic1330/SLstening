---
type: decision
title: "ADR 0002: Separate Durable and Live State"
status: stable
---

# ADR 0002: Separate Durable and Live State

## Context

The application combines identity, user-curated configuration, a provisioned relational local store, high-frequency quotes, and view preferences. These data classes have different lifetimes, write rates, ownership, and migration needs.

## Decision

Use separate state and persistence boundaries:

- Supabase session handling for identity and profile information.
- Zustand plus Tauri Store `settings.json` for durable tracked stocks, categories, selection, pins, and recency.
- A separate in-memory Zustand store for latest market ticks and freshness timestamps.
- Tauri SQL/SQLite migrations for schema-backed local records when that store is used.
- Feature-local browser or window persistence for view preferences where already implemented.

Choose a boundary from data lifetime and ownership; do not merge stores merely because features consume the same symbol.

## Alternatives

- **Persist the entire Zustand tree:** rejected because high-frequency market ticks would create unnecessary writes and migration burden.
- **Make Supabase canonical for all state:** not adopted because offline/local desktop state and the existing category model do not have a proven complete synchronization contract.
- **Put all local state in browser storage:** rejected because it weakens native persistence and relational migration boundaries.

## Consequences

- Durable store mutations must remain serialized and normalized for backward compatibility.
- Live market data is intentionally lost on restart and must expose loading/freshness state.
- Data crossing boundaries needs explicit synchronization rather than implicit shared state.
- Changing ownership or persistence strategy is an architectural decision that requires migration planning and a wiki update.

## Source Anchors

- [`src/context/UserContext.tsx`](../../src/context/UserContext.tsx)
- [`src/store/Stock.store.ts`](../../src/store/Stock.store.ts)
- [`src/store/MarketData.store.ts`](../../src/store/MarketData.store.ts)
- [`src-tauri/src/sqlite/migrations.rs`](../../src-tauri/src/sqlite/migrations.rs)
