import { Box, Stack, Typography, styled } from "@mui/material";
import { useMemo, useRef } from "react";
import MakChart from "../../../../components/CommonChart/MakChart";
import StockTickChart from "../../../../components/StockBox/StockTickChart";
import useDetailWebviewWindow from "../../../../hooks/useDetailWebviewWindow";
import { useIsVisible } from "../../../../hooks/useIsVisible";
import useMarketSubscriber from "../../../../hooks/useMarketSubscriber";
import useNasdaqDeals from "../../../../hooks/useNasdaqDeals";
import useWtxDeals from "../../../../hooks/useWtxDeals";
import { FutureIds } from "../../../../types";
import useConditionalDeals from "../../../../hooks/useConditionalDeals";
import MarketDataStatus from "../../../../components/MarketDataStatus";

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
}));

interface MarketIndexBoxProps {
  id: string;
  name: string;
  group: string;
}

/**
 * 基礎佈局組件，用於統一市場指標卡片的外觀
 */
const MarketIndexItemLayout = ({
  name,
  price,
  percent,
  change,
  mainColor,
  children,
  onClick,
  containerRef,
}: {
  name: string;
  price: number | null;
  percent: number | null;
  change: number | null;
  mainColor: string;
  children: React.ReactNode;
  onClick: () => void;
  containerRef: React.RefObject<HTMLDivElement>;
}) => {
  const safePrice = Number.isFinite(price) ? Number(price) : null;
  const safePercent = Number.isFinite(percent) ? Number(percent) : null;
  const safeChange = Number.isFinite(change) ? Number(change) : null;

  return (
    <StyledIndexCard ref={containerRef} onClick={onClick}>
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
            {safePrice === null ? "—" : safePrice.toLocaleString(undefined, {
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
          zIndex: 1,
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
      containerRef={containerRef}
    >
      {deals?.data.length ? (
        <MakChart deals={deals} height={64} hideTooltip={true} />
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
      containerRef={containerRef}
    >
      {deals?.data?.length ? (
        <MakChart deals={deals} height={64} hideTooltip={true} />
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
      containerRef={containerRef}
    >
      {tickDeals ? (
        <StockTickChart tickDeals={tickDeals} />
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
