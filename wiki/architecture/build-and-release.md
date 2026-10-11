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

The MCP stdio bridge is bundled through an explicit source-to-target resource mapping. Every desktop bundle installs it as `scripts/slstening-agent-bridge.mjs` beneath Tauri's platform resource directory, so discovery can publish a valid absolute path on macOS, Windows, and Linux without depending on the launch working directory. Node.js 18 or newer remains an external MCP client requirement.

Production diagnostics use one `slistening@<app-version>` release across the WebView and Rust SDKs. The release workflow passes `SENTRY_RELEASE` into the Tauri build, lets the Vite plugin upload hidden browser source maps, deletes uploaded map files from the packaged frontend, and uploads native debug files after each platform build. Configure the repository Actions secret `SENTRY_AUTH_TOKEN` with release/debug-file upload access. The organization (`e95e6391edf1`), project (`react-native`), and public DSN are not secrets. If the token is absent, packaging remains available but the workflow emits a warning and skips symbol uploads.

## Environment Boundaries

- The Supabase URL and publishable client key are currently frontend configuration in `src/supabase.ts`; they are not secrets. Authorization must still be enforced by trusted backend/database policies.
- Account-owned tracking data is stored in the Google Sheet through the native account commands. Tauri Store is used only for namespaced local recovery; live market data remains in memory and no SQLite database is initialized by the app.
- Local `.env` contents are intentionally not documented here. Add only variable names and contracts that source code and deployment configuration prove are required.
- `SENTRY_AUTH_TOKEN` is CI-only and must never be bundled into the application. `SENTRY_RELEASE` is build metadata; the Sentry DSN is a public ingestion identifier.

## Known Verification Point

The packaged application version comes from `src-tauri/tauri.conf.json` and is kept aligned with `package.json`; the Rust crate version in `src-tauri/Cargo.toml` is independent build metadata. Sentry release identity uses the packaged application version.

## Source Anchors

- [`package.json`](../../package.json)
- [`vite.config.ts`](../../vite.config.ts)
- [`src-tauri/tauri.conf.json`](../../src-tauri/tauri.conf.json)
- [`src-tauri/Cargo.toml`](../../src-tauri/Cargo.toml)
- [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)
- [`.github/workflows/tauri-updater.yml`](../../.github/workflows/tauri-updater.yml)
- [`src/supabase.ts`](../../src/supabase.ts)
