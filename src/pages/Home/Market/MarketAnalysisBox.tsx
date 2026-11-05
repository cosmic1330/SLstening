import { Box, Stack, Typography } from "@mui/material";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import MarketDataStatus from "../../../components/MarketDataStatus";
import useConditionalDeals from "../../../hooks/useConditionalDeals";
import { useIsVisible } from "../../../hooks/useIsVisible";
import useMarketAnalysis from "../../../hooks/useMarketAnalysis";
import { primitiveTokens, semanticTokens } from "../../../theme";
import { FutureIds, UrlTaPerdOptions } from "../../../types";
import { formatMarketTime, type MarketTrend } from "../../../utils/marketAnalysis";

const states: Record<MarketTrend, { key: string; color: string }> = {
  多頭: { key: "bull", color: semanticTokens.market.gain },
  空頭: { key: "bear", color: semanticTokens.market.loss },
  震盪: { key: "range", color: semanticTokens.analysis.textMuted },
  資料不足: { key: "insufficient", color: semanticTokens.analysis.textMuted },
  "N/A": { key: "insufficient", color: semanticTokens.analysis.textMuted },
};

export default function MarketAnalysisBox() {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const visible = useIsVisible(ref);
  const { deals, historyState, retryHistory } = useConditionalDeals(FutureIds.WTX, true, visible, {
    fetchTick: false, fetchHistory: true,
  });
  const { trends, trendChangePoints } = useMarketAnalysis({ ta: deals, perd: UrlTaPerdOptions.Day });
  const recentChanges = trendChangePoints.slice(-3);
  const points = trends.slice(-10);
  const latest = points[points.length - 1];
  const title = t("home.marketAnalysis.title");

  return (
    <Box ref={ref} component="section" aria-label={title} sx={{
      width: "100%", boxSizing: "border-box", p: 1.5, minHeight: 130,
      borderRadius: `${primitiveTokens.radius.md}px`,
      border: `1px solid ${semanticTokens.analysis.borderSubtle}`,
      background: semanticTokens.analysis.surfaceGlass, backdropFilter: "blur(14px)",
    }}>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={1}>
        <Typography component="h2" variant="caption" fontWeight={900}>{title}</Typography>
        {latest && <Typography variant="caption" fontWeight={800} sx={{ color: states[latest.trend].color }}>
          {t(`home.marketAnalysis.states.${states[latest.trend].key}`)}
        </Typography>}
      </Stack>
      {points.length > 0 && (
        <Box role="region" aria-label={t("home.marketAnalysis.timeline")} tabIndex={0}
          sx={{ overflowX: "auto", mt: 1.5, pb: 0.5, "&:focus-visible": { outline: `2px solid ${semanticTokens.analysis.focus}`, outlineOffset: 2 } }}>
          <Box component="ol" aria-label={t("home.marketAnalysis.timeline")} sx={{
            listStyle: "none", m: 0, p: 0, display: "grid",
            gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))`,
            minWidth: points.length * 29,
          }}>
            {points.map((point, index) => {
              const state = states[point.trend];
              const date = formatMarketTime(point.t);
              const label = t(`home.marketAnalysis.states.${state.key}`);
              const unknown = state.key === "insufficient";
              return (
                <Box component="li" key={point.t} aria-label={`${date} · ${label}`} title={`${date} · ${label}`}
                  sx={{ position: "relative", textAlign: "center", minWidth: 0 }}>
                  {index < points.length - 1 && <Box aria-hidden="true" sx={{ position: "absolute", top: 6, left: "50%", width: "100%", borderTop: `2px solid ${semanticTokens.analysis.borderSubtle}` }} />}
                  <Box aria-hidden="true" sx={{ position: "relative", mx: "auto", width: 12, height: 12, boxSizing: "border-box", borderRadius: "50%",
                    border: `2px solid ${state.color}`, bgcolor: unknown ? semanticTokens.analysis.canvas : state.color,
                    outline: index === points.length - 1 ? `2px solid ${state.color}` : undefined, outlineOffset: 2,
                  }} />
                  <Typography component="span" sx={{ display: "block", mt: 1, fontSize: 10, fontWeight: 700, color: state.color }}>
                    {t(`home.marketAnalysis.short.${state.key}`)}
                  </Typography>
                  <Typography component="time" dateTime={date} sx={{ display: "block", mt: 0.25, fontSize: 9, fontVariantNumeric: "tabular-nums", color: semanticTokens.analysis.textMuted }}>
                    {date.slice(5).replace("-", "/")}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Box>
      )}
      {recentChanges.length > 0 && (
        <Box component="ol" aria-label={t("home.marketAnalysis.transitions")} sx={{
          listStyle: "none", mb: 0, mx: 0, mt: 1, px: 0, pt: 1,
          borderTop: `1px solid ${semanticTokens.analysis.borderSubtle}`,
          display: "grid", gridTemplateColumns: `repeat(${recentChanges.length}, minmax(0, 1fr))`, gap: 2,
        }}>
          {recentChanges.map((point, index) => {
            const state = states[point.trend];
            const date = formatMarketTime(point.t);
            const label = t(`home.marketAnalysis.states.${state.key}`);
            return (
              <Box component="li" key={point.t} aria-label={`${date} · ${label}`} sx={{ position: "relative", textAlign: "center" }}>
                <Typography sx={{ fontSize: 11, fontWeight: index === recentChanges.length - 1 ? 800 : 600, color: state.color }}>
                  {label}
                </Typography>
                <Typography component="time" dateTime={date} sx={{ display: "block", fontSize: 10, fontVariantNumeric: "tabular-nums", color: semanticTokens.analysis.textMuted }}>
                  {date}
                </Typography>
                {index < recentChanges.length - 1 && (
                  <Box component="span" aria-hidden="true" sx={{ position: "absolute", right: -12, top: 3, color: semanticTokens.analysis.textMuted }}>→</Box>
                )}
              </Box>
            );
          })}
        </Box>
      )}
      <MarketDataStatus state={historyState.phase === "idle" && !points.length ? { ...historyState, phase: "loading" } : historyState} retry={retryHistory} compact />
    </Box>
  );
}
