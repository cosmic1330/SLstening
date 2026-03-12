# SLstening 系統架構

## 系統概觀
專案採用 Tauri 2.0 框架，本質上是一個以 Rust 為後端、Web 技術 (React) 為前端的現代桌面應用程式。

## 核心層級

### 1. 後端 (Rust - `src-tauri`)
- **Tauri Core**: 負責視窗管理、系統 API 調用、更新機制等。
- **Command Layer**: 提供供前端調用的非同步指令，例如資料庫查詢、檔案 IO。
- **SQLite (Plugin-sql)**: 本地持久化存儲的核心，存儲股票代碼、歷史成交資料與使用者偏好設定。
- **Migrations**: 所有資料庫結構變更皆透過 `migrations/*.sql` 進行版本控制。

### 2. 前端 (React + Vite - `src`)
- **React 18**: 組件化開發架構。
- **MUI (Material UI)**: UI 元件庫，針對桌面端進行效能優化。
- **Recharts**: 技術分析圖表的渲染引擎。
- **狀態管理**:
    - **Zustand**: 全域且需持久化的狀態（如自選股列表）。
    - **React Context**: 組件樹內的局部狀態共享。
- **資料流**:
    - **Offline-First**: 優先讀取本地 SQLite 資料。
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
