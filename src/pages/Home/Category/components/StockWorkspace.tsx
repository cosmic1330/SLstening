import {
  Add as AddIcon,
  PlaylistAdd as AddListIcon,
} from "@mui/icons-material";
import { Box, Stack, Typography } from "@mui/material";
import { STOCK_BOX_HEIGHT } from "../../../../components/StockBox";
import LazyStockBox from "../../../../components/StockBox/LazyStockBox";
import VirtualizedStockList from "../../../../components/VirtualizedStockList";
import useElementHeight from "../../../../hooks/useElementHeight";
import { StockStoreType } from "../../../../types";
import { useTranslation } from "react-i18next";

interface StockWorkspaceProps {
  stocks: StockStoreType[];
  hasCategory: boolean;
  onRemoveStock: (stockId: string) => void;
  header?: React.ReactNode;
}

export default function StockWorkspace({
  stocks,
  hasCategory,
  onRemoveStock,
  header,
}: StockWorkspaceProps) {
  const { t } = useTranslation();
  const { ref: workspaceRef, height: workspaceHeight } =
    useElementHeight<HTMLDivElement>();
  return (
    <Box ref={workspaceRef} sx={{ width: "100%", height: "100%" }}>
      {hasCategory ? (
        stocks.length > 0 ? (
          <VirtualizedStockList
            stocks={stocks}
            height={workspaceHeight}
            itemHeight={STOCK_BOX_HEIGHT}
            header={header}
            renderItem={(stock) => (
              <LazyStockBox
                stock={stock}
                canDelete={false}
                onRemove={() => onRemoveStock(stock.id)}
              />
            )}
          />
        ) : (
          <Box>
            {header}
            <Stack
              alignItems="center"
              justifyContent="center"
              height="60vh"
              sx={{ opacity: 0.25 }}
            >
              <AddListIcon sx={{ fontSize: 100, mb: 3 }} />
              <Typography variant="h5" fontWeight="700">
                {t("category.emptyStocks")}
              </Typography>
              <Typography variant="body1">
                {t("category.emptyStocksHint")}
              </Typography>
            </Stack>
          </Box>
        )
      ) : (
        <Box>
          {header}
          <Stack
            alignItems="center"
            justifyContent="center"
            height="60vh"
            sx={{ opacity: 0.15 }}
          >
            <Box
              sx={{
                p: 5,
                borderRadius: "50%",
                border: "2px dashed rgba(255,255,255,0.2)",
              }}
            >
              <AddIcon sx={{ fontSize: 80 }} />
            </Box>
            <Typography variant="h6" sx={{ mt: 3 }}>
              {t("category.selectOrAdd")}
            </Typography>
          </Stack>
        </Box>
      )}
    </Box>
  );
}
