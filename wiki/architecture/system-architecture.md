---
type: architecture
title: System Architecture
status: stable
---

# System Architecture

## Purpose

This page describes boundaries a change must preserve. It is not a component inventory.

## Runtime Topology

1. `src/main.tsx` boots the React application inside the Tauri webview.
2. `src/App.tsx` composes the theme, user/session provider, router, route guards, and lazy screens.
3. Authenticated routes mount `AuthenticatedRuntime`, which starts the single market-event bridge and reloads durable stock state.
4. React invokes registered Tauri commands for native data and persistence work. Rust emits events back to the webview for streaming updates and operational warnings.
5. Supabase authentication is initialized in the frontend. Local durable stock/category state uses Tauri Store, Tauri startup provisions the SQLite schema, and high-frequency ticks remain in memory.

## Route Boundaries

| Route | Boundary |
| --- | --- |
| `/auth/login`, `/auth/register` | Public-only; an authenticated user is redirected to a safe intended destination. |
| `/dashboard` | Authenticated shell for watchlist, market, and settings surfaces. |
| `/detail/:id` | Authenticated stock-detail route. |
| `/add` | Legacy redirect to `/dashboard`. |

Do not add a second router or bypass `RequireAuth` for protected screens. Keep redirect targets internal and validated through the existing navigation helper.

## State and Persistence Boundaries

| Concern | Owner | Persistence |
| --- | --- | --- |
| Supabase session and profile | `UserContext` | Supabase client session storage |
| Tracked stocks, categories, active/pinned/recent IDs | `Stock.store` | Tauri Store `settings.json` |
| Latest market ticks and freshness | `MarketData.store` | Memory only |
| Provisioned relational schema | Rust/Tauri SQL migrations | SQLite `schoice.db` |
| View-specific preferences | Feature hooks/components | Local storage or window state where implemented |

Do not assume similarly named stores are interchangeable. Choose persistence from the lifetime and ownership of the data, then update [ADR 0002](../decisions/0002-separate-durable-and-live-state.md) if the strategy changes.

## Cross-Language Contracts

Tauri command names, arguments, return values, event names, and payload shapes are shared API contracts. A change on one side requires inspection and validation of the other side. The `market-update` bridge currently converts Rust snake_case payloads into frontend tick objects before writing to the live store.

## Source Anchors

- [`src/App.tsx`](../../src/App.tsx)
- [`src/layout/AuthenticatedRuntime.tsx`](../../src/layout/AuthenticatedRuntime.tsx)
- [`src/context/UserContext.tsx`](../../src/context/UserContext.tsx)
- [`src/store/Stock.store.ts`](../../src/store/Stock.store.ts)
- [`src/store/MarketData.store.ts`](../../src/store/MarketData.store.ts)
- [`src-tauri/src/lib.rs`](../../src-tauri/src/lib.rs)
- [`src-tauri/src/sqlite/migrations.rs`](../../src-tauri/src/sqlite/migrations.rs)
- [`src-tauri/capabilities/main.json`](../../src-tauri/capabilities/main.json)
