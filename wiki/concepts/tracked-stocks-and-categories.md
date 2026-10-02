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

`Stock.store` serializes durable changes through a mutation queue before writing Tauri Store `settings.json`. Preserve serialization when adding mutations; overlapping read-modify-write operations can otherwise lose data.

The store also contains Supabase helpers for `watch_stock`, but the current code does not establish Supabase as the canonical source for the complete category model. Do not assume two-way synchronization without implementing and documenting an explicit contract.

## Change Checklist

- Preserve old stored data through reload normalization or an explicit migration.
- Update every dependent reference when changing category identity or deletion behavior.
- Keep list keys stable and selectors narrow so live quote updates do not rerender the full watchlist.
- Run frontend tests and, for persistence or shared-contract changes, `npm run test:all`.

## Source Anchors

- [`src/store/Stock.store.ts`](../../src/store/Stock.store.ts)
- [`src/types.ts`](../../src/types.ts)
- [`src-tauri/tauri.conf.json`](../../src-tauri/tauri.conf.json)
