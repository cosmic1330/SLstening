---
type: concept
title: Tracked Stocks and Categories
status: stable
---

# Tracked Stocks and Categories

## Why This Matters

The watchlist is durable user configuration, not a projection of live market data. Category membership, ordering, selection, pinning, and recency must remain coherent across reloads and migrations from older stored shapes.

## Model and Invariants

- The default category ID is `default-watchlist` and it remains first.
- Stock identity must be stable; category and stock IDs are the relationships persisted by the store.
- Custom category names are trimmed and compared case-insensitively for uniqueness.
- Deleting or normalizing categories must repair active, pinned, and recent category references.
- A stock with no remaining category membership is removed rather than kept as an orphan.
- Pinned categories are capped at five.

Normalization during reload is part of backward compatibility. Do not replace it with an unchecked deserialize-and-use path.

## Persistence Boundary

`Stock.store` serializes durable changes through a mutation queue. In the authenticated desktop runtime, each complete snapshot is validated and sent through native account commands to the Google Sheet Web App with an expected revision. A stale revision is surfaced as a conflict and never overwritten. A namespaced local cache and the original unscoped settings are retained only for recovery and explicit one-time import.

The store also contains Supabase helpers for `watch_stock`, but those compatibility paths do not define category membership. The account snapshot is keyed by the server-verified Supabase `user.id`; email is display metadata only.

## Change Checklist

- Preserve old stored data through reload normalization or an explicit migration.
- Update every dependent reference when changing category identity or deletion behavior.
- Keep list keys stable and selectors narrow so live quote updates do not rerender the full watchlist.
- Run frontend tests and, for persistence or shared-contract changes, `npm run test:all`.

## Source Anchors

- [`src/store/Stock.store.ts`](../../src/store/Stock.store.ts)
- [`src/types.ts`](../../src/types.ts)
- [`src-tauri/tauri.conf.json`](../../src-tauri/tauri.conf.json)
