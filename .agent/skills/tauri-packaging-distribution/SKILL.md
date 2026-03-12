---
name: tauri-packaging-distribution
description: "Structured guide for handling Tauri application packaging, code signing, auto-updates, and CI/CD pipelines."
---

# Tauri Packaging & Distribution

## 1️⃣ Purpose & Scope

Ensure the Tauri application is **properly bundled, signed, and distributable** to end-users with a working auto-update mechanism.

- Prevents installation failures
- Ensures OS security trust (Code Signing)
- Sets up robust update delivery

---

## 2️⃣ Pre-Requisites

You must have:

- Completed production build (`npm run build`)
- Product metadata (Name, Version, Identifier)
- OS-specific requirements:
  - **Windows**: WiX Toolset / NSIS
  - **macOS**: Apple Developer Certificate (for Notarization)
  - **Linux**: libwebkit2gtk-4.0

---

## 3️⃣ Bundle Configuration (Hard Gate)

Before running the build command, you MUST verify `tauri.conf.json`:

- **Identifier**: Unique reverse-DNS string.
- **Icon Set**: High-quality icons for all required sizes.
- **Permissions**: Confirmed capabilities (FS, Network, Shell).
- **External Binaries**: If any sidecars are needed, ensure they are correctly mapped.

Ask explicitly:

> “Is the bundle identifier and icon set finalized and verified for production?”

---

## 4️⃣ Code Signing & Security (Critical)

- **Windows**: Signing with a GPG/EV certificate to avoid SmartScreen warnings.
- **macOS**: Mandatory App Store or Developer ID signing + Notarization.
- **Update Signing**: Ensure the `TAURI_SIGNING_PRIVATE_KEY` is securely stored and the public key is embedded in the app.

---

## 5️⃣ Auto-Update Implementation

- **Update Server**: Define where the manifest (`update.json`) and artifacts are hosted (GitHub Releases, AWS S3, etc.).
- **Backend Sync**: Ensure the Rust backend can correctly trigger and handle the update event.
- **User UX**: Define how the user is notified (Silent, Forced, or Optional update).

---

## 6️⃣ CI/CD Integration

Automate the build process using GitHub Actions or GitLab CI:

- **Environment Secrets**: `TAURI_SIGNING_PRIVATE_KEY`, `APPLE_ID`, `APPLE_PASSWORD`.
- **Target Matrices**: Build for Windows, macOS, and Linux in parallel.
- **Release Automation**: Automatically create a tag and release on successful builds.

---

## 7️⃣ Refusal Conditions

Refuse to proceed if:

- Version number is not incremented.
- Code signing keys are missing for target production platforms.
- Update endpoint is not reachable.

---

## Key Principles

- Test on clean OS installs (prevent "works on my machine")
- Minimize bundle size
- Security first: Never hardcode keys
- Validate update manifest before publishing
