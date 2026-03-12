---
trigger: always_on
---

# Tauri 跨語言測試規範

## 內容描述
規範前端單元測試、Rust 後端測試以及兩者結合的集成測試。

## 核心規則
1. **Mocking Tauri API**：
   - 在 Vitest/Jest 前端測試中，必須使用 `@tauri-apps/api/mocks` 模擬 `invoke` 調用。
   - 禁止在測試環境中直接觸發真實的 Rust 指令。
2. **Rust Command 測試**：
   - 針對**複雜邏輯**、**演算處理**或涉及**系統寫入/刪除（高風險）**的 `#[tauri::command]` 必須編寫 `#[test]`。
   - 簡單的資料讀取或轉發指令可視情況省略單元測試，但需確保類型安全。
   - 測試應覆蓋 `Result::Err` 的情況，確保錯誤消息符合預期。
3. **E2E 測試規範**：
   - 推薦使用 Playwright 或 WebDriver 進行端到端測試。
   - 測試腳本應包含「應用啟動檢查」與「核心 IPC 流程驗證」。
4. **類型一致性檢查**：
   - 建議手動或使用工具（如 `ts-rs`）確保 Rust 的 `struct` 與 TypeScript 的 `interface` 定義完全同步，避免運行時序列化失敗。