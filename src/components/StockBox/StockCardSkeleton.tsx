import { Box, Grid, Skeleton, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import { semanticTokens } from "../../theme";
import { StockStoreType } from "../../types";

const SkeletonCard = styled(Box)(({ theme }) => ({
  backgroundColor: semanticTokens.analysis.surfaceGlass,
  border: `1px solid ${semanticTokens.analysis.borderSubtle}`,
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  color: semanticTokens.analysis.text,
  minWidth: 0,
  height: "100%",
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
}));

export default function StockCardSkeleton({ stock }: { stock: StockStoreType }) {
  const skeleton = semanticTokens.analysis.surfaceSubtle;
  const secondarySkeleton = semanticTokens.analysis.inset;
  return (
    <SkeletonCard>
      <Box>
        <Grid container alignItems="center" spacing={1} mb={2}>
          <Grid size={5}><Skeleton animation={false} variant="rectangular" width="100%" height={40} sx={{ bgcolor: skeleton, borderRadius: 1 }} /></Grid>
          <Grid size={7}><Skeleton animation={false} variant="text" width="60%" height={24} sx={{ bgcolor: skeleton }} /></Grid>
        </Grid>
        <Grid container spacing={1} mb={2}>
          {Array.from({ length: 4 }).map((_, index) => (
            <Grid size={6} key={index}>
              <Skeleton animation={false} variant="text" width="40%" sx={{ bgcolor: secondarySkeleton }} />
              <Skeleton animation={false} variant="text" width="80%" height={32} sx={{ bgcolor: skeleton }} />
            </Grid>
          ))}
        </Grid>
      </Box>
      <Box>
        <Skeleton animation={false} variant="rectangular" width="100%" height={60} sx={{ bgcolor: secondarySkeleton, borderRadius: 1.5 }} />
        <Typography variant="caption" sx={{ color: semanticTokens.analysis.textMuted, display: "block", textAlign: "center", mt: 1, fontWeight: 600 }}>{stock.id} {stock.name}</Typography>
      </Box>
    </SkeletonCard>
  );
}
