import { Box, Stack, Typography, styled } from "@mui/material";
import { useMemo, useRef } from "react";
import MakChart from "../../../../components/CommonChart/MakChart";
import StockTickChart from "../../../../components/StockBox/StockTickChart";
import useDetailWebviewWindow from "../../../../hooks/useDetailWebviewWindow";
import { useIsVisible } from "../../../../hooks/useIsVisible";
import useMarketSubscriber from "../../../../hooks/useMarketSubscriber";
import useNasdaqDeals from "../../../../hooks/useNasdaqDeals";
import useWtxDeals from "../../../../hooks/useWtxDeals";
import useMarketDataStore from "../../../../store/MarketData.store";
import { FutureIds } from "../../../../types";

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
  price = 0,
  percent = 0,
  change = 0,
  mainColor,
  children,
  onClick,
  containerRef,
}: {
  name: string;
  price: number;
  percent: number;
  change: number;
  mainColor: string;
  children: React.ReactNode;
  onClick: () => void;
  containerRef: React.RefObject<HTMLDivElement>;
}) => {
  const safePrice = Number(price) || 0;
  const safePercent = Number(percent) || 0;
  const safeChange = Number(change) || 0;

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
            {safePrice.toLocaleString(undefined, {
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
            {safeChange > 0 ? "+" : ""}
            {safeChange.toFixed(1)}
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
            ({safePercent > 0 ? "+" : ""}
            {safePercent.toFixed(2)}%)
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
  id,
  name,
  group,
  isVisible,
  openDetailWindow,
  containerRef,
}: any) {
  const { deals } = useNasdaqDeals(isVisible);

  const { price, percent, change, mainColor } = useMemo(() => {
    const p = deals?.price || 0;
    const c = deals?.change || 0;
    const prevPrice = p - c;
    const pct = prevPrice !== 0 ? (c / prevPrice) * 100 : 0;
    const color = c > 0 ? "#FF5252" : c < 0 ? "#69F0AE" : "#94A3B8";
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
      {deals ? (
        <MakChart deals={deals} hideTooltip={true} />
      ) : (
        <LoadingPlaceholder />
      )}
    </MarketIndexItemLayout>
  );
}

/**
 * 處理 WTX 市場指標
 */
function MarketIndexWtxItem({
  id,
  name,
  group,
  isVisible,
  openDetailWindow,
  containerRef,
}: any) {
  const { deals } = useWtxDeals(isVisible);

  const { price, percent, change, mainColor } = useMemo(() => {
    const p = deals?.price || 0;
    const c = deals?.change || 0;
    const prevPrice = p - c;
    const pct = prevPrice !== 0 ? (c / prevPrice) * 100 : 0;
    const color = c > 0 ? "#FF5252" : c < 0 ? "#69F0AE" : "#94A3B8";
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
      {deals ? (
        <MakChart deals={deals} hideTooltip={true} />
      ) : (
        <LoadingPlaceholder />
      )}
    </MarketIndexItemLayout>
  );
}

/**
 * 處理一般市場指標 (Tick 數據)
 */
function MarketIndexTickItem({
  id,
  name,
  group,
  isVisible,
  openDetailWindow,
  containerRef,
}: any) {
  useMarketSubscriber(id, true, isVisible);
  const tickDeals = useMarketDataStore((state) => state.getTick(id)) || null;

  const { price, percent, change, mainColor } = useMemo(() => {
    const p = tickDeals?.price || 0;
    const pct = tickDeals?.changePercent || 0;
    const c = p - (tickDeals?.previousClose || p);
    const color = pct > 0 ? "#FF5252" : pct < 0 ? "#69F0AE" : "#94A3B8";
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
        <LoadingPlaceholder />
      )}
    </MarketIndexItemLayout>
  );
}

const LoadingPlaceholder = () => (
  <Box display="flex" alignItems="center" justifyContent="center" height="100%">
    <Typography
      sx={{ fontSize: "9px", fontWeight: 900, color: "rgba(255,255,255,0.2)" }}
    >
      LOADING
    </Typography>
  </Box>
);

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
