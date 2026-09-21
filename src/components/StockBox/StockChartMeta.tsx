import { Box, Typography } from "@mui/material";
import { semanticTokens } from "../../theme";

interface StockChartMetaProps {
  periodLabel: string;
  updatedLabel: string;
}

export default function StockChartMeta({ periodLabel, updatedLabel }: StockChartMetaProps) {
  return (
    <Box sx={{ minHeight: 20, px: 1, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, color: semanticTokens.analysis.textMuted, fontVariantNumeric: "tabular-nums" }}>
      <Typography variant="caption" noWrap sx={{ fontSize: "11px", lineHeight: 1.2 }}>{periodLabel}</Typography>
      <Typography variant="caption" noWrap sx={{ fontSize: "11px", lineHeight: 1.2, textAlign: "right" }}>{updatedLabel}</Typography>
    </Box>
  );
}
