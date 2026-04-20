import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import {
  Box,
  Grid,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  alpha,
  styled,
} from "@mui/material";
import { open } from "@tauri-apps/plugin-shell";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useRef, useState } from "react";
import useConditionalDeals from "../../hooks/useConditionalDeals";
import useDetailWebviewWindow from "../../hooks/useDetailWebviewWindow";
import { useIsVisible } from "../../hooks/useIsVisible";
import useMaDeduction from "../../hooks/useMaDeduction";
import useMarketSubscriber from "../../hooks/useMarketSubscriber";
import useMarketDataStore from "../../store/MarketData.store";
import useStocksStore from "../../store/Stock.store";
import { StockStoreType } from "../../types";
import estimateVolume from "../../utils/estimateVolume";
import AvgPrice from "./Items/AvgPrice";
import Ma10 from "./Items/Ma10";
import Ma20 from "./Items/Ma20";
import Ma5 from "./Items/Ma5";
import VolumeRatio from "./Items/VolumeRatio";
import StockTickChart from "./StockTickChart";

// Constants
export const STOCK_BOX_HEIGHT = 280;

// Premium Colors (Traditional Japanese & Financial tones - High Contrast)
const COLORS = {
  up: "#FF5252",
  down: "#69F0AE",
  neutral: "#94A3B8",
  cardBg: "rgba(10, 10, 15, 0.85)", // Darker, less transparent
  cardBorder: "rgba(255, 255, 255, 0.12)",
  textSecondary: "rgba(255, 255, 255, 0.8)", // Brighter for readability
};

// Styled Components
const StyledCard = styled(motion.div)(() => ({
  position: "relative",
  background: COLORS.cardBg,
  backdropFilter: "blur(20px)", // Reduced blur for clarity
  borderRadius: "16px", // Reduced radius
  border: `1px solid ${COLORS.cardBorder}`,
  boxShadow: "0 12px 40px rgba(0, 0, 0, 0.4)",
  overflow: "hidden",
  cursor: "pointer",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  boxSizing: "border-box",
  fontFamily: "'Outfit', 'Inter', sans-serif",
}));

const ActionButtons = styled(motion.div)(() => ({
  position: "absolute",
  top: 12,
  right: 12,
  zIndex: 20,
}));

const ActionBtn = styled(IconButton)(({ theme }) => ({
  backgroundColor: "rgba(255, 255, 255, 0.1)",
  backdropFilter: "blur(12px)",
  color: "rgba(255, 255, 255, 0.9)",
  border: "1px solid rgba(255, 255, 255, 0.2)",
  padding: 6,
  transition: "all 0.2s ease",
  "&:hover": {
    backgroundColor: theme.palette.primary.main,
    color: "#fff",
    transform: "scale(1.1)",
  },
}));

const MetricTag = styled(Box)(() => ({
  padding: "4px 8px",
  borderRadius: "8px",
  background: "rgba(255, 255, 255, 0.05)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  transition: "all 0.2s ease",
  "&:hover": {
    background: "rgba(255, 255, 255, 0.1)",
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
}));

export interface StockBoxProps {
  stock: StockStoreType;
  canDelete?: boolean;
  canAdd?: boolean;
  enabled?: boolean;
  onRemove?: () => void;
}

export default function StockBox({
  stock,
  enabled = true,
  canDelete = true,
  onRemove,
}: StockBoxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isComponentVisible = useIsVisible(containerRef);
  const [isHovered, setIsHovered] = useState(false);

  // Data Hooks
  useMarketSubscriber(stock.id, enabled, isComponentVisible);
  const tickDeals =
    useMarketDataStore((state) => state.getTick(stock.id)) || null;
  const { deals, name } = useConditionalDeals(
    stock.id,
    enabled,
    isComponentVisible,
  );

  // Indicators
  const maData = useMaDeduction(deals);
  const { openDetailWindow } = useDetailWebviewWindow({
    id: stock.id,
    name: name || stock.name,
    group: stock.group,
  });

  const removeStock = useStocksStore((state) => state.remove);

  const priceInfo = useMemo(() => {
    const lastPrice =
      tickDeals?.price || (deals.length > 0 ? deals[deals.length - 1].c : 0);
    const percent =
      tickDeals?.changePercent ||
      (deals.length >= 2
        ? Math.round(
            ((lastPrice - deals[deals.length - 2].c) /
              deals[deals.length - 2].c) *
              10000,
          ) / 100
        : 0);
    const isUp = percent > 0;
    const isDown = percent < 0;
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

  return (
    <StyledCard
      ref={containerRef}
      onClick={openDetailWindow}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      whileHover={{ y: -4 }}
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

      <AnimatePresence>
        {isHovered && (
          <ActionButtons
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <Stack direction="row" spacing={0.5}>
              <Tooltip title="TradingView" arrow>
                <ActionBtn
                  size="small"
                  onClick={async (e) => {
                    e.stopPropagation();
                    const url =
                      stock.type === "上市"
                        ? `https://tw.tradingview.com/chart?symbol=TWSE%3A${stock.id}`
                        : `https://tw.tradingview.com/chart?symbol=TPEX%3A${stock.id}`;
                    await open(url);
                  }}
                >
                  <OpenInNewIcon fontSize="inherit" sx={{ fontSize: 14 }} />
                </ActionBtn>
              </Tooltip>

              {onRemove && (
                <Tooltip title="移除" arrow>
                  <ActionBtn
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove();
                    }}
                  >
                    <CloseIcon fontSize="inherit" sx={{ fontSize: 14 }} />
                  </ActionBtn>
                </Tooltip>
              )}

              {canDelete && (
                <Tooltip title="刪除" arrow>
                  <ActionBtn
                    size="small"
                    sx={{ "&:hover": { bgcolor: "#FF5252" } }}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeStock(stock.id);
                    }}
                  >
                    <DeleteIcon fontSize="inherit" sx={{ fontSize: 14 }} />
                  </ActionBtn>
                </Tooltip>
              )}
            </Stack>
          </ActionButtons>
        )}
      </AnimatePresence>

      <Box sx={{ position: "relative", zIndex: 1, p: 2, flex: 1 }}>
        {/* Header: Name & ID */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          mb={1}
        >
          <Box sx={{ minWidth: 0, flex: 1, pr: 1 }}>
            <Typography
              noWrap
              sx={{
                color: COLORS.textSecondary,
                fontSize: "11px",
                fontWeight: 900,
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
                fontWeight: 900,
                fontSize: "18px",
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
                fontWeight: 900,
                fontSize: "24px",
                color: priceInfo.mainColor,
                lineHeight: 1,
              }}
            >
              {priceInfo.lastPrice}
            </Typography>
            <Stack
              direction="row"
              spacing={0.2}
              justifyContent="flex-end"
              alignItems="center"
            >
              <Typography
                sx={{
                  fontWeight: 900,
                  fontSize: "13px",
                  color: priceInfo.mainColor,
                }}
              >
                {priceInfo.percent > 0 ? "+" : ""}
                {priceInfo.percent}%
              </Typography>
            </Stack>
          </Box>
        </Stack>

        {/* Indicators Grid - More Compact */}
        <Box sx={{ mt: 1.5 }}>
          <Grid container spacing={1}>
            <Grid size={{ xs: 4 }}>
              <MetricTag>
                <Ma5 lastPrice={priceInfo.lastPrice} {...maData} />
              </MetricTag>
            </Grid>
            <Grid size={{ xs: 4 }}>
              <MetricTag>
                <Ma10 lastPrice={priceInfo.lastPrice} {...maData} />
              </MetricTag>
            </Grid>
            <Grid size={{ xs: 4 }}>
              <MetricTag>
                <Ma20 lastPrice={priceInfo.lastPrice} {...maData} />
              </MetricTag>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <MetricTag>
                <VolumeRatio {...volumeInfo} />
              </MetricTag>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <MetricTag>
                <AvgPrice
                  lastPrice={priceInfo.lastPrice}
                  tickDeals={tickDeals}
                />
              </MetricTag>
            </Grid>
          </Grid>
        </Box>
      </Box>

      {/* Footer Chart - Thinner */}
      <Box
        sx={{
          height: 40,
          mt: "auto",
          background: "rgba(255,255,255,0.02)",
          position: "relative",
          display: "flex",
          alignItems: "flex-end",
        }}
      >
        {tickDeals ? (
          <StockTickChart tickDeals={tickDeals} />
        ) : (
          <Box
            sx={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: 0.2,
            }}
          >
            <Typography sx={{ fontSize: "9px", fontWeight: 900 }}>
              LOADING
            </Typography>
          </Box>
        )}
      </Box>
    </StyledCard>
  );
}
