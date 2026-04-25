import SettingsIcon from "@mui/icons-material/Settings";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import {
  Box,
  Chip,
  CircularProgress,
  Container,
  IconButton,
  Menu,
  Tooltip as MuiTooltip,
  Slider,
  Stack,
  Typography,
} from "@mui/material";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Customized,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import BaseCandlestickRectangle from "../../../components/RechartCustoms/BaseCandlestickRectangle";
import { DealsContext } from "../../../context/DealsContext";
import useIndicatorSettings from "../../../hooks/useIndicatorSettings";
import {
  calculateIndicators,
  EnhancedDealData,
} from "../../../utils/indicatorUtils";
import ChartTooltip from "../Tooltip/ChartTooltip";
import Fundamental from "../Tooltip/Fundamental";

const BuyArrow = (props: any) => {
  const { cx, cy } = props;
  if (!cx || !cy) return null;
  return (
    <g>
      <path
        d={`M${cx},${cy + 10} L${cx - 6},${cy + 20} L${cx + 6},${cy + 20} Z`}
        fill="#f44336"
        stroke="#c62828"
      />
      <text
        x={cx}
        y={cy + 35}
        textAnchor="middle"
        fill="#f44336"
        fontSize="10px"
      >
        進場
      </text>
    </g>
  );
};

const ExitArrow = (props: any) => {
  const { cx, cy } = props;
  if (!cx || !cy) return null;
  return (
    <g>
      <path
        d={`M${cx},${cy - 10} L${cx - 6},${cy - 20} L${cx + 6},${cy - 20} Z`}
        fill="#4caf50"
        stroke="#2e7d32"
      />
      <text
        x={cx}
        y={cy - 30}
        textAnchor="middle"
        fill="#4caf50"
        fontSize="10px"
      >
        出場
      </text>
    </g>
  );
};

export default function ATR({
  visibleCount,
  setVisibleCount,
  rightOffset,
  setRightOffset,
}: {
  visibleCount: number;
  setVisibleCount: React.Dispatch<React.SetStateAction<number>>;
  rightOffset: number;
  setRightOffset: React.Dispatch<React.SetStateAction<number>>;
}) {
  const { settings, updateSetting } = useIndicatorSettings();
  const deals = useContext(DealsContext);
  const [showSuperTrend, setShowSuperTrend] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const { id } = useParams();

  // Zoom & Pan Control
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const lastX = useRef(0);

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = Math.sign(e.deltaY);
      const step = 4;
      setVisibleCount((prev) => {
        const next = prev + delta * step;
        const minBars = 30;
        const maxBars = deals.length > 0 ? deals.length : 1000;
        if (next < minBars) return minBars;
        if (next > maxBars) return maxBars;
        return next;
      });
    };

    const handleMouseDown = (e: MouseEvent) => {
      isDragging.current = true;
      lastX.current = e.clientX;
      e.preventDefault();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      e.preventDefault();
      const deltaX = e.clientX - lastX.current;
      const sensitivity = visibleCount / (container.clientWidth || 500);
      const barDelta = Math.round(deltaX * sensitivity * 1.5);
      if (barDelta === 0) return;
      setRightOffset((prev) => {
        let next = prev + barDelta;
        if (next < 0) next = 0;
        const maxOffset = Math.max(0, deals.length - visibleCount);
        if (next > maxOffset) next = maxOffset;
        return next;
      });
      lastX.current = e.clientX;
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    container.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [deals.length, visibleCount]);

  const allPoints = useMemo(() => {
    if (!deals || deals.length === 0) return [];
    return calculateIndicators(deals, settings);
  }, [deals, settings]);

  const chartData = useMemo(() => {
    return allPoints.slice(
      -(visibleCount + rightOffset),
      rightOffset === 0 ? undefined : -rightOffset,
    );
  }, [allPoints, visibleCount, rightOffset]);

  const yDomain = useMemo(() => {
    if (chartData.length === 0) return ["auto", "auto"];
    let min = Infinity;
    let max = -Infinity;
    chartData.forEach((d) => {
      if (d.h != null && d.h > max) max = d.h;
      if (d.l != null && d.l < min) min = d.l;
      if (d.supertrend != null && d.supertrend > max) max = d.supertrend;
      if (d.supertrend != null && d.supertrend < min) min = d.supertrend;
      if (d.hma != null && d.hma > max) max = d.hma;
      if (d.hma != null && d.hma < min) min = d.hma;
      if (d.ema50 != null && d.ema50 > max) max = d.ema50;
      if (d.ema50 != null && d.ema50 < min) min = d.ema50;
      if (d.trailStop != null && d.trailStop > max) max = d.trailStop;
      if (d.trailStop != null && d.trailStop < min) min = d.trailStop;
    });
    if (min === Infinity || max === -Infinity) return ["auto", "auto"];
    const padding = (max - min) * 0.05;
    return [min - padding, max + padding];
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <Box
        height="100vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container
      component="main"
      maxWidth={false}
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        pt: 1,
        px: 2,
        pb: 1,
      }}
    >
      <Stack spacing={2} direction="row" alignItems="center" sx={{ mb: 1 }}>
        <MuiTooltip title={<Fundamental id={id} />} arrow>
          <Typography variant="h6" component="div" color="white" sx={{ mr: 2 }}>
            ATR Trend
          </Typography>
        </MuiTooltip>

        <Box
          sx={{ flexGrow: 1, display: "flex", gap: 2, alignItems: "center" }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              icon={
                showSuperTrend ? (
                  <VisibilityIcon fontSize="small" />
                ) : (
                  <VisibilityOffIcon fontSize="small" />
                )
              }
              label="SuperTrend"
              size="small"
              onClick={() => setShowSuperTrend(!showSuperTrend)}
              variant={showSuperTrend ? "filled" : "outlined"}
              color={showSuperTrend ? "primary" : "default"}
              sx={{ height: 24, fontSize: "0.75rem" }}
            />
            <IconButton
              size="small"
              onClick={(e) => setAnchorEl(e.currentTarget)}
              color="primary"
              sx={{ p: 0.5 }}
            >
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Box>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          PaperProps={{
            sx: {
              p: 2,
              width: 250,
              bgcolor: "rgba(30, 30, 40, 0.9)",
              backdropFilter: "blur(10px)",
            },
          }}
        >
          <Typography variant="subtitle2" gutterBottom color="white">
            策略參數設定
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="rgba(255,255,255,0.7)">
              HMA 週期: {settings.hmaLength}
            </Typography>
            <Slider
              value={settings.hmaLength}
              min={5}
              max={100}
              step={1}
              onChange={(_, v) => updateSetting("hmaLength", v as number)}
              size="small"
            />
          </Box>
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="rgba(255,255,255,0.7)">
              突破週期 (N天): {settings.fastLookback}
            </Typography>
            <Slider
              value={settings.fastLookback}
              min={3}
              max={20}
              step={1}
              onChange={(_, v) => updateSetting("fastLookback", v as number)}
              size="small"
              color="primary"
            />
          </Box>
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="rgba(255,255,255,0.7)">
              ATR 週期: {settings.atrLen}
            </Typography>
            <Slider
              value={settings.atrLen}
              min={5}
              max={50}
              step={1}
              onChange={(_, v) => updateSetting("atrLen", v as number)}
              size="small"
              color="secondary"
            />
          </Box>
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="rgba(255,255,255,0.7)">
              ATR 乘數: {settings.atrMult.toFixed(1)}
            </Typography>
            <Slider
              value={settings.atrMult}
              min={1.0}
              max={5.0}
              step={0.1}
              onChange={(_, v) => updateSetting("atrMult", v as number)}
              size="small"
              color="primary"
            />
          </Box>
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="rgba(255,255,255,0.7)">
              出場成交量過濾: {settings.atrVolSwitch === 1 ? "開啟" : "關閉"}
            </Typography>
            <Slider
              value={settings.atrVolSwitch}
              min={0}
              max={1}
              step={1}
              onChange={(_, v) => updateSetting("atrVolSwitch", v as number)}
              size="small"
              color={settings.atrVolSwitch === 1 ? "success" : "warning"}
            />
          </Box>
        </Menu>
      </Stack>

      <Box
        ref={chartContainerRef}
        sx={{ flexGrow: 1, minHeight: 0, width: "100%" }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 5, right: 0, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
            <XAxis dataKey="t" hide />
            <YAxis domain={yDomain} allowDataOverflow={true} />
            <YAxis
              yAxisId="volume"
              orientation="right"
              domain={[0, (dataMax: number) => dataMax * 5]}
              width={0}
              tick={false}
              axisLine={false}
            />

            <Tooltip
              content={
                <ChartTooltip
                  hideKeys={["buySignal", "exitSignal", "direction"]}
                />
              }
              offset={50}
            />

            {/* Ghost lines for Tooltip */}
            <Line
              dataKey="h"
              stroke="none"
              dot={false}
              activeDot={false}
              name="高"
            />
            <Line
              dataKey="c"
              stroke="none"
              dot={false}
              activeDot={false}
              name="收"
            />
            <Line
              dataKey="l"
              stroke="none"
              dot={false}
              activeDot={false}
              name="低"
            />
            <Line
              dataKey="o"
              stroke="none"
              dot={false}
              activeDot={false}
              name="開"
            />

            <Customized component={BaseCandlestickRectangle} />

            <Bar
              dataKey="v"
              yAxisId="volume"
              fill="rgba(144, 202, 249, 0.2)"
              name="成交量"
              barSize={8}
            />

            <Line
              dataKey="hma"
              stroke="#089299"
              strokeWidth={1.5}
              dot={false}
              activeDot={false}
              name="HMA"
              opacity={0.5}
            />

            {showSuperTrend ? (
              <Line
                dataKey="supertrend"
                stroke="rgba(33, 150, 243, 0.8)"
                strokeWidth={2}
                dot={false}
                activeDot={false}
                name="SuperTrend"
              />
            ) : (
              <Line
                dataKey="trailStop"
                stroke="#eda049"
                strokeWidth={2}
                dot={false}
                activeDot={false}
                name="動態防線"
              />
            )}

            <Scatter
              dataKey="buySignal"
              shape={<BuyArrow />}
              legendType="none"
            />
            <Scatter
              dataKey="exitSignal"
              shape={<ExitArrow />}
              legendType="none"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </Box>
    </Container>
  );
}
