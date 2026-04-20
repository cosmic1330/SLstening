import { Box, Grid, useMediaQuery, useTheme } from "@mui/material";
import React, { memo, useMemo } from "react";
import { FixedSizeList as List } from "react-window";
import { StockStoreType } from "../../types";
import LazyStockBox from "../StockBox/LazyStockBox";

interface VirtualizedStockListProps {
  stocks: StockStoreType[];
  height: number;
  width?: number | string;
  itemHeight: number;
  showDebug?: boolean;
  renderItem?: (stock: StockStoreType) => React.ReactNode;
}

/**
 * StockRow 元件
 * 使用 memo 優化，確保只有在 data (stocks/columns) 發生變化時才重繪。
 * 捲動時 react-window 會更換 index/style，但不會重新建立此元件。
 */
const StockRow = memo(
  ({
    index,
    style,
    data,
  }: {
    index: number;
    style: React.CSSProperties;
    data: {
      stocks: StockStoreType[];
      columns: number;
      renderItem?: (stock: StockStoreType) => React.ReactNode;
    };
  }) => {
    const { stocks, columns, renderItem } = data;
    const startIndex = index * columns;
    const rowStocks = [];

    for (let i = 0; i < columns; i++) {
      const stockIndex = startIndex + i;
      if (stockIndex < stocks.length) {
        rowStocks.push(stocks[stockIndex]);
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
          {rowStocks.map((stock) => (
            <Grid
              size={12 / columns}
              key={stock.id}
              sx={{ height: "100%", boxSizing: "border-box" }}
            >
              {renderItem ? (
                renderItem(stock)
              ) : (
                <LazyStockBox stock={stock} />
              )}
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  },
);

StockRow.displayName = "StockRow";

export default function VirtualizedStockList({
  stocks,
  height,
  width = "calc(100% - 8px)",
  itemHeight = 400,
  renderItem,
}: VirtualizedStockListProps) {
  const theme = useTheme();

  // RWD Breakpoints - 決定顯示幾欄
  const isSm = useMediaQuery(theme.breakpoints.up("sm"));
  const isMd = useMediaQuery(theme.breakpoints.up("md"));

  const columns = useMemo(() => {
    if (isMd) return 3;
    if (isSm) return 2;
    return 1;
  }, [isMd, isSm]);

  const rowCount = Math.ceil(stocks.length / columns);

  // 優化點：將資料傳入 itemData，避免 Row 閉包造成的重繪
  const itemData = useMemo(
    () => ({
      stocks,
      columns,
      renderItem,
    }),
    [stocks, columns, renderItem],
  );

  return (
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
        itemData={itemData}
      >
        {StockRow}
      </List>
    </Box>
  );
}
