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
3. Authenticated routes mount `AuthenticatedRuntime`, which starts the single market-event bridge. In the desktop runtime, `UserContext` first primes the account-scoped local snapshot and then starts the cloud refresh in the background; the browser path keeps its local reload here.
4. React invokes registered Tauri commands for native data and persistence work. Rust emits events back to the webview for streaming updates and operational warnings. The authenticated desktop session establishes a monotonic native account epoch; account state uses the PhoneApp `pull`/`sync` endpoint with `uuid` (Supabase `user.id`) and `email`. The cloud wire format is strictly the PhoneApp watchlist groups array; legacy desktop snapshots are rejected.
5. Supabase authentication is initialized in the frontend. Durable stock/category membership state is projected by Zustand and persisted through native account commands; active/recent navigation plus desktop-only pinned and indicator preferences remain local because they are outside the shared groups wire format. High-frequency ticks remain in memory. PhoneApp cloud writes are last-write-wins and do not use revisions or operation IDs. A cached account projection may remain hydrated while a cloud refresh is loading or reports a recoverable sync error.
6. While the desktop app is open, Rust owns an optional 127.0.0.1 MCP gateway and writes an owner-only discovery file. Startup failure leaves the Tauri app usable and exposes an unavailable status through `agent_get_config`; the gateway bounds accepted connections and isolates worker panics. After bearer/origin/rate checks pass and a JSON-RPC response is successfully written, the gateway records a shared epoch-millisecond `lastClientActivityAt`; rejected, malformed, or failed responses do not update it. The bundled stdio bridge forwards Codex JSON-RPC requests to the allowlisted gateway tools; no access token is exposed to MCP.

## Route Boundaries

| Route | Boundary |
| --- | --- |
| `/auth/login`, `/auth/register` | Public-only; an authenticated user is redirected to a safe intended destination. |
| `/dashboard` | Authenticated shell for watchlist, market, MCP setup/status, and settings surfaces. |
| `/detail/:id` | Authenticated stock-detail route. |
| `/add` | Legacy redirect to `/dashboard`. |

Do not add a second router or bypass `RequireAuth` for protected screens. Keep redirect targets internal and validated through the existing navigation helper.

## State and Persistence Boundaries

| Concern | Owner | Persistence |
| --- | --- | --- |
| Supabase session and profile | `UserContext` | Supabase client session storage |
| Tracked stocks, categories, memberships | `Stock.store` projection | PhoneApp-compatible groups in the PhoneApp Google Sheet through native account commands; `account-state.json` cache |
| Active/recent navigation, pinned IDs | `Stock.store` projection | `account-state.json` account-scoped cache |
| Indicator settings | `Stock.store` / native preference manager | `preferences.json` account-scoped cache |
| Shared catalog/menu | `Stock.store` | `catalog.json` device-scoped cache |
| Latest market ticks and freshness | `MarketData.store` | Memory only |
| View-specific preferences | Feature hooks/components | Local storage or window state where implemented |
| MCP gateway status | `mcp.store` fed by `agent_get_config` | In memory; BottomBar owns an immediate + 5-second poll while mounted |

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
- [`src-tauri/src/account.rs`](../../src-tauri/src/account.rs)
- [`scripts/phoneapp-sync.gs`](../../scripts/phoneapp-sync.gs)
- [`src-tauri/src/agent_gateway.rs`](../../src-tauri/src/agent_gateway.rs)
- [`src/store/mcp.store.ts`](../../src/store/mcp.store.ts)
- [`src/pages/Home/Mcp/index.tsx`](../../src/pages/Home/Mcp/index.tsx)
- [`scripts/slstening-agent-bridge.mjs`](../../scripts/slstening-agent-bridge.mjs)
- [`src-tauri/capabilities/main.json`](../../src-tauri/capabilities/main.json)

## Account backup partitioning

The Google Sheet backup is partitioned by `(uuid, type)`: desktop requests use `Desktop`; legacy PhoneApp requests without a type remain `Mobile`. Both retain the existing PhoneApp watchlist-groups payload.
