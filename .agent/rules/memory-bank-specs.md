---
trigger: always_on
---

# Project Memory Bank Specifications
## 1. Directory Structure & Taxonomy
All project context and persistent memory must be maintained within the `/memory-bank` directory. This serves as the "Single Source of Truth" for the AI Agent.

* **`memory-bank/prd.md` (Product Requirements Document)**  
    * **Purpose:** Defines the core product vision, user stories, and functional requirements.  
    * **Content:** Project goals, target audience, feature lists, and acceptance criteria.

* **`memory-bank/architecture.md` (System Design)**  
    * **Purpose:** Records the structural decisions of the Expo App.  
    * **Content:** Navigation patterns (Expo Router), folder structure, state management logic, and component hierarchy.

* **`memory-bank/tech-stack.md` (Technology Ledger)**  
    * **Purpose:** Tracks all technical choices and library versions.  
    * **Content:** List of Expo SDKs, UI frameworks (React Native Paper), and third-party integrations (e.g., TanStack Query, Axios).

* **`memory-bank/task-backlog.md` (Persistent Requirements Log)**  
    * **Purpose:** 作為「永久不會遺忘的需求記憶庫」。每一筆需求必須有唯一 ID (REQ-001、REQ-002...)，並嚴格區分兩大類。  
      **智能調整機制**：當用戶異動需求但未指定 REQ-ID 時，AI 必須自動偵測並**就地更新既有需求內容**，而非建立新 REQ。  
      只要需求沒有被用戶明確調整或取消，就必須一直保留，讓 AI 永遠記住。
    * **Content Structure（強制格式）**：
      ```
      # Task Backlog - Persistent Requirements Log

      ## Functional Tasks
      | REQ-ID | Description | Status | Last Updated | Adjusted From | History | Notes |
      |--------|-------------|--------|--------------|---------------|---------|-------|
      | REQ-001| ...         | Pending| 2026-03-12   | -             | v1: 原描述 | ...   |

      ## Global Constraints (Always On)
      | REQ-ID | Description | Status | Last Updated | History | Notes |
      |--------|-------------|--------|--------------|---------|-------|
      | REQ-002| 所有 MUI 按鈕必須禁用波紋效果 | Active | 2026-03-12 | v1: ... | 永遠遵守 |
      ```

---
## 2. Core Operational Principles
### A. Context Initialization (The "Read-First" Rule)
**Before generating any code or proposing architectural changes, the Agent MUST:**
1. 完整讀取 `/memory-bank` 所有 Markdown 檔案。
2. **特別強制讀取 `task-backlog.md` 中的全部內容**。
3. 在回應**最開頭**列出以下兩項清單：
   - 「**當前所有 Global Constraints (Always On)**」
   - 「**尚未完成的 Functional Tasks (Pending / In-Progress)**」

### B. Atomic Synchronization (The "Sync-After" Rule)
**當用戶提出新訊息時，Agent MUST 依以下優先順序處理：**

1. **先判斷是否為「異動（調整）」**  
   - 偵測關鍵字/語意：改成、不要、更新為、修正、之前說的…現在要、把…改成、異動、調整、先前要求…  
   - 若符合，則**自動比對** task-backlog.md 中所有尚未 Cancelled 的 REQ（包含 Functional Tasks 與 Global Constraints）。  
   - **匹配成功**（描述相似度高或上下文明顯相關）→ **就地更新既有 REQ**：  
     - 更新 `Description` 為最新版本  
     - 狀態改為 `Adjusted`（Global Constraints 則維持 `Active`）  
     - `Last Updated` 更新日期  
     - `History` 欄位追加版本紀錄（v1: 原描述 / v2: 新描述）  
     - `Notes` 記錄「依用戶訊息於 [日期] 自動調整」  
     - **絕對不建立新 REQ**

2. **若無法明確匹配**（或用戶明確說「新增」「另外再做一個」）→ 才建立新 REQ-XXX（下一序號），狀態預設 Pending / Active。

3. **其他常規更新**（完成、取消）：
   - Functional Tasks：完成 → `Completed`（仍保留）
   - Global Constraints：狀態永遠維持 `Active`，絕對不可標記 Completed
   - 取消需求：改為 `Cancelled`（仍保留歷史）

### C. Fact-Based Reasoning + Persistent Memory Rule
- `task-backlog.md` 中的 **Global Constraints** 優先級高於一切（高於 prd.md、architecture.md、甚至你的新指令，除非你明確說「廢除此 Global Constraint」）。
- 引用需求時**必須使用 REQ-ID**（例如：「根據 REQ-005，全局禁用波紋效果」）。
- AI 不得遺漏任何 Global Constraints，也不得擅自將其標記為 Completed。
- **智能調整優先級最高**：即使你沒有說 REQ-ID，只要 AI 判斷這是異動，就必須更新舊需求。

---
## 3. Implementation Workflow
1. **Phase 1 (Input):** 同時讀取 `prd.md`、`architecture.md` 與 `task-backlog.md`（特別注意所有 Global Constraints 與未完成 Functional Tasks）。
2. **Phase 2 (Action):** 執行任務前，先執行「智能異動偵測」。
3. **Phase 3 (Output):** 
   - 提供程式碼。
   - 立即執行 Memory Sync 更新 `task-backlog.md`。
   - 在回應結尾附上：「本次已自動更新 REQ-XXX（原描述 → 新描述），History 已記錄 v2。」 或 「本次已新增 REQ-XXX 為 Global Constraint」。
