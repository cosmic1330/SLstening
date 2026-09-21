import { useMediaQuery, useTheme } from "@mui/material";
import React, { useEffect, useMemo, useRef } from "react";
import { VariableSizeList as List } from "react-window";
import useElementHeight from "../../hooks/useElementHeight";
import { StockStoreType } from "../../types";
import { STOCK_BOX_HEIGHT } from "../StockBox/constants";
import StockGridRow, { StockGridRowData } from "./StockGridRow";
import {
  VirtualInnerElement,
  VirtualOuterElement,
  VirtualScrollContext,
} from "./virtualElements";

interface VirtualizedStockListProps {
  stocks: StockStoreType[];
  height: number;
  width?: number | string;
  itemHeight?: number;
  header?: React.ReactNode;
  renderItem?: (stock: StockStoreType) => React.ReactNode;
}

export default function VirtualizedStockList({
  stocks = [],
  height,
  width = "100%",
  itemHeight = STOCK_BOX_HEIGHT,
  header,
  renderItem,
}: VirtualizedStockListProps) {
  const theme = useTheme();
  const listRef = useRef<List<StockGridRowData>>(null);
  const { ref: headerRef, height: headerHeight } = useElementHeight<HTMLDivElement>();
  const isSm = useMediaQuery(theme.breakpoints.up("sm"));
  const isMd = useMediaQuery(theme.breakpoints.up("md"));
  const columns = useMemo(() => {
    if (isMd) return 3;
    if (isSm) return 2;
    return 1;
  }, [isMd, isSm]);

  const rowCount = Math.ceil(stocks.length / columns);
  const itemCount = header ? rowCount + 1 : rowCount;
  const getItemSize = React.useCallback(
    (index: number) => (index === 0 && header ? headerHeight || 180 : itemHeight),
    [header, headerHeight, itemHeight],
  );
  const itemData = useMemo<StockGridRowData>(
    () => ({ stocks, columns, renderItem, header }),
    [stocks, columns, renderItem, header],
  );
  const contextValue = useMemo(
    () => ({ header, headerRef }),
    [header, headerRef],
  );
  const safeHeight = Math.max(height || 0, 100);

  useEffect(() => {
    listRef.current?.resetAfterIndex(0);
  }, [stocks.length, columns, height, headerHeight]);

  return (
    <VirtualScrollContext.Provider value={contextValue}>
      <List
        ref={listRef}
        height={safeHeight}
        width={width}
        itemCount={itemCount}
        itemSize={getItemSize}
        itemData={itemData}
        outerElementType={VirtualOuterElement}
        innerElementType={VirtualInnerElement}
        overscanCount={2}
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {StockGridRow}
      </List>
    </VirtualScrollContext.Provider>
  );
}
