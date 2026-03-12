---
trigger: always_on
---

# React + TS 前端開發規則

## 內容描述
規範 React 組件與 Tauri IPC 之間的交互，確保類型安全與效能。

## 核心規則
1. **強類型 Invoke**：
   - 禁止使用 `await invoke('command_name', { ... })` 而不定義泛型。
   - 必須先定義 Interface：`export interface CommandPayload { ... }` 和 `export interface CommandResponse { ... }`。
   - 範例：`const res = await invoke<CommandResponse>('command_name', { payload });`
2. **資源加載**：
   - 顯示本地圖片或視頻時，必須使用 `convertFileSrc` 函數。
3. **異步狀態管理**：
   - 所有的 IPC 調用必須封裝在 `try...catch` 中，並處理加載狀態 (Loading) 和錯誤狀態 (Error)。
   - 推薦使用 React Query 或自定義 Hooks 封裝 `invoke`。
4. **生命週期管理**：
   - 使用 `listen` 監聽 Tauri 事件時，必須在 `useEffect` 的 Cleanup 函數中調用 `unlisten()`。
5. **狀態管理劃分**：
   - **Zustand**：用於全局且需持久化的狀態（如：自選股清單、配置設定、用戶 Token）。
   - **Context**：僅用於組件樹內的局部狀態共享（如：特定表格的過濾狀態、詳情頁的選中指標）。
   - **命名建議**：Store 名稱應統一為 `use[Feature]Store` (例如 `useStockStore`)，State 與 Action 應清晰分離。