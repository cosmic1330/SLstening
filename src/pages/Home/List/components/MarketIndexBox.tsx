import { Box, Stack, Typography, styled } from "@mui/material";
import { lazy, Suspense, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { normalizeLanguage } from "../../../../i18n";
import useDetailWebviewWindow from "../../../../hooks/useDetailWebviewWindow";
import { useIsVisible } from "../../../../hooks/useIsVisible";
import useMarketSubscriber from "../../../../hooks/useMarketSubscriber";
import useNasdaqDeals from "../../../../hooks/useNasdaqDeals";
import useWtxDeals from "../../../../hooks/useWtxDeals";
import { FutureIds } from "../../../../types";
import useConditionalDeals from "../../../../hooks/useConditionalDeals";
import MarketDataStatus from "../../../../components/MarketDataStatus";

const MakChart = lazy(() => import("../../../../components/CommonChart/MakChart"));
const StockTickChart = lazy(() => import("../../../../components/StockBox/StockTickChart"));

function ChartAreaFallback() {
  const { t } = useTranslation();

  return (
    <Box role="status" aria-live="polite" sx={{ height: 64, display: "grid", placeItems: "center", color: "text.secondary" }}>
      <Typography variant="caption">{t("app.loading")}</Typography>
    </Box>
  );
}

const StyledIndexCard = styled(Box)(() => ({
  position: "relative",
  background: "rgba(10, 10, 15, 0.85)",
  backdropFilter: "blur(20px)",
  borderRadius: "16px",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  padding: "12px",
  cursor: "pointer",
  transition: "all 0.2s ease",
  overflow: "hidden",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  "&:hover": {
    background: "rgba(20, 20, 25, 0.95)",
    transform: "translateY(-2px)",
    borderColor: "rgba(255, 255, 255, 0.2)",
    boxShadow: "0 8px 30px rgba(0, 0, 0, 0.5)",
  },
  "&:focus-visible": {
    outline: "3px solid #90CAF9",
    outlineOffset: 2,
  },
  "@media (prefers-reduced-motion: reduce)": {
    transition: "none",
    "&:hover": {
      transform: "none",
    },
  },
}));

interface MarketIndexBoxProps {
  id: string;
  name: string;
  group: string;
}

/**
 * 基礎佈局組件，用於統一市場指標卡片的外觀
 */
export const MarketIndexItemLayout = ({
  name,
  price,
  percent,
  change,
  mainColor,
  children,
  onClick,
  ariaLabel,
  primaryActionEnabled,
  containerRef,
}: {
  name: string;
  price: number | null;
  percent: number | null;
  change: number | null;
  mainColor: string;
  children: React.ReactNode;
  onClick: () => void;
  ariaLabel: string;
  primaryActionEnabled: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
}) => {
  const { i18n } = useTranslation();
  const locale = normalizeLanguage(i18n.resolvedLanguage);
  const safePrice = Number.isFinite(price) ? Number(price) : null;
  const safePercent = Number.isFinite(percent) ? Number(percent) : null;
  const safeChange = Number.isFinite(change) ? Number(change) : null;

  return (
    <StyledIndexCard
      ref={containerRef}
      sx={{ cursor: primaryActionEnabled ? "pointer" : "default" }}
    >
      {primaryActionEnabled ? (
        <Box
          component="button"
          type="button"
          aria-label={ariaLabel}
          onClick={onClick}
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 5,
            border: 0,
            p: 0,
            bgcolor: "transparent",
            cursor: "pointer",
            "&:focus-visible": {
              outline: "3px solid #90CAF9",
              outlineOffset: -3,
            },
          }}
        />
      ) : null}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ position: "relative", zIndex: 1, mb: 1 }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{
              color: "rgba(255,255,255,0.7)",
              fontWeight: 900,
              fontSize: "10px",
              textTransform: "uppercase",
              mb: 0.2,
            }}
          >
            {name}
          </Typography>
          <Typography
            sx={{
              fontWeight: 900,
              color: "white",
              fontSize: "16px",
              lineHeight: 1,
            }}
          >
            {safePrice === null ? "—" : safePrice.toLocaleString(locale, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}
          </Typography>
        </Box>
        <Box sx={{ textAlign: "right", flexShrink: 0 }}>
          <Typography
            sx={{
              fontWeight: 900,
              color: mainColor,
              fontSize: "12px",
              lineHeight: 1.2,
            }}
          >
            {safeChange === null ? "—" : `${safeChange > 0 ? "+" : ""}${safeChange.toFixed(1)}`}
          </Typography>
          <Typography
            sx={{
              fontWeight: 900,
              color: mainColor,
              fontSize: "11px",
              opacity: 0.8,
              lineHeight: 1.2,
            }}
          >
            {safePercent === null ? "—" : `(${safePercent > 0 ? "+" : ""}${safePercent.toFixed(2)}%)`}
          </Typography>
        </Box>
      </Stack>

      <Box
        sx={{
          flex: 1,
          height: 64,
          position: "relative",
          mt: "auto",
        }}
      >
        {children}
      </Box>
    </StyledIndexCard>
  );
};

/**
 * 處理 NASDAQ 市場指標
 */
function MarketIndexNasdaqItem({
  name,
  isVisible,
  openDetailWindow,
  containerRef,
}: any) {
  const { deals, state, retry } = useNasdaqDeals(isVisible);
  const { t } = useTranslation();

  const { price, percent, change, mainColor } = useMemo(() => {
    const p = deals?.price ?? null;
    const c = deals?.change ?? null;
    const prevPrice = p !== null && c !== null ? p - c : null;
    const pct = prevPrice ? (c! / prevPrice) * 100 : null;
    const color = (c ?? 0) > 0 ? "#FF5252" : (c ?? 0) < 0 ? "#69F0AE" : "#94A3B8";
    return { price: p, percent: pct, change: c, mainColor: color };
  }, [deals]);

  return (
    <MarketIndexItemLayout
      name={name}
      price={price}
      percent={percent}
      change={change}
      mainColor={mainColor}
      onClick={openDetailWindow}
      ariaLabel={t("a11y.openMarket", { name })}
      primaryActionEnabled={state.phase === "ready"}
      containerRef={containerRef}
    >
      {deals?.data.length ? (
        <Box role="img" aria-label={t("a11y.stockChart", { name })}><Suspense fallback={<ChartAreaFallback />}><MakChart deals={deals} height={64} hideTooltip={true} /></Suspense></Box>
      ) : (
        <MarketDataStatus state={state} retry={retry} compact />
      )}
      {deals?.data.length ? <MarketDataStatus state={state} retry={retry} compact overlay /> : null}
    </MarketIndexItemLayout>
  );
}

/**
 * 處理 WTX 市場指標
 */
function MarketIndexWtxItem({
  name,
  isVisible,
  openDetailWindow,
  containerRef,
}: any) {
  const { deals, state, retry } = useWtxDeals(isVisible);
  const { t } = useTranslation();

  const { price, percent, change, mainColor } = useMemo(() => {
    const p = deals?.price ?? null;
    const c = deals?.change ?? null;
    const prevPrice = p !== null && c !== null ? p - c : null;
    const pct = prevPrice ? (c! / prevPrice) * 100 : null;
    const color = (c ?? 0) > 0 ? "#FF5252" : (c ?? 0) < 0 ? "#69F0AE" : "#94A3B8";
    return { price: p, percent: pct, change: c, mainColor: color };
  }, [deals]);

  return (
    <MarketIndexItemLayout
      name={name}
      price={price}
      percent={percent}
      change={change}
      mainColor={mainColor}
      onClick={openDetailWindow}
      ariaLabel={t("a11y.openMarket", { name })}
      primaryActionEnabled={state.phase === "ready"}
      containerRef={containerRef}
    >
      {deals?.data?.length ? (
        <Box role="img" aria-label={t("a11y.stockChart", { name })}><Suspense fallback={<ChartAreaFallback />}><MakChart deals={deals} height={64} hideTooltip={true} /></Suspense></Box>
      ) : (
        <MarketDataStatus state={state} retry={retry} compact />
      )}
      {deals?.data?.length ? <MarketDataStatus state={state} retry={retry} compact overlay /> : null}
    </MarketIndexItemLayout>
  );
}

/**
 * 處理一般市場指標 (Tick 數據)
 */
function MarketIndexTickItem({
  id,
  name,
  isVisible,
  openDetailWindow,
  containerRef,
}: any) {
  useMarketSubscriber(id, true, isVisible);
  const { t } = useTranslation();
  const { tickDeals, tickState, retryTick } = useConditionalDeals(id, true, isVisible, { fetchTick: true, fetchHistory: false });

  const { price, percent, change, mainColor } = useMemo(() => {
    const p = tickDeals?.price ?? null;
    const pct = tickDeals?.changePercent ?? null;
    const c = p !== null && tickDeals?.previousClose !== undefined ? p - tickDeals.previousClose : null;
    const color = (pct ?? 0) > 0 ? "#FF5252" : (pct ?? 0) < 0 ? "#69F0AE" : "#94A3B8";
    return { price: p, percent: pct, change: c, mainColor: color };
  }, [tickDeals]);

  return (
    <MarketIndexItemLayout
      name={name}
      price={price}
      percent={percent}
      change={change}
      mainColor={mainColor}
      onClick={openDetailWindow}
      ariaLabel={t("a11y.openMarket", { name })}
      primaryActionEnabled={tickState.phase === "ready"}
      containerRef={containerRef}
    >
      {tickDeals ? (
        <Box role="img" aria-label={t("a11y.stockChart", { name })}><Suspense fallback={<ChartAreaFallback />}><StockTickChart tickDeals={tickDeals} /></Suspense></Box>
      ) : (
        <MarketDataStatus state={tickState} retry={retryTick} compact />
      )}
      {tickDeals ? <MarketDataStatus state={tickState} retry={retryTick} compact overlay /> : null}
    </MarketIndexItemLayout>
  );
}

export default function MarketIndexBox({
  id,
  name,
  group,
}: MarketIndexBoxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isVisible = useIsVisible(containerRef);

  const { openDetailWindow } = useDetailWebviewWindow({
    id,
    name,
    group,
  });

  const props = { id, name, group, isVisible, openDetailWindow, containerRef };

  if (id === FutureIds.NASDAQ) {
    return <MarketIndexNasdaqItem {...props} />;
  }

  if (id === FutureIds.WTX) {
    return <MarketIndexWtxItem {...props} />;
  }

  return <MarketIndexTickItem {...props} />;
}
