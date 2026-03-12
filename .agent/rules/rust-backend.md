---
trigger: always_on
---

# Rust 後端指令開發規則

## 內容描述
規範 Tauri Command 的編寫，確保 Rust 代碼的安全性、非阻塞性和錯誤傳遞。

## 核心規則
1. **錯誤處理**：
   - 禁止在 `#[tauri::command]` 中使用 `unwrap()` 或 `expect()`。
   - 必須返回 `Result<T, String>`。錯誤應通過 `map_err(|e| e.to_string())` 轉換為字符串傳回前端。
2. **非同步開發**：
   - 涉及 IO 或耗時運算的指令必須定義為 `async fn`。
   - 長時間運算需考慮使用 `tauri::Window::emit` 實時向前端推送進度。
3. **數據序列化**：
   - 所有與前端交互的結構體必須衍生 `serde::Serialize` 和 `serde::Deserialize`。
   - 欄位名稱建議優先使用 `#[serde(rename_all = "camelCase")]` 以符合 JavaScript 習慣，若有特殊資料對齊需求可例外。
4. **狀態管理**：
   - 訪問 `tauri::State` 時需注意死鎖風險，推薦使用異步讀寫鎖。