![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/cosmic1330/SLstening?utm_source=oss&utm_medium=github&utm_campaign=cosmic1330%2FSLstening&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)

![License](https://img.shields.io/github/license/cosmic1330/SLstening?color=blue)
![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232a?logo=react&logoColor=61dafb)
![Vite](https://img.shields.io/badge/Vite-646cff?logo=vite&logoColor=fff)
![Tauri](https://img.shields.io/badge/Tauri-ffc131?logo=tauri&logoColor=black)
![SQLite](https://img.shields.io/badge/SQLite-003B57?logo=sqlite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ecf8e?logo=supabase&logoColor=white)
![Last Commit](https://img.shields.io/github/last-commit/cosmic1330/SLstening?color=orange)

# SLstening 📈💻

> Tags: `Tauri` `React` `TypeScript` `Vite` `SQLite` `Supabase` `OAuth2` `Stock` `Technical Analysis` `Backtest` `Zustand` `Plugin` `i18n` `Desktop App` `Modern UI` `台股` `美股` `多語系` `策略回測` `即時股價` `桌面應用`

一個基於 **Tauri + React + TypeScript** 的現代化股票監控與技術分析桌面應用。

## 技術棧 🛠️

- **前端**：React 18, Vite, TypeScript, MUI, Zustand
- **桌面應用**：Tauri (Rust)
- **資料庫**：SQLite (本地), Supabase (雲端)
- **認證**：Google OAuth2, Supabase Auth
- **技術指標/回測**：自訂技術指標、策略回測
- **多語系**：i18next (支援繁體中文/英文)
- **插件系統**：Tauri Plugin Store

## 安裝與啟動 🚀

1. **安裝依賴**
   ```sh
   pnpm install
   # 或 npm install / yarn install
   ```
2. **啟動開發模式**
   ```sh
   pnpm app
   # 或 npm run app / yarn app
   ```
3. **建置桌面應用**
   ```sh
   pnpm build_app
   # 或 npm run build_app / yarn build_app
   ```

## 快速初始化資料庫 ⚡

首次啟動時，建議下載並導入提供的 SQLite 資料庫檔案，加速股票資料初始化：

[點此下載資料庫檔案](https://drive.google.com/drive/folders/1dh2F9hPT3TQOaR9pPAPIYFYg5oMHP2wL?usp=drive_link)

## 主要功能 🌟

- 📊 即時台股/美股股價監控
- 📈 技術分析圖表（MA, EMA, MACD, RSI, KD, OBV 等）
- 🤖 多空交易策略與回測
- 🛎️ 策略自訂與警示通知
- 🌏 多語系介面（繁體中文/英文）
- 🔐 Google/Supabase OAuth2 登入
- 💾 本地 SQLite 快速查詢
- 🧩 插件化架構，易於擴充
- 🖥️ 現代化 UI/UX

## 擴充性 🧑‍💻

- 支援 Tauri Plugin Store，可自訂擴充功能
- 技術指標、策略、資料來源皆可擴展

## 推薦開發環境 🧰

- [VS Code](https://code.visualstudio.com/)
- [Tauri VS Code 擴充](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## 相關連結 🔗

- [Supabase](https://supabase.com/dashboard/new/hyygxvdzjyhdgudgvaag?projectName=cosmic1330%27s%20Project)
- [Google OAuth2](https://developers.google.com/identity/protocols/oauth2?hl=zh-tw)

如需協助或有功能建議，歡迎提出 issue！🙌
