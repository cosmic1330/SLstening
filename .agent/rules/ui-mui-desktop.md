---
trigger: always_on
---

# MUI 桌面端優化規範 (Tauri 2)

## 內容描述
規範 MUI 組件在桌面應用中的行為，確保 UI 響應快速且符合原生桌面操作習慣。

## 核心規則
1. **主題與深色模式 (Theme Consistency)**：
   - 必須使用 `createTheme` 配合 `CssBaseline` 確保全局樣式一致。
   - 禁止在組件內硬編碼顏色。必須使用 `theme.palette.primary.main`。
   - 監聽 Tauri 的 `window.onThemeChanged` 來動態切換 MUI 的 `mode: 'light' | 'dark'`。
2. **性能優化 (Disable Web Overhead)**：
   - 對於列表 (List) 或大量按鈕，建議全局禁用 `TouchRipple` 以減少 Web 感：
     `components: { MuiButtonBase: { defaultProps: { disableRipple: true } } }`。
3. **窗口交互與彈窗 (Modals & Popovers)**：
   - MUI 的 `Modal` 或 `Dialog` 彈出時，應確保不會隱藏桌面端的滾動條導致頁面抖動 (`disableScrollLock: true`)。
   - 確保 Dialog 中的按鈕佈局符合操作系統慣例（例如 Windows 確定在左，macOS 確定在右）。
4. **字體與渲染**：
   - **優化建議**：為確保離線可用與啟動速度，建議將字體本地化到 `src/assets/fonts`。
   - 在初步開發階段可使用 Web 字體，但應在性能優化階段完成本地化。
5. **數據表格 (DataGrid)**：
   - 在 Tauri 環境下處理大量數據時，優先使用分頁或虛擬滾動 (Virtual Scrolling)，避免阻塞 Webview 渲染進程。