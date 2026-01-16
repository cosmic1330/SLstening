import AnalyticsIcon from "@mui/icons-material/Analytics";
import DeleteIcon from "@mui/icons-material/Delete";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import {
  Box,
  Divider,
  Grid,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  styled,
} from "@mui/material";
import { open } from "@tauri-apps/plugin-shell";
import { useMemo } from "react";
import useConditionalDeals from "../../hooks/useConditionalDeals";
import useDetailWebviewWindow from "../../hooks/useDetailWebviewWindow";
import useMaDeduction from "../../hooks/useMaDeduction";
import useStocksStore from "../../store/Stock.store";
import { StockStoreType } from "../../types";
import estimateVolume from "../../utils/estimateVolume";
import AvgPrice from "./Items/AvgPrice";
import DailyLow from "./Items/DailyLow";
import Ma20 from "./Items/Ma20";
import Ma5 from "./Items/Ma5";
import PreVolume from "./Items/PreVolume";
import Volume from "./Items/Volume";
import VolumeEstimated from "./Items/VolumeEstimated";
import VolumeRatio from "./Items/VolumeRatio";
import TickChart from "./TickChart";

// Premium Card Styling
const StyledCard = styled(Box)(() => ({
  position: "relative",
  background: "rgba(30, 30, 35, 0.6)", // Darker, more transparent base
  backdropFilter: "blur(24px) saturate(180%)", // Heavy blur & saturation for premium glass
  borderRadius: "24px",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  boxShadow:
    "0 8px 32px rgba(0, 0, 0, 0.2), inset 0 0 0 1px rgba(255,255,255,0.05)",
  overflow: "hidden",
  cursor: "pointer",
  transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)", // Bouncy spring effect
  "&:hover": {
    transform: "translateY(-6px) scale(1.02)",
    background: "rgba(40, 40, 45, 0.75)",
    boxShadow:
      "0 20px 50px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(255,255,255,0.1)",
    borderColor: "rgba(255, 255, 255, 0.2)",
    "& .action-buttons": {
      opacity: 1,
      transform: "translateY(0)",
      pointerEvents: "auto",
    },
    "& .card-glow": {
      opacity: 0.8,
    },
  },
}));

// Action buttons container
const ActionButtons = styled(Stack)(() => ({
  position: "absolute",
  top: 12,
  right: 12,
  opacity: 0,
  pointerEvents: "none",
  transform: "translateY(-10px)",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  zIndex: 20,
}));

// Action Button Style
const ActionBtn = styled(IconButton)(({ theme }) => ({
  backgroundColor: "rgba(0,0,0,0.5)",
  backdropFilter: "blur(4px)",
  color: theme.palette.common.white,
  border: "1px solid rgba(255,255,255,0.1)",
  padding: 6,
  "&:hover": {
    backgroundColor: theme.palette.primary.main,
    transform: "scale(1.1)",
  },
}));

// Metric Container with subtle separation
const MetricBox = styled(Box)(() => ({
  padding: "4px 8px",
  borderRadius: "12px",
  transition: "background 0.2s",
  "&:hover": {
    background: "rgba(255,255,255,0.03)",
  },
}));

const GlowEffect = styled(Box)(() => ({
  position: "absolute",
  top: "-50%",
  left: "-50%",
  width: "200%",
  height: "200%",
  background:
    "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.05) 0%, transparent 50%)",
  opacity: 0,
  pointerEvents: "none",
  transition: "opacity 0.5s ease",
  zIndex: 0,
}));

export interface StockBoxProps {
  stock: StockStoreType;
  canDelete?: boolean; // Kept for interface compatibility, logic handled internally if needed
  canAdd?: boolean; // Kept for interface compatibility
  enabled?: boolean;
}

export default function StockBox({ stock, enabled = true }: StockBoxProps) {
  // Using the Hook with enabled capabilities
  const { deals, name, tickDeals } = useConditionalDeals(stock.id, enabled);

  // MA Calculations
  const {
    ma5,
    ma5_deduction_time,
    ma5_deduction_value,
    ma5_tomorrow_deduction_value,
    ma5_tomorrow_deduction_time,
    ma20,
    ma20_deduction_time,
    ma20_deduction_value,
    ma20_tomorrow_deduction_value,
    ma20_tomorrow_deduction_time,
  } = useMaDeduction(deals);

  // Detail Window Opener
  const { openDetailWindow } = useDetailWebviewWindow({
    id: stock.id,
    name: name || stock.name,
    group: stock.group,
  });

  const removeStock = useStocksStore((state) => state.remove);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeStock(stock.id);
  };

  // TradingView Link
  const url =
    stock.type === "上市"
      ? `https://tw.tradingview.com/chart?symbol=TWSE%3A${stock.id}`
      : `https://tw.tradingview.com/chart?symbol=TPEX%3A${stock.id}`;

  // Basic Price Calcs
  const lastPrice = useMemo(() => {
    if (tickDeals?.price) return tickDeals.price;
    return deals.length > 0 ? deals[deals.length - 1].c : 0;
  }, [deals, tickDeals]);

  const percent = useMemo(() => {
    if (tickDeals?.changePercent) return tickDeals.changePercent;
    if (deals.length < 2) return 0;
    const prePrice = deals[deals.length - 2].c;
    return Math.round(((lastPrice - prePrice) / prePrice) * 10000) / 100;
  }, [deals, tickDeals, lastPrice]);

  // Volume Analysis
  const avgDaysVolume = useMemo(() => {
    if (deals.length < 11) return 0;
    const pastDeals = deals.slice(-11, -1);
    const totalVolume = pastDeals.reduce((acc, deal) => acc + deal.v, 0);
    return Math.round((totalVolume / pastDeals.length) * 100) / 100;
  }, [deals]);

  const { estimatedVolume } = useMemo(() => {
    if (deals.length > 0) {
      return estimateVolume({
        currentVolume: deals[deals.length - 1].v,
        currentTime: new Date(),
        previousDayVolume: deals[deals.length - 2]?.v,
        avg5DaysVolume: avgDaysVolume,
      });
    }
    return { estimatedVolume: 0 };
  }, [deals, avgDaysVolume]);

  const isPositive = percent > 0;
  const isNegative = percent < 0;
  // Taiwan market colors: Red = Up, Green = Down
  const mainColor = isPositive
    ? "#FF5252" // Red accent
    : isNegative
    ? "#69F0AE" // Green accent
    : "#B0B0B0"; // Grey

  // Dynamic Glow Color based on trend
  const glowColor = isPositive
    ? "radial-gradient(circle at 80% 20%, rgba(255, 82, 82, 0.15) 0%, transparent 50%)"
    : isNegative
    ? "radial-gradient(circle at 80% 20%, rgba(105, 240, 174, 0.15) 0%, transparent 50%)"
    : "radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.05) 0%, transparent 50%)";

  return (
    <StyledCard onClick={openDetailWindow}>
      <Box
        className="card-glow"
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: glowColor,
          opacity: 0.5,
          transition: "opacity 0.4s",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />
      <GlowEffect className="highlight-glow" />

      {/* Action Buttons */}
      <ActionButtons direction="row" spacing={1} className="action-buttons">
        <Tooltip title="View Chart on TradingView" arrow>
          <ActionBtn
            size="small"
            onClick={async (e) => {
              e.stopPropagation();
              await open(url);
            }}
          >
            <OpenInNewIcon fontSize="small" />
          </ActionBtn>
        </Tooltip>
        <Tooltip title="Detailed Analytics" arrow>
          <ActionBtn
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              openDetailWindow();
            }}
          >
            <AnalyticsIcon fontSize="small" />
          </ActionBtn>
        </Tooltip>
        <Tooltip title="Delete Stock" arrow>
          <ActionBtn
            size="small"
            color="error"
            onClick={handleDelete}
            sx={{
              "&:hover": {
                backgroundColor: "rgba(244, 67, 54, 0.8)",
                borderColor: "#ef5350",
              },
            }}
          >
            <DeleteIcon fontSize="small" />
          </ActionBtn>
        </Tooltip>
      </ActionButtons>

      {/* Main Content */}
      <Box sx={{ position: "relative", zIndex: 1, p: 2.5 }}>
        {/* Header: Name & Price */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          mb={2.5}
        >
          <Box>
            <Typography
              variant="caption"
              sx={{
                color: "rgba(255,255,255,0.5)",
                fontWeight: 600,
                letterSpacing: 0.5,
              }}
            >
              {stock.id}
            </Typography>
            <Typography
              variant="h5"
              sx={{ fontWeight: 800, color: "#fff", lineHeight: 1.1 }}
            >
              {name || stock.name}
            </Typography>
          </Box>
          <Box sx={{ textAlign: "right" }}>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 800,
                color: mainColor,
                letterSpacing: -1,
                lineHeight: 1,
              }}
            >
              {lastPrice}
            </Typography>
            <Stack
              direction="row"
              justifyContent="flex-end"
              alignItems="center"
              spacing={0.5}
              mt={0.5}
            >
              {isPositive ? (
                <TrendingUpIcon sx={{ fontSize: 16, color: mainColor }} />
              ) : isNegative ? (
                <TrendingDownIcon sx={{ fontSize: 16, color: mainColor }} />
              ) : null}
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 700, color: mainColor }}
              >
                {percent > 0 ? "+" : ""}
                {percent}%
              </Typography>
            </Stack>
          </Box>
        </Stack>

        <Divider sx={{ borderColor: "rgba(255,255,255,0.08)", mb: 2 }} />

        {/* Info Grid - Grouped logically */}
        {/* Info Grid - Grouped logically */}
        <Grid container spacing={2}>
          {/* Moving Averages Group */}
          <Grid size={6}>
            <Box>
              <MetricBox>
                <Ma5
                  {...{
                    ma5,
                    lastPrice,
                    ma5_deduction_time,
                    ma5_deduction_value,
                    ma5_tomorrow_deduction_time,
                    ma5_tomorrow_deduction_value,
                  }}
                />
              </MetricBox>
              <MetricBox>
                <Ma20
                  {...{
                    ma20,
                    lastPrice,
                    ma20_deduction_time,
                    ma20_deduction_value,
                    ma20_tomorrow_deduction_time,
                    ma20_tomorrow_deduction_value,
                  }}
                />
              </MetricBox>
            </Box>
          </Grid>

          <Grid size={{ xs: 6 }}>
            <MetricBox>
              <AvgPrice {...{ lastPrice, tickDeals }} />
            </MetricBox>
            <MetricBox>
              <DailyLow {...{ deals, lastPrice }} />
            </MetricBox>
          </Grid>

          {/* Volume & Stats Group */}
          <Grid size={{ xs: 6 }}>
            <Stack direction="row" flexWrap="nowrap" spacing={1}>
              <MetricBox>
                <VolumeEstimated {...{ deals, estimatedVolume }} />
              </MetricBox>
              <MetricBox>
                <VolumeRatio {...{ estimatedVolume, avgDaysVolume }} />
              </MetricBox>
            </Stack>
          </Grid>

          {/* Volume bars (Standard & Pre) */}
          <Grid size={{ xs: 6 }}>
            <Stack direction="row" flexWrap="nowrap" spacing={1}>
              <MetricBox>
                <Volume {...{ deals }} />
              </MetricBox>
              <MetricBox>
                <PreVolume {...{ deals }} />
              </MetricBox>
            </Stack>
          </Grid>
        </Grid>
      </Box>

      {/* Chart Footer - Integrated seamlessly */}
      <Box
        sx={{
          height: 64,
          mt: 1,
          background:
            "linear-gradient(to top, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 100%)",
          position: "relative",
          borderBottomLeftRadius: "24px",
          borderBottomRightRadius: "24px",
          overflow: "hidden", // Ensure chart doesn't spill
        }}
      >
        {tickDeals ? (
          <TickChart tickDeals={tickDeals} />
        ) : (
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            height="100%"
          >
            <Typography
              variant="caption"
              color="text.disabled"
              sx={{ fontStyle: "italic" }}
            >
              Waiting for tick data...
            </Typography>
          </Box>
        )}
      </Box>
    </StyledCard>
  );
}
