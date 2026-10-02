---
okf_version: "0.2"
---

# SLstening Knowledge Base

This wiki records durable context that is difficult to infer safely from one source file. The repository's source code, tests, configuration, and migrations remain the final truth.

## Project Overview

SLstening is a Tauri 2 desktop stock-monitoring application. React owns the interface, routing, session-aware screens, and client state; Rust owns native integration and rate-limited market-data access. Supabase supplies identity, while local stores separate durable user configuration from high-frequency live data.

## Architecture

- [System Architecture](architecture/system-architecture.md) — runtime boundaries, routes, state, persistence, and cross-language contracts.
- [Build and Release](architecture/build-and-release.md) — validation commands, CI, packaging, updater flow, and environment boundaries.

## Core Concepts

- [Tracked Stocks and Categories](concepts/tracked-stocks-and-categories.md)
- [Market Data Lifecycle](concepts/market-data-lifecycle.md)
- [Authentication and Navigation](concepts/authentication-and-navigation.md)

## Important Decisions

- [ADR 0001: Native Market Data Boundary](decisions/0001-native-market-data-boundary.md)
- [ADR 0002: Separate Durable and Live State](decisions/0002-separate-durable-and-live-state.md)

## Development Conventions

Follow [AGENTS.md](../AGENTS.md). In particular: keep Zustand subscriptions narrow, preserve command/event contracts across TypeScript and Rust, update both locales for user-visible text, and run validation in proportion to the affected boundary. Update this wiki only when durable architecture, contracts, strategy, or decisions change.

## Suggested Reading by Task

| Task | Read first |
| --- | --- |
| UI, route, or protected-screen change | [System Architecture](architecture/system-architecture.md), [Authentication and Navigation](concepts/authentication-and-navigation.md) |
| Watchlist, category, or persistence change | [Tracked Stocks and Categories](concepts/tracked-stocks-and-categories.md), [ADR 0002](decisions/0002-separate-durable-and-live-state.md) |
| Quotes, subscriptions, charts, or native commands | [Market Data Lifecycle](concepts/market-data-lifecycle.md), [ADR 0001](decisions/0001-native-market-data-boundary.md) |
| CI, packaging, updater, or environment change | [Build and Release](architecture/build-and-release.md) |
