---
type: decision
title: "ADR 0001: Native Market Data Boundary"
status: stable
---

# ADR 0001: Native Market Data Boundary

## Context

SLstening displays frequently changing Taiwan and US market data inside a desktop webview. Provider rate limits, request pacing, retry behavior, subscription lifetime, and native application lifecycle must remain consistent even when many React components are visible.

## Decision

Rust owns external market-data scheduling, coalescing, batching, pacing, retry, and native caching. React owns visibility-aware subscription intent, command invocation, event consumption, freshness state, and rendering. A single listener in the authenticated runtime writes `market-update` data to the in-memory market store.

Tauri commands and events form the explicit boundary between those responsibilities.

## Alternatives

- **Poll providers directly from React:** rejected because component lifecycles would fragment throttling, caching, and failure handling.
- **Stream every known symbol continuously:** rejected because it ignores visibility and subscription demand and increases provider pressure.
- **Let each feature own an independent native listener:** rejected because duplicate listeners complicate cleanup and multiply work.

## Consequences

- Cross-language payload changes require coordinated TypeScript and Rust changes plus shared-contract validation.
- Native scheduling behavior is part of correctness and must not be bypassed by new frontend fetch paths.
- The frontend can remain responsive by selecting per-symbol in-memory state rather than persisting or globally rerendering each tick.
- Debugging a quote may require tracing subscription intent, native scheduling, the emitted event, and store ingestion.

## Source Anchors

- [`src/layout/AuthenticatedRuntime.tsx`](../../src/layout/AuthenticatedRuntime.tsx)
- [`src/hooks/useMarketSubscriber.ts`](../../src/hooks/useMarketSubscriber.ts)
- [`src/hooks/useMarketWatcher.ts`](../../src/hooks/useMarketWatcher.ts)
- [`src-tauri/src/market_watcher.rs`](../../src-tauri/src/market_watcher.rs)
- [`src-tauri/src/commands/market.rs`](../../src-tauri/src/commands/market.rs)
- [`src-tauri/src/lib.rs`](../../src-tauri/src/lib.rs)
