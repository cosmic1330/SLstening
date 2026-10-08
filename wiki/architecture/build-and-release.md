---
type: architecture
title: Build and Release
status: stable
---

# Build and Release

## Local Validation

`package.json` is the command source of truth; README command examples may lag behind it.

| Scope | Command |
| --- | --- |
| Frontend behavior | `npm run test:frontend` |
| TypeScript/material frontend | `npm run build` |
| Rust, persistence, or shared native contract | `npm run test:all` |
| Full package build | `npm run package` |

The Vite development server uses the fixed Tauri port `1425`. The configured initial desktop window is `375x675`, which is also a required UI verification viewport.

## Continuous Integration

The main CI workflow uses Node 22 and pnpm 10 for linting, type checking, and frontend coverage tests. A separate Ubuntu job installs Tauri system libraries and runs locked Rust tests. Keep local scripts and CI invocations aligned when changing validation strategy.

## Packaging and Updates

The release workflow builds signed Tauri bundles for macOS, Linux, and Windows from the `release` branch and prepares updater artifacts in a draft release. The application updater reads its endpoint and public key from `src-tauri/tauri.conf.json`. Changes to release targets, signing, updater metadata, or branch policy are architecture changes and must update this page.

## Environment Boundaries

- The Supabase URL and publishable client key are currently frontend configuration in `src/supabase.ts`; they are not secrets. Authorization must still be enforced by trusted backend/database policies.
- Account-owned tracking data is stored in the Google Sheet through the native account commands. Tauri Store is used only for namespaced local recovery; live market data remains in memory and no SQLite database is initialized by the app.
- Local `.env` contents are intentionally not documented here. Add only variable names and contracts that source code and deployment configuration prove are required.

## Known Verification Point

The JavaScript/Tauri app version is `0.0.62`, while `src-tauri/Cargo.toml` declares package version `0.0.28`. The repository does not establish whether this mismatch is intentional; verify release policy before synchronizing versions.

## Source Anchors

- [`package.json`](../../package.json)
- [`vite.config.ts`](../../vite.config.ts)
- [`src-tauri/tauri.conf.json`](../../src-tauri/tauri.conf.json)
- [`src-tauri/Cargo.toml`](../../src-tauri/Cargo.toml)
- [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)
- [`.github/workflows/tauri-updater.yml`](../../.github/workflows/tauri-updater.yml)
- [`src/supabase.ts`](../../src/supabase.ts)
