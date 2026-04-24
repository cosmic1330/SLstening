import { Box, Grid, useMediaQuery, useTheme } from "@mui/material";
import React, {
  forwardRef,
  memo,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { VariableSizeList as List } from "react-window";
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
 * 單純作為捲動視窗，不放置 Header 以免干擾位移
 */
const OuterElement = forwardRef<HTMLDivElement, any>(
  ({ children, style, ...rest }, ref) => {
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
        {children}
      </div>
    );
  },
);

/**
 * 自定義內容容器 (Inner)
 * 在這裡放置持久掛載的 Header，使其與 Spacer 完美重合
 */
const InnerElement = forwardRef<HTMLDivElement, any>(
  ({ children, style, ...rest }, ref) => {
    const { header, headerRef } = useContext(VirtualScrollContext);

    return (
      <div
        ref={ref}
        style={{
          ...style,
          position: "relative",
        }}
        {...rest}
      >
        {/* 持久掛載的 Header 實體，座標與 Spacer (index 0) 相同 */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            zIndex: 10,
          }}
        >
          <div ref={headerRef}>{header}</div>
        </div>

        {/* 這裡包含所有虛擬化項目（包括位於 index 0 的 Spacer） */}
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
      header: React.ReactNode;
      renderItem?: (stock: StockStoreType) => React.ReactNode;
    };
  }) => {
    const { stocks, columns, renderItem, header } = data;

    // Index 0 是透明佔位符，為 InnerElement 內的 Header 實體預留空間
    if (index === 0 && header) {
      return <Box style={style} sx={{ pointerEvents: "none" }} />;
    }

    // 計算股票索引，需扣除佔用 index 0 的 Spacer
    const realRowIndex = header ? index - 1 : index;
    const startIndex = realRowIndex * columns;
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
  const listRef = useRef<List>(null);

  const headerRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) observerRef.current.disconnect();
      if (node) {
        const observer = new ResizeObserver((entries) => {
          const h = entries[0]?.contentRect.height || 0;
          if (Math.abs(h - headerHeight) > 1) {
            setHeaderHeight(h);
            // 當高度改變時，必須重置快取以確保 Spacer 大小正確
            setTimeout(() => {
              listRef.current?.resetAfterIndex(0);
            }, 0);
          }
        });
        observer.observe(node);
        observerRef.current = observer;
      }
    },
    [headerHeight],
  );

  const isSm = useMediaQuery(theme.breakpoints.up("sm"));
  const isMd = useMediaQuery(theme.breakpoints.up("md"));

  const columns = useMemo(() => {
    if (isMd) return 3;
    if (isSm) return 2;
    return 1;
  }, [isMd, isSm]);

  const rowCount = Math.ceil((stocks?.length || 0) / columns);
  const itemCount = header ? rowCount + 1 : rowCount;

  const getItemSize = React.useCallback(
    (index: number) => {
      if (index === 0 && header) {
        return headerHeight || 180;
      }
      return itemHeight;
    },
    [header, headerHeight, itemHeight],
  );

  const itemData = useMemo(
    () => ({
      stocks,
      columns,
      renderItem,
      header,
    }),
    [stocks, columns, renderItem, header],
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

  // 當股票變動時重置快取
  useEffect(() => {
    listRef.current?.resetAfterIndex(0);
  }, [stocks.length, columns]);

  return (
    <VirtualScrollContext.Provider value={contextValue}>
      <List
        ref={listRef}
        height={safeHeight}
        width={width}
        itemCount={itemCount}
        itemSize={getItemSize}
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
