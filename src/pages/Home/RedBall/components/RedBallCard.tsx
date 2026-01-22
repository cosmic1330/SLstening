import {
  AddCircleOutline as AddIcon,
  Analytics as AnalyticsIcon,
  OpenInNew as OpenInNewIcon,
} from "@mui/icons-material";
import {
  Box,
  Divider,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  styled,
  Tooltip,
  Typography,
} from "@mui/material";
import { open } from "@tauri-apps/plugin-shell";
import { useMemo } from "react";
import MakChart from "../../../../components/CommonChart/MakChart";
import useConditionalDeals from "../../../../hooks/useConditionalDeals";
import useDetailWebviewWindow from "../../../../hooks/useDetailWebviewWindow";
import useMaDeduction from "../../../../hooks/useMaDeduction";
import useStocksStore from "../../../../store/Stock.store";
import { StockStoreType, TaType } from "../../../../types";
import estimateVolume from "../../../../utils/estimateVolume";

export const RED_BALL_CARD_HEIGHT = 360; // 統一管理推薦股卡片高度

// --- Styled Components ---

const CardContainer = styled(Paper)(() => ({
  background: "rgba(25, 27, 35, 0.7)",
  backdropFilter: "blur(20px)",
  borderRadius: "16px",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  height: "100%",
  position: "relative",
  overflow: "hidden",
  transition: "all 0.3s ease",
  display: "flex",
  flexDirection: "column",
  cursor: "pointer",
  "&:hover": {
    background: "rgba(35, 37, 45, 0.9)",
    borderColor: "rgba(239, 68, 68, 0.4)",
    boxShadow: "0 12px 24px rgba(0, 0, 0, 0.3)",
  },
}));

const ActionButtons = styled(Stack)(() => ({
  position: "absolute",
  top: 8,
  right: 8,
  zIndex: 10,
}));

const ActionBtn = styled(IconButton)(() => ({
  padding: 4,
  background: "rgba(0,0,0,0.3)",
  color: "rgba(255, 255, 255, 0.5)",
  "&:hover": {
    background: "#ef4444",
    color: "white",
  },
}));

const CompactMetric = styled(Box)(() => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "4px 0",
  borderBottom: "1px solid rgba(255,255,255,0.03)",
}));

// --- Volume Logic ---
const getVolumeStatus = (ratio: number) => {
  if (ratio >= 5) return { title: "出大量", color: "#ef4444" };
  if (ratio >= 2.5) return { title: "放量", color: "#f87171" };
  if (ratio >= 1.5) return { title: "溫和", color: "#fb923c" };
  if (ratio >= 0.8) return { title: "正常", color: "#94a3b8" };
  if (ratio >= 0.5) return { title: "偏低", color: "#4ade80" };
  return { title: "量縮", color: "#10b981" };
};

// --- Helper for Date Conversion ---
const convertTaToMak = (deals: TaType) => {
  return deals.map((d) => {
    const s = d.t.toString();
    if (s.length === 8) {
      const year = parseInt(s.substring(0, 4));
      const month = parseInt(s.substring(4, 6)) - 1;
      const day = parseInt(s.substring(6, 8));
      const timestamp = new Date(year, month, day).getTime() / 1000;
      return { ...d, t: timestamp };
    }
    return d;
  });
};

// --- Main Component ---

interface RedBallCardProps {
  stock: StockStoreType;
  isVisible: boolean;
}

export default function RedBallCard({ stock, isVisible }: RedBallCardProps) {
  if (!stock || !stock.id) return null;

  const recommendationReason = stock.type || "策略選股";
  const { deals, name, tickDeals } = useConditionalDeals(stock.id, isVisible);
  const { ma5, ma20 } = useMaDeduction(deals);
  const { openDetailWindow } = useDetailWebviewWindow({
    id: stock.id,
    name: name || stock.name,
    group: stock.group,
  });

  const lastPrice = useMemo(() => {
    let price: any = 0;
    if (tickDeals?.price !== undefined && tickDeals?.price !== null) {
      price = tickDeals.price;
    } else if (deals && deals.length > 0) {
      price = deals[deals.length - 1].c;
    }
    return Number(price) || 0;
  }, [deals, tickDeals]);

  const percent = useMemo(() => {
    if (tickDeals && typeof tickDeals.changePercent === "number") {
      return tickDeals.changePercent;
    }
    if (!deals || deals.length < 2) return 0;
    const current = Number(lastPrice) || 0;
    const prePrice = Number(deals[deals.length - 2].c) || 0;
    if (prePrice === 0) return 0;
    return Math.round(((current - prePrice) / prePrice) * 10000) / 100;
  }, [deals, tickDeals, lastPrice]);

  const avgDaysVolume = useMemo(() => {
    if (!deals || deals.length < 11) return 0;
    const pastDeals = deals.slice(-11, -1);
    const totalVolume = pastDeals.reduce(
      (acc: number, deal: TaType[0]) => acc + (Number(deal?.v) || 0),
      0,
    );
    return Math.round(totalVolume / pastDeals.length);
  }, [deals]);

  const { estimatedVolume } = useMemo(() => {
    if (deals && deals.length > 0) {
      return estimateVolume({
        currentVolume: deals[deals.length - 1].v,
        currentTime: new Date(),
        previousDayVolume: deals[deals.length - 2]?.v,
        avg5DaysVolume: avgDaysVolume,
      });
    }
    return { estimatedVolume: 0 };
  }, [deals, avgDaysVolume]);

  const volumeRatio = useMemo(() => {
    if (avgDaysVolume === 0) return 0;
    return Math.round((estimatedVolume / avgDaysVolume) * 100) / 100;
  }, [estimatedVolume, avgDaysVolume]);

  const volumeStatus = useMemo(
    () => getVolumeStatus(volumeRatio),
    [volumeRatio],
  );

  const { stocks, increase } = useStocksStore();
  const isTracking = useMemo(
    () => stocks.some((s) => s.id === stock.id),
    [stocks, stock.id],
  );

  const isPositive = percent > 0;
  const isNegative = percent < 0;
  const mainColor = isPositive ? "#ef4444" : isNegative ? "#10b981" : "#94a3b8";

  // Wrap deals for MakChart
  const makDeals = useMemo(() => {
    if (!deals || deals.length === 0) return null;
    return {
      data: convertTaToMak(deals),
      change: percent,
      price: lastPrice,
    };
  }, [deals, percent, lastPrice]);

  if (!isVisible) {
    return (
      <CardContainer sx={{ p: 1.5 }}>
        <Skeleton width="60%" />
        <Skeleton variant="rectangular" height={40} sx={{ my: 1 }} />
        <Skeleton width="100%" height={20} sx={{ my: 0.5 }} />
        <Skeleton width="100%" height={20} sx={{ my: 0.5 }} />
      </CardContainer>
    );
  }

  return (
    <CardContainer onClick={openDetailWindow}>
      {/* Mini Actions */}
      <ActionButtons direction="row" spacing={0.5}>
        {!isTracking && (
          <Tooltip title="加入追蹤" arrow>
            <ActionBtn
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                increase(stock);
              }}
            >
              <AddIcon sx={{ fontSize: 14 }} />
            </ActionBtn>
          </Tooltip>
        )}
        <Tooltip title="詳情" arrow>
          <ActionBtn
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              openDetailWindow();
            }}
          >
            <AnalyticsIcon sx={{ fontSize: 14 }} />
          </ActionBtn>
        </Tooltip>
        <Tooltip title="TradingView" arrow>
          <ActionBtn
            size="small"
            onClick={async (e) => {
              e.stopPropagation();
              await open(
                `https://tw.tradingview.com/chart?symbol=TWSE%3A${stock.id}`,
              );
            }}
          >
            <OpenInNewIcon sx={{ fontSize: 14 }} />
          </ActionBtn>
        </Tooltip>
      </ActionButtons>

      <Box sx={{ p: 1.5, flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Header Row: Name & Price */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          mb={1}
        >
          <Box sx={{ maxWidth: "60%" }}>
            <Typography
              variant="body2"
              sx={{
                color: "rgba(255,255,255,0.4)",
                fontSize: 10,
                lineHeight: 1,
              }}
            >
              {stock.id}.TW
            </Typography>
            <Typography
              variant="subtitle1"
              noWrap
              sx={{ fontWeight: 800, color: "white", lineHeight: 1.2 }}
            >
              {name || stock.name}
            </Typography>
          </Box>
          <Box sx={{ textAlign: "right" }}>
            <Typography
              sx={{
                fontWeight: 900,
                color: mainColor,
                fontSize: 18,
                fontFamily: "monospace",
              }}
            >
              {(Number(lastPrice) || 0).toFixed(2)}
            </Typography>
            <Typography
              sx={{ fontWeight: 700, color: mainColor, fontSize: 12 }}
            >
              {isPositive ? "+" : ""}
              {percent}%
            </Typography>
          </Box>
        </Stack>

        <Divider sx={{ borderColor: "rgba(255,255,255,0.06)", mb: 1 }} />

        {/* Reason Chip */}
        <Box sx={{ mb: 1 }}>
          <Typography
            sx={{
              display: "inline-block",
              background: "rgba(239, 68, 68, 0.1)",
              color: "#ef4444",
              fontSize: 10,
              fontWeight: 800,
              px: 1,
              py: 0.2,
              borderRadius: 1,
              border: "1px solid rgba(239, 68, 68, 0.2)",
            }}
          >
            {recommendationReason}
          </Typography>
        </Box>

        {/* Dense Metrics */}
        <Stack spacing={0.2} sx={{ mb: 1 }}>
          <CompactMetric>
            <Typography
              variant="caption"
              sx={{ color: "rgba(255,255,255,0.4)" }}
            >
              量能狀態
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: volumeStatus.color,
                fontWeight: 800,
                letterSpacing: "0.5px",
              }}
            >
              {volumeStatus.title} ({volumeRatio}x)
            </Typography>
          </CompactMetric>
          <CompactMetric>
            <Typography
              variant="caption"
              sx={{ color: "rgba(255,255,255,0.4)" }}
            >
              預估量
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: "white", fontWeight: 700 }}
            >
              {Math.round(estimatedVolume).toLocaleString()}
            </Typography>
          </CompactMetric>
          <CompactMetric>
            <Typography
              variant="caption"
              sx={{ color: "rgba(255,255,255,0.4)" }}
            >
              MA5 / MA20
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Typography
                variant="caption"
                sx={{
                  color:
                    Number(lastPrice) >= Number(ma5) ? "#ef4444" : "#10b981",
                  fontWeight: 700,
                }}
              >
                {(Number(ma5) || 0).toFixed(1)}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color:
                    Number(lastPrice) >= Number(ma20) ? "#ef4444" : "#10b981",
                  fontWeight: 700,
                }}
              >
                {(Number(ma20) || 0).toFixed(1)}
              </Typography>
            </Box>
          </CompactMetric>
        </Stack>
      </Box>

      {/* MakChart implementation */}
      <Box
        sx={{
          height: 100,
          position: "relative",
          mt: "auto",
          borderTop: "1px solid rgba(255,255,255,0.03)",
          overflow: "hidden",
        }}
      >
        {makDeals ? (
          <MakChart deals={makDeals} height={100} />
        ) : (
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            height="100%"
          >
            <Typography
              variant="caption"
              color="rgba(255,255,255,0.2)"
              sx={{ fontStyle: "italic" }}
            >
              載入日線走勢...
            </Typography>
          </Box>
        )}
      </Box>
    </CardContainer>
  );
}
