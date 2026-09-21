import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import {
  Box,
  Grid,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  Stack,
  Typography,
  alpha,
  styled,
} from "@mui/material";
import { open } from "@tauri-apps/plugin-shell";
import { motion, useReducedMotion } from "framer-motion";
import { lazy, Suspense, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import useConditionalDeals from "../../hooks/useConditionalDeals";
import useDetailWebviewWindow from "../../hooks/useDetailWebviewWindow";
import useMaDeduction from "../../hooks/useMaDeduction";
import useMarketSubscriber from "../../hooks/useMarketSubscriber";
import useStocksStore from "../../store/Stock.store";
import { StockStoreType } from "../../types";
import estimateVolume from "../../utils/estimateVolume";
import AvgPrice from "./Items/AvgPrice";
import Ma10 from "./Items/Ma10";
import Ma20 from "./Items/Ma20";
import Ma5 from "./Items/Ma5";
import VolumeRatio from "./Items/VolumeRatio";
import useUIStore from "../../store/UI.store";
import MarketDataStatus from "../MarketDataStatus";
import { hasSamples, hasVolumeBaseline } from "../../utils/marketMetrics";

const MakChart = lazy(() => import("../CommonChart/MakChart"));
const StockTickChart = lazy(() => import("./StockTickChart"));

// Constants
// Includes the virtualized row gutter and enough room for the accessible
// 44px metric controls plus the insufficient-data message.
export const STOCK_BOX_HEIGHT = 308;

// Premium Colors (Traditional Japanese & Financial tones - High Contrast)
const COLORS = {
  up: "#FF5252",
  down: "#69F0AE",
  neutral: "#94A3B8",
  cardBg: "rgba(30, 36, 48, 0.96)",
  cardBorder: "rgba(148, 163, 184, 0.22)",
  textSecondary: "rgba(226, 232, 240, 0.78)",
};

function ChartAreaFallback({ height }: { height: number }) {
  const { t } = useTranslation();

  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{ width: "100%", height, display: "grid", placeItems: "center", color: "text.secondary" }}
    >
      <Typography variant="caption">{t("app.loading")}</Typography>
    </Box>
  );
}

// Styled Components
const StyledCard = styled(motion.div)(() => ({
  position: "relative",
  background: COLORS.cardBg,
  borderRadius: "14px",
  border: `1px solid ${COLORS.cardBorder}`,
  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.24)",
  overflow: "hidden",
  cursor: "default",
  height: "100%",
  minWidth: 0,
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  boxSizing: "border-box",
  fontFamily: "'Outfit', 'Inter', sans-serif",
  transition: "border-color 160ms ease, box-shadow 160ms ease",
  "@media (prefers-reduced-motion: reduce)": {
    transition: "none",
  },
  "&:hover": {
    borderColor: "rgba(148, 163, 184, 0.42)",
    boxShadow: "0 10px 28px rgba(0, 0, 0, 0.32)",
  },
}));

const ActionBtn = styled(IconButton)(({ theme }) => ({
  backgroundColor: "rgba(15, 23, 42, 0.86)",
  color: "rgba(241, 245, 249, 0.92)",
  border: "1px solid rgba(148, 163, 184, 0.3)",
  width: 44,
  height: 44,
  flexShrink: 0,
  transition: "background-color 160ms ease, border-color 160ms ease, transform 160ms ease",
  "&:hover": {
    backgroundColor: theme.palette.primary.main,
    borderColor: theme.palette.primary.main,
    color: "#fff",
    transform: "scale(1.1)",
  },
  "&:focus-visible": {
    outline: "2px solid #90CAF9",
    outlineOffset: 2,
  },
  "@media (prefers-reduced-motion: reduce)": {
    transition: "none",
    "&:hover": { transform: "none" },
  },
}));

const MetricTag = styled(Box)(() => ({
  minWidth: 0,
  minHeight: 44,
  padding: 0,
  borderRadius: "8px",
  background: "rgba(15, 23, 42, 0.42)",
  border: "1px solid rgba(148, 163, 184, 0.16)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  transition: "background-color 160ms ease, border-color 160ms ease",
  "@media (prefers-reduced-motion: reduce)": {
    transition: "none",
  },
  "&:hover": {
    background: "rgba(15, 23, 42, 0.65)",
    borderColor: "rgba(148, 163, 184, 0.3)",
  },
}));

export interface StockBoxProps {
  stock: StockStoreType;
  canDelete?: boolean;
  canAdd?: boolean;
  enabled?: boolean;
  onRemove?: () => void;
  isVisible?: boolean; // 新增外部傳入的可見性狀態
}

export default function StockBox({
  stock,
  enabled = true,
  canDelete = true,
  onRemove,
  isVisible,
}: StockBoxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isComponentVisible = isVisible ?? true;
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const stockBoxChartType = useUIStore((state) => state.stockBoxChartType);

  // Data Hooks
  const fetchTick = stockBoxChartType === "tick";
  const fetchHistory = stockBoxChartType === "mak";

  useMarketSubscriber(stock.id, enabled && fetchTick, isComponentVisible);
  const { deals, name, tickDeals: storedTickDeals, tickState, historyState, retryTick, retryHistory } = useConditionalDeals(
    stock.id,
    enabled,
    isComponentVisible,
    { fetchTick, fetchHistory }
  );
  const tickDeals = fetchTick ? storedTickDeals || null : null;
  const activeState = stockBoxChartType === "tick" ? tickState : historyState;
  const retry = stockBoxChartType === "tick" ? retryTick : retryHistory;

  // Indicators
  const maData = useMaDeduction(deals);
  const { openDetailWindow } = useDetailWebviewWindow({
    id: stock.id,
    name: name || stock.name,
    group: stock.group,
  });

  const removeStock = useStocksStore((state) => state.remove);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  const priceInfo = useMemo(() => {
    const lastPrice =
      tickDeals?.price ?? (deals.length > 0 ? deals[deals.length - 1].c : null);
    const percent =
      tickDeals?.changePercent ??
      (deals.length >= 2
        ? Math.round(
              ((lastPrice! - deals[deals.length - 2].c) /
              deals[deals.length - 2].c) *
              10000,
          ) / 100
        : null);
    const isUp = (percent ?? 0) > 0;
    const isDown = (percent ?? 0) < 0;
    const mainColor = isUp ? COLORS.up : isDown ? COLORS.down : COLORS.neutral;

    return { lastPrice, percent, isUp, isDown, mainColor };
  }, [deals, tickDeals]);

  const volumeInfo = useMemo(() => {
    if (deals.length < 11) return { avgDaysVolume: 0, estimatedVolume: 0 };
    const pastDeals = deals.slice(-11, -1);
    const totalVolume = pastDeals.reduce((acc, deal) => acc + deal.v, 0);
    const avgDaysVolume =
      Math.round((totalVolume / pastDeals.length) * 100) / 100;
    const { estimatedVolume } = estimateVolume({
      currentVolume: deals[deals.length - 1].v,
      currentTime: new Date(),
      previousDayVolume: deals[deals.length - 2]?.v,
      avg5DaysVolume: avgDaysVolume,
    });
    return { avgDaysVolume, estimatedVolume };
  }, [deals]);

  const cardGlow = useMemo(() => {
    return `radial-gradient(circle at 100% 0%, ${alpha(priceInfo.mainColor, 0.1)} 0%, transparent 50%)`;
  }, [priceInfo.mainColor]);

  const isReady = activeState.phase === "ready";
  const tradingViewUrl = stock.type === "上市"
    ? `https://tw.tradingview.com/chart?symbol=TWSE%3A${stock.id}`
    : `https://tw.tradingview.com/chart?symbol=TPEX%3A${stock.id}`;
  const handleTradingView = async () => {
    setMenuAnchor(null);
    await open(tradingViewUrl);
  };
  const handleRemove = () => {
    setMenuAnchor(null);
    onRemove?.();
  };
  const handleDelete = () => {
    setMenuAnchor(null);
    removeStock(stock.id);
  };

  return (
    <StyledCard
      ref={containerRef}
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      whileHover={reduceMotion ? undefined : { y: -4 }}
    >
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "100%",
          background: cardGlow,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <Box
        component="button"
        type="button"
        disabled={!isReady}
        aria-label={t("a11y.openStock", { name: name || stock.name, id: stock.id })}
        onClick={openDetailWindow}
        sx={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          width: "100%",
          height: "100%",
          border: 0,
          p: 0,
          bgcolor: "transparent",
          cursor: isReady ? "pointer" : "default",
          pointerEvents: isReady ? "auto" : "none",
          "&:focus-visible": { outline: "3px solid #90CAF9", outlineOffset: -3 },
        }}
      />

      <Box sx={{ position: "relative", zIndex: 2, p: 2, flex: 1, pointerEvents: "none", "& button, & [role='button'], & a": { pointerEvents: "auto", position: "relative", zIndex: 3 } }}>
        {/* Header: Name & ID */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          mb={1}
          spacing={0.75}
        >
          <Box sx={{ minWidth: 0, flex: 1, pr: 1 }}>
            <Typography
              noWrap
              sx={{
                color: COLORS.textSecondary,
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.02em",
                lineHeight: 1,
                mb: 0.5,
              }}
            >
              {stock.id} · {stock.type}
            </Typography>
            <Typography
              noWrap
              sx={{
                fontWeight: 800,
                fontSize: { xs: "15px", sm: "18px" },
                color: "#fff",
                lineHeight: 1,
              }}
            >
              {name || stock.name}
            </Typography>
          </Box>
          <Box sx={{ textAlign: "right", flexShrink: 0 }}>
            <Typography
              sx={{
                fontWeight: 800,
                fontSize: { xs: "20px", sm: "24px" },
                fontVariantNumeric: "tabular-nums",
                color: priceInfo.mainColor,
                lineHeight: 1,
              }}
            >
              {priceInfo.lastPrice ?? "—"}
            </Typography>
            <Stack
              direction="row"
              spacing={0.2}
              justifyContent="flex-end"
              alignItems="center"
            >
              <Typography
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: "12px", sm: "13px" },
                  fontVariantNumeric: "tabular-nums",
                  color: priceInfo.mainColor,
                }}
              >
                {priceInfo.percent === null ? "—" : `${priceInfo.percent > 0 ? "+" : ""}${priceInfo.percent}%`}
              </Typography>
            </Stack>
          </Box>
          <Box sx={{ minWidth: 44, flexShrink: 0, zIndex: 2 }}>
            <ActionBtn
              aria-label={t("watchlist.more")}
              aria-haspopup="menu"
              aria-expanded={Boolean(menuAnchor) ? "true" : undefined}
              onClick={(event) => {
                event.stopPropagation();
                setMenuAnchor(event.currentTarget);
              }}
            >
              <MoreVertIcon />
            </ActionBtn>
            <Menu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={() => setMenuAnchor(null)}
              MenuListProps={{ "aria-label": t("watchlist.more") }}
            >
              <MenuItem onClick={(event) => { event.stopPropagation(); void handleTradingView(); }} sx={{ minHeight: 44 }}>
                <ListItemIcon><OpenInNewIcon fontSize="small" /></ListItemIcon>
                {t("a11y.tradingView", { name: name || stock.name })}
              </MenuItem>
              {onRemove ? (
                <MenuItem onClick={(event) => { event.stopPropagation(); handleRemove(); }} sx={{ minHeight: 44 }}>
                  <ListItemIcon><CloseIcon fontSize="small" /></ListItemIcon>
                  {t("a11y.removeStock", { name: name || stock.name })}
                </MenuItem>
              ) : null}
              {canDelete ? (
                <MenuItem onClick={(event) => { event.stopPropagation(); handleDelete(); }} sx={{ minHeight: 44 }}>
                  <ListItemIcon><DeleteIcon fontSize="small" /></ListItemIcon>
                  {t("a11y.deleteStock", { name: name || stock.name })}
                </MenuItem>
              ) : null}
            </Menu>
          </Box>
        </Stack>

        {/* Indicators Grid - More Compact */}
        <Box sx={{ mt: 1.5 }}>
          <Grid container spacing={1} sx={{ minWidth: 0 }}>
            {stockBoxChartType === "mak" && activeState.phase === "ready" && (
              <>
                {(!hasSamples(deals, 20) || !hasVolumeBaseline(deals)) && (
                  <Grid size={{ xs: 12 }}>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {t("marketData.insufficient")}
                    </Typography>
                  </Grid>
                )}
                <Grid size={{ xs: 4 }} sx={{ minWidth: 0 }}>
                  <MetricTag>
                    {hasSamples(deals, 5) ? <Ma5 lastPrice={priceInfo.lastPrice ?? 0} {...maData} /> : <Typography variant="caption">MA5 · —</Typography>}
                  </MetricTag>
                </Grid>
                <Grid size={{ xs: 4 }} sx={{ minWidth: 0 }}>
                  <MetricTag>
                    {hasSamples(deals, 10) ? <Ma10 lastPrice={priceInfo.lastPrice ?? 0} {...maData} /> : <Typography variant="caption">MA10 · —</Typography>}
                  </MetricTag>
                </Grid>
                <Grid size={{ xs: 4 }} sx={{ minWidth: 0 }}>
                  <MetricTag>
                    {hasSamples(deals, 20) ? <Ma20 lastPrice={priceInfo.lastPrice ?? 0} {...maData} /> : <Typography variant="caption">MA20 · —</Typography>}
                  </MetricTag>
                </Grid>
                <Grid size={{ xs: 12 }} sx={{ minWidth: 0 }}>
                  <MetricTag>
                    {hasVolumeBaseline(deals) ? <VolumeRatio {...volumeInfo} /> : <Typography variant="caption">Vol · —</Typography>}
                  </MetricTag>
                </Grid>
              </>
            )}
            {stockBoxChartType === "tick" && activeState.phase === "ready" && (
              <Grid size={{ xs: 12 }} sx={{ minWidth: 0 }}>
                <MetricTag>
                  <AvgPrice
                    lastPrice={priceInfo.lastPrice ?? 0}
                    tickDeals={tickDeals}
                  />
                </MetricTag>
              </Grid>
            )}
          </Grid>
        </Box>
      </Box>

      {/* Footer Chart - Enhanced Visibility */}
      <Box
        sx={{
          height: 64,
          mt: "auto",
          background: "rgba(15, 23, 42, 0.34)",
          position: "relative",
          zIndex: 2,
          pointerEvents: activeState.phase === "ready" ? "none" : "auto",
          display: "flex",
          alignItems: "flex-end",
          borderTop: "1px solid rgba(148, 163, 184, 0.14)",
        }}
      >
        {stockBoxChartType === "mak" ? (
          deals && deals.length > 0 ? (
             <Box sx={{ width: "100%", height: "100%", overflow: "hidden", pb: 0.5 }}>
               <Suspense fallback={<ChartAreaFallback height={64} />}>
                 <MakChart deals={{ data: deals, change: null, price: null }} height={64} count={60} hideTooltip />
               </Suspense>
             </Box>
          ) : <MarketDataStatus state={activeState} retry={retry} compact />
        ) : tickDeals ? (
          <Suspense fallback={<ChartAreaFallback height={64} />}>
            <StockTickChart tickDeals={tickDeals} />
          </Suspense>
        ) : <MarketDataStatus state={activeState} retry={retry} compact />}
        {activeState.phase === "ready" && <MarketDataStatus state={activeState} retry={retry} compact overlay />}
      </Box>
    </StyledCard>
  );
}
