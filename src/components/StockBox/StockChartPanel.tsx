import { Box, Skeleton } from "@mui/material";
import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { semanticTokens } from "../../theme";
import { TaType, TickDealsType } from "../../types";
import MarketDataStatus from "../MarketDataStatus";
import { MarketResourceState } from "../../utils/marketResourceState";
import StockChartMeta from "./StockChartMeta";

const MakChart = lazy(() => import("../CommonChart/MakChart"));
const StockTickChart = lazy(() => import("./StockTickChart"));

function ChartAreaFallback({ height }: { height: number }) {
  const { t } = useTranslation();
  return <Box role="status" aria-live="polite" aria-label={t("app.loading")} sx={{ width: "100%", height, display: "grid", placeItems: "center", color: "text.secondary" }}><Skeleton variant="rectangular" animation={false} sx={{ width: "100%", height: "100%", bgcolor: semanticTokens.analysis.surfaceSubtle }} /></Box>;
}

interface StockChartPanelProps {
  chartType: "mak" | "tick";
  deals: TaType;
  tickDeals: TickDealsType | null;
  state: MarketResourceState;
  retry: () => void;
}

export default function StockChartPanel({ chartType, deals, tickDeals, state, retry }: StockChartPanelProps) {
  const { i18n, t } = useTranslation();
  const updatedLabel = state.updatedAt === undefined
    ? t("marketData.unavailable")
    : t("marketData.updated", { time: new Intl.DateTimeFormat(i18n.resolvedLanguage ?? i18n.language, { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(state.updatedAt)) });
  const periodLabel = chartType === "mak" ? t("stock.chartDaily", { count: 60 }) : t("stock.chartTick");
  return (
    <Box sx={{ height: 84, mt: "auto", background: semanticTokens.analysis.chartInset, position: "relative", zIndex: 2, pointerEvents: state.phase === "ready" ? "none" : "auto", display: "flex", flexDirection: "column", borderTop: `1px solid ${semanticTokens.analysis.dividerSubtle}` }}>
      <StockChartMeta periodLabel={periodLabel} updatedLabel={updatedLabel} />
      <Box sx={{ height: 64, minHeight: 64, display: "flex", alignItems: "flex-end" }}>
      {chartType === "mak" ? (
        deals.length > 0 ? <Box sx={{ width: "100%", height: "100%", overflow: "hidden", pb: 0.5 }}><Suspense fallback={<ChartAreaFallback height={64} />}><MakChart deals={{ data: deals, change: null, price: null }} height={64} count={60} hideTooltip /></Suspense></Box> : <MarketDataStatus state={state} retry={retry} compact />
      ) : tickDeals ? (
        <Suspense fallback={<ChartAreaFallback height={64} />}><StockTickChart tickDeals={tickDeals} /></Suspense>
      ) : <MarketDataStatus state={state} retry={retry} compact />}
      </Box>
      {state.phase === "ready" && <MarketDataStatus state={state} retry={retry} compact overlay />}
    </Box>
  );
}
