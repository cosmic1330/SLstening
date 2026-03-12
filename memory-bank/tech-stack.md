# SLstening 技術棧清冊

## 核心框架
- **Tauri 2.0**: 桌面端整合框架。
- **React 18.3**: 前端視圖庫。
- **TypeScript 5.6**: 強類型程式開發。
- **Vite 6**: 高效能前端建構工具。

## UI & 動畫
- **MUI (Material UI) 7**: 主題化 UI 元件庫。
- **Framer Motion**: 平滑的微互動與動畫。
- **Recharts**: 高效能圖表庫。

## 狀態管理與資料流
- **Zustand 5.0**: 全域狀態管理。
- **SWR**: 資料獲取、快取與重新驗證。
- **React Router 7**: 單頁面應用路由。

## 資料庫與雲端服務
- **SQLite (via Tauri SQL Plugin)**: 本地端資料存儲。
- **Supabase**: 雲端身份驗證與資料同步。

## 開發工具
- **pnpm**: 套件管理器。
- **Turborepo** (若有配置): 建構管線管理。
- **React Hook Form**: 表單一致性管理。
- **i18next**: 多語系支援。

## 效能與規範
- **效能控制**: 圖表渲染限制於 300-500 數據點。
- **Offloading**: 複雜計算 (如 Schoice) 由 Rust 層執行。
