---
type: concept
title: Market Data Lifecycle
status: stable
---

# Market Data Lifecycle

## End-to-End Flow

1. A visible, enabled stock card requests `subscribe_stock` after a short frontend debounce; hiding or unmounting it cancels a pending request or unsubscribes an active one.
2. Rust tracks subscriptions and performs coalesced, batched, paced requests with retry and cache behavior appropriate to provider limits.
3. Rust emits `market-update` payloads for subscribed symbols.
4. The single authenticated runtime listener converts the native payload to the frontend tick type and updates `MarketData.store`.
5. Components select only the symbol data they need and render freshness/loading/error states without persisting the tick stream.
6. One-shot detail data uses `get_market_data`; chip data uses the separate `get_chip_data` command and its own cache path.

## Contract Boundaries

- `subscribe_stock`, `unsubscribe_stock`, `get_market_data`, `get_chip_data`, `market-update`, and `api-blocked` are cross-language contracts.
- Validate stock identity, finite numeric values, aligned history arrays, and timestamp/freshness meaning at boundaries.
- Preserve Taiwan market semantics: red means rising and green means falling, with a non-color cue for direction.

## Performance Rules

- Keep one event listener for the authenticated application runtime rather than one listener per card.
- Keep live ticks in the in-memory market store; do not write each update to durable storage.
- Maintain visibility-aware subscriptions and stable list keys.
- Treat native pacing, batching, coalescing, retries, and cache behavior as correctness constraints, not incidental constants.

## Change Checklist

- Inspect TypeScript and Rust together for command, event, or payload changes.
- Exercise subscription cleanup and symbol switching, not only the happy path.
- Confirm populated, loading, empty, stale, and error states where applicable.
- Run `npm run test:all` for native or shared-contract changes.

## Source Anchors

- [`src/hooks/useMarketSubscriber.ts`](../../src/hooks/useMarketSubscriber.ts)
- [`src/hooks/useMarketWatcher.ts`](../../src/hooks/useMarketWatcher.ts)
- [`src/api/marketApi.ts`](../../src/api/marketApi.ts)
- [`src/store/MarketData.store.ts`](../../src/store/MarketData.store.ts)
- [`src-tauri/src/market_watcher.rs`](../../src-tauri/src/market_watcher.rs)
- [`src-tauri/src/commands/market.rs`](../../src-tauri/src/commands/market.rs)
- [`src-tauri/src/lib.rs`](../../src-tauri/src/lib.rs)
