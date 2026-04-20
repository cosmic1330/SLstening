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
  background: "rgba(30, 30, 35, 0.4)",
  backdropFilter: "blur(16px)",
  borderRadius: "20px",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  padding: "16px",
  cursor: "pointer",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  overflow: "hidden",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  "&:hover": {
    background: "rgba(40, 40, 45, 0.6)",
    transform: "translateY(-4px)",
    borderColor: "rgba(255, 255, 255, 0.2)",
    boxShadow: "0 12px 40px rgba(0, 0, 0, 0.4)",
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
    const color = pct > 0 ? "#FF5252" : pct < 0 ? "#69F0AE" : "#B0B0B0";
    return { price: p, percent: pct, mainColor: color };
  }, [tickDeals]);

  const glowColor = percent > 0
    ? "radial-gradient(circle at 80% 20%, rgba(255, 82, 82, 0.1) 0%, transparent 50%)"
    : percent < 0
      ? "radial-gradient(circle at 80% 20%, rgba(105, 240, 174, 0.1) 0%, transparent 50%)"
      : "none";

  return (
    <StyledIndexCard ref={containerRef} onClick={openDetailWindow}>
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: glowColor,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
        sx={{ position: "relative", zIndex: 1, mb: 1.5 }}
      >
        <Box>
          <Typography
            variant="caption"
            sx={{ color: "rgba(255,255,255,0.4)", fontWeight: 700, fontSize: 10 }}
          >
            {name}
          </Typography>
          <Typography
            variant="h5"
            sx={{ fontWeight: 800, color: "white", letterSpacing: "-0.5px" }}
          >
            {price.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
          </Typography>
        </Box>
        <Box sx={{ textAlign: "right" }}>
          <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={0.5}>
            {percent > 0 ? (
              <TrendingUpIcon sx={{ fontSize: 14, color: mainColor }} />
            ) : percent < 0 ? (
              <TrendingDownIcon sx={{ fontSize: 14, color: mainColor }} />
            ) : null}
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 800, color: mainColor }}
            >
              {percent > 0 ? "+" : ""}{percent.toFixed(2)}%
            </Typography>
          </Stack>
        </Box>
      </Stack>

      <Box sx={{ flex: 1, minHeight: 60, position: "relative", zIndex: 1, mt: "auto" }}>
        {tickDeals ? (
          <StockTickChart tickDeals={tickDeals} />
        ) : (
          <Box display="flex" alignItems="center" justifyContent="center" height="100%">
            <Typography variant="caption" color="rgba(255,255,255,0.2)">
              更新中...
            </Typography>
          </Box>
        )}
      </Box>
    </StyledIndexCard>
  );
}
