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
| REQ-016 | ATR 頁面優化：Supertrend 趨勢轉折策略定案，並改為 MA30 與 EMA200 併列顯示 | Completed | 2026-05-08 | REQ-016 | v1-v7: ...; v8: 將原本的 EMA30 改為顯示 MA30 與 EMA200 | 依用戶訊息於 2026-05-08 自動調整，提升視覺直覺性與策略執行效率 |
| REQ-017 | 設定頁面新增 Supertrend 參數設定，並在詳情頁面提供即時調整 | Completed | 2026-04-28 | - | v1: 原始需求; v2: 修正指標為 0 導致的顯示異常 (改為 null); v3: 依需求移除動態防線設定 | 增加技術指標的靈活性與可控性 |
| REQ-018 | 實現 EMA 頁面 K 線類型切換 (平均 K 線 vs 標準 K 線) | Completed | 2026-04-26 | - | v1: 原始需求 | 提供使用者在不同分析視角間切換的靈活性 |
| REQ-019 | 優化 Yahoo API 請求流量控制：集中後端管理、實作緩存與熔斷機制 | Completed | 2026-04-27 | - | v1: 原始需求 | 解決過度請求導致的 429 錯誤，提升系統穩定性 |
| REQ-020 | MSS 邏輯解耦：將市場強度分數計算邏輯移至 cls_tools | Completed | 2026-04-28 | - | v1: 原始需求 | 提升代碼複用性與組件清潔度 |
| REQ-021 | Donchian 訊號優化：整合 VMA20 放量條件 | Completed | 2026-04-28 | - | v1: 在買入訊號加入 v > vma20 判斷; v2: 圖表新增 VMA20 曲線顯示 | 提升訊號準確度，過濾無量突破 |
| REQ-022 | 修復台指期 (WTX) 漲跌數據顯示異常 | Completed | 2026-04-29 | - | v1: 優化 Rust 後端資料擷取與前端 Hook 計算邏輯; v2: 修正期貨與美股市場刷新時段判斷 | 確保市場指標卡片數據顯示準確 |
| REQ-023 | MR 頁面邏輯優化：由交叉邏輯改為 RSI 與價格背離偵測 | Completed | 2026-05-02 | - | v1: 原始需求; v2: 調整 RSI 為 14 並實作背離偵測 | 提升交易訊號的前瞻性 |
| REQ-024 | 修復所有圖表最後一根 K 線顯示異常（含對齊、嚴格座標檢查、後端空成交量過濾與極小開收盤 Doli 實體修復） | Completed | 2026-05-13 | REQ-024 | v1: 修復圖表裁切與異常數值縮放問題 / v2: 採用時間戳對齊、加上嚴格座標檢查 / v3: 處理後端空成交量遺失問題 / v4: 解決「開收盤極其接近 (Doji)」時 K 棒實體高度淪為極小浮點數變為一條細線的缺陷，強制實體高度至少 2px 並置中微調，同時實作「K 線寬度隨縮放級別動態自適應」功能 | 依用戶訊息於 2026-05-13 自動調整升級為核心修正，保障所有技術指標頁面的 K 線顯示完美不失真 |
| REQ-026 | StockBox 按鈕顯示邏輯優化：Category 僅顯示「移除」，List 顯示「刪除」 | Completed | 2026-05-08 | - | v1: 原始需求 | 避免 Category 中同時出現兩個刪除/移除按鈕造成混淆 |
| REQ-027 | 設定頁面新增「批次刪除自選股」功能 | Completed | 2026-05-08 | - | v1: 原始需求 | 解決 List 頁面一檔一檔刪除過於繁瑣的問題，提升使用者體驗 |
| REQ-028 | OBV 圖表視覺優化：移除 OBV 與 OBV MA20 交叉的柱狀圖，並以紅色與綠色背景填滿交叉空間 | Completed | 2026-05-15 | REQ-028 | v1: 依用戶需求移除柱狀表示，改為純線條以提升圖表整潔度 / v2: 應要求在交叉空間加入紅色(多頭)與綠色(空頭)的背景填滿 | 提升圖表直覺性 |
| REQ-029 | EMA 頁面長期均線統一：將原有的 SMA200 全部改為 EMA200 | Completed | 2026-05-15 | - | v1: 原始需求 | 確保 EMA 策略頁面內的所有均線邏輯連貫一致 |
| REQ-030 | EMA 頁面圖表優化：移除 EMA60 的畫面顯示與控制面板開關 | Completed | 2026-05-15 | - | v1: 用戶要求不再顯示 EMA60 (內部指標計算保留以供買賣點策略判斷) | 簡化圖表視覺 |
| REQ-031 | 實現 StockBox 的 Tick 與 MA K 線圖表切換功能，且預設顯示 MA K 線 (mak) 圖表 | Adjusted | 2026-05-29 | REQ-031 | v1: 原始需求 / v2: 將 MA K 線圖表的 K 棒顯示數量從 30 增加到 90 / v3: 優化資料獲取與畫面顯示，根據設定（Tick / MA K）獨立拉取對應資料，並隱藏非必要的指標標籤（例如 mak 模式下隱藏 AvgPrice） / v4: 應使用者要求，將 mak 模式的歷史資料更新頻率提高至每 20 秒一次，保持與 tick 同等的即時更新體驗 / v5: 調整預設卡片圖表類型為 K 線 (mak) 模式 | 依用戶訊息於 2026-05-29 自動調整，將首頁 StockBox 的卡片圖表預設改為 K 線 (mak) 顯示 |
| REQ-032 | 修復 GitHub Actions 的 pnpm 構建腳本忽略錯誤 (esbuild) | Completed | 2026-05-28 | - | v1: 將 GitHub Actions 的 pnpm 版本鎖定為 10，並新增 .npmrc 檔案明確允許 esbuild 執行構建腳本 | 解決 ERR_PNPM_IGNORED_BUILDS 錯誤，確保 CI/CD 流程順暢 |
| REQ-033 | CMF 資金流圖表重新設計：移除重疊柱狀圖、實作紅綠分離漸層 Area、銀白霓虹發光 CMF 主線與低調 EMA 訊號線 | Completed | 2026-05-29 | - | v1: 應使用者要求進行資金流 CMF 圖表重設計，實現 Glowing HUD 專業化視覺，並將 EMA 訊號線改為低飽和度虛線 | 大幅提升資金流圖表的易讀性與視覺質感 |
| REQ-034 | 將 CJ 指標重構為純 CCI 指標：刪除 KDJ J 線與說明，重命名資料夾與檔案名稱為 Cci | Completed | 2026-05-29 | - | v1: 依使用者最新指示，徹底移除 J 線以簡化圖表視覺，同步修正資料夾名為 Cci、檔案名為 Cci.tsx、Cci.md，並修改 chartConfig 載入配置 | 簡化技術指標分析介面，移除多餘的 J 線雜訊 |
| REQ-035 | 優化唐奇安通道 (Donchian) 圖表顯示：移除 EMA200 折線、成交量長條圖與 VMA20 平均成交量線 | Completed | 2026-05-29 | - | v1: 應使用者最新回饋，為保持唐奇安通道主圖的聚焦度，移除重疊的 EMA200 線、Volume 覆蓋長條圖與 VMA20 線，並修復 Y 軸自適應範圍計算 | 簡化唐奇安通道圖表，提升通道分析專注度 |
| REQ-036 | 唐奇安通道新增未補缺口顯示：整合跳空缺口偵測，並採用 premium 半透明紅色支撐區間與綠色壓力區間 ReferenceArea 標示，附帶 toolbar 控制面板切換 | Completed | 2026-05-29 | - | v1: 依使用者要求在 Donchian 圖表中渲染未補缺口 / v2: 將原本雜亂的水平雙折線優化為 premium 的半透明 ReferenceArea 紅綠區間填充（Support/Resistance Zones），完美兼顧清晰度與圖表整潔度 | 完美兼顧了缺口的提示功能與整體圖表的清爽度，避免水平線對通道的干擾 |
| REQ-037 | Supertrend 預設參數優化：將 ATR 長度預設值由 14 調整為 10，倍數由 2.5 調整為 3.0，並實現 localStorage 自動遷移 | Completed | 2026-05-29 | - | v1: 依使用者指示將預設值調整為 10, 3.0，並實作 localStorage 智能遷移 (supertrend-10-3-migrated)，保障已有使用者的參數能直接無縫升級，無須手動重置 | 提升 Supertrend 指標分析的實戰預設準確度，優化使用者初次載入體驗 |
| REQ-038 | OBV 價格圖表指標切換為布林通道：將原本的單條 MA60 均線替換為高質感布林通道上下軌與中軌虛線 (bollUb, bollMa, bollLb) | Completed | 2026-05-29 | - | v1: 應使用者最新回饋，在 OBV 上半部的價格圖表中移除 MA60 均線，並繪製代表波動幅度的經典布林通道三軌虛線，完美增強波動極限對比 | 提升量價背離分析時價格波動區間的易讀性 |
| REQ-039 | MA 均線圖預設隱藏 MA120：將預設開啟狀態改為 false | Completed | 2026-05-29 | - | v1: 依使用者最新要求，在 MaKbar.tsx 中將 ma120 預設顯示設為 false，避免開啟時均線過多造成雜訊 | 優化預設開啟視圖的清爽度 |
| REQ-040 | ATR 價格圖表 MA 均線視覺降噪：將原先搶戲的橘色實線弱化為朦朧淡黃虛線 | Completed | 2026-05-29 | - | v1: 依使用者回饋弱化 ATR.tsx 中過於醒目的 MA20，將其改為半透明淡黃虛線 (rgba(241, 175, 32, 0.35)，strokeDasharray="4 3"，寬度 1)，釋放焦點予 Supertrend 信號 | 完美回歸輔助參考線定位，消除視覺干擾 |
| REQ-041 | 布林通道配色與線型跨頁面統一：調整所有包含布林通道的輔助分析頁面線條，改為高清晰平滑實線並統一為天藍色中軌、銀灰色上下軌 | Completed | 2026-05-29 | - | v1: 依使用者回饋，統一修正 Mfi, Kd, Obv, Mr, Cci, MJ 頁面中的布林通道配色為中軌天藍、上下軌銀灰實線，與主 Bollean 頁面保持完全一致 | 大幅提升跨頁面圖表的視覺美感與專業認知度 |
| REQ-042 | 布林通道頁面新增未補缺口顯示：在 Bollean.tsx 中整合 unfilledGaps 檢測與 premium 半透明紅綠 Support/Resistance Area 填充，並實作 Gap 控制面板 Chips 與 hover 高亮 CustomTooltip | Completed | 2026-05-29 | - | v1: 依使用者最新要求，在 Bollean 頁面主圖中渲染未補缺口，並實作 Toolbar Control Chips 讓使用者自主切換顯示與否，以及 custom tooltip 互動 | 完善 Bollean 主圖的跳空分析能力，提供極致的 Support/Resistance Zones 視覺反饋 |
| REQ-043 | 布林通道頁面移除上升下降通道邏輯和相關 UI | Completed | 2026-05-29 | - | v1: 依使用者最新指示，在 Bollean.tsx 中移除線性回歸通道 (LRC) 邏輯、設置選單、控制晶片與圖表中的上下軌通道線渲染 | 簡化布林通道圖表，消除通道干擾與視覺雜訊 |
| REQ-044 | 自選股清單列表滾動效能優化與 SWR 請求降噪 | Completed | 2026-06-16 | - | v1: 原始需求 / v2: 實作後端日K資料快取與 in_flight 歷史去重，配合前端 SWR 依開盤狀態動態輪詢 (盤中20秒/盤後0)，解決限流熔斷問題 | 降低 CPU 與 IPC 請求風暴，提升列表滾動流暢度 |
| REQ-045 | 詳情頁面 MFI 整合分價成交量分佈 (Volume Profile)，並移除布林通道，且優化強勢量能柱與外框對比度使其更為低調與美觀 | Completed | 2026-06-04 | REQ-045 | v1: 新增 CVD 獨立頁面 / v2: 取消 CVD 獨立頁面，改將 Volume Profile 整合至 MFI 詳情頁面並移除布林通道 / v3: 依使用者要求降低強勢量能柱顏色亮度 / v4: 依使用者要求降低外框描邊不透明度 / v5: 僅在主導方顯示外框 / v6: 消除填充色亮度偏差 (統一為 0.30) 並保留主導方描邊外框 (0.50) / v7: 依使用者要求將外框調整為內描邊 (Inner Stroke) 避免溢出邊界 | 提供簡潔的分價量能分析視角 |
| REQ-046 | CCI 訊號簡化與參數設定支援：將預設值調整為 26，並於設定頁面新增 CCI 設定欄位，同時將訊號簡化為突破 -100 (買入) 與跌破 100 (賣出) | Completed | 2026-06-04 | - | v1: 原始需求 | 減少指標訊號雜訊並提升參數可自訂性 |
| REQ-047 | 建立獨立的 Volume Profile 價量分析頁面與說明文件，提供 Bins / 價值區比例 / 左右對齊等控制面板 | Completed | 2026-07-17 | - | v1: 原始需求 | 提供更彈性且專業的量價分佈分析介面 |
| REQ-048 | 移除成交量輪廓圖表 (Volume Profile) 的 HVN 顯示與相關 UI 控制開關，並優化分桶數 (Bins) 的自適應與選擇功能 | Completed | 2026-07-19 | - | v1: 隱藏 HVN 相關圖形與 UI 開關，同步更新說明文件 / v2: 將分桶數 (Bins) 從 Slider 改為 Select 下拉式選單，支援 "Auto" 自適應分桶數 `Math.min(Math.max(visibleCount * 1.2, 80), 180)` 以及 `[60, 80, 100, 120, 150, 180, 200]` 等專業分桶數選項，預設為 "Auto" | 消除視覺干擾，大幅提升分桶數的實用性與自適應表現 |

## Global Constraints (Always On)
| REQ-ID | Description | Status | Last Updated | History | Notes |
|--------|-------------|--------|--------------|---------|-------|
| REQ-005 | 離線優先 (Offline-First) 策略 | Active | 2026-03-12 | v1: 原始規範 | UI 優先從本地 SQLite 讀取 |
| REQ-006 | 嚴格錯誤處理：Rust Command 禁止使用 unwrap() 或 expect() | Active | 2026-03-13 | v1: 原始規範; v2: 檢視發現違規 | 需修復 lib.rs 中的 unwrap |
| REQ-007 | 圖表效能限制：單次渲染數據點建議控制在 300 - 500 點內 | Active | 2026-03-12 | v1: 原始規範 | 防止 Webview 渲染阻塞 |
| REQ-008 | MUI 全局禁用 TouchRipple | Active | 2026-03-13 | v1: 原始規範; v2: 檢視發現未實作 | 需建立 ThemeProvider |
| REQ-010 | Rust Command 統一返回 AppError 結構化錯誤 | Active | 2026-03-13 | v1: 檢視報告新增 | 禁止直接返回 String 錯誤 |
| REQ-011 | 打包前(tauri build) 強制執行自動測試與覆蓋率收集 | Active | 2026-03-16 | v1: 依照使用者要求新增 | 阻擋未過測試及不符標準的專案發布 |
| REQ-025 | Donchian 與 Bollean 頁面圖表配色優化及參數設定 UI 補齊 | Completed | 2026-05-07 | - | v1: 原始需求 | 提升圖表視覺一致性與使用彈性 |
