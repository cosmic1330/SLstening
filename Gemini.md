# SLstening 專案總覽
這是一個使用 Tauri、React、TypeScript 和 Vite 建立的桌面股票分析應用程式。它提供了一套完整的工具，讓使用者可以追蹤、分析和篩選股票。

**詳細的說明文件位於各個子資料夾下的 `Gemini.md` 檔案中。**

## 核心技術棧

- **核心框架**: Tauri (使用 Rust 作為後端，WebView 作為前端)
- **前端**: React, TypeScript, Vite
- **UI**: Material-UI, Recharts (圖表), Framer Motion (動畫)
- **狀態管理**: Zustand, React Context
- **後端/服務**: Supabase (使用者驗證), SQLite (本地端資料庫)

## 主要功能

- **股票追蹤**: 使用者可以新增、移除和查看自選股列表。
- **資料視覺化**: 提供多種技術分析圖表，包括 K線、均線 (MA)、隨機指標 (KD)、能量潮 (OBV) 以及自定義的 MJ、MR 指標圖。
- **智慧選股 (Schoice)**: 強大的篩選功能，允許使用者透過 UI 建立複雜的查詢條件，篩選出符合特定技術指標和基本面條件的股票。
- **資料管理**: 從網路下載股票資料，並儲存在本地的 SQLite 資料庫中，以實現快速存取。
- **使用者系統**: 透過 Supabase 進行使用者註冊和登入。
- **自動更新**: 應用程式會自動檢查並安裝更新。

## 專案結構

- **`src/`**: 前端 React 應用程式的原始碼。
  - **`api/`**: 處理 HTTP 請求。
  - **`classes/`**: 核心的資料管理和查詢建立邏輯。
  - **`components/`**: 可重複使用的 UI 元件。
  - **`context/`**: 全域狀態管理 (React Context)。
  - **`hooks/`**: 自定義的 React hooks。
  - **`pages/`**: 應用程式的主要頁面 (首頁、詳情頁、登入頁等)。
  - **`store/`**: 全域狀態管理 (Zustand)。
  - **`utils/`**: 各種工具函式。
- **`src-tauri/`**: 後端 Rust 應用程式的原始碼。
  - **`src/`**: Rust 的主要程式碼，包含 Tauri 指令、外掛設定和資料庫遷移。
- **`public/`**: 靜態資源 (圖示、圖片等)。
- **`supabase/`**: Supabase 的設定和雲端函式。

## 開發指令

- `npm run dev`: 啟動 Vite 開發伺服器 (僅前端)。
- `npm run app`: 在開發模式下執行完整的 Tauri 應用程式。
- `npm run build`: 建構前端應用程式。
- `npm run build_app`: 建構生產環境的 Tauri 應用程式。

## 限制
- 我希望你提供implementation_plan.md的內容是中文