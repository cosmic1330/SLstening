import RefreshIcon from "@mui/icons-material/Refresh";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import LockClockIcon from "@mui/icons-material/LockClock";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import { Box, Button, CircularProgress, Stack, Typography, useMediaQuery } from "@mui/material";
import { useTranslation } from "react-i18next";
import { MarketResourceState } from "../../utils/marketResourceState";

export default function MarketDataStatus({ state, retry, compact = false, overlay = false }: { state: MarketResourceState; retry?: () => void; compact?: boolean; overlay?: boolean }) {
  const { t, i18n } = useTranslation();
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const stopRetry = (event: React.MouseEvent) => { event.stopPropagation(); retry?.(); };
  const withData = state.phase === "ready";
  const phaseMessage = state.phase === "loading" ? t("marketData.loading")
    : state.phase === "empty" ? t("marketData.empty")
    : state.phase === "error" ? t("marketData.error")
    : null;
  const badges = (withData ? [state.isRefreshing ? t("marketData.refreshing") : null, state.error ? t("marketData.staleError") : null, !state.error && state.freshness === "stale" ? t("marketData.stale") : null, state.marketSession === "closed" ? t("marketData.closed") : null] : [state.marketSession === "closed" ? t("marketData.closed") : null]).filter((badge): badge is string => Boolean(badge));
  if (!phaseMessage && !badges.length) return null;
  const alert = state.phase === "error" || Boolean(state.error);
  const showUpdatedAt = state.updatedAt && (state.phase === "ready" || state.isRefreshing || state.freshness === "stale" || Boolean(state.error));
  return <Box role={alert ? "alert" : "status"} aria-live={alert ? undefined : "polite"} sx={{ position: overlay ? "absolute" : "relative", zIndex: overlay ? 4 : undefined, bottom: overlay ? 2 : undefined, left: overlay ? 2 : undefined, right: overlay ? 2 : undefined, maxHeight: overlay ? "calc(100% - 4px)" : undefined, overflow: "auto", pointerEvents: overlay ? "auto" : undefined, bgcolor: overlay ? "rgba(15,18,20,.86)" : undefined, borderRadius: overlay ? 1 : undefined, display: "flex", alignItems: "center", justifyContent: "center", minHeight: compact ? 24 : 48, px: 0.75, color: "text.secondary", textAlign: "center" }}>
    <Stack direction="row" spacing={0.6} alignItems="center" justifyContent="center" flexWrap="wrap">
      {state.phase === "loading" || state.isRefreshing ? reducedMotion ? <HourglassEmptyIcon fontSize="inherit" aria-label={t("marketData.loading")} /> : <CircularProgress size={12} aria-label={t("marketData.loading")} /> : alert ? <ErrorOutlineIcon fontSize="inherit" /> : state.marketSession === "closed" ? <LockClockIcon fontSize="inherit" /> : null}
      {phaseMessage && <Typography variant="caption" sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{phaseMessage}</Typography>}
      {badges.map((badge) => <Typography key={badge} variant="caption" sx={{ fontWeight: 700, border: 1, borderColor: "divider", borderRadius: 1, px: .5 }}>{badge}</Typography>)}
      {showUpdatedAt && <Typography variant="caption" sx={{ fontVariantNumeric: "tabular-nums" }}>{t("marketData.updated", { time: new Date(state.updatedAt!).toLocaleTimeString(i18n.resolvedLanguage ?? i18n.language, { hour: "2-digit", minute: "2-digit" }) })}</Typography>}
      {((!withData && (state.phase === "empty" || state.phase === "error")) || Boolean(state.error)) && retry && <Button size="small" startIcon={<RefreshIcon />} onClick={stopRetry} sx={{ minHeight: 28 }}>{t("marketData.retry")}</Button>}
    </Stack>
  </Box>;
}
