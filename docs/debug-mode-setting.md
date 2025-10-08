# 調試模式設定功能

## 功能概述

在 Setting 頁面中添加了調試模式開關，讓用戶可以輕鬆控制虛擬化股票列表的調試信息顯示。

## 新增功能

### 1. Setting 頁面調試模式開關

**位置**: `src/pages/Home/Setting/index.tsx`

**新增項目**:

- 🐛 **調試模式開關**: 使用 BugReport 圖標
- **本地存儲**: 設定會自動保存到 `localStorage`
- **即時生效**: 切換後立即保存設定

**界面設計**:

```tsx
<Grid size={6} display="flex" alignItems="center">
  <BugReportIcon />
  <Typography variant="body1" fontWeight="bold" ml={1}>
    調試模式
  </Typography>
</Grid>
<Grid size={6} justifyContent="flex-end" display="flex" alignItems="center">
  <Switch
    defaultChecked={localStorage.getItem("slitenting-debugMode") === "true"}
    onChange={handleDebugModeChange}
  />
</Grid>
```

### 2. useDebugMode Hook

**位置**: `src/hooks/useDebugMode.ts`

**功能**:

- 📱 **響應式狀態管理**: 自動監聽 localStorage 變化
- 🔄 **實時更新**: 當設定變化時立即更新狀態
- 🎯 **跨頁面同步**: 確保所有使用此 hook 的組件都能同步更新

**特點**:

- 監聽 `storage` 事件來響應跨標籤頁的變化
- 使用定時檢查來處理同一頁面內的變化
- 自動清理事件監聽器和定時器

### 3. TurnoverRate 頁面整合

**位置**: `src/pages/Home/TurnoverRate/index.tsx`

**更新**:

- 使用 `useDebugMode()` hook 替代直接讀取 localStorage
- 調試信息會根據設定動態顯示/隱藏

```tsx
const isDebugMode = useDebugMode();

<VirtualizedStockList
  showDebug={isDebugMode} // 動態控制調試模式
  // ... 其他 props
/>;
```

## 使用方式

### 開啟調試模式

1. 進入 Setting 頁面
2. 找到「調試模式」開關
3. 開啟開關
4. 回到 TurnoverRate 頁面
5. 右上角會顯示調試信息

### 調試信息內容

```
總項目數: 100
可見範圍: 2 - 5
API 請求數: 4
只有 4 個項目在請求數據！
```

### 關閉調試模式

1. 回到 Setting 頁面
2. 關閉「調試模式」開關
3. 調試信息立即消失

## 技術實現

### LocalStorage 鍵值

- **鍵名**: `slitenting-debugMode`
- **值**: `"true"` 或 `"false"`

### 響應式更新機制

```typescript
// 監聽跨標籤頁變化
window.addEventListener("storage", handleStorageChange);

// 監聽同頁面變化
const interval = setInterval(() => {
  const currentValue = localStorage.getItem("slitenting-debugMode") === "true";
  if (currentValue !== isDebugMode) {
    setIsDebugMode(currentValue);
  }
}, 100);
```

## 文件結構

```
src/
├── hooks/
│   └── useDebugMode.ts          # 調試模式狀態管理
├── pages/Home/
│   ├── Setting/
│   │   └── index.tsx            # 設定頁面（新增調試開關）
│   └── TurnoverRate/
│       └── index.tsx            # 週轉率頁面（使用調試設定）
└── components/
    └── VirtualizedStockList/    # 虛擬化列表（支援調試模式）
```

## 優勢

1. **用戶友好**: 不需要修改代碼就能開關調試模式
2. **即時響應**: 設定變化立即生效
3. **持久化**: 設定會保存，重啟應用程式後仍然有效
4. **模組化**: 調試模式 hook 可以在其他組件中重用
5. **性能友好**: 只在需要時顯示調試信息

## 注意事項

- 調試模式主要用於開發和測試
- 在生產環境中建議默認關閉
- 調試信息會佔用一些螢幕空間
- 可以考慮在未來加入更多調試選項
