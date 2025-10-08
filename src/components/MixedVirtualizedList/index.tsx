import { Box } from "@mui/material";
import { useCallback, useState } from "react";
import { VariableSizeList as List } from "react-window";
import { StockStoreType } from "../../types";
import DebugInfo from "../DebugInfo";
import LazyStockBox from "../StockBox/LazyStockBox";

interface MixedItem {
  type: "component" | "stock" | "button";
  data?: StockStoreType;
  component?: React.ReactNode;
  height?: number;
}

interface MixedVirtualizedListProps {
  items: MixedItem[];
  height: number;
  width?: number | string;
  canDelete?: boolean;
  showDebug?: boolean;
}

export default function MixedVirtualizedList({
  items,
  height,
  width = "100%",
  canDelete = true,
  showDebug = false,
}: MixedVirtualizedListProps) {
  const [visibleStartIndex, setVisibleStartIndex] = useState(0);
  const [visibleStopIndex, setVisibleStopIndex] = useState(0);

  // 計算哪些項目應該被認為是"可見的" - 只有真正在可視區域內的才算可見
  const isItemVisible = useCallback(
    (index: number) => {
      // 不使用緩衝區域，只有真正可見的項目才加載
      return index >= visibleStartIndex && index <= visibleStopIndex;
    },
    [visibleStartIndex, visibleStopIndex]
  );

  const Row = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const item = items[index];

      if (!item) {
        return (
          <div style={style}>
            <div
              style={{
                height: 280,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
              }}
            >
              Loading...
            </div>
          </div>
        );
      }

      if (item.type === "component") {
        // 固定組件（如 NasdaqBox, WtxBox, TwseBox）
        return <div style={style}>{item.component}</div>;
      }

      if (item.type === "button") {
        // 按鈕組件
        return <div style={style}>{item.component}</div>;
      }

      if (item.type === "stock" && item.data) {
        // 股票組件
        return (
          <Box style={style}>
            <LazyStockBox
              stock={item.data}
              canDelete={canDelete}
              isVisible={isItemVisible(index)}
            />
          </Box>
        );
      }

      return <div style={style}></div>;
    },
    [items, canDelete, isItemVisible]
  );

  const onItemsRendered = useCallback(
    ({
      visibleStartIndex,
      visibleStopIndex,
    }: {
      visibleStartIndex: number;
      visibleStopIndex: number;
    }) => {
      setVisibleStartIndex(visibleStartIndex);
      setVisibleStopIndex(visibleStopIndex);
    },
    []
  );

  // 計算每個項目的高度
  const getItemSize = useCallback(
    (index: number) => {
      const item = items[index];
      if (item.height) return item.height;
      if (item.type === "stock") return 280;
      if (item.type === "component") return item.height || 120;
      if (item.type === "button") return 60;
      return 280;
    },
    [items]
  );

  return (
    <>
      {showDebug && (
        <DebugInfo
          visibleStartIndex={visibleStartIndex}
          visibleStopIndex={visibleStopIndex}
          totalItems={items.length}
        />
      )}
      <List
        height={height}
        width={width}
        itemCount={items.length}
        itemSize={getItemSize}
        onItemsRendered={onItemsRendered}
      >
        {Row}
      </List>
    </>
  );
}
