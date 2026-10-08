import { Box, Grid, Skeleton, Stack } from "@mui/material";
import { semanticTokens } from "../../../../theme";
import { STOCK_BOX_HEIGHT } from "../../../../components/StockBox/constants";
import { WATCHLIST_RADIUS } from "../../../../components/StockBox/constants";

export default function WatchlistLoadingState() {
  return (
    <Box p={{ xs: 1.5, sm: 2 }} height="100%" bgcolor={semanticTokens.analysis.canvas}>
      <Stack spacing={1.5}>
        <Skeleton variant="rounded" animation={false} height={56} sx={{ bgcolor: semanticTokens.analysis.surfaceSubtle, borderRadius: WATCHLIST_RADIUS }} />
        <Skeleton variant="rounded" animation={false} height={44} sx={{ bgcolor: semanticTokens.analysis.surfaceSubtle, borderRadius: WATCHLIST_RADIUS }} />
        <Grid container spacing={1}>
          {Array.from({ length: 6 }, (_, index) => (
            <Grid key={index} size={{ xs: 12, sm: 6, md: 4 }}>
              <Skeleton variant="rounded" animation={false} height={STOCK_BOX_HEIGHT} sx={{ bgcolor: semanticTokens.analysis.surfaceGlass, borderRadius: WATCHLIST_RADIUS }} />
            </Grid>
          ))}
        </Grid>
      </Stack>
    </Box>
  );
}
