---
trigger: always_on
---

# Tauri 跨平台 UI 開發規範

## 內容描述
確保 Web 前端在不同作業系統（Windows, macOS, Linux, Mobile）下擁有一致且符合原生感的體驗。

## 核心規則
1. **禁止系統默認行為**：
   - 必須在 CSS 中設置 `user-select: none;` 防止 UI 被意外選中（輸入框除外）。
   - 建議在正式版本中禁止右鍵默認菜單（除非自定義）。在開發模式下可保留以輔助調試。
2. **窗口拖拽區 (Window Dragging)**：
   - 自定義標題欄時，必須在頂部元素添加 `data-tauri-drag-region`。
   - 確保拖拽區內部的按鈕（如關閉、縮放）設置 `pointer-events: auto;` 以便點擊。
3. **安全區域適配 (Safe Area)**：
   - 針對 Tauri 2 的行動端支持，必須處理 `env(safe-area-inset-*)`，避免 UI 被劉海屏或系統導覽條遮擋。
4. **系統字體優先**：
   - 優先使用系統默認字體棧（如 `-apple-system`, `Segoe UI`, `Roboto`），確保冷啟動時沒有字體閃爍。
5. **主題同步**：
   - 建議使用 `window.onThemeChanged` 監聽系統深色/淺色模式切換，並同步更新 React 狀態。