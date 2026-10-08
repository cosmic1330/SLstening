# SLstening 系統架構

## 系統概觀
專案採用 Tauri 2.0 框架，本質上是一個以 Rust 為後端、Web 技術 (React) 為前端的現代桌面應用程式。

## 核心層級

### 1. 後端 (Rust - `src-tauri`)
- **Tauri Core**: 負責視窗管理、系統 API 調用、更新機制等。
- **Command Layer**: 提供供前端調用的非同步指令，例如帳號資料同步、行情訂閱與檔案 IO。
- **Account persistence**: 追蹤清單、類別與指標設定透過原生帳號命令寫入依 Supabase 使用者 ID 區分的 Google Sheet；Tauri Store 僅提供本機復原快取。

### 2. 前端 (React + Vite - `src`)
- **React 18**: 組件化開發架構。
- **MUI (Material UI)**: UI 元件庫，針對桌面端進行效能優化。
- **Recharts**: 技術分析圖表的渲染引擎。
- **狀態管理**:
    - **Zustand**: 全域且需持久化的狀態（如自選股列表）。
    - **React Context**: 組件樹內的局部狀態共享。
- **資料流**:
    - **Account-aware sync**: 優先載入目前帳號的本機復原快取並與 Google Sheet 同步。
    - **Event-Driven**: Rust 完成背景更新後透過 `emit` 通知前端渲染。

### 3. 雲端整合 (Supabase)
- **Authentication**: 使用者登入、註冊。
- **Settings Sync**: 同步使用者的自選股清單與個人化設定。

## 資料夾結構
- `/src/api`: 外部 API 接口調用。
- `/src/classes`: 計算指標與查詢建立的邏輯類。
- `/src/components`: 原子化與複合式 UI 組件。
- `/src/hooks`: 自定義 React hooks (例如 `useStockStore`)。
- `/src-tauri/src`: Rust 指令與應用邏輯。
- `/memory-bank`: 本專案的知識與進度追蹤庫。

## 效能與請求調優架構
- **自選股與推薦股清單滾動效能優化**: 詳細的滾動 DOM 持久化（`hasBeenVisible`）、可見性防抖（300ms）、訂閱安全防抖（1.5s）以及 SWR 快取配置調優架構，請參閱專案文件：[docs/list-performance-optimization.md](file:///Users/yangjunyu/rust_project/SLstening/docs/list-performance-optimization.md)。
