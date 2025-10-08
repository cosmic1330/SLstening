# 虛擬化股票列表實現

## 概述

此實現解決了在 TurnoverRate 頁面中加載大量股票數據時的性能問題。通過使用虛擬化技術，只有在可視區域內的 StockBox 組件才會進行 API 請求，大大提升了頁面性能。

## 主要組件

### 1. LazyStockBox (`src/components/StockBox/LazyStockBox.tsx`)

- **功能**: 延遲加載的 StockBox 組件
- **特點**:
  - 只有當組件進入可視區域時才開始加載股票數據
  - 提供美觀的骨架屏效果
  - 100ms 延遲加載以避免過於頻繁的 API 請求

### 2. VirtualizedStockList (`src/components/VirtualizedStockList/index.tsx`)

- **功能**: 虛擬化的股票列表容器
- **特點**:
  - 使用 `react-window` 實現虛擬化滾動
  - 自動管理可視區域項目
  - 提供 2 項緩衝區域以提升用戶體驗
  - 可自定義高度和項目大小

### 3. TurnoverRate 頁面 (`src/pages/Home/TurnoverRate/index.tsx`)

- **更新**: 替換原有的 map 渲染方式為虛擬化列表
- **特點**:
  - 動態計算可視區域高度
  - 根據實際 StockBox 大小調整項目高度

## 性能優勢

1. **減少初始渲染負擔**: 只渲染可視區域內的組件
2. **按需加載數據**: 只有可見的股票才會進行 API 請求
3. **更少的 DOM 節點**: 大幅減少 DOM 節點數量
4. **更流暢的滾動**: 虛擬化提供更好的滾動性能

## 使用方式

```tsx
<VirtualizedStockList
  stocks={stocks} // 股票數據陣列
  height={viewportHeight} // 可視區域高度
  itemHeight={280} // 每個項目的估計高度
  canDelete={false} // 是否允許刪除
/>
```

## 參數說明

- `stocks`: StockStoreType[] - 股票數據陣列
- `height`: number - 虛擬化列表的可視區域高度
- `width`: number | string - 列表寬度（可選，默認 "100%"）
- `itemHeight`: number - 每個 StockBox 的估計高度
- `canDelete`: boolean - 是否顯示刪除按鈕

## 技術依賴

- `react-window`: 虛擬化滾動核心庫
- `react-window-infinite-loader`: 無限滾動支持（未來擴展用）
- `@mui/material`: UI 組件和骨架屏

## 注意事項

1. **項目高度**: `itemHeight` 需要根據實際的 StockBox 高度進行調整
2. **緩衝區域**: 目前設置為 2 項，可以根據需要調整
3. **延遲加載**: LazyStockBox 有 100ms 的延遲，可以根據需要調整
4. **響應式**: 可能需要根據不同屏幕尺寸調整 `viewportHeight` 計算

## 未來擴展

- 支持無限滾動加載更多數據
- 支持動態項目高度
- 支持橫向虛擬化
- 支持項目重用優化
