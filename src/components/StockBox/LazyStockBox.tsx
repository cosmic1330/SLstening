import { Box, Grid, Skeleton, Typography, styled } from "@mui/material";
import { useMemo } from "react";
import useStocksStore from "../../store/Stock.store";
import { StockStoreType } from "../../types";
import StockBox from "./index";

const StyledBox = styled(Box)`
  background-color: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 1rem;
  border-radius: 0.8rem;
  color: #fff;
`;

interface LazyStockBoxProps {
  stock: StockStoreType;
  isVisible: boolean;
}

export default function LazyStockBox({ stock, isVisible }: LazyStockBoxProps) {
  // 取得監測中的股票列表
  const { stocks: monitoredStocks } = useStocksStore();

  // 只有在可見時才計算監測狀態（效能優化）
  const { canDelete, canAdd } = useMemo(() => {
    if (!isVisible) {
      return { canDelete: false, canAdd: false };
    }

    const isMonitored = monitoredStocks.some(
      (monitoredStock) => monitoredStock.id === stock.id
    );
    return {
      canDelete: isMonitored,
      canAdd: !isMonitored,
    };
  }, [isVisible, monitoredStocks, stock.id]);
  // 直接根據 isVisible 來決定是否加載數據
  // 不再使用 shouldLoad 狀態，確保只有可見時才請求

  if (!isVisible) {
    // 不可見時顯示骨架屏，不進行任何 API 請求
    return (
      <StyledBox>
        <Grid container alignItems="center">
          <Grid size={5}>
            <Skeleton
              variant="rectangular"
              width={120}
              height={32}
              sx={{ bgcolor: "rgba(255, 255, 255, 0.1)" }}
            />
          </Grid>
          <Grid size={7}>
            <Grid container spacing={1}>
              <Grid size={6}>
                <Skeleton
                  variant="text"
                  width="80%"
                  sx={{ bgcolor: "rgba(255, 255, 255, 0.1)" }}
                />
              </Grid>
              <Grid size={6}>
                <Skeleton
                  variant="text"
                  width="60%"
                  sx={{ bgcolor: "rgba(255, 255, 255, 0.1)" }}
                />
              </Grid>
            </Grid>
          </Grid>
        </Grid>
        <Grid container spacing={1} mb={1}>
          {Array.from({ length: 8 }).map((_, index) => (
            <Grid size={3} key={index}>
              <Skeleton
                variant="text"
                width="80%"
                sx={{ bgcolor: "rgba(255, 255, 255, 0.1)" }}
              />
              <Skeleton
                variant="text"
                width="60%"
                sx={{ bgcolor: "rgba(255, 255, 255, 0.1)" }}
              />
            </Grid>
          ))}
        </Grid>
        <Typography
          variant="caption"
          color="rgba(255, 255, 255, 0.6)"
          display="block"
          textAlign="center"
        >
          {stock.id} {stock.name}
        </Typography>
      </StyledBox>
    );
  }

  // 只有真正可見時才渲染實際的 StockBox 並啟用 API 請求
  return (
    <StockBox
      stock={stock}
      canDelete={canDelete}
      canAdd={canAdd}
      enabled={true}
    />
  );
}
