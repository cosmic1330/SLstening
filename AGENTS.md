# AGENTS.md

## 專案背景

SLstening 是台股／美股監控與技術分析桌面應用。`src/` 使用 React 18、TypeScript、Vite、MUI、Zustand；`src-tauri/` 使用 Tauri 2 與 Rust，負責原生整合及市場資料排程。Supabase 提供認證，帳號資料採本機持久化與選用的 Google Sheet 備份。

## 開發與驗證

- 使用 pnpm；CI 使用 Node.js 22、pnpm 10 與 stable Rust。指令以 [package.json](package.json) 與 [CI](.github/workflows/ci.yml) 為準；README 的 `build_app` 已不存在。
- 依變更範圍選擇驗證；純文件變更檢查內容與連結即可。

| 用途 | 在專案根目錄執行 |
| --- | --- |
| 安裝依賴 | `pnpm install --frozen-lockfile` |
| 桌面開發 | `pnpm app`；`pnpm dev` 僅啟動前端 |
| 前端靜態檢查 | `pnpm lint`、`pnpm typecheck` |
| 前端測試 | `pnpm test:frontend`；指定檔案可在後面加路徑 |
| Rust 測試 | `cargo test --locked --manifest-path src-tauri/Cargo.toml` |
| MCP bridge／PhoneApp 同步測試 | `pnpm test:bridge`／`pnpm test:phoneapp` |
| 前端建置 | `pnpm build` |
| 桌面封裝 | `pnpm package` |

- `pnpm test` 為 watch 模式；單次驗證使用 `test:frontend`。`test:all` 包含前端、Rust、PhoneApp 測試，但不包含 `test:bridge`。
- Tauri command／event 契約變更需同步檢查 TypeScript 與 Rust 兩端。`src-tauri/bindings/` 由 ts-rs 產生；修改 Rust 型別並透過 Rust 測試重新產生，不直接手改產物。

## 按需閱讀

僅讀取與任務相關的文件；實作、測試與設定優先於文件中的過時描述。

- [知識庫入口](wiki/index.md)：依 UI、認證、追蹤清單、市場資料等任務導向架構與決策文件。
- [建置與發佈](wiki/architecture/build-and-release.md)：CI、桌面封裝、更新器與環境設定。
- [Agent 整合](docs/agent-setup.md)：本機 MCP gateway、bridge 與用戶端設定。
- [PhoneApp 同步](docs/phoneapp-sync.md)：Google Apps Script 部署與雲端資料契約。

## 實作原則

- Keep things in one function unless composable or reusable
- Validate unknown values once at the boundary that owns them. Pass typed values inward instead of repeating typeof value === "object" and property-existence checks. Do not defensively revalidate values already guaranteed by a schema, constructor, or internal type.
- Do not extract single-use helpers preemptively. Inline the logic at the call site unless the helper is reused, hides a genuinely complex boundary, or has a clear independent name that improves the caller.
- Before adding complexity for a speculative or vanishingly unlikely race or security edge case, explain the concrete failure mode, likelihood, and complexity cost to the user and get their buy-in. Do not silently expand scope for theoretical robustness.
- Avoid try / catch where possible
