import { Box, Stack, Typography, styled } from "@mui/material";
import { useMemo, useRef } from "react";
import StockTickChart from "../../../../components/StockBox/StockTickChart";
import useMarketDataStore from "../../../../store/MarketData.store";
import useMarketSubscriber from "../../../../hooks/useMarketSubscriber";
import { useIsVisible } from "../../../../hooks/useIsVisible";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import useDetailWebviewWindow from "../../../../hooks/useDetailWebviewWindow";

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

export default function MarketIndexBox({ id, name, group }: MarketIndexBoxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isVisible = useIsVisible(containerRef);

  // 訂閱市場數據
  useMarketSubscriber(id, true, isVisible);

  // 獲取數據
  const tickDeals = useMarketDataStore((state) => state.getTick(id)) || null;

  const { openDetailWindow } = useDetailWebviewWindow({
    id,
    name,
    group,
  });

  const { price, percent, mainColor } = useMemo(() => {
    const p = tickDeals?.price || 0;
    const pct = tickDeals?.changePercent || 0;
    const color = pct > 0 ? "#FF5252" : pct < 0 ? "#69F0AE" : "#94A3B8";
    return { price: p, percent: pct, mainColor: color };
  }, [tickDeals]);

  return (
    <StyledIndexCard ref={containerRef} onClick={openDetailWindow}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ position: "relative", zIndex: 1, mb: 1 }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{ color: "rgba(255,255,255,0.7)", fontWeight: 900, fontSize: "10px", textTransform: "uppercase", mb: 0.2 }}
          >
            {name}
          </Typography>
          <Typography
            sx={{ fontWeight: 900, color: "white", fontSize: "16px", lineHeight: 1 }}
          >
            {price.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </Typography>
        </Box>
        <Box sx={{ textAlign: "right", flexShrink: 0 }}>
          <Typography
            sx={{ fontWeight: 900, color: mainColor, fontSize: "13px" }}
          >
            {percent > 0 ? "+" : ""}{percent.toFixed(2)}%
          </Typography>
        </Box>
      </Stack>

      <Box sx={{ flex: 1, height: 32, position: "relative", zIndex: 1, mt: "auto" }}>
        {tickDeals ? (
          <StockTickChart tickDeals={tickDeals} />
        ) : (
          <Box display="flex" alignItems="center" justifyContent="center" height="100%">
            <Typography sx={{ fontSize: "9px", fontWeight: 900, color: "rgba(255,255,255,0.2)" }}>
              LOADING
            </Typography>
          </Box>
        )}
      </Box>
    </StyledIndexCard>
  );
}
