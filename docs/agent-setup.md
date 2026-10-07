# Codex 與 SLstening 本機 Agent

SLstening 啟動後會在本機 loopback 建立 MCP HTTP gateway，只有目前已登入的 Supabase 帳號可以使用。App 會在自己的 application-data 目錄建立 owner-only 的 `slstening-agent.json`；檔案包含隨機 bearer token、port 與 bridge 路徑。登出、切換帳號或 token 過期後，gateway 會拒絕帳號工具；關閉 App 後 gateway 隨行程消失。

Codex 使用 Node.js 18 以上的 `scripts/slstening-agent-bridge.mjs`，bridge 只讀 discovery file，不會取得或轉發 Supabase access token。測試環境可用：

```sh
SLISTENING_AGENT_DISCOVERY="/path/to/slstening-agent.json" \
  node /absolute/path/to/scripts/slstening-agent-bridge.mjs
```

Codex MCP 設定的 command 應使用 bridge 的絕對路徑。App 執行時可從 discovery file 的 `bridgePath` 取得已安裝版本路徑；開發環境則使用 repository 內的 `scripts/slstening-agent-bridge.mjs`。

開發環境可直接註冊：

```sh
codex mcp add slstening -- /absolute/path/to/node /absolute/path/to/SLstening/scripts/slstening-agent-bridge.mjs
codex mcp list
```

Codex 桌面版、CLI 與 IDE 共用這份設定。新增後請重新啟動 Codex，並在 App 已開啟且登入時用 `/mcp` 確認 `slstening` 已連線。若日後移動 repository 或改用封裝版 App，請移除舊設定後以 discovery file 的 `bridgePath` 重新註冊。

MCP 工具包含清單、報價、K 線、技術指標、籌碼分析，以及新增／刪除股票、建立／改名／刪除分類、調整成員與順序、更新／重設指標參數。寫入直接執行，並使用雲端 revision 做樂觀鎖；衝突會回傳錯誤並要求重新讀取。revision `0` 且尚無資料的全新帳號會先使用安全的預設清單，再以 revision `0` 建立第一筆資料。

使用者已選擇本版本不顯示額外的 Agent permission UI；因此把 bridge 加入 Codex 前，請確認目前 App 登入的是要被讀寫的帳號。若不希望 Agent 能修改資料，請不要啟動 bridge。

這個 MVP 明確採用同一個作業系統使用者的信任模型：任何能讀取 owner-only discovery file 的同機程序，在 App 開啟且使用者登入時都能呼叫已啟用的工具。因此不要把 discovery file 複製給其他使用者或機器，也不要把 bearer token 寫入日誌。

雲端個人狀態由部署好的 Google Apps Script Web App 透過 Supabase access token 驗證後，存放在指定 Google Sheet 的 `SLstening_UserData` 工作表。App 不接受呼叫者自選的 user ID；Rust 從目前 native session 取 token，並在每次讀寫後重新檢查 session epoch。

市場資料回應會標示 `freshness`（`live`、`cached` 或 `unknown`）與實際 provider fetch time；快取資料不會宣稱為即時，未知的時區、調整方式與未完成 bar 會明確回傳 null/`unknown`。TW 股票使用台股 provider，US 股票可用 `US:AAPL` 這類 qualified symbol，分析快照在超過整體 deadline 時會保留已完成項目並附可重試 warning。技術指標輸出附 algorithm、sample size、warm-up 與 rounding metadata，並以 App canonical fixtures 維持 Rust/TypeScript parity。
