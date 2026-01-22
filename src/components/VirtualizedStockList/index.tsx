import { Box, Grid, useMediaQuery, useTheme } from "@mui/material";
import { useCallback, useMemo, useState } from "react";
import { FixedSizeList as List } from "react-window";
import { StockStoreType } from "../../types";
import DebugInfo from "../DebugInfo";
import LazyStockBox from "../StockBox/LazyStockBox";

interface VirtualizedStockListProps {
  stocks: StockStoreType[];
  height: number;
  width?: number | string;
  itemHeight: number;
  showDebug?: boolean;
  renderItem?: (stock: StockStoreType, isVisible: boolean) => React.ReactNode;
}

export default function VirtualizedStockList({
  stocks,
  height,
  width = "calc(100% - 8px)",
  itemHeight = 400,
  showDebug = false,
  renderItem,
}: VirtualizedStockListProps) {
  const [visibleStartIndex, setVisibleStartIndex] = useState(0);
  const [visibleStopIndex, setVisibleStopIndex] = useState(0);
  const theme = useTheme();

  // RWD Breakpoints
  const isSm = useMediaQuery(theme.breakpoints.up("sm"));
  const isMd = useMediaQuery(theme.breakpoints.up("md"));

  // Calculate columns based on breakpoint
  const columns = useMemo(() => {
    if (isMd) return 3;
    if (isSm) return 2;
    return 1;
  }, [isMd, isSm]);

  const rowCount = Math.ceil(stocks.length / columns);

  // Calculate visibility based on rows
  const isItemVisible = useCallback(
    (index: number) => {
      const rowIndex = Math.floor(index / columns);
      return rowIndex >= visibleStartIndex && rowIndex <= visibleStopIndex;
    },
    [visibleStartIndex, visibleStopIndex, columns],
  );

  const Row = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const startIndex = index * columns;
      const rowStocks = [];

      for (let i = 0; i < columns; i++) {
        const stockIndex = startIndex + i;
        if (stockIndex < stocks.length) {
          rowStocks.push({ stock: stocks[stockIndex], index: stockIndex });
        }
      }

      if (rowStocks.length === 0) {
        return null;
      }

      return (
        <Box style={{ ...style, overflow: "hidden" }}>
          <Grid
            container
            spacing={1}
            sx={{ px: 1, py: 1, height: "100%", boxSizing: "border-box" }}
          >
            {rowStocks.map(({ stock, index: stockIndex }) => (
              <Grid
                size={12 / columns}
                key={stock.id}
                sx={{ height: "100%", boxSizing: "border-box" }}
              >
                {renderItem ? (
                  renderItem(stock, isItemVisible(stockIndex))
                ) : (
                  <LazyStockBox
                    stock={stock}
                    isVisible={isItemVisible(stockIndex)}
                  />
                )}
              </Grid>
            ))}
          </Grid>
        </Box>
      );
    },
    [stocks, isItemVisible, columns, renderItem],
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
    [],
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
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            "&::-webkit-scrollbar": {
              display: "none",
            },
          },
        }}
      >
        <List
          height={height}
          width={width}
          itemCount={rowCount}
          itemSize={itemHeight}
          onItemsRendered={onItemsRendered}
        >
          {Row}
        </List>
      </Box>
    </>
  );
}
