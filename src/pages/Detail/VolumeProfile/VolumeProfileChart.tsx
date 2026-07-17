import { AlignHorizontalLeft, AlignHorizontalRight, HelpOutline } from "@mui/icons-material";
import {
  Box,
  CircularProgress,
  Container,
  FormControlLabel,
  FormGroup,
  Tooltip as MuiTooltip,
  Slider,
  Stack,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
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
  isHVN?: boolean;
  priceCenter: number;
}

// Customized Volume Profile Component
const CustomVolumeProfile = (props: any) => {
  const { formattedGraphicalItems, width, margin, yAxisMap, bins, align, showHVN } = props;

  if (!formattedGraphicalItems || formattedGraphicalItems.length === 0 || !bins || bins.length === 0) {
    return null;
  }

  const yAxisKey = Object.keys(yAxisMap || {})[0];
  const yAxis = yAxisMap?.[yAxisKey];
  const yScale = yAxis?.scale;
  if (typeof yScale !== "function") return null;

  const leftX = margin?.left || 65;
  const chartWidth = width - (margin?.left || 65) - (margin?.right || 0);
  const maxProfileWidth = chartWidth * 0.35;

  let maxTotalVolume = 0;
  for (const bin of bins) {
    if (bin.totalVolume > maxTotalVolume) maxTotalVolume = bin.totalVolume;
  }
  if (maxTotalVolume === 0) return null;

  return (
    <g key="volume-profile-overlay" className="volume-profile-overlay">
      {/* HVN 高亮 + 價格標籤 */}
      {showHVN &&
        bins.map((bin: VolumeBin, i: number) => {
          if (!bin.isHVN || bin.totalVolume === 0) return null;

          const yMin = yScale(bin.priceMin);
          const yMax = yScale(bin.priceMax);
          if (isNaN(yMin) || isNaN(yMax)) return null;

          const y = Math.min(yMin, yMax);
          const height = Math.max(Math.abs(yMin - yMax) - 0.8, 1.2);
          const barWidth = (bin.totalVolume / maxTotalVolume) * maxProfileWidth;

          let startX = leftX;
          if (align === "right") {
            startX = width - (margin?.right || 0) - barWidth;
          }

          const centerY = y + height / 1.65

          return (
            <g key={`hvn-${i}`}>
              {/* HVN 背景與邊框 */}
              <rect
                x={startX}
                y={y}
                width={barWidth}
                height={height}
                fill="#ffd700"
                fillOpacity={0.09}
                stroke="#ffeb3b"
                strokeWidth={2.8}
                strokeDasharray="2 1"
              />
              {/* HVN 價格標籤 */}
              <text
                x={align === "left" ? startX + barWidth + 10 : startX - 10}
                y={centerY + 3.5}
                fill="#ffeb3b"
                fontSize={10}
                fontWeight="600"
                textAnchor={align === "left" ? "start" : "end"}
                dominantBaseline="middle"
                style={{ textShadow: "0 0 4px rgba(0,0,0,0.8)" }}
              >
                {bin.priceCenter.toFixed(2)}
              </text>
            </g>
          );
        })}

      {/* 買賣量長條 */}
      {bins.map((bin: VolumeBin, i: number) => {
        if (bin.totalVolume === 0) return null;

        const yMin = yScale(bin.priceMin);
        const yMax = yScale(bin.priceMax);
        if (isNaN(yMin) || isNaN(yMax)) return null;

        const y = Math.min(yMin, yMax);
        const height = Math.max(Math.abs(yMin - yMax) - 0.8, 1.2);

        const barWidth = (bin.totalVolume / maxTotalVolume) * maxProfileWidth;
        const sellWidth = (bin.sellVolume / bin.totalVolume) * barWidth;
        const buyWidth = (bin.buyVolume / bin.totalVolume) * barWidth;

        let startX = leftX;
        if (align === "right") {
          startX = width - (margin?.right || 0) - barWidth;
        }

        const isBuyDominant = bin.buyVolume > bin.sellVolume;

        return (
          <g key={`volume-bar-${i}`}>
            {align === "left" ? (
              <>
                {sellWidth > 0 && (
                  <rect
                    x={startX}
                    y={y}
                    width={sellWidth}
                    height={height}
                    fill="#52c41a"
                    fillOpacity={0.25}
                  />
                )}
                {buyWidth > 0 && (
                  <rect
                    x={startX + sellWidth}
                    y={y}
                    width={buyWidth}
                    height={height}
                    fill="#ff4d4f"
                    fillOpacity={0.25}
                  />
                )}
              </>
            ) : (
              <>
                {buyWidth > 0 && (
                  <rect
                    x={startX + sellWidth}
                    y={y}
                    width={buyWidth}
                    height={height}
                    fill="#ff4d4f"
                    fillOpacity={0.25}
                  />
                )}
                {sellWidth > 0 && (
                  <rect
                    x={startX}
                    y={y}
                    width={sellWidth}
                    height={height}
                    fill="#52c41a"
                    fillOpacity={0.25}
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

  const [binsCount, setBinsCount] = useState<number>(30);
  const [vaRatio, setVaRatio] = useState<number>(70);
  const [align, setAlign] = useState<"left" | "right">("left");

  const [showPoc, setShowPoc] = useState<boolean>(true);
  const [showVa, setShowVa] = useState<boolean>(true);
  const [showHVN, setShowHVN] = useState<boolean>(true);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const lastX = useRef(0);

  // Zoom & Pan Effect
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

    const handleMouseDown = (e: MouseEvent) => { isDragging.current = true; lastX.current = e.clientX; e.preventDefault(); };
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
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
    const handleMouseUp = () => { isDragging.current = false; };

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

  const chartData = useMemo(() => {
    if (!deals || deals.length === 0) return [];
    return deals.slice(-(visibleCount + rightOffset), rightOffset === 0 ? undefined : -rightOffset);
  }, [deals, visibleCount, rightOffset]);

  // Compute Volume Profile + HVN
const profileMetrics = useMemo(() => {
  if (chartData.length === 0) {
    return { bins: [], minPrice: 0, maxPrice: 0, pocPrice: 0, vahPrice: 0, valPrice: 0 };
  }

  let maxPrice = -Infinity;
  let minPrice = Infinity;
  for (const deal of chartData) {
    if (deal.h > maxPrice) maxPrice = deal.h;
    if (deal.l < minPrice) minPrice = deal.l;
  }

  if (maxPrice <= minPrice) {
    return { bins: [], minPrice, maxPrice, pocPrice: minPrice, vahPrice: minPrice, valPrice: minPrice };
  }

  const binSize = (maxPrice - minPrice) / binsCount;
  const bins: VolumeBin[] = Array.from({ length: binsCount }, (_, idx) => ({
    priceMin: minPrice + idx * binSize,
    priceMax: minPrice + (idx + 1) * binSize,
    buyVolume: 0,
    sellVolume: 0,
    totalVolume: 0,
    isHVN: false,
    priceCenter: minPrice + (idx + 0.5) * binSize,
  }));

  let totalVolume = 0;

  chartData.forEach((deal, index) => {
    const { o, h, l, c, v } = deal;
    const isUp = c > o;
    const isLastBar = index === chartData.length - 1;   // ← 關鍵：判斷是否為最新一筆
    totalVolume += v;

    if (h === l || binSize === 0) {
      const idx = Math.min(binsCount - 1, Math.max(0, Math.floor((c - minPrice) / binSize)));
      if (isUp) bins[idx].buyVolume += v;
      else bins[idx].sellVolume += v;
      bins[idx].totalVolume += v;
    } else {
      const candleRange = h - l;

      for (let i = 0; i < binsCount; i++) {
        const bin = bins[i];

        let overlap = 0;

        if (isLastBar) {
          // 對最新一筆使用更保守的分配方式
          const currentPrice = c; // 使用目前收盤價作為基準
          const realizedLow = Math.min(l, c);
          const realizedHigh = Math.max(h, c); // 至少包含已實現範圍
          overlap = Math.max(0, Math.min(realizedHigh, bin.priceMax) - Math.max(realizedLow, bin.priceMin));
        } else {
          // 歷史 K 線使用完整範圍
          overlap = Math.max(0, Math.min(h, bin.priceMax) - Math.max(l, bin.priceMin));
        }

        if (overlap > 0) {
          const fraction = overlap / candleRange;
          const distributedVol = v * fraction;

          if (isUp) bin.buyVolume += distributedVol;
          else bin.sellVolume += distributedVol;
          bin.totalVolume += distributedVol;
        }
      }
    }
  });

  // POC & HVN & Value Area（保持原本邏輯）
  let pocIdx = 0;
  let maxBinVol = 0;
  for (let i = 0; i < binsCount; i++) {
    if (bins[i].totalVolume > maxBinVol) {
      maxBinVol = bins[i].totalVolume;
      pocIdx = i;
    }
  }
  const pocPrice = minPrice + (pocIdx + 0.5) * binSize;

  const avgVolume = bins.reduce((sum, b) => sum + b.totalVolume, 0) / binsCount;
  const hvnThreshold = avgVolume * 1.75;

  bins.forEach((bin, idx) => {
    if (idx === pocIdx) {
      bin.isHVN = false;
      return;
    }
    const isLocalMax = (idx === 0 || bin.totalVolume >= bins[idx - 1].totalVolume) &&
                      (idx === binsCount - 1 || bin.totalVolume >= bins[idx + 1].totalVolume);
    bin.isHVN = bin.totalVolume > hvnThreshold && isLocalMax;
  });

  // Value Area（不變）
  const targetVolume = totalVolume * (vaRatio / 100);
  let currentVolume = bins[pocIdx].totalVolume;
  let upIdx = pocIdx, downIdx = pocIdx;

  while (currentVolume < targetVolume) {
    const volUp = upIdx + 1 < binsCount ? bins[upIdx + 1].totalVolume : 0;
    const volDown = downIdx - 1 >= 0 ? bins[downIdx - 1].totalVolume : 0;
    if (volUp === 0 && volDown === 0) break;
    if (volUp >= volDown) { currentVolume += volUp; upIdx++; }
    else { currentVolume += volDown; downIdx--; }
  }

  const valPrice = minPrice + downIdx * binSize;
  const vahPrice = minPrice + (upIdx + 1) * binSize;

  return { bins, minPrice, maxPrice, pocPrice, vahPrice, valPrice };
}, [chartData, binsCount, vaRatio]);

  const { bins, pocPrice, vahPrice, valPrice } = profileMetrics;

  if (chartData.length === 0) {
    return (
      <Box height="100vh" display="flex" alignItems="center" justifyContent="center">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container component="main" maxWidth={false} sx={{ height: "100vh", display: "flex", flexDirection: "column", pt: 1, px: 2, pb: 1 }}>
      {/* Toolbar */}
      <Stack spacing={2} direction={{ xs: "column", md: "row" }} alignItems={{ xs: "stretch", md: "center" }} justifyContent="space-between" sx={{ mb: 1.5, p: 1.5, bgcolor: "rgba(30,30,40,0.45)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px" }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="h6" color="white" sx={{ fontWeight: 600 }}>成交量輪廓</Typography>
          <MuiTooltip title="HVN 已加上價格標籤，可清楚比較價位">
            <HelpOutline fontSize="small" sx={{ color: "primary.main", cursor: "pointer" }} />
          </MuiTooltip>
        </Stack>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 2, sm: 3 }} alignItems="center">
          <Box sx={{ width: 140 }}>
            <Typography variant="caption" color="rgba(255,255,255,0.6)">分桶數: {binsCount}</Typography>
            <Slider value={binsCount} onChange={(_, val) => setBinsCount(val as number)} min={10} max={100} step={5} size="small" />
          </Box>
          <Box sx={{ width: 140 }}>
            <Typography variant="caption" color="rgba(255,255,255,0.6)">價值區: {vaRatio}%</Typography>
            <Slider value={vaRatio} onChange={(_, val) => setVaRatio(val as number)} min={50} max={95} step={5} size="small" />
          </Box>

          <FormGroup row sx={{ gap: 1 }}>
            <FormControlLabel control={<Switch checked={showPoc} onChange={e => setShowPoc(e.target.checked)} color="warning" size="small" />} label="POC" />
            <FormControlLabel control={<Switch checked={showVa} onChange={e => setShowVa(e.target.checked)} size="small" />} label="價值區" />
            <FormControlLabel control={<Switch checked={showHVN} onChange={e => setShowHVN(e.target.checked)} color="warning" size="small" />} label="HVN" />
          </FormGroup>

          <ToggleButtonGroup value={align} exclusive onChange={(_, val) => val && setAlign(val)} size="small">
            <ToggleButton value="left"><AlignHorizontalLeft fontSize="small" /></ToggleButton>
            <ToggleButton value="right"><AlignHorizontalRight fontSize="small" /></ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Stack>

      {/* Charts */}
      <Box ref={chartContainerRef} sx={{ flexGrow: 1, minHeight: 0, width: "100%", display: "flex", flexDirection: "column" }}>
        <ResponsiveContainer width="100%" height="70%">
          <ComposedChart data={chartData} syncId="volumeProfileSync" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
            <XAxis dataKey="t" hide />
            <YAxis domain={[(dataMin: number) => dataMin * 0.985, (dataMax: number) => dataMax * 1.015]} orientation="left" stroke="#888" fontSize={10} />
            <YAxis yAxisId="volAxis" orientation="right" hide />

            <Tooltip content={<ChartTooltip />} />

            <Line dataKey="h" stroke="#fff" opacity={0} dot={false} />
            <Line dataKey="c" stroke="#fff" opacity={0} dot={false} />
            <Line dataKey="l" stroke="#fff" opacity={0} dot={false} />
            <Line dataKey="o" stroke="#fff" opacity={0} dot={false} />

            {showVa && vahPrice > valPrice && <ReferenceArea y1={valPrice} y2={vahPrice} fill="rgba(144, 202, 249, 0.04)" />}

            <Customized component={BaseCandlestickRectangle} />
            <Customized component={(props: any) => <CustomVolumeProfile {...props} bins={bins} align={align} showHVN={showHVN} />} />

            {/* POC / VA Lines */}
            {showPoc && pocPrice > 0 && (
              <ReferenceLine y={pocPrice} stroke="#ffeb3b" strokeWidth={1.5} strokeDasharray="3 3" label={{ value: `POC: ${pocPrice.toFixed(2)}`, fill: "#ffeb3b", fontSize: 10, fontWeight: "bold" }} />
            )}
            {showVa && vahPrice > valPrice && (
              <>
                <ReferenceLine y={vahPrice} stroke="rgba(255,255,255,0.35)" strokeDasharray="4 3" label={{ value: `VAH: ${vahPrice.toFixed(2)}`, fill: "rgba(255,255,255,0.5)", fontSize: 9 }} />
                <ReferenceLine y={valPrice} stroke="rgba(255,255,255,0.35)" strokeDasharray="4 3" label={{ value: `VAL: ${valPrice.toFixed(2)}`, fill: "rgba(255,255,255,0.5)", fontSize: 9 }} />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>

        {/* Volume Bar Chart */}
        <ResponsiveContainer width="100%" height="30%">
          <ComposedChart data={chartData} syncId="volumeProfileSync" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
            <XAxis dataKey="t" stroke="#888" fontSize={9} />
            <YAxis stroke="#888" fontSize={9} />
            <Tooltip content={<ChartTooltip />} />

            <Bar dataKey="v" shape={(props: any) => {
              const { x, y, width, height, payload } = props;
              const isUp = payload.c > payload.o;
              return <rect x={x} y={y} width={width} height={height} fill={isUp ? "#ff4d4f" : "#52c41a"} fillOpacity={0.45} />;
            }} />
          </ComposedChart>
        </ResponsiveContainer>
      </Box>
    </Container>
  );
}