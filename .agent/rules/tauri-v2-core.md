---
trigger: always_on
---

# Tauri 2.0 核心開發規範

## 內容描述
確保 AI 在處理 Tauri 項目時遵循 2.0 版本的新架構，特別是插件化系統和權限管理。

## 核心規則
1. **API 符合性**：確保使用 `@tauri-apps/api` 的 2.0 版本，並遵循插件化架構（如從 `@tauri-apps/api/plugin-xxx` 導入）。
2. **能力系統 (Capabilities)**：
   - 每當新增 `invoke` 調用時，必須檢查或提示用戶更新 `src-tauri/capabilities/default.json`。
   - 權限定義必須遵循最小權限原則。
3. **路徑處理**：
   - 嚴禁在前端直接拼寫系統絕對路徑。
   - 必須使用 `path` 插件獲取標準目錄（如 `appDataDir`, `desktopDir`）。
4. **IPC 隔離**：前端不應處理文件 IO、數據庫連接或原始網絡請求（若需繞過 CORS），必須通過 Rust 指令 (Command) 進行。