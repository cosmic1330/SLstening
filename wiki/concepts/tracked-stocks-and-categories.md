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

Legacy import reads the device-wide `settings.json` stocks first and then resolves IDs referenced by every category against the shared local `menu` catalog. The resolved union is uploaded, while the full menu remains device-shared and reconstructable. Unresolved IDs are retained as a visible warning. If a locally claimed account was imported by a version that dropped those memberships, the same account receives a dismissible repair dialog with repair, keep-current, and decide-later choices. Repair merges missing categories and members while preserving current cloud preferences and is marked complete only after the cloud write succeeds. Keep-current stores a typed per-account local disposition without changing cloud data; decide-later only dismisses the dialog for the current mounted session.

An import also writes a user-bound pending reservation before its cloud request. The reservation keeps the same operation ID for retries, prevents another local account from claiming the legacy backup while the request is ambiguous, and is reconciled into the claim when that same account later observes the committed cloud state.

## Change Checklist

- Preserve old stored data through reload normalization or an explicit migration.
- Update every dependent reference when changing category identity or deletion behavior.
- Keep list keys stable and selectors narrow so live quote updates do not rerender the full watchlist.
- Run frontend tests and, for persistence or shared-contract changes, `npm run test:all`.

## Source Anchors

- [`src/store/Stock.store.ts`](../../src/store/Stock.store.ts)
- [`src/types.ts`](../../src/types.ts)
- [`src-tauri/tauri.conf.json`](../../src-tauri/tauri.conf.json)
