# Task Backlog - Persistent Requirements Log

## Functional Tasks
| REQ-ID | Description | Status | Last Updated | Adjusted From | History | Notes |
|--------|-------------|--------|--------------|---------------|---------|-------|
| REQ-001 | 建立與初始化 Memory Bank | Completed | 2026-03-12 | - | v1: 建立 prd, architecture, tech-stack, task-backlog | 初始化專案記憶庫 |
| REQ-002 | MA 分析邏輯優化：擴充支持所有顯示的 MA 線 (MA5 至 MA240) | Pending | 2026-03-12 | - | v1: 原始需求 | 提升技術分析深度 |
| REQ-003 | UI 視覺優化：提升圖表互動質感，實現 "Glowing HUD" 風格 | Pending | 2026-03-12 | - | v1: 原始需求 | 增強 Premium 視覺體驗 |
| REQ-004 | Schoice 效能調優：確保複雜篩選邏輯在 Rust 層更穩定執行 | Pending | 2026-03-12 | - | v1: 原始需求 | 優化巨量資料處理速度 |
| REQ-009 | 引入 ts-rs 實現 Rust 與 TS 類型自動同步 | Pending | 2026-03-13 | - | v1: 檢視報告新增 | 確保前後端資料結構一致 |
| REQ-012 | 修復 Nasdaq K-線數值異常：優化 Yahoo API 資料過濾與計算邏輯 | Completed | 2026-03-23 | - | v1: 原始需求 | 解決 Nasdaq 頁面顯示異常的問題 |
| REQ-013 | 登入頁面 UI 與配色全面重新設計 | In-Progress | 2026-03-27 | - | v1: 原始需求 | 提升首頁的 Premium 視覺質感 |
| REQ-014 | 實現分類列表拖拉排序 (Drag-and-Drop) | Completed | 2026-04-21 | - | v1: 原始需求 | 增加使用者管理自選清單的靈活性 |
| REQ-015 | 優化 StockTickChart：實現基於時間 (09:00-13:30) 的固定長度切分 | Completed | 2026-04-24 | - | v1: 原始需求 | 確保即時圖表能準確反映交易時段進度 |
| REQ-016 | ATR 頁面優化：Supertrend 趨勢轉折策略定案，並改為雙線（EMA 30）併列顯示 | Completed | 2026-04-28 | REQ-016 | v1-v2: 優化動能防線; v3: 改為 Supertrend 信號; v4: 取消按鈕切換，雙線併列顯示; v5: 修正指標為 0 導致的顯示異常 (改為 null); v6: 依需求移除動態防線邏輯; v7: Supertrend 顯示邏輯從全域移除，僅保留於 ATR 頁面展示 | 提升視覺直覺性與策略執行效率 |
| REQ-017 | 設定頁面新增 Supertrend 參數設定，並在詳情頁面提供即時調整 | Completed | 2026-04-28 | - | v1: 原始需求; v2: 修正指標為 0 導致的顯示異常 (改為 null); v3: 依需求移除動態防線設定 | 增加技術指標的靈活性與可控性 |
| REQ-018 | 實現 EMA 頁面 K 線類型切換 (平均 K 線 vs 標準 K 線) | Completed | 2026-04-26 | - | v1: 原始需求 | 提供使用者在不同分析視角間切換的靈活性 |
| REQ-019 | 優化 Yahoo API 請求流量控制：集中後端管理、實作緩存與熔斷機制 | Completed | 2026-04-27 | - | v1: 原始需求 | 解決過度請求導致的 429 錯誤，提升系統穩定性 |


## Global Constraints (Always On)
| REQ-ID | Description | Status | Last Updated | History | Notes |
|--------|-------------|--------|--------------|---------|-------|
| REQ-005 | 離線優先 (Offline-First) 策略 | Active | 2026-03-12 | v1: 原始規範 | UI 優先從本地 SQLite 讀取 |
| REQ-006 | 嚴格錯誤處理：Rust Command 禁止使用 unwrap() 或 expect() | Active | 2026-03-13 | v1: 原始規範; v2: 檢視發現違規 | 需修復 lib.rs 中的 unwrap |
| REQ-007 | 圖表效能限制：單次渲染數據點建議控制在 300 - 500 點內 | Active | 2026-03-12 | v1: 原始規範 | 防止 Webview 渲染阻塞 |
| REQ-008 | MUI 全局禁用 TouchRipple | Active | 2026-03-13 | v1: 原始規範; v2: 檢視發現未實作 | 需建立 ThemeProvider |
| REQ-010 | Rust Command 統一返回 AppError 結構化錯誤 | Active | 2026-03-13 | v1: 檢視報告新增 | 禁止直接返回 String 錯誤 |
| REQ-011 | 打包前(tauri build) 強制執行自動測試與覆蓋率收集 | Active | 2026-03-16 | v1: 依照使用者要求新增 | 阻擋未過測試及不符標準的專案發布 |
