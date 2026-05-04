import {
  Box,
  CircularProgress,
  Container,
  Stack,
  Typography,
} from "@mui/material";
import { useContext, useEffect, useMemo, useRef } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Customized,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import BaseCandlestickRectangle from "../../../components/RechartCustoms/BaseCandlestickRectangle";
import { DealsContext } from "../../../context/DealsContext";
import useIndicatorSettings from "../../../hooks/useIndicatorSettings";
import { calculateIndicators } from "../../../utils/indicatorUtils";
import ChartTooltip from "../Tooltip/ChartTooltip";

interface CciChartData extends Partial<{
  t: number | string;
  o: number | null;
  h: number | null;
  l: number | null;
  c: number | null;
  v: number | null;
}> {
  cci: number | null;
  j: number | null;
  bollMa: number | null;
  bollUb: number | null;
  bollLb: number | null;
  cciOverbought: number | null;
  cciOversold: number | null;
}

export default function CCI({
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
  const deals = useContext(DealsContext);
  const { settings } = useIndicatorSettings();

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
  }, [deals.length, visibleCount, rightOffset]);

  const allData = useMemo(() => {
    return calculateIndicators(deals, settings);
  }, [deals, settings]);

  const chartData = useMemo((): CciChartData[] => {
    return allData
      .map((item) => ({
        ...item,
        cciOverbought: (item.cci || 0) > 80 ? item.cci : null,
        cciOversold: (item.cci || 0) < -80 ? item.cci : null,
      }))
      .slice(
        -(visibleCount + rightOffset),
        rightOffset === 0 ? undefined : -rightOffset,
      );
  }, [allData, visibleCount, rightOffset]);

  // Calculate Signals based on cci.pine logic
  const signals = useMemo(() => {
    const result = [];
    // We need to look back at the original data to detect crossunder/crossover accurately
    // However, for performance and simplicity in this view, we'll check based on the current window
    // and a bit of lookback from allData.

    const startIndex = Math.max(1, deals.length - (visibleCount + rightOffset));
    const endIndex = deals.length - rightOffset;

    for (let i = startIndex; i < endIndex; i++) {
      const curr = allData[i];
      const prev = allData[i - 1];

      if (!curr || !prev) continue;

      const cciVal = curr.cci || 0;
      const jVal = curr.j || 0;
      const prevJVal = prev.j || 0;
      const highVal = curr.h;
      const bbUpper = curr.bollUb;
      const prevHigh = prev.h;
      const prevBbUpper = prev.bollUb;

      // 1. CJ Sell (Only when touching/crossing BB Upper)
      const crossoverBB =
        prevHigh !== null &&
        prevBbUpper !== null &&
        highVal !== null &&
        bbUpper !== null &&
        highVal >= bbUpper;
      const isTopWarning =
        cciVal > 80 && crossoverBB && jVal < prevJVal && prevJVal > 85;

      if (isTopWarning) {
        result.push({
          t: curr.t,
          type: "top_warning",
          price: curr.h,
          text: "CJ 頂部",
        });
      }
    }
    return result;
  }, [allData, deals.length, visibleCount, rightOffset]);

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
        <Typography variant="h6" component="div" color="white" sx={{ mr: 2 }}>
          CJ
        </Typography>
      </Stack>

      <Box
        ref={chartContainerRef}
        sx={{ flexGrow: 1, minHeight: 0, width: "100%" }}
      >
        {/* Main Price Chart (60%) */}
        <ResponsiveContainer width="100%" height="60%">
          <ComposedChart
            data={chartData}
            syncId="cciSync"
            margin={{ top: 5, right: 0, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
            <XAxis dataKey="t" hide />
            <YAxis
              domain={[
                (dataMin: number) => dataMin * 0.98,
                (dataMax: number) => dataMax * 1.02,
              ]}
              orientation="left"
              stroke="#888"
              fontSize={10}
            />
            <YAxis
              yAxisId="vol"
              orientation="right"
              domain={[0, (max: number) => max * 5]}
              hide
            />

            <Tooltip content={<ChartTooltip />} />

            <Line
              dataKey="h"
              stroke="#fff"
              opacity={0}
              dot={false}
              activeDot={false}
              legendType="none"
              name="高"
            />
            <Line
              dataKey="c"
              stroke="#fff"
              opacity={0}
              dot={false}
              activeDot={false}
              legendType="none"
              name="收"
            />
            <Line
              dataKey="l"
              stroke="#fff"
              opacity={0}
              dot={false}
              activeDot={false}
              legendType="none"
              name="低"
            />
            <Line
              dataKey="o"
              stroke="#fff"
              opacity={0}
              dot={false}
              activeDot={false}
              legendType="none"
              name="開"
            />

            <Customized component={BaseCandlestickRectangle} />

            {/* Volume */}
            <Bar
              dataKey="v"
              yAxisId="vol"
              opacity={0.1}
              shape={(props: any) => {
                const { x, y, width, height, payload } = props;
                const isUp = payload.c > payload.o;
                return (
                  <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    fill={isUp ? "#f44336" : "#4caf50"}
                  />
                );
              }}
            />

            {/* Bollinger Bands */}
            <Line
              dataKey="bollMa"
              stroke="#2196f3"
              strokeWidth={1}
              dot={false}
              activeDot={false}
              opacity={0.5}
            />
            <Line
              dataKey="bollUb"
              stroke="#ff9800"
              strokeDasharray="3 3"
              dot={false}
              activeDot={false}
              opacity={0.5}
            />
            <Line
              dataKey="bollLb"
              stroke="#ff9800"
              strokeDasharray="3 3"
              dot={false}
              activeDot={false}
              opacity={0.5}
            />

            {/* Signal Markers */}
            {signals.map((signal) => {
              const isBuy = signal.type.includes("buy");
              const isStrong =
                signal.type.includes("strong") ||
                signal.type.includes("warning");
              const color = isBuy ? "#f44336" : "#4caf50";
              const yPos = isBuy ? signal.price * 0.99 : signal.price * 1.01;

              return (
                <ReferenceDot
                  key={`${signal.t}-${signal.type}`}
                  x={signal.t}
                  y={yPos}
                  shape={(props: any) => {
                    const { cx, cy } = props;
                    if (!cx || !cy) return <g />;
                    return (
                      <g>
                        {isBuy ? (
                          <path
                            d={`M${cx - 6},${cy + 12} L${cx + 6},${cy + 12} L${cx},${cy} Z`}
                            fill={color}
                          />
                        ) : (
                          <path
                            d={`M${cx - 6},${cy - 12} L${cx + 6},${cy - 12} L${cx},${cy} Z`}
                            fill={color}
                          />
                        )}
                        <text
                          x={cx}
                          y={isBuy ? cy + 20 : cy - 15}
                          textAnchor="middle"
                          fill={color}
                          fontSize={isStrong ? 12 : 10}
                          fontWeight={isStrong ? "bold" : "normal"}
                        >
                          {signal.text}
                        </text>
                      </g>
                    );
                  }}
                />
              );
            })}
          </ComposedChart>
        </ResponsiveContainer>

        {/* CCI & J Line Chart (40%) */}
        <ResponsiveContainer width="100%" height="40%">
          <ComposedChart
            data={chartData}
            syncId="cciSync"
            margin={{ top: 5, right: 0, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
            <XAxis dataKey="t" hide />
            <YAxis domain={[-250, 250]} stroke="#888" fontSize={10} />

            <Tooltip content={<ChartTooltip />} />

            {/* Threshold Lines */}
            <ReferenceLine
              y={100}
              stroke="#ff5252"
              strokeDasharray="3 3"
              opacity={0.5}
              label={{
                value: "100",
                position: "right",
                fill: "#ff5252",
                fontSize: 10,
              }}
            />
            <ReferenceLine
              y={-100}
              stroke="#448aff"
              strokeDasharray="3 3"
              opacity={0.5}
              label={{
                value: "-100",
                position: "right",
                fill: "#448aff",
                fontSize: 10,
              }}
            />
            <ReferenceLine y={0} stroke="#666" opacity={0.3} />

            {/* CCI Areas */}
            <Area
              dataKey="cciOverbought"
              fill="#ff5252"
              stroke="none"
              opacity={0.2}
              baseValue={80}
            />
            <Area
              dataKey="cciOversold"
              fill="#448aff"
              stroke="none"
              opacity={0.2}
              baseValue={-80}
            />

            {/* Indicators */}
            <Line
              dataKey="cci"
              stroke="#fff"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              name="CCI"
            />
            <Line
              dataKey="j"
              stroke="#ffeb3b"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 4 }}
              name="J Line"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </Box>
    </Container>
  );
}
