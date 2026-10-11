---
type: concept
title: Tracked Stocks and Categories
status: stable
---

# Tracked Stocks and Categories

## Why This Matters

The watchlist is durable user configuration, not a projection of live market data. Category membership, ordering, selection, pinning, and recency must remain coherent across reloads; this version starts clean and does not migrate the obsolete desktop settings shape.

## Model and Invariants

- There is no built-in or virtual category. Empty category lists are valid; the active-category sentinel is the empty string.
- Stock identity must be stable; category and stock IDs are the relationships persisted by the store.
- Custom category names are trimmed and compared case-insensitively for uniqueness.
- Deleting or normalizing categories must repair active, pinned, and recent category references.
- A stock with no remaining category membership is removed rather than kept as an orphan.
- Pinned categories are capped at five.

Normalization during reload applies only to the current PhoneApp group projection and local navigation references. It is not a migration path for the obsolete `settings.json` file.

## Persistence Boundary

`Stock.store` serializes durable changes through a mutation queue. Cloud backup is an account-scoped `account-state.json` preference and defaults on to preserve the historical behavior. Turning it off stops new reads, comparisons, and writes without deleting the remote copy. Local edits always commit; if the PhoneApp wire payload exceeds 45,000 UTF-8 bytes, backup turns off and stays off until the user removes enough data and enables it again. Successful and failed upload starts share a runtime-only 30-second minimum interval: triggers during the interval or while another upload is active are dropped, with no timer or deferred send. A later cloud-represented mutation can try again after the interval.

On startup, a dirty local outbox wins and uploads immediately when backup is enabled. A clean cache is compared with the cloud using only category IDs/names/order, stock IDs/names, and membership/order. Differences open a blocking local-versus-cloud choice with both modification times; active, pinned, recent, and indicator preferences remain local-only. Cloud failures are silent and never block local work. New Desktop cloud payloads serialize each category member with only `symbol` and `name`; removing the legacy placeholder quote fields saves 47 UTF-8 bytes per membership. The native reader and Apps Script continue accepting the exact legacy five-field PhoneApp shape so existing Mobile rows and older Desktop backups remain readable. Input is stored unchanged, and the `(uuid, type)` partition prevents compact Desktop writes from replacing Mobile data. Desktop-only `marketGroup`/`marketType` values are inferred locally and never uploaded. Indicator settings stay in `preferences.json`; the shared menu stays in `catalog.json`.

The native reader accepts PhoneApp's serialized JSON string containing the groups array and rejects decoded arrays and the old desktop `AccountSnapshot` object. Missing PhoneApp data is an empty account. Missing market metadata is classified locally using Taiwan numeric symbols versus US symbols.

The store also contains Supabase helpers for `watch_stock`, but those compatibility paths do not define category membership. The account snapshot is keyed by the immutable Supabase `user.id` supplied by the authenticated desktop session; email is sent as PhoneApp-compatible identity metadata. The endpoint does not receive or verify a Supabase access token.

The old `settings.json` is never read for migration. If it exists, the app shows a localized one-time choice to keep it as a backup or delete the exact app-data file; the disposition is stored in `account-state.json`. Deletion failures keep the dialog retryable.

## Change Checklist

- Do not load or copy obsolete settings data; only present the one-time keep/delete choice when the exact legacy file exists.
- Update every dependent reference when changing category identity or deletion behavior.
- Keep list keys stable and selectors narrow so live quote updates do not rerender the full watchlist.
- Run frontend tests and, for persistence or shared-contract changes, `npm run test:all`.

## Source Anchors

- [`src/store/Stock.store.ts`](../../src/store/Stock.store.ts)
- [`src/types.ts`](../../src/types.ts)
- [`src-tauri/tauri.conf.json`](../../src-tauri/tauri.conf.json)

## Local-first desktop persistence

Desktop watchlist mutations commit to the account-scoped local cache first. A durable dirty marker keeps the projection authoritative across restart while an ordered background outbox retries the cloud backup; a failed backup never rolls back the local list.
