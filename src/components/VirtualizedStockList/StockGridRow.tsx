import { Box, Grid } from "@mui/material";
import { memo } from "react";
import { StockStoreType } from "../../types";
import LazyStockBox from "../StockBox/LazyStockBox";

export interface StockGridRowData {
  stocks: StockStoreType[];
  columns: number;
  header: React.ReactNode;
  renderItem?: (stock: StockStoreType) => React.ReactNode;
}

export interface StockGridRowProps {
  index: number;
  style: React.CSSProperties;
  data: StockGridRowData;
}

function StockGridRow({ index, style, data }: StockGridRowProps) {
  const { stocks, columns, renderItem, header } = data;

  if (index === 0 && header) {
    return <Box style={style} sx={{ pointerEvents: "none" }} />;
  }

  const realRowIndex = header ? index - 1 : index;
  const startIndex = realRowIndex * columns;
  const rowStocks = stocks.slice(startIndex, startIndex + columns);
  if (!rowStocks.length) return null;

  return (
    <Box style={style}>
      <Grid container spacing={1} sx={{ px: 1, py: 1, height: "100%", boxSizing: "border-box" }}>
        {rowStocks.map((stock) => (
          <Grid size={12 / columns} key={stock.id} sx={{ height: "100%", boxSizing: "border-box", minWidth: 0 }}>
            {renderItem ? renderItem(stock) : <LazyStockBox stock={stock} />}
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

export default memo(StockGridRow);
