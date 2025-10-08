import { Box } from "@mui/material";
import { useCallback, useState } from "react";
import { FixedSizeList as List } from "react-window";
import { StockStoreType } from "../../types";
import DebugInfo from "../DebugInfo";
import LazyStockBox from "../StockBox/LazyStockBox";

interface VirtualizedStockListProps {
  stocks: StockStoreType[];
  height: number;
  width?: number | string;
  itemHeight: number;
  canDelete?: boolean;
  showDebug?: boolean; // 添加調試選項
}

export default function VirtualizedStockList({
  stocks,
  height,
  width = "calc(100% - 8px)",
  itemHeight = 200, // StockBox 的估計高度
  canDelete = false,
  showDebug = false, // 默認不顯示調試信息
}: VirtualizedStockListProps) {
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
      const stock = stocks[index];
      if (!stock) {
        return (
            <Box
              style={{
                height: itemHeight,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
              }}
            >
              Loading...
            </Box>
        );
      }

      return (
        <Box style={style}>
          <LazyStockBox
            stock={stock}
            canDelete={canDelete}
            isVisible={isItemVisible(index)}
          />
        </Box>
      );
    },
    [stocks, canDelete, isItemVisible, itemHeight]
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

  return (
    <>
      {showDebug && (
        <DebugInfo
          visibleStartIndex={visibleStartIndex}
          visibleStopIndex={visibleStopIndex}
          totalItems={stocks.length}
        />
      )}
      <Box
        sx={{
          "& > div": {
            // 隱藏滾動條但保持滾動功能
            scrollbarWidth: "none", // Firefox
            msOverflowStyle: "none", // IE and Edge
            "&::-webkit-scrollbar": {
              display: "none", // WebKit 瀏覽器
            },
          },
        }}
      >
        <List
          height={height}
          width={width}
          itemCount={stocks.length}
          itemSize={itemHeight}
          onItemsRendered={onItemsRendered}
        >
          {Row}
        </List>
      </Box>
    </>
  );
}
