import { Box, Grid, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { semanticTokens } from "../../theme";
import { TaType, TickDealsType } from "../../types";
import { hasSamples, hasVolumeBaseline } from "../../utils/marketMetrics";
import AvgPrice from "./Items/AvgPrice";
import Ma10 from "./Items/Ma10";
import Ma20 from "./Items/Ma20";
import Ma5 from "./Items/Ma5";
import VolumeRatio from "./Items/VolumeRatio";

const MetricSurface = ({ children }: { children: React.ReactNode }) => (
  <Box sx={{ minWidth: 0, minHeight: 44, p: "0 6px", borderRadius: 1, bgcolor: semanticTokens.analysis.inset, border: `1px solid ${semanticTokens.analysis.borderSubtle}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", transition: "background-color 160ms ease, border-color 160ms ease", "&:hover": { bgcolor: semanticTokens.analysis.chartInset, borderColor: semanticTokens.analysis.border }, "@media (prefers-reduced-motion: reduce)": { transition: "none" } }}>
    {children}
  </Box>
);

interface StockMetricsGridProps {
  chartType: "mak" | "tick";
  deals: TaType;
  tickDeals: TickDealsType | null;
  lastPrice: number;
  maData: {
    ma5: number;
    ma5_deduction_value: number;
    ma5_tomorrow_deduction_value: number;
    ma5_deduction_time: string;
    ma5_tomorrow_deduction_time: string;
    ma10: number;
    ma10_deduction_value: number;
    ma10_tomorrow_deduction_value: number;
    ma10_deduction_time: string;
    ma10_tomorrow_deduction_time: string;
    ma20: number;
    ma20_deduction_value: number;
    ma20_tomorrow_deduction_value: number;
    ma20_deduction_time: string;
    ma20_tomorrow_deduction_time: string;
  };
  volumeInfo: { avgDaysVolume: number; estimatedVolume: number };
}

export default function StockMetricsGrid({ chartType, deals, tickDeals, lastPrice, maData, volumeInfo }: StockMetricsGridProps) {
  const { t } = useTranslation();
  if (chartType === "mak") {
    return (
      <Grid container spacing={1} sx={{ minWidth: 0 }}>
        {(!hasSamples(deals, 20) || !hasVolumeBaseline(deals)) ? (
          <Grid size={{ xs: 12 }}><Typography variant="caption" sx={{ fontSize: "12px", color: "text.secondary" }}>{t("marketData.insufficient")}</Typography></Grid>
        ) : null}
        <Grid size={{ xs: 4 }} sx={{ minWidth: 0 }}><MetricSurface>{hasSamples(deals, 5) ? <Ma5 lastPrice={lastPrice} {...maData} /> : <Typography variant="caption">MA5 · —</Typography>}</MetricSurface></Grid>
        <Grid size={{ xs: 4 }} sx={{ minWidth: 0 }}><MetricSurface>{hasSamples(deals, 10) ? <Ma10 lastPrice={lastPrice} {...maData} /> : <Typography variant="caption">MA10 · —</Typography>}</MetricSurface></Grid>
        <Grid size={{ xs: 4 }} sx={{ minWidth: 0 }}><MetricSurface>{hasSamples(deals, 20) ? <Ma20 lastPrice={lastPrice} {...maData} /> : <Typography variant="caption">MA20 · —</Typography>}</MetricSurface></Grid>
        <Grid size={{ xs: 12 }} sx={{ minWidth: 0 }}><MetricSurface>{hasVolumeBaseline(deals) ? <VolumeRatio {...volumeInfo} /> : <Typography variant="caption">Vol · —</Typography>}</MetricSurface></Grid>
      </Grid>
    );
  }
  return (
    <Grid container spacing={1} sx={{ minWidth: 0 }}>
      <Grid size={{ xs: 12 }} sx={{ minWidth: 0 }}>
        <MetricSurface><AvgPrice lastPrice={lastPrice} tickDeals={tickDeals} /></MetricSurface>
      </Grid>
    </Grid>
  );
}
