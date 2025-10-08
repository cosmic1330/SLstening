# 虛擬化股票列表實現 - 嚴格可見性控制

## 概述

此實現解決了在 TurnoverRate 頁面中加載大量股票數據時的性能問題。通過使用虛擬化技術和嚴格的可見性控制，**只有真正出現在畫面上的 StockBox 組件才會進行 API 請求**，大大提升了頁面性能。

## 主要組件

### 1. useConditionalDeals Hook (`src/hooks/useConditionalDeals.ts`)

- **功能**: 條件性的數據獲取 Hook
- **特點**:
  - 支援 `enabled` 參數來控制是否進行 API 請求
  - 當 `enabled=false` 時，完全不會發送任何網路請求
  - 保持與原 `useDeals` 相同的 API 介面

### 2. ConditionalStockBox (`src/components/StockBox/ConditionalStockBox.tsx`)

- **功能**: 可控制 API 請求的 StockBox 組件
- **特點**:
  - 接受 `enabled` 屬性來控制是否加載數據
  - 與原 StockBox 功能完全相同，但可控制數據請求時機

### 3. LazyStockBox (`src/components/StockBox/LazyStockBox.tsx`)

- **功能**: 延遲加載的 StockBox 組件
- **特點**:
  - **嚴格的可見性控制**: 只有 `isVisible=true` 時才渲染實際組件
  - 不可見時顯示美觀的骨架屏
  - **零緩衝區**: 不會提前加載任何項目

### 4. VirtualizedStockList (`src/components/VirtualizedStockList/index.tsx`)

- **功能**: 虛擬化的股票列表容器
- **特點**:
  - 使用 `react-window` 實現虛擬化滾動
  - **精確的可見性追蹤**: 只有真正在可視區域內的項目才被標記為可見
  - 包含調試模式來驗證功能

### 5. DebugInfo 組件 (`src/components/DebugInfo/index.tsx`)

- **功能**: 實時顯示虛擬化狀態
- **顯示內容**:
  - 總項目數量
  - 當前可見範圍
  - 實際進行 API 請求的項目數量

## 核心改進

### 🎯 **嚴格的可見性控制**

```tsx
// 只有真正在可視區域內的項目才算可見
const isItemVisible = useCallback(
  (index: number) => {
    // 不使用緩衝區域，只有真正可見的項目才加載
    return index >= visibleStartIndex && index <= visibleStopIndex;
  },
  [visibleStartIndex, visibleStopIndex]
);
```

### 🚫 **條件性 API 請求**

```tsx
// 在 useConditionalDeals 中
const { data: tickData } = useSWR(
  enabled ? generateUrl() : null, // 只有 enabled=true 才發送請求
  tauriFetcher
);
```

### 📊 **實時監控**

調試模式會顯示：

- 總共有多少股票
- 當前可見的項目範圍
- **實際進行 API 請求的數量**

## 性能優勢

1. **零浪費**: 只有真正可見的項目才進行 API 請求
2. **即時響應**: 滾動時立即停止不可見項目的請求
3. **最小化網路流量**: 大幅減少不必要的 API 調用
4. **更快的初始加載**: 頁面打開時只加載可見項目

## 使用方式

```tsx
<VirtualizedStockList
  stocks={stocks} // 股票數據陣列
  height={viewportHeight} // 可視區域高度
  itemHeight={280} // 每個項目的估計高度
  canDelete={false} // 是否允許刪除
  showDebug={true} // 顯示調試信息（生產環境設為 false）
/>
```

## 驗證功能

啟用 `showDebug={true}` 後，您會在右上角看到調試信息：

```
總項目數: 100
可見範圍: 2 - 5
API 請求數: 4
只有 4 個項目在請求數據！
```

這證明了即使有 100 個股票，也只有 4 個可見的項目在進行 API 請求。

## 技術實現細節

### 可見性檢測

```tsx
if (!isVisible) {
  // 顯示骨架屏，不進行任何 API 請求
  return <SkeletonComponent />;
}

// 只有可見時才渲染實際組件並啟用 API
return <ConditionalStockBox enabled={true} />;
```

### SWR 條件請求

```tsx
useSWR(
  enabled ? url : null, // key 為 null 時不發送請求
  fetcher
);
```

## 注意事項

1. **調試模式**: 生產環境請設置 `showDebug={false}`
2. **項目高度**: 根據實際 StockBox 高度調整 `itemHeight`
3. **響應式**: 可能需要根據螢幕尺寸調整高度計算
4. **網路優化**: 系統會自動管理 API 請求，無需手動干預

## 測試建議

1. 開啟調試模式觀察 API 請求數量
2. 快速滾動查看請求數量變化
3. 檢查網路面板確認只有可見項目在請求數據
4. 驗證滾動性能是否流暢

這個實現確保了 **只有真正出現在畫面上的股票才會進行 API 請求**，完全滿足您的需求！
