---
type: plan
title: 帳號隔離與 AI Agent 接入規劃
status: superseded
date: 2026-10-07
---

# 帳號隔離與 AI Agent 接入規劃

> Superseded by the implemented PhoneApp-compatible contract documented in
> [`docs/phoneapp-sync.md`](../phoneapp-sync.md) and the stable wiki pages. This
> proposal is retained as historical design context only; its former settings
> migration, default-category, Supabase-token cloud, and revision-locking
> assumptions are not the current product behavior. Read the current status
> below before using any later section as guidance.

以下正文是 2026-10-07 的已封存提案，不是目前 App 的規格。現行行為由 source、`docs/phoneapp-sync.md` 與 wiki 決定。

## Current implementation status (2026-10-08)

- Desktop and PhoneApp use the same `pull`/`sync` Web App. `pull` accepts
  `uuid` with optional email; `sync` requires `uuid`, email, and a serialized
  PhoneApp `WatchlistGroup[]` payload. Sync is last-write-wins and does not use
  cloud revisions, operation IDs, or Supabase access tokens.
- A cloud payload contains only the PhoneApp group/stock fields. Desktop may
  infer market metadata locally, but never uploads `marketGroup` or
  `marketType`. Missing cloud data is an empty account; old AccountSnapshot
  payloads are rejected as corrupt.
- Desktop starts clean and has no `default-watchlist`. Empty categories and an
  empty active-category sentinel are valid; a durable stock must belong to a
  real category.
- Local concerns are split across `account-state.json`, `preferences.json`,
  and `catalog.json`. The obsolete exact app-data `settings.json` is never
  read. If present, a one-time localized Keep/Delete choice is persisted in a
  new store; deletion is explicit and retryable.
- The Apps Script source and local contract tests are
  [`scripts/phoneapp-sync.gs`](../../scripts/phoneapp-sync.gs) and
  [`scripts/phoneapp-sync.test.mjs`](../../scripts/phoneapp-sync.test.mjs).

The sections below remain only to explain the abandoned design and must not be
used to implement new behavior.

## Archived proposal: 目標與現況 (not current)

目標：每個帳號擁有自己的追蹤設定，使用者可以授權自己的 AI 讀取 App 提供的行情與個人追蹤資訊，據此提出有資料依據的建議。

已確認的現況：

- `Stock.store` 將股票、類別、選取、置頂與最近使用狀態寫入同一份 `settings.json`，沒有帳號 namespace。
- `UserContext` 管理 Supabase session；`AuthenticatedRuntime` 的 reload 沒有以 user ID 作為依賴，不能只靠 authenticated route 保證帳號切換。
- Supabase `watch_stock` helper 有 user ID 篩選，但完整類別模型仍以本機為主；現有程式與 wiki 無法證明完整雲端同步或 RLS 政策。
- Rust `MarketManager` 已集中處理行情快取、請求合併、限流與訂閱引用計數，應讓 UI 與 Agent 共用。
- 指標主要由 TypeScript 與 `@ch20026103/anysis` 計算；`useIndicatorSettings` 的設定與遷移旗標存在全域 localStorage，`ma20` 的預設實際為 30 期。
- SQLite 已有行情/指標等 schema，不表示它已是個人追蹤設定的來源。

## Archived proposal: 決策提案 (not current)

1. 帳號以 Supabase project/issuer 與穩定 user ID 識別，不使用 email 或顯示名稱。
2. 個人追蹤設定改由 Rust 的 `AccountRepository` 管理，React Zustand 成為該設定的 UI 投影。避免後續 MCP 再建立另一個寫入者。
3. SQLite 新增獨立的帳號設定 snapshot 表；股票市場資料仍依原有生命週期處理。第一版不拆成大量關聯表，也不把每筆 tick 寫入資料庫。
4. 先提供本機唯讀 MCP；雲端同步、遠端 MCP、Agent 寫入能力各自獨立交付。
5. App 提供事實與可追溯的分析資料，使用者自己的 AI 負責推論與建議；第一版不需要 App 內建 LLM、模型金鑰或下單功能。

## Archived proposal: 一、帳號隔離 (not current)

### 資料歸屬

| 類型 | 處理方式 |
| --- | --- |
| 追蹤股票、類別、成員關係、類別與股票排序 | 每帳號持久化 |
| 選取、置頂、最近使用類別 | 每帳號持久化 |
| 技術指標參數及其遷移狀態 | 每帳號持久化，供 UI 與未來指標 API 共用 |
| Agent 授權、撤銷狀態、存取紀錄 | 每帳號；憑證秘密使用 OS 安全儲存或僅存在記憶體 |
| 股票目錄、可共用的原始市場行情快取 | 裝置共用；不能含追蹤關係、個人名稱或個人指標結果 |
| 語言、視窗位置、置頂視窗與一般顯示偏好 | 保持裝置共用，避免擴大本次範圍 |
| Supabase session | 沿用既有認證；不得交給 Agent |

邏輯帳號隔離不等於加密保護：同一 OS 使用者若直接讀取本機檔案，仍可能接觸資料。本期不承諾抵抗已控制該 OS 帳號的程式。

### 儲存與命令契約

新增 `account_state`：`account_key` 主鍵、`schema_version`、`revision`、`payload_json`、`updated_at`。payload 包含原有股票/類別/排序/引用與指標設定；使用 SQLite transaction 完成驗證、寫入、revision 遞增。指標結果快取另外依股票、週期、參數與計算版本索引。

新增 native 服務：`AccountSessionService`、`AccountRepository` 與 `TrackingService`。命令可包含 `get_tracking_state`、具型別的追蹤 mutations、`import_legacy_tracking`。前端不再直接 set 個人設定的 Tauri Store keys，避免雙寫；保留既有正規化與 mutation serialization 的語意。

native session 的帳號來源必須先驗證 Supabase session（登入時向 Auth 服務確認身分或依實際 JWT 簽章機制驗證），不可將前端傳入的任意 user ID 當作授權。供 UI 更新 session 的命令僅允許受信任 App webview；Agent 無法呼叫它。refresh token 不提供給 Agent，驗證失敗或 session 到期即停止個人資料服務。第一版採需要有效登入的策略，離線重新啟動登入另行設計。

每個操作帶內部 `account_key + session_epoch`，mutations 再帶 `expected_revision`。帳號變更立即遞增 epoch；排隊與執行中作業不得改綁新帳號。跨 epoch 的待寫操作取消，舊讀取結果不能回填；已提交的舊帳號 transaction 只能屬於舊帳號。衝突回報 `REVISION_CONFLICT`，重新載入後處理，不靜默覆蓋。

### 登入、登出與切換

1. 開始切換即遮蔽舊清單、關閉個人資料操作並清空舊 UI 投影。
2. 撤銷舊 Agent sessions，取消其待執行作業並釋放個人訂閱。
3. 驗證新登入身分，載入新帳號 snapshot；完成前呈現 loading。
4. 新帳號沒有資料時建立空的預設追蹤類別；只有載入成功才恢復操作。
5. 失敗顯示可重試狀態，不把錯誤當空清單並覆寫資料。
6. 登出清除記憶體與授權上下文，保留各帳號已儲存的資料。

公共行情快取可以保留；追蹤名單、聚合 snapshot 與帳號相關查詢快取必須清除或按 account/epoch 隔離。

### 舊資料匯入

舊清單無法推斷所有者，不能自動指定給第一個登入帳號。

- 保留原資料並建立具版本/校驗資訊的備份。
- 登入後顯示舊資料摘要，提供「匯入目前帳號」或「使用空清單」；暫不處理時保留可再次開啟的入口。
- 預設只允許一個帳號認領；認領後不在其他帳號顯示摘要。來源備份不自動刪除。
- import 與認領標記在同一 transaction 寫入，重試不能重複匯入；如果帳號已有設定，先預覽差異並明確選擇合併或取代，不能自動覆蓋。
- Current implementation has no `default-watchlist`; empty categories use an empty active sentinel and the clean-start contract does not migrate the former settings data.
- 舊版 App 仍可能讀到原本共用資料，因此禁止把降版視為安全 rollback。回復以支援帳號隔離的版本或修正版為主，不重新合併帳號資料。

## Archived proposal: 二、AI Agent 架構 (not current)

### 服務邊界

```text
React App ── Tauri commands ───────────────────────┐
                                                  ▼
                                       Rust Application Services
                                       ├─ AccountSessionService
                                       ├─ TrackingService / AccountRepository
                                       ├─ MarketDataService / MarketManager
                                       └─ SnapshotService / 後續 IndicatorService
                                                  ▲
Local AI ── MCP stdio ── slstening-agent-bridge ────┘
                          私有、本機、已配對 IPC
```

`slstening-agent-bridge` 是 Agent client 啟動的輕量 MCP 程式，透過私有 IPC 呼叫已開啟的 App。它不直接讀 SQLite、Tauri Store 或 Supabase session，也不另開行情抓取器。stdio 的 stdout 只輸出 MCP 訊息，logs 走 stderr。

私有 IPC 優先採 Unix socket / Windows named pipe，限制 OS 使用者並驗證配對憑證。若跨平台 SDK 或目標 client 需求促使改用 loopback HTTP，僅綁定 loopback，驗證 Host/Origin、所有請求需憑證、限制 payload/速率；該私有 bridge API 不宣稱是 HTTP MCP OAuth。若直接公開 Streamable HTTP MCP，則另實作該 transport 的授權契約與互通性測試。

### 第一版唯讀工具

| 工具 | 能力與限制 |
| --- | --- |
| `get_context` | 協定/資料版本、帳號的非敏感顯示識別、權限、App 與資料服務狀態 |
| `list_watchlists` | 目前授權帳號的類別、排序與股票識別；需 `watchlist:read` |
| `get_quotes` | 有界批次的價格、漲跌、成交量與狀態；需 `market:read` |
| `get_history` | 指定股票/週期/日期範圍的 OHLCV，限制最大 bars 並提供分頁 |
| `get_analysis_snapshot` | 一次組合指定類別的追蹤設定版本、行情及選定歷史摘要；需兩種 read scopes |

第一版不開放任意 SQL、檔案讀取、shell、任意 Tauri invoke 或 user ID 切換工具。所有參數使用明確 schema 和 allowlist。股票在 API 採市場限定識別，例如市場/交易所/symbol；由 adapter 映射現有 ID，不直接大改所有歷史鍵值。模糊 symbol 回報錯誤。

MVP 以有界查詢為主，不新增永久行情訂閱工具。AI 查詢未顯示在畫面的股票時，仍透過同一 MarketManager 一次抓取。未來加入連續訂閱需有獨立 client owner、TTL 與清理機制，保留既有引用計數，不讓 AI 離線導致無限訂閱。

### 資料必須能被正確解讀

共同 response envelope：`schema_version`、`snapshot_id`、`generated_at`、`configuration_epoch`、`warnings`；每個資料項目再附來源、`observed_at`、`fetched_at`、freshness/state、交易所時區、幣別、價格/成交量單位。

來源時間與抓取時間必須區分。現有 `refreshed_ts` 要追查語意，不能直接把抓取時間宣稱為成交時間；来源缺少時間則回傳 null 與 warning。history 附 interval、時段、調整方式（未知就標示未知）、是否未收完的當期 bar。

`get_analysis_snapshot` 保證設定來自同一 session epoch，但市場報價可能有不同時間，逐項揭露；超過設定的最大時間差則標示 mixed freshness。它不是市場資料的原子同時快照。

缺資料使用 null/狀態，不用 0 替代；單項失敗可回傳 partial，附穩定錯誤碼與 retry 資訊。基本錯誤包含 `APP_UNAVAILABLE`、`AUTH_REQUIRED`、`ACCOUNT_CHANGED`、`ACCESS_REVOKED`、`INSUFFICIENT_DATA`、`RATE_LIMITED`、`PROVIDER_UNAVAILABLE`。休市與資料過期分開判定，不能要求週末資料保持盤中更新頻率。

### 指標一致性：後續一個獨立里程碑

`get_indicators` 必須附實際期間、參數、算法版本、有效樣本数與輸入資料版本。不能從 `ma20` 名稱推論使用 20 期；同樣不能把日線 MA 和盤中 MA 混為一談。

建議先將少量指標（MA、RSI、MACD）搬到 native `IndicatorService`，讓 UI 的對應指標也使用同一計算來源。先建立現有 TypeScript 行為的 golden fixtures，處理暖機期、零值、null、排序、時區與浮點容差，再擴充。其餘既有圖表維持原有計算直到逐項遷移；尚未驗證一致性的指標不提供給 Agent，也不一次重寫所有圖表。

### 授權與使用體驗

- 設定頁「AI 連線」預設關閉，顯示正在授權的帳號、client 名稱、資料範圍、最後存取與撤銷入口。
- 使用者開啟並建立配對，在 App 內确认一次；token 绑定 client、account、scopes、session epoch 与期限。不要讓 client 自行指定資料所有者。
- 第一版授權只在目前 App session 有效；登出、切換、撤銷或 App 重啟後重新配對。bridge 憑證僅存記憶體，單次配對碼過期且不可重用。
- 查詢進入、非同步工作完成及回傳前都檢查授權/epoch，避免 A 的長查詢在切到 B 後仍回傳。MCP session ID 不是授權憑證。
- 稽核只記 client、工具、時間、帳號、結果與必要數量，不記 token 或整包報價/個人資料；限制保留期和容量。
- 工具輸出的名稱/文字是資料，不能被當成額外指令；AI 可依 `snapshot_id` 與時間引用來源。送出的資料將由使用者選定的 AI 處理，配對介面應明確說明範圍。

使用情境：使用者詢問「看看我的半導體類別有哪些需要注意」。Agent 取得授權清單、行情與歷史 snapshot，產生趨勢、量價與風險說明，引用資料時間；App 不宣稱掌握使用者持股、成本或風險偏好。

### 雲端 Agent 與未來擴充

雲端執行的 client 通常無法直接連使用者電腦的 loopback/私有 IPC。不能把本機 MCP 當成遠端可用服務。

雲端階段新增獨立 HTTPS MCP server、標準 OAuth 授權、account/scope 校驗，以及個人設定同步。行情由雲端 MarketDataService 提供，或由明確設計的 App relay 提供；若依賴 relay，App 關閉仍不可用。若要全天服務，必須有獨立行情 worker、配額與部署。上線前確認資料來源允許預定用途/傳輸方式。

Supabase 遠端個人資料需明確 RLS、跨帳號測試與同步衝突契約；本機先作 revision 管理，不在第一版引入未完成的雙向同步。public MCP 與 Supabase access token 不直接互相透傳。

Agent 寫入列為後續：最先做「提出清單修改提案 → App 顯示差異 → 使用者確認提交」，搭配 revision 與 idempotency，另給 write scopes。模型的工具呼叫不是使用者確認。金融下單不在本規劃。

## Historical implementation status (2026-10-07; superseded)

The following paragraphs describe the pre-PhoneApp implementation proposal and
are intentionally retained for context. They are not claims about the current
source or deployment.

本提案仍保留為長期設計參考；目前依 `account-agent-implementation-contract.md` 已完成可運作切片：A 階段的 native session epoch、Google Apps Script 帳號 snapshot、舊資料明確匯入、帳號範圍指標設定，以及 B 階段的本機 MCP loopback gateway 與 Node.js stdio bridge。這一版依使用者明確選擇，MCP 的追蹤清單／分類／指標寫入會直接執行，不提供額外 permission UI；每次寫入仍以雲端 revision 做樂觀鎖，衝突回報給呼叫端。

目前的實作以已部署 Apps Script Web App 為雲端 repository，沒有新增 SQLite 個人 snapshot migration。Gateway 與 bridge 只在 App 開啟且 native session 有效時工作，並共用既有 `MarketManager`；bridge 不接觸 Supabase token。指標工具回傳 App 的 MA、EMA、布林、KD、RSI、MFI、OBV、CMF/CMF EMA、MACD、ATR/Supertrend、Donchian 與 CCI 欄位，並以靜態跨 runtime golden fixtures 驗證暖機、seed、rounding 與設定期間 parity。C 階段後續仍可把演算法集中到單一 native service，但在此之前不得擴大未驗證指標範圍。

## Archived proposal: 分階段交付與驗收 (not current)

| 階段 | 交付 | 完成條件 |
| --- | --- | --- |
| A：帳號隔離 | native repository/session boundary、Zustand 投影、參數隔離、舊資料匯入 | A/B 切換、重啟與匯入不交叉污染；失敗不覆寫；舊資料可復原 |
| B：本機 Agent MVP | MCP bridge、native epoch/revocation、allowlisted read/write tools、資料 envelope | 本機 bridge handshake/list/call/cancel 通過；App 關閉/登出後回報明確錯誤；live account/packaged smoke test 仍需人工 |
| C：可重現指標 | native gateway parity implementation、App canonical fixtures、metadata | golden/parity fixtures 通過；參數、版本、暖機期與單位可追溯；將演算法集中到單一 native service仍是後續改善 |
| D：依需要擴充 | 雲端 MCP/同步、背景服務、受確認的寫入提案 | 各自有獨立授權、衝突、部署與端到端驗收契約 |

依賴順序 A → B → C。D 不是前三期的驗收前提；若確認只用雲端 Agent，需重新將 D 的遠端服務部分提前，不能交付本機 B 後宣稱可遠端使用。

### 實作範圍與驗證要求

A 預計涉及 `src/context/UserContext.tsx`、`src/layout/AuthenticatedRuntime.tsx`、`src/store/Stock.store.ts`、`src/hooks/useIndicatorSettings.ts`、native account/session/tracking modules、SQLite migrations、commands 與 tests。B 涉及 bridge binary、native agent gateway/snapshot service、設定頁、types/capabilities/build packaging。C 涉及 indicator utils、native calculations 與使用該指標的 UI。所有新 UI 文案提供 zh-TW/en。

必要案例：

- A 登入新增 → B 登入為空 → A 再登入恢復；同 session 的 user ID 改變也必須切換。
- 延遲的 A reload/mutation/Agent query 在切換後不能寫入或顯示 B；撤銷不能僅依賴 frontend cleanup。
- 相同股票 ID 在不同帳號、空清單、損壞 payload、寫入失敗、認領中斷、重複匯入與 revision 衝突。
- 隨意 user ID、過期/重放 token、跨帳號 token、錯誤 scope、無效 symbol/interval、超大請求與日誌秘密檢查。
- UI 與 Agent 同時查詢能合併請求、共享冷卻，不拖慢可見卡片；資料不足、休市、部分失敗、stale 與 timeout 可辨識。
- 真實 client 的 initialize/tools/list/tools/call、取消與斷線、App 重啟、bridge 打包後可啟動。
- `npm run test:all`、`npm run build`；UI 於 375×675、768px 與寬桌面检查 loading/empty/error/populated、鍵盤焦點、reduced motion 與兩語系。

進入實作時依 AGENTS.md 的 Sol → Terra → Sol 流程，為每個階段整理精確 implementation contract，單一 implementer 完成後由唯讀 reviewer 查驗，不以本提案取代實作前審查。這次僅規劃，未執行產品測試或實作 review。

主要風險：舊資料沒有所有者、session/佇列競態、指標語意漂移、行情提供者限流、client transport 不相容，以及舊版降版重新暴露共用清單。用備份、transaction、epoch、版本化 DTO、共用 MarketManager 與真實 client 驗收降低風險；新 Agent gateway 可單獨關閉，帳號隔離保留。

## 參考

專案來源：`Stock.store.ts`、`UserContext.tsx`、`AuthenticatedRuntime.tsx`、`useIndicatorSettings.ts`、`indicatorUtils.ts`、`market_watcher.rs`、`commands/market.rs`、`sqlite/migrations.rs` 與 wiki 對應概念頁。

- [MCP transports（已檢閱的 2025-11-25 規格）](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)：stdio/Streamable HTTP 與本機 transport 保護；實作時按目標 SDK/client 協商支援版本，不依 draft 開發。
- [MCP authorization](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization)：HTTP 授權邊界與流程。
- [MCP tools](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)：工具 schema 與結構化輸出。
