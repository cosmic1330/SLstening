# Task Backlog - Persistent Requirements Log

## Functional Tasks
| REQ-ID | Description | Status | Last Updated | Adjusted From | History | Notes |
|--------|-------------|--------|--------------|---------------|---------|-------|
| REQ-001 | 建立與初始化 Memory Bank | Completed | 2026-03-12 | - | v1: 建立 prd, architecture, tech-stack, task-backlog | 初始化專案記憶庫 |
| REQ-002 | MA 分析邏輯優化：擴充支持所有顯示的 MA 線 (MA5 至 MA240) | Pending | 2026-03-12 | - | v1: 原始需求 | 提升技術分析深度 |
| REQ-003 | UI 視覺優化：提升圖表互動質感，實現 "Glowing HUD" 風格 | Pending | 2026-03-12 | - | v1: 原始需求 | 增強 Premium 視覺體驗 |
| REQ-004 | Schoice 效能調優：確保複雜篩選邏輯在 Rust 層更穩定執行 | Pending | 2026-03-12 | - | v1: 原始需求 | 優化巨量資料處理速度 |

## Global Constraints (Always On)
| REQ-ID | Description | Status | Last Updated | History | Notes |
|--------|-------------|--------|--------------|---------|-------|
| REQ-005 | 離線優先 (Offline-First) 策略 | Active | 2026-03-12 | v1: 原始規範 | UI 優先從本地 SQLite 讀取 |
| REQ-006 | 嚴格錯誤處理：Rust Command 禁止使用 unwrap() 或 expect() | Active | 2026-03-12 | v1: 原始規範 | 確保應用程式穩定性 |
| REQ-007 | 圖表效能限制：單次渲染數據點建議控制在 300 - 500 點內 | Active | 2026-03-12 | v1: 原始規範 | 防止 Webview 渲染阻塞 |
| REQ-008 | MUI 全局禁用 TouchRipple | Active | 2026-03-12 | v1: 原始規範 | 減少 Web 感，符合桌面端習慣 |
