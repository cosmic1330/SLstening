import { Box } from "@mui/material";
import { useMemo, useRef, useState, useEffect } from "react";
import { useIsVisible } from "../../hooks/useIsVisible";
import useStocksStore from "../../store/Stock.store";
import { StockStoreType } from "../../types";
import StockBox from "./index";
import StockCardSkeleton from "./StockCardSkeleton";

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
  const monitoredStocks = useStocksStore((state) => state.stocks);

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
        <StockCardSkeleton stock={stock} />
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
