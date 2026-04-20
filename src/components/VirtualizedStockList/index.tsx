import { Box, Grid, useMediaQuery, useTheme } from "@mui/material";
import React, { forwardRef, memo, useMemo, useRef, useState } from "react";
import { FixedSizeList as List } from "react-window";
import { StockStoreType } from "../../types";
import LazyStockBox from "../StockBox/LazyStockBox";

interface VirtualizedStockListProps {
  stocks: StockStoreType[];
  height: number;
  width?: number | string;
  itemHeight: number;
  header?: React.ReactNode;
  renderItem?: (stock: StockStoreType) => React.ReactNode;
}

const VirtualScrollContext = React.createContext<{
  header: React.ReactNode;
  headerHeight: number;
  headerRef: (node: HTMLDivElement | null) => void;
}>({
  header: null,
  headerHeight: 0,
  headerRef: () => {},
});

/**
 * 自定義捲動容器 (Outer)
 * Header 使用標準文件流 (flow)，會自然地將下方的列表內容推開
 */
const OuterElement = forwardRef<HTMLDivElement, any>(
  ({ children, style, ...rest }, ref) => {
    const { header, headerRef } = React.useContext(VirtualScrollContext);
    return (
      <div
        ref={ref}
        style={{
          ...style,
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          overflowY: "auto",
          overflowX: "hidden",
        }}
        {...rest}
      >
        <div ref={headerRef} style={{ width: "100%" }}>
          {header}
        </div>
        {children}
      </div>
    );
  },
);

/**
 * 自定義內容容器 (Inner)
 * 只需要增加總高度即可，不需要額外的位移，因為它在層級上跟在 Header 之後
 */
const InnerElement = forwardRef<HTMLDivElement, any>(
  ({ children, style, ...rest }, ref) => {
    return (
      <div
        ref={ref}
        style={{
          ...style,
          position: "relative",
        }}
        {...rest}
      >
        {/* 修正：移除這裡的 absolute 偏移，因為父容器中的 Header 已經佔位 */}
        {children}
      </div>
    );
  },
);

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
      if (stockIndex < (stocks?.length || 0)) {
        rowStocks.push(stocks[stockIndex]);
      }
    }

    if (rowStocks.length === 0) return null;

    return (
      <Box style={style}>
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
              {renderItem ? renderItem(stock) : <LazyStockBox stock={stock} />}
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  },
);

StockRow.displayName = "StockRow";

export default function VirtualizedStockList({
  stocks = [],
  height,
  width = "100%",
  itemHeight = 280,
  header,
  renderItem,
}: VirtualizedStockListProps) {
  const theme = useTheme();
  const [headerHeight, setHeaderHeight] = useState(0);
  const observerRef = useRef<ResizeObserver | null>(null);

  const headerRef = React.useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) observerRef.current.disconnect();
    if (node) {
      const observer = new ResizeObserver((entries) => {
        const h = entries[0]?.contentRect.height || 0;
        setHeaderHeight(h);
      });
      observer.observe(node);
      observerRef.current = observer;
    }
  }, []);

  const isSm = useMediaQuery(theme.breakpoints.up("sm"));
  const isMd = useMediaQuery(theme.breakpoints.up("md"));

  const columns = useMemo(() => {
    if (isMd) return 3;
    if (isSm) return 2;
    return 1;
  }, [isMd, isSm]);

  const rowCount = Math.ceil((stocks?.length || 0) / columns);

  const itemData = useMemo(
    () => ({
      stocks,
      columns,
      renderItem,
    }),
    [stocks, columns, renderItem],
  );

  const contextValue = useMemo(
    () => ({
      header,
      headerHeight,
      headerRef,
    }),
    [header, headerHeight, headerRef],
  );

  const safeHeight = Math.max(height || 0, 100);

  return (
    <VirtualScrollContext.Provider value={contextValue}>
      <List
        height={safeHeight}
        width={width}
        itemCount={rowCount}
        itemSize={itemHeight}
        itemData={itemData}
        outerElementType={OuterElement}
        innerElementType={InnerElement}
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {StockRow}
      </List>
    </VirtualScrollContext.Provider>
  );
}
