import {
  Add as AddIcon,
  PlaylistAdd as AddListIcon,
} from "@mui/icons-material";
import { Box, Stack, Typography } from "@mui/material";
import { STOCK_BOX_HEIGHT } from "../../../../components/StockBox";
import LazyStockBox from "../../../../components/StockBox/LazyStockBox";
import VirtualizedStockList from "../../../../components/VirtualizedStockList";
import { StockStoreType } from "../../../../types";

interface StockWorkspaceProps {
  stocks: StockStoreType[];
  hasCategory: boolean;
  onRemoveStock: (stockId: string) => void;
}

export default function StockWorkspace({
  stocks,
  hasCategory,
  onRemoveStock,
}: StockWorkspaceProps) {
  return (
    <Box sx={{ flex: 1, pb: "140px" }}>
      {hasCategory ? (
        stocks.length > 0 ? (
          <VirtualizedStockList
            stocks={stocks}
            height={window.innerHeight} // Scrolling container handled by PageContainer
            itemHeight={STOCK_BOX_HEIGHT}
            renderItem={(stock, isVisible) => (
              <LazyStockBox
                stock={stock}
                isVisible={isVisible}
                canDelete={false}
                onRemove={() => onRemoveStock(stock.id)}
              />
            )}
          />
        ) : (
          <Stack
            alignItems="center"
            justifyContent="center"
            height="80vh"
            sx={{ opacity: 0.25 }}
          >
            <AddListIcon sx={{ fontSize: 100, mb: 3 }} />
            <Typography variant="h5" fontWeight="700">
              分類尚無內容
            </Typography>
            <Typography variant="body1">
              使用上方搜尋列，快速充實您的自選名單
            </Typography>
          </Stack>
        )
      ) : (
        <Stack
          alignItems="center"
          justifyContent="center"
          height="80vh"
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
            請選擇或新增分類
          </Typography>
        </Stack>
      )}
    </Box>
  );
}
