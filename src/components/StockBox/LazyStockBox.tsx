import { Box, Grid, Skeleton, Typography, styled } from "@mui/material";
import { useMemo, useRef, useState, useEffect } from "react";
import { useIsVisible } from "../../hooks/useIsVisible";
import useStocksStore from "../../store/Stock.store";
import { StockStoreType } from "../../types";
import StockBox from "./index";

const StyledBox = styled(Box)`
  background-color: rgba(30, 30, 35, 0.4);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 1.5rem;
  border-radius: 24px;
  color: #fff;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`;

interface LazyStockBoxProps {
  stock: StockStoreType;
  canDelete?: boolean;
  onRemove?: () => void;
}

export default function LazyStockBox({
  stock,
  canDelete: forcedCanDelete,
  onRemove,
}: LazyStockBoxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // 改為自主探測可見性，減少父組件重繪壓力
  const isVisible = useIsVisible(containerRef);

  // 引入 hasBeenVisible 機制，避免快速滾動時在 Skeleton 和 StockBox 間來回銷毀/掛載
  const [hasBeenVisible, setHasBeenVisible] = useState(false);
  useEffect(() => {
    if (isVisible) {
      setHasBeenVisible(true);
    }
  }, [isVisible]);

  // 取得監測中的股票列表
  const { stocks: monitoredStocks } = useStocksStore();

  // 只有在曾經可見時才計算監測狀態
  const { canDelete: calculatedCanDelete, canAdd } = useMemo(() => {
    if (!hasBeenVisible) {
      return { canDelete: false, canAdd: false };
    }

    const isMonitored = monitoredStocks.some(
      (monitoredStock) => monitoredStock.id === stock.id,
    );
    return {
      canDelete: isMonitored,
      canAdd: !isMonitored,
    };
  }, [hasBeenVisible, monitoredStocks, stock.id]);

  const finalCanDelete =
    forcedCanDelete !== undefined ? forcedCanDelete : calculatedCanDelete;

  return (
    <Box ref={containerRef} sx={{ height: "100%" }}>
      {!hasBeenVisible ? (
        <StyledBox>
          <Box>
            <Grid container alignItems="center" spacing={2} mb={3}>
              <Grid size={5}>
                <Skeleton
                  variant="rectangular"
                  width="100%"
                  height={40}
                  sx={{
                    bgcolor: "rgba(255, 255, 255, 0.05)",
                    borderRadius: "12px",
                  }}
                />
              </Grid>
              <Grid size={7}>
                <Skeleton
                  variant="text"
                  width="60%"
                  height={24}
                  sx={{ bgcolor: "rgba(255, 255, 255, 0.05)" }}
                />
              </Grid>
            </Grid>

            <Grid container spacing={2} mb={2}>
              {Array.from({ length: 4 }).map((_, index) => (
                <Grid size={6} key={index}>
                  <Skeleton
                    variant="text"
                    width="40%"
                    sx={{ bgcolor: "rgba(255, 255, 255, 0.03)" }}
                  />
                  <Skeleton
                    variant="text"
                    width="80%"
                    height={32}
                    sx={{ bgcolor: "rgba(255, 255, 255, 0.05)" }}
                  />
                </Grid>
              ))}
            </Grid>
          </Box>

          <Box>
            <Skeleton
              variant="rectangular"
              width="100%"
              height={60}
              sx={{
                bgcolor: "rgba(255, 255, 255, 0.03)",
                borderRadius: "16px",
              }}
            />
            <Typography
              variant="caption"
              sx={{
                color: "rgba(255, 255, 255, 0.3)",
                display: "block",
                textAlign: "center",
                mt: 1,
                fontWeight: 600,
              }}
            >
              {stock.id} {stock.name}
            </Typography>
          </Box>
        </StyledBox>
      ) : (
        <StockBox
          stock={stock}
          canDelete={finalCanDelete}
          canAdd={canAdd}
          enabled={true}
          onRemove={onRemove}
          isVisible={isVisible}
        />
      )}
    </Box>
  );
}
