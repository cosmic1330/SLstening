# Codex 與 SLstening 本機 Agent

SLstening 啟動後會在本機 loopback 建立 MCP HTTP gateway，只有目前已登入的 Supabase 帳號可以使用。App 會在自己的 application-data 目錄建立 owner-only 的 `slstening-agent.json`；檔案包含隨機 bearer token、port 與 bridge 路徑。登出、切換帳號或 token 過期後，gateway 會拒絕帳號工具；關閉 App 後 gateway 隨行程消失。

MCP 是可選整合。若 loopback bind、權限或執行緒建立失敗，App 仍會正常啟動；`agent_get_config` 會回報 `available: false` 與不含敏感資訊的錯誤代碼，bridge 會將請求轉成 `APP_UNAVAILABLE`。Gateway 也會限制同時連線數，避免只連線但不送 HTTP header 的 client 耗盡 App 執行緒。

桌面 App 的底部導覽列提供 MCP 頁面（`/dashboard/mcp`）。頁面會顯示三種狀態：灰色「無法使用」代表 Gateway 尚未建立；黃色「已就緒，等待用戶端」代表 Gateway 可用但最近 60 秒沒有已驗證且成功處理的 MCP 請求；綠色「最近有活動」代表最近 60 秒至少有一個這類請求。這是 request/response 活動指標，不是持久連線或 client 數量；頁面也會顯示最後活動的相對時間。底部導覽列每 5 秒輪詢一次 `agent_get_config`，離開 App 後會清理計時器。

MCP 頁面會依目前執行中的 Gateway 產生 Codex TOML 與一般 stdio MCP JSON，並提供複製按鈕。Codex 設定使用 `node` 加上頁面提供的 bridge 絕對路徑，存入 `~/.codex/config.toml` 的 `[mcp_servers.slistening]`；一般用戶端則使用相同 bridge 路徑。頁面不顯示、不複製 bearer token，也不會自動修改設定檔、重啟用戶端或啟動程序。Gateway 不可用或瀏覽器環境沒有 bridge path 時，複製按鈕會停用。

Codex 使用 Node.js 18 以上的 `scripts/slstening-agent-bridge.mjs`，bridge 只讀 discovery file，不會取得或轉發 Supabase access token。測試環境可用：

```sh
SLISTENING_AGENT_DISCOVERY="/path/to/slstening-agent.json" \
  node /absolute/path/to/scripts/slstening-agent-bridge.mjs
```

Codex MCP 設定中的 `command` 應是 Node.js 可執行檔（通常是 `node`），bridge 的絕對路徑放在第一個 `args` 項目。App 執行時可從 discovery file 的 `bridgePath` 取得已安裝版本路徑；開發環境則使用 repository 內的 `scripts/slstening-agent-bridge.mjs`。

開發環境可直接註冊：

```sh
codex mcp add slstening -- node /absolute/path/to/SLstening/scripts/slstening-agent-bridge.mjs
codex mcp list
```

Codex 桌面版、CLI 與 IDE 共用這份設定。新增後請重新啟動 Codex，並在 App 已開啟且登入時用 `/mcp` 確認 `slstening` 已連線。若日後移動 repository 或改用封裝版 App，請移除舊設定後以 discovery file 的 `bridgePath` 重新註冊。

MCP 工具包含清單、報價、K 線、技術指標、籌碼分析，以及新增／刪除股票、建立／改名／刪除分類、調整成員與順序、更新／重設指標參數。寫入直接執行，雲端採 PhoneApp 的 last-write-wins `sync`，不使用 revision 或 operation ID。全新帳號可以是零分類；新增股票前必須先建立實際分類。

本版本不讀取或匯入舊版 `settings.json`，也不會複製其中的 stocks、分類或指標設定。若精確的 App data `settings.json` 仍存在，App 只顯示一次說明資料不再使用的對話框；使用者可選擇保留檔案作備份，或明確選擇刪除整個檔案。選擇與刪除結果會寫入新的 `account-state.json`，刪除失敗時對話框保留並可重試。

本機持久化依責任拆分為 `account-state.json`（帳號快取與導航）、`preferences.json`（指標設定）及 `catalog.json`（共享目錄）；正常流程不再使用 `settings.json`。

在 Windows 開發模式中，關閉 Tauri 視窗後出現 `ELIFECYCLE` 搭配 `4294967295` 通常是 pnpm/Vite 的開發命令收到應用程式結束訊號；若 App 仍保持開啟，這行不代表 MCP gateway 已崩潰。只有在 App 自行關閉或無法繼續使用時，才應依 `agent_get_config` 的 unavailable 狀態與 App log 排查。

使用者已選擇本版本不顯示額外的 Agent permission UI；因此把 bridge 加入 Codex 前，請確認目前 App 登入的是要被讀寫的帳號。若不希望 Agent 能修改資料，請不要啟動 bridge。

這個 MVP 明確採用同一個作業系統使用者的信任模型：任何能讀取 owner-only discovery file 的同機程序，在 App 開啟且使用者登入時都能呼叫已啟用的工具。因此不要把 discovery file 複製給其他使用者或機器，也不要把 bearer token 寫入日誌。

雲端個人狀態由 PhoneApp 相容的 Google Apps Script Web App 存放在 `uuid,email,data,建立時間,最後同步時間` 欄位。Rust 使用目前 Supabase session 的 immutable `user.id` 作為 uuid，並傳送 email；PhoneApp cloud 不接收 access token，也不提供舊 desktop snapshot 格式。`data` 是嚴格的 PhoneApp `WatchlistGroup[]` JSON 字串，股票只含 `symbol`、`name`、`price: "---"`、`change: "0.0"`、`isPositive: true`。

市場資料回應會標示 `freshness`（`live`、`cached` 或 `unknown`）與實際 provider fetch time；快取資料不會宣稱為即時，未知的時區、調整方式與未完成 bar 會明確回傳 null/`unknown`。TW 股票使用台股 provider，US 股票可用 `US:AAPL` 這類 qualified symbol，分析快照在超過整體 deadline 時會保留已完成項目並附可重試 warning。技術指標輸出附 algorithm、sample size、warm-up 與 rounding metadata，並以 App canonical fixtures 維持 Rust/TypeScript parity。
