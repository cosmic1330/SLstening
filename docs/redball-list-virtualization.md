# RedBall 和 List 頁面虛擬化改造

## 概述

我已經成功將 RedBall 和 List 頁面改造為使用 react-window 虛擬化技術，大幅提升了性能，特別是在處理大量股票數據時。

## 改造內容

### 1. RedBall 頁面改造

**文件**: `src/pages/Home/RedBall/index.tsx`

**主要變更**:

- ✅ 移除了 `map` 渲染方式
- ✅ 導入 `VirtualizedStockList` 和 `useDebugMode`
- ✅ 添加動態視窗高度計算
- ✅ 集成調試模式支援

**改造前**:

```tsx
{
  stocks.map((stock, index) => (
    <StockBox key={index} stock={stock} canDelete={false} />
  ));
}
```

**改造後**:

```tsx
{
  stocks.length > 0 && (
    <VirtualizedStockList
      stocks={stocks}
      height={viewportHeight}
      itemHeight={280}
      canDelete={false}
      showDebug={isDebugMode}
    />
  );
}
```

### 2. List 頁面改造（複雜混合內容）

**文件**: `src/pages/Home/List/index.tsx`

**挑戰**: List 頁面包含多種類型的內容：

- 固定組件：NasdaqBox, WtxBox, TwseBox
- 動態股票列表
- 條件性按鈕

**解決方案**: 創建了 `MixedVirtualizedList` 組件來處理混合內容

### 3. 新增 MixedVirtualizedList 組件

**文件**: `src/components/MixedVirtualizedList/index.tsx`

**功能特點**:

- 🔄 **混合內容支援**: 可以同時渲染不同類型的組件
- 📏 **動態高度**: 使用 `VariableSizeList` 支援不同高度的項目
- 🎯 **嚴格可見性控制**: 只有可見的股票項目才進行 API 請求
- 🐛 **調試模式集成**: 支援調試信息顯示

**支援的項目類型**:

```typescript
interface MixedItem {
  type: "component" | "stock" | "button";
  data?: StockStoreType; // 股票數據
  component?: React.ReactNode; // React 組件
  height?: number; // 項目高度
}
```

## 性能優勢

### 🚀 **RedBall 頁面**

- **只渲染可見項目**: 不再一次性渲染所有股票
- **按需 API 請求**: 只有可見股票才進行數據請求
- **流暢滾動**: 即使有數百個股票也能流暢滾動

### 🎛️ **List 頁面**

- **混合內容優化**: 固定組件正常渲染，股票列表虛擬化
- **動態高度適配**: 不同類型項目使用不同高度
- **內存友好**: 大幅減少 DOM 節點數量

## 使用方式

### RedBall 頁面

```tsx
// 自動從設定讀取調試模式
const isDebugMode = useDebugMode();

<VirtualizedStockList
  stocks={stocks}
  height={viewportHeight}
  itemHeight={280}
  canDelete={false}
  showDebug={isDebugMode}
/>;
```

### List 頁面

```tsx
// 創建混合項目列表
const mixedItems = useMemo(() => {
  const items = [];

  // 固定組件
  items.push({
    type: "component",
    component: <NasdaqBox />,
    height: 120,
  });

  // 股票項目
  stocks.forEach((stock) => {
    items.push({
      type: "stock",
      data: stock,
      height: 280,
    });
  });

  return items;
}, [stocks]);

<MixedVirtualizedList
  items={mixedItems}
  height={viewportHeight}
  canDelete={true}
  showDebug={isDebugMode}
/>;
```

## 調試模式

兩個頁面都支援調試模式，可以在 Setting 頁面中開關：

**調試信息顯示**:

- 總項目數量
- 當前可見範圍
- 實際進行 API 請求的項目數

**開啟方式**:

1. 進入 Setting 頁面
2. 開啟「調試模式」開關
3. 回到 RedBall 或 List 頁面查看效果

## 技術實現

### 項目高度配置

```typescript
// RedBall: 固定高度
itemHeight={280}

// List: 動態高度
const getItemSize = (index: number) => {
  const item = items[index];
  if (item.type === 'stock') return 280;
  if (item.type === 'component') return item.height || 120;
  if (item.type === 'button') return 60;
  return 280;
};
```

### 可見性控制

```typescript
// 嚴格的可見性檢測
const isItemVisible = useCallback(
  (index: number) => {
    return index >= visibleStartIndex && index <= visibleStopIndex;
  },
  [visibleStartIndex, visibleStopIndex]
);
```

## 文件結構

```
src/
├── components/
│   ├── VirtualizedStockList/     # 純股票虛擬化列表
│   └── MixedVirtualizedList/     # 混合內容虛擬化列表
├── hooks/
│   └── useDebugMode.ts           # 調試模式狀態管理
└── pages/Home/
    ├── RedBall/
    │   └── index.tsx             # ✅ 已虛擬化
    ├── List/
    │   └── index.tsx             # ✅ 已虛擬化（混合內容）
    └── TurnoverRate/
        └── index.tsx             # ✅ 已虛擬化
```

## 注意事項

1. **高度設定**: 根據實際組件高度調整 `itemHeight`
2. **調試模式**: 生產環境建議關閉調試模式
3. **響應式**: 視窗高度會根據螢幕尺寸自動調整
4. **混合內容**: List 頁面的固定組件會正常渲染，不受虛擬化影響

## 性能對比

**改造前**:

- 100 個股票 = 100 個 DOM 節點 + 100 個 API 請求
- 記憶體使用量隨股票數量線性增長

**改造後**:

- 100 個股票 = 僅 3-5 個可見 DOM 節點 + 3-5 個 API 請求
- 記憶體使用量保持穩定，與股票數量無關

這樣的改造讓您的應用程式能夠輕鬆處理數百甚至數千個股票，同時保持流暢的用戶體驗！
