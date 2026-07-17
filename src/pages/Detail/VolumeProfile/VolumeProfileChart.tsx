import {
  Box,
  CircularProgress,
  Container,
  FormControlLabel,
  FormGroup,
  Slider,
  Stack,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip as MuiTooltip,
  Typography,
} from "@mui/material";
import { AlignHorizontalLeft, AlignHorizontalRight, HelpOutline } from "@mui/icons-material";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Customized,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import BaseCandlestickRectangle from "../../../components/RechartCustoms/BaseCandlestickRectangle";
import { DealsContext } from "../../../context/DealsContext";
import ChartTooltip from "../Tooltip/ChartTooltip";

// Interface for Volume Profile Bin
interface VolumeBin {
  priceMin: number;
  priceMax: number;
  buyVolume: number;
  sellVolume: number;
  totalVolume: number;
}

// Customized component to draw the horizontal volume profile overlay
const CustomVolumeProfile = (props: any) => {
  const { formattedGraphicalItems, width, margin, yAxisMap, bins, align } = props;

  if (!formattedGraphicalItems || formattedGraphicalItems.length === 0 || !bins || bins.length === 0) {
    return null;
  }

  // Find the first series containing points to ensure vertical positioning
  const firstSeries = formattedGraphicalItems[0];
  const points = firstSeries?.props?.points;
  if (!points || points.length === 0) {
    return null;
  }

  // Get Y-axis scale to map price to pixel coordinates
  const yAxisKey = Object.keys(yAxisMap || {})[0];
  const yAxis = yAxisMap?.[yAxisKey];
  const yScale = yAxis?.scale;

  if (typeof yScale !== "function") {
    return null;
  }

  // Calculate coordinates
  const leftX = margin?.left || 65;
  const chartWidth = width - (margin?.left || 65) - (margin?.right || 0);
  const maxProfileWidth = chartWidth * 0.35; // Use up to 35% of chart width

  // Find max total volume for scaling widths
  let maxTotalVolume = 0;
  for (const bin of bins) {
    if (bin.totalVolume > maxTotalVolume) {
      maxTotalVolume = bin.totalVolume;
    }
  }

  if (maxTotalVolume === 0) {
    return null;
  }

  return (
    <g key="volume-profile-overlay" className="volume-profile-overlay">
      {bins.map((bin: VolumeBin, i: number) => {
        if (bin.totalVolume === 0) return null;

        const yMin = yScale(bin.priceMin);
        const yMax = yScale(bin.priceMax);

        if (isNaN(yMin) || isNaN(yMax)) return null;

        const y = Math.min(yMin, yMax);
        const rawHeight = Math.abs(yMin - yMax);
        const height = Math.max(rawHeight - 0.8, 1.2); // Add spacing between bins

        // Scale widths
        const barWidth = (bin.totalVolume / maxTotalVolume) * maxProfileWidth;
        const sellWidth = (bin.sellVolume / bin.totalVolume) * barWidth;
        const buyWidth = (bin.buyVolume / bin.totalVolume) * barWidth;

        // Position alignment
        let startX = leftX;
        if (align === "right") {
          startX = width - (margin?.right || 0) - barWidth;
        }

        const isBuyDominant = bin.buyVolume > bin.sellVolume;
        const buyFillOpacity = 0.25;
        const sellFillOpacity = 0.25;

        return (
          <g key={`vp-bin-${i}`}>
            {align === "left" ? (
              <>
                {/* Sell Volume (Green in Taiwan context) */}
                {sellWidth > 0 && (
                  <rect
                    x={startX}
                    y={y}
                    width={sellWidth}
                    height={height}
                    fill="#52c41a"
                    fillOpacity={sellFillOpacity}
                  />
                )}
                {/* Buy Volume (Red in Taiwan context) */}
                {buyWidth > 0 && (
                  <rect
                    x={startX + sellWidth}
                    y={y}
                    width={buyWidth}
                    height={height}
                    fill="#ff4d4f"
                    fillOpacity={buyFillOpacity}
                  />
                )}
                {/* Buy/Sell Inner Border for highlighting dominant side */}
                {isBuyDominant && buyWidth > 1 && (
                  <rect
                    x={startX + sellWidth + 0.5}
                    y={y + 0.5}
                    width={buyWidth - 1}
                    height={height - 1}
                    fill="none"
                    stroke="#ff4d4f"
                    strokeOpacity={0.4}
                    strokeWidth={1}
                  />
                )}
                {!isBuyDominant && sellWidth > 1 && (
                  <rect
                    x={startX + 0.5}
                    y={y + 0.5}
                    width={sellWidth - 1}
                    height={height - 1}
                    fill="none"
                    stroke="#52c41a"
                    strokeOpacity={0.4}
                    strokeWidth={1}
                  />
                )}
              </>
            ) : (
              <>
                {/* When right-aligned, render Buy (Red) closer to the right margin, Sell (Green) on the left */}
                {buyWidth > 0 && (
                  <rect
                    x={startX + sellWidth}
                    y={y}
                    width={buyWidth}
                    height={height}
                    fill="#ff4d4f"
                    fillOpacity={buyFillOpacity}
                  />
                )}
                {sellWidth > 0 && (
                  <rect
                    x={startX}
                    y={y}
                    width={sellWidth}
                    height={height}
                    fill="#52c41a"
                    fillOpacity={sellFillOpacity}
                  />
                )}
                {isBuyDominant && buyWidth > 1 && (
                  <rect
                    x={startX + sellWidth + 0.5}
                    y={y + 0.5}
                    width={buyWidth - 1}
                    height={height - 1}
                    fill="none"
                    stroke="#ff4d4f"
                    strokeOpacity={0.4}
                    strokeWidth={1}
                  />
                )}
                {!isBuyDominant && sellWidth > 1 && (
                  <rect
                    x={startX + 0.5}
                    y={y + 0.5}
                    width={sellWidth - 1}
                    height={height - 1}
                    fill="none"
                    stroke="#52c41a"
                    strokeOpacity={0.4}
                    strokeWidth={1}
                  />
                )}
              </>
            )}
          </g>
        );
      })}
    </g>
  );
};

export default function VolumeProfileChart({
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

  // States for Volume Profile settings
  const [binsCount, setBinsCount] = useState<number>(30);
  const [vaRatio, setVaRatio] = useState<number>(70); // default 70% Value Area
  const [align, setAlign] = useState<"left" | "right">("left");

  // Display toggles
  const [showPoc, setShowPoc] = useState<boolean>(true);
  const [showVa, setShowVa] = useState<boolean>(true);

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

  // Extract visible deals for computation
  const chartData = useMemo(() => {
    if (!deals || deals.length === 0) return [];
    return deals.slice(
      -(visibleCount + rightOffset),
      rightOffset === 0 ? undefined : -rightOffset
    );
  }, [deals, visibleCount, rightOffset]);

  // Compute Volume Profile variables (POC, VAH, VAL, Bins)
  const profileMetrics = useMemo(() => {
    if (chartData.length === 0) {
      return {
        bins: [],
        minPrice: 0,
        maxPrice: 0,
        pocPrice: 0,
        vahPrice: 0,
        valPrice: 0,
      };
    }

    // 1. Calculate price range for visible deals
    let maxPrice = -Infinity;
    let minPrice = Infinity;
    for (const deal of chartData) {
      if (deal.h > maxPrice) maxPrice = deal.h;
      if (deal.l < minPrice) minPrice = deal.l;
    }

    if (maxPrice <= minPrice) {
      return {
        bins: [],
        minPrice,
        maxPrice,
        pocPrice: minPrice,
        vahPrice: minPrice,
        valPrice: minPrice,
      };
    }

    // 2. Initialize bins
    const binSize = (maxPrice - minPrice) / binsCount;
    const bins: VolumeBin[] = Array.from({ length: binsCount }, (_, idx) => {
      const priceMin = minPrice + idx * binSize;
      const priceMax = minPrice + (idx + 1) * binSize;
      return {
        priceMin,
        priceMax,
        buyVolume: 0,
        sellVolume: 0,
        totalVolume: 0,
      };
    });

    // 3. Distribute K-line volume into bins based on range overlap
    let totalVolume = 0;
    for (const deal of chartData) {
      const { o, h, l, c, v } = deal;
      const isUp = c > o;
      totalVolume += v;

      if (h === l || binSize === 0) {
        // Special case: Single price point
        const idx = Math.min(
          binsCount - 1,
          Math.max(0, Math.floor((c - minPrice) / binSize))
        );
        if (isUp) {
          bins[idx].buyVolume += v;
        } else {
          bins[idx].sellVolume += v;
        }
        bins[idx].totalVolume += v;
      } else {
        const candleRange = h - l;
        for (let i = 0; i < binsCount; i++) {
          const bin = bins[i];
          // Overlap between candle range [l, h] and bin range [bin.priceMin, bin.priceMax]
          const overlap = Math.max(
            0,
            Math.min(h, bin.priceMax) - Math.max(l, bin.priceMin)
          );
          if (overlap > 0) {
            const fraction = overlap / candleRange;
            const distributedVol = v * fraction;

            if (isUp) {
              bin.buyVolume += distributedVol;
            } else {
              bin.sellVolume += distributedVol;
            }
            bin.totalVolume += distributedVol;
          }
        }
      }
    }

    // 4. Find POC (Point of Control)
    let maxBinVol = 0;
    let pocIdx = 0;
    for (let i = 0; i < binsCount; i++) {
      if (bins[i].totalVolume > maxBinVol) {
        maxBinVol = bins[i].totalVolume;
        pocIdx = i;
      }
    }
    const pocPrice = minPrice + (pocIdx + 0.5) * binSize;

    // 5. Calculate Value Area (VAH / VAL) using dual-index expansion
    const targetVolume = totalVolume * (vaRatio / 100);
    let currentVolume = bins[pocIdx].totalVolume;
    let upIdx = pocIdx;
    let downIdx = pocIdx;

    while (currentVolume < targetVolume) {
      const volUp = upIdx + 1 < binsCount ? bins[upIdx + 1].totalVolume : 0;
      const volDown = downIdx - 1 >= 0 ? bins[downIdx - 1].totalVolume : 0;

      if (volUp === 0 && volDown === 0) {
        break; // Guard against dead ends
      }

      if (volUp >= volDown) {
        currentVolume += volUp;
        upIdx += 1;
      } else {
        currentVolume += volDown;
        downIdx -= 1;
      }
    }

    const valPrice = minPrice + downIdx * binSize;
    const vahPrice = minPrice + (upIdx + 1) * binSize;

    return {
      bins,
      minPrice,
      maxPrice,
      pocPrice,
      vahPrice,
      valPrice,
    };
  }, [chartData, binsCount, vaRatio]);

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

  const { bins, pocPrice, vahPrice, valPrice } = profileMetrics;

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
      {/* Title & Toolbar */}
      <Stack
        spacing={2}
        direction={{ xs: "column", md: "row" }}
        alignItems={{ xs: "stretch", md: "center" }}
        justifyContent="space-between"
        sx={{
          mb: 1.5,
          p: 1.5,
          bgcolor: "rgba(30, 30, 40, 0.45)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "12px",
        }}
      >
        {/* Title */}
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="h6" component="div" color="white" sx={{ fontWeight: 600 }}>
            成交量輪廓
          </Typography>
          <Typography variant="body2" color="rgba(255,255,255,0.4)">
            (Volume Profile)
          </Typography>
          <MuiTooltip title="Y 軸呈現各價位累計成交量，POC 為主力最活躍控制點，Value Area 為公平價值區 (涵蓋70%成交量)。滾輪縮放、拖曳平移。">
            <HelpOutline fontSize="small" sx={{ color: "primary.main", cursor: "pointer", ml: 0.5 }} />
          </MuiTooltip>
        </Stack>

        {/* Toolbar Controls */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={{ xs: 2, sm: 3 }}
          alignItems="center"
        >
          {/* Bin Slider */}
          <Box sx={{ width: 140 }}>
            <Typography variant="caption" color="rgba(255, 255, 255, 0.6)" gutterBottom display="block">
              分桶數 (Bins): {binsCount}
            </Typography>
            <Slider
              value={binsCount}
              onChange={(_, val) => setBinsCount(val as number)}
              min={10}
              max={100}
              step={5}
              size="small"
              sx={{ py: 1 }}
            />
          </Box>

          {/* Value Area Ratio Slider */}
          <Box sx={{ width: 140 }}>
            <Typography variant="caption" color="rgba(255, 255, 255, 0.6)" gutterBottom display="block">
              價值區比例: {vaRatio}%
            </Typography>
            <Slider
              value={vaRatio}
              onChange={(_, val) => setVaRatio(val as number)}
              min={50}
              max={95}
              step={5}
              size="small"
              sx={{ py: 1 }}
            />
          </Box>

          {/* Display Toggles */}
          <FormGroup row sx={{ gap: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={showPoc}
                  onChange={(e) => setShowPoc(e.target.checked)}
                  size="small"
                  color="warning"
                />
              }
              label={
                <Typography variant="caption" color={showPoc ? "#ffeb3b" : "rgba(255,255,255,0.4)"}>
                  POC
                </Typography>
              }
            />
            <FormControlLabel
              control={
                <Switch
                  checked={showVa}
                  onChange={(e) => setShowVa(e.target.checked)}
                  size="small"
                />
              }
              label={
                <Typography variant="caption" color={showVa ? "primary.main" : "rgba(255,255,255,0.4)"}>
                  價值區
                </Typography>
              }
            />
          </FormGroup>

          {/* Alignment Selector */}
          <ToggleButtonGroup
            value={align}
            exclusive
            onChange={(_, val) => val && setAlign(val)}
            size="small"
            sx={{
              bgcolor: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <ToggleButton value="left" sx={{ p: 0.5, color: "rgba(255,255,255,0.6)" }}>
              <AlignHorizontalLeft fontSize="small" />
            </ToggleButton>
            <ToggleButton value="right" sx={{ p: 0.5, color: "rgba(255,255,255,0.6)" }}>
              <AlignHorizontalRight fontSize="small" />
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Stack>

      {/* Charts Layout */}
      <Box
        ref={chartContainerRef}
        sx={{
          flexGrow: 1,
          minHeight: 0,
          width: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Main Price & Volume Profile Chart (70%) */}
        <ResponsiveContainer width="100%" height="70%">
          <ComposedChart
            data={chartData}
            syncId="volumeProfileSync"
            margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
            <XAxis dataKey="t" hide />
            <YAxis
              domain={[
                (dataMin: number) => dataMin * 0.985,
                (dataMax: number) => dataMax * 1.015,
              ]}
              orientation="left"
              stroke="#888"
              fontSize={10}
            />
            <YAxis
              yAxisId="volAxis"
              orientation="right"
              domain={[0, (dataMax: number) => dataMax * 4]}
              tick={false}
              axisLine={false}
              width={0}
              hide
            />

            <Tooltip content={<ChartTooltip />} offset={50} />

            {/* Invisible Line indicators to carry payloads to Customized component */}
            <Line dataKey="h" stroke="#fff" opacity={0} dot={false} activeDot={false} legendType="none" name="高" />
            <Line dataKey="c" stroke="#fff" opacity={0} dot={false} activeDot={false} legendType="none" name="收" />
            <Line dataKey="l" stroke="#fff" opacity={0} dot={false} activeDot={false} legendType="none" name="低" />
            <Line dataKey="o" stroke="#fff" opacity={0} dot={false} activeDot={false} legendType="none" name="開" />

            {/* Render Value Area Background Highlight */}
            {showVa && vahPrice > valPrice && (
              <ReferenceArea
                y1={valPrice}
                y2={vahPrice}
                fill="rgba(144, 202, 249, 0.04)"
                stroke="none"
              />
            )}

            {/* Recharts Customized components */}
            <Customized component={BaseCandlestickRectangle} />
            <Customized
              component={(props: any) => (
                <CustomVolumeProfile
                  {...props}
                  bins={bins}
                  align={align}
                />
              )}
            />

            {/* VAH/VAL Border Lines */}
            {showVa && vahPrice > valPrice && (
              <ReferenceLine
                y={vahPrice}
                stroke="rgba(255, 255, 255, 0.35)"
                strokeDasharray="4 3"
                strokeWidth={1}
                label={{
                  value: `VAH: ${vahPrice.toFixed(2)}`,
                  fill: "rgba(255, 255, 255, 0.5)",
                  fontSize: 9,
                  position: align === "left" ? "insideTopRight" : "insideTopLeft",
                }}
              />
            )}
            {showVa && vahPrice > valPrice && (
              <ReferenceLine
                y={valPrice}
                stroke="rgba(255, 255, 255, 0.35)"
                strokeDasharray="4 3"
                strokeWidth={1}
                label={{
                  value: `VAL: ${valPrice.toFixed(2)}`,
                  fill: "rgba(255, 255, 255, 0.5)",
                  fontSize: 9,
                  position: align === "left" ? "insideBottomRight" : "insideBottomLeft",
                }}
              />
            )}

            {/* POC Center Line (Glowing Yellow HUD style) */}
            {showPoc && pocPrice > 0 && (
              <ReferenceLine
                y={pocPrice}
                stroke="#ffeb3b"
                strokeDasharray="3 3"
                strokeWidth={1.5}
                label={{
                  value: `POC: ${pocPrice.toFixed(2)}`,
                  fill: "#ffeb3b",
                  fontSize: 10,
                  fontWeight: "bold",
                  position: align === "left" ? "insideTopRight" : "insideTopLeft",
                }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>

        {/* Traditional Volume Bar Chart (30%) */}
        <ResponsiveContainer width="100%" height="30%">
          <ComposedChart
            data={chartData}
            syncId="volumeProfileSync"
            margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
            <XAxis dataKey="t" stroke="#888" fontSize={9} />
            <YAxis stroke="#888" fontSize={9} />

            <Tooltip content={<ChartTooltip />} offset={50} />

            <Bar
              dataKey="v"
              name="成交量"
              shape={(props: any) => {
                const { x, y, width, height, payload } = props;
                const isUp = payload.c > payload.o;
                return (
                  <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    fill={isUp ? "#ff4d4f" : "#52c41a"}
                    fillOpacity={0.4}
                    stroke={isUp ? "#ff4d4f" : "#52c41a"}
                    strokeOpacity={0.6}
                    strokeWidth={0.5}
                  />
                );
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </Box>
    </Container>
  );
}
