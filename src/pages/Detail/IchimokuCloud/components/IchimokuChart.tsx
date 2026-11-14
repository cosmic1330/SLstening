import { semanticTokens } from "../../../../theme";
import { Box } from "@mui/material";
import { forwardRef, useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Customized,
  Label,
  Line,
  Tooltip as RechartsTooltip,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import BaseCandlestickRectangle from "../../../../components/RechartCustoms/BaseCandlestickRectangle";
import ChartTooltip from "../../Tooltip/ChartTooltip";
import { IchimokuCombinedData, SignalResult } from "../ichimokuStrategy";
import {
  classifyCloudThickness,
  summarizeProjectedCloud,
} from "../projectedCloud";

interface IchimokuChartProps {
  data: IchimokuCombinedData[];
  signals: SignalResult[];
  cmfEmaPeriod?: number;
  timeframeLabel: string;
  onHoverChange?: (index: number | null) => void;
}

const IchimokuChart = forwardRef<HTMLDivElement, IchimokuChartProps>(
  ({ data, signals, cmfEmaPeriod = 5, timeframeLabel, onHoverChange }, ref) => {
    // Map signals for easy lookup
    const signalMap = useMemo(
      () => new Map(signals.map((s) => [String(s.t), s])),
      [signals],
    );

    const lastRealAtr = useMemo(() => {
      for (let i = data.length - 1; i >= 0; i--) {
        if (data[i].c !== null && data[i].atr14 !== null)
          return data[i].atr14 as number;
      }
      return 0;
    }, [data]);

    // Merge signals and calculate per-bar future analysis
    const mergedData = useMemo(() => {
      return data.map((d, index) => {
        const sig = signalMap.get(String(d.t));

        // Future Analysis & Current Status
        const isFuture = d.c === null;
        let futureTrend = "";
        let futureReason = "";
        let currentStatus = "";
        let thicknessStatus = "";
        let cloudAtrRatio: number | null = null;
        let cloudThicknessTrend = "stable";
        const tkDistanceAtr =
          d.tenkan !== null &&
          d.kijun !== null &&
          d.atr14 !== null &&
          d.atr14 > 0
            ? (d.tenkan - d.kijun) / d.atr14
            : null;
        const previous = index > 0 ? data[index - 1] : null;
        const previousTkDistanceAtr =
          previous?.tenkan !== null &&
          previous?.tenkan !== undefined &&
          previous.kijun !== null &&
          previous.kijun !== undefined &&
          previous.atr14 !== null &&
          previous.atr14 !== undefined &&
          previous.atr14 > 0
            ? (previous.tenkan - previous.kijun) / previous.atr14
            : null;
        const tkDistanceTrend =
          tkDistanceAtr === null || previousTkDistanceAtr === null
            ? "stable"
            : Math.abs(tkDistanceAtr) >
                Math.abs(previousTkDistanceAtr) + 0.05
              ? "expanding"
              : Math.abs(tkDistanceAtr) <
                    Math.abs(previousTkDistanceAtr) - 0.05
                ? "contracting"
                : "stable";

        if (d.senkouA !== null && d.senkouB !== null) {
          const thickness = Math.abs(d.senkouA - d.senkouB);
          const atr14 = d.atr14 ?? lastRealAtr;
          cloudAtrRatio = atr14 > 0 ? thickness / atr14 : null;
          const atrText =
            cloudAtrRatio === null
              ? "ATR 資料不足"
              : `${cloudAtrRatio.toFixed(2)} 倍 ATR`;
          const thicknessLevel = classifyCloudThickness(
            thickness,
            atr14,
          );
          const previousThickness =
            previous?.senkouA !== null &&
            previous?.senkouA !== undefined &&
            previous.senkouB !== null &&
            previous.senkouB !== undefined
              ? Math.abs(previous.senkouA - previous.senkouB)
              : null;
          cloudThicknessTrend =
            previousThickness === null || previousThickness === 0
              ? "stable"
              : thickness > previousThickness * 1.1
                ? "expanding"
                : thickness < previousThickness * 0.9
                  ? "contracting"
                  : "stable";
          const cloudTop = Math.max(d.senkouA, d.senkouB);
          const cloudBottom = Math.min(d.senkouA, d.senkouB);

          thicknessStatus =
            thicknessLevel === "thick"
              ? `雲層較厚（${atrText}），價格通常較難一次穿越`
              : thicknessLevel === "thin"
                ? `雲層很薄（${atrText}），較容易被價格穿越`
                : `雲層厚度一般（${atrText}），請搭配價格與成交量判斷`;

          if (isFuture) {
            futureTrend = "26 期後雲層區間";
            if (thicknessLevel === "thick") {
              futureReason = `雲層較厚（${atrText}），這個區間通常較難一次穿越`;
            } else if (thicknessLevel === "thin") {
              futureReason = `雲層很薄（${atrText}），較容易被價格穿越`;
            } else {
              futureReason = `雲層厚度一般（${atrText}），請搭配價格位置判斷`;
            }
          } else if (d.c !== null) {
            if (d.c > cloudTop) {
              currentStatus = "價格位於雲層上方：整體結構偏多";
            } else if (d.c < cloudBottom) {
              currentStatus = "價格位於雲層下方：整體結構偏空";
            } else {
              currentStatus = "位於雲層內：行情整理中";
            }
          }
        }

        const cmfBull =
          d.cmf !== null && d.cmf !== undefined
            ? d.cmf >= 0
              ? d.cmf
              : 0
            : null;
        const cmfBear =
          d.cmf !== null && d.cmf !== undefined
            ? d.cmf < 0
              ? d.cmf
              : 0
            : null;

        return {
          ...d,
          signalReason: sig ? sig.reason : undefined,
          signalType: sig ? sig.type : undefined,
          historicalCloudRange:
            !isFuture && d.senkouA !== null && d.senkouB !== null
              ? [
                  Math.min(d.senkouA, d.senkouB),
                  Math.max(d.senkouA, d.senkouB),
                ]
              : null,
          futureCloudRange:
            isFuture && d.senkouA !== null && d.senkouB !== null
              ? [
                  Math.min(d.senkouA, d.senkouB),
                  Math.max(d.senkouA, d.senkouB),
                ]
              : null,
          cmfBull,
          cmfBear,
          isFuture,
          futureTrend,
          futureReason,
          currentStatus,
          thicknessStatus,
          cloudAtrRatio,
          cloudThicknessTrend,
          tkDistanceAtr,
          tkDistanceTrend,
        };
      });
    }, [data, signalMap, lastRealAtr]);

    // Find the transition point to future cloud
    const todayBarT = useMemo(() => {
      for (let i = mergedData.length - 1; i >= 0; i--) {
        if (mergedData[i].c !== null) return mergedData[i].t;
      }
      return null;
    }, [mergedData]);

    const futureAnalysis = useMemo(() => {
      if (!todayBarT) return null;
      const todayIdx = mergedData.findIndex((d) => d.t === todayBarT);
      if (todayIdx === -1) return null;

      const futureData = mergedData.slice(todayIdx + 1);
      if (futureData.length === 0) return null;

      const lastBar = futureData[futureData.length - 1];
      if (!lastBar || lastBar.senkouA === null || lastBar.senkouB === null)
        return null;

      const summary = summarizeProjectedCloud(futureData, lastRealAtr);
      if (!summary) return null;

      const cloudTop = Math.max(lastBar.senkouA, lastBar.senkouB);
      const cloudBottom = Math.min(lastBar.senkouA, lastBar.senkouB);
      let structureStr =
        `雲層區間: ${cloudBottom.toFixed(2)}–${cloudTop.toFixed(2)}`;

      if (summary.thicknessTrend === "expanding")
        structureStr += " | 雲層變厚";
      else if (summary.thicknessTrend === "contracting")
        structureStr += " | 雲層變薄";
      else structureStr += " | 厚度穩定";

      return {
        structureSymbol: structureStr,
        lastBarT: lastBar.t,
        midBarT: futureData[Math.floor(futureData.length / 2)]?.t || lastBar.t,
        midBarY:
          ((futureData[Math.floor(futureData.length / 2)]?.senkouA || 0) +
            (futureData[Math.floor(futureData.length / 2)]?.senkouB || 0)) /
          2,
        futureStart: futureData[0].t,
        futureEnd: lastBar.t,
      };
    }, [mergedData, todayBarT, lastRealAtr]);

    // Calculate max absolute value for CMF y-axis to center 0
    const cmfDomain = useMemo(() => {
      let maxAbs = 0.3; // Default minimum range
      mergedData.forEach((d) => {
        if (d.cmf !== null && d.cmf !== undefined) {
          const val = Math.abs(d.cmf);
          if (val > maxAbs) maxAbs = val;
        }
        if (d.cmfEma5 !== null && d.cmfEma5 !== undefined) {
          const val = Math.abs(d.cmfEma5);
          if (val > maxAbs) maxAbs = val;
        }
      });
      // Add a little padding
      maxAbs = maxAbs * 1.1;
      return [-maxAbs, maxAbs];
    }, [mergedData]);

    return (
      <Box
        ref={ref}
        sx={{
          flexGrow: 1,
          minHeight: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          width: "100%",
        }}
      >
        {/* 1. Main Chart: Price + Ichimoku (75%) */}
        <Box sx={{ position: "relative", width: "100%", height: "75%", minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={mergedData}
            margin={{ top: 5, right: 0, left: 0, bottom: 5 }}
            syncId="ichiSync"
            onMouseMove={(e) => {
              if (e.activeTooltipIndex !== undefined && onHoverChange) {
                onHoverChange(e.activeTooltipIndex);
              }
            }}
            onMouseLeave={() => {
              if (onHoverChange) onHoverChange(null);
            }}
          >
            <CartesianGrid strokeDasharray="3 3" opacity={0.1} stroke="#fff" />
            <XAxis dataKey="t" hide />
            <YAxis
              domain={["auto", "auto"]}
              tick={{ fill: "rgba(255,255,255,0.7)" }}
              stroke="rgba(255,255,255,0.3)"
            />

            <RechartsTooltip
              content={<ChartTooltip showSignals={true} />}
              isAnimationActive={false}
            />

            {/* Invisible Lines for Tooltip Value Access & Candlestick Order */}
            {/* Order MUST be: High, Close, Low, Open for BaseCandlestickRectangle */}
            <Line
              dataKey="h"
              stroke="#fff"
              opacity={0}
              dot={false}
              legendType="none"
              name="高"
            />
            <Line
              dataKey="c"
              stroke="#fff"
              opacity={0}
              dot={false}
              legendType="none"
              name="收"
            />
            <Line
              dataKey="l"
              stroke="#fff"
              opacity={0}
              dot={false}
              legendType="none"
              name="低"
            />
            <Line
              dataKey="o"
              stroke="#fff"
              opacity={0}
              dot={false}
              legendType="none"
              name="開"
            />
            {/* Ichimoku Lines */}
            <Line
              dataKey="tenkan"
              stroke="#4FC3F7"
              strokeWidth={1}
              opacity={0.85}
              dot={false}
              name="轉換線"
            />
            <Line
              dataKey="kijun"
              stroke="#FFD166"
              strokeWidth={1.8}
              opacity={0.95}
              dot={false}
              name="基準線"
            />
            {/* Historical cloud: neutral but clearly visible behind price. */}
            <Area
              dataKey="historicalCloudRange"
              fill="#90A4AE"
              fillOpacity={0.22}
              stroke="none"
              dot={false}
              activeDot={false}
              connectNulls={false}
              name="目前／歷史雲層"
            />

            {/* Future cloud: lighter and dashed to distinguish projection. */}
            <Area
              dataKey="futureCloudRange"
              fill="#90A4AE"
              fillOpacity={0.12}
              stroke="#B0BEC5"
              strokeOpacity={0.45}
              strokeWidth={0.7}
              strokeDasharray="3 3"
              dot={false}
              activeDot={false}
              connectNulls={false}
              name="26 期後雲層"
            />

            {/* 1. Future Projection Area Highlight */}
            {futureAnalysis && (
              <ReferenceArea
                x1={futureAnalysis.futureStart}
                x2={futureAnalysis.futureEnd}
                fill="rgba(255,255,255,0.03)"
                stroke="none"
              />
            )}

            {/* 2. Today Marker with Label */}
            {todayBarT && (
              <ReferenceLine
                x={todayBarT}
                stroke="#fff"
                strokeOpacity={0.8}
                strokeWidth={1.5}
                strokeDasharray="3 3"
              >
                <Label
                  value={`歷史 | ${timeframeLabel}雲層`}
                  position="top"
                  fill={semanticTokens.analysis.focus}
                  fontSize={10}
                  offset={10}
                />
              </ReferenceLine>
            )}

            {/* 3. Future Trend Analysis Labels */}
            {futureAnalysis && (
              <>
                <ReferenceLine
                  x={futureAnalysis.lastBarT}
                  stroke="rgba(255,255,255,0.2)"
                  strokeDasharray="2 2"
                />
                <ReferenceDot
                  x={futureAnalysis.midBarT}
                  y={futureAnalysis.midBarY}
                  r={0}
                  shape={(props: any) => {
                    const { cx, cy } = props;
                    const structureParts =
                      futureAnalysis.structureSymbol.split(" | ");

                    return (
                      <g>
                        {/* 1. 時間區間 */}
                        <text
                          x={cx}
                          y={cy}
                          dy={-45}
                          textAnchor="middle"
                          fill="rgba(255,255,255,0.7)"
                          fontSize={11}
                          fontWeight="bold"
                        >
                          {`[ ${timeframeLabel}雲層參考 ]`}
                        </text>

                        {/* 2. 結構與厚度 (行1) */}
                        {structureParts.length > 1 && (
                          <text
                            x={cx}
                            y={cy}
                            dy={-20}
                            textAnchor="middle"
                            fill="#ffeb3b"
                            fontSize={11}
                          >
                            {structureParts[0]}
                          </text>
                        )}

                        {/* 3. 結構與厚度 (行2) */}
                        <text
                          x={cx}
                          y={cy}
                          dy={structureParts.length > 1 ? 0 : -10}
                          textAnchor="middle"
                          fill="#ffeb3b"
                          fontSize={11}
                        >
                          {structureParts[structureParts.length - 1]}
                        </text>

                        {/* 4. 底部標註小字 */}
                        <text
                          x={cx}
                          y={cy}
                          dy={20}
                          textAnchor="middle"
                          fill="rgba(255,255,255,0.4)"
                          fontSize={10}
                        >
                          - 由目前資料計算，並非價格預測 -
                        </text>
                      </g>
                    );
                  }}
                />
              </>
            )}

            {/* Candlesticks */}
            <Customized
              component={BaseCandlestickRectangle}
              upColor="#ff4d4f"
              downColor="#52c41a"
            />

            {/* Signal Markers */}
            {data.map((d) => {
              const sig = signalMap.get(String(d.t));
              if (!sig) return null;

              let color = "#FFD700";
              let icon = "▲";
              let label = "Sig";

              switch (sig.type) {
                case "ACCUMULATION":
                  color = "#2196f3";
                  icon = "●";
                  label = "Accum";
                  break;
                case "DIVERGENCE_BULL":
                  color = "#ff5252"; // Taiwan Red for Buy
                  icon = "▲";
                  label = "底背離";
                  break;
                case "DIVERGENCE_BEAR":
                  color = "#00e676"; // Taiwan Green for Sell
                  icon = "▼";
                  label = "頂背離";
                  break;
                case "EXIT":
                  color = "#4caf50";
                  icon = "X";
                  label = "Exit";
                  break;
              }

              return (
                <ReferenceDot
                  key={`sig-${d.t}`}
                  x={d.t}
                  y={sig.price}
                  r={5}
                  stroke="none"
                  shape={(props: any) => {
                    const { cx, cy } = props;
                    return (
                      <g>
                        <circle
                          cx={cx}
                          cy={cy}
                          r={10}
                          fill={color}
                          fillOpacity={0.2}
                        />
                        <text
                          x={cx}
                          y={cy}
                          dy={5}
                          textAnchor="middle"
                          fill={color}
                          fontSize={12}
                          fontWeight="bold"
                        >
                          {icon}
                        </text>
                        <text
                          x={cx}
                          y={cy}
                          dy={22}
                          textAnchor="middle"
                          fill={color}
                          fontSize={8}
                        >
                          {label}
                        </text>
                      </g>
                    );
                  }}
                />
              );
            })}
          </ComposedChart>
        </ResponsiveContainer>

          <Box
            aria-label="一目雲判讀順序"
            sx={{
              position: "absolute",
              right: 12,
              bottom: 10,
              zIndex: 2,
              pointerEvents: "none",
              px: 1.25,
              py: 0.8,
              borderRadius: 1.5,
              border: "1px solid rgba(207, 216, 220, 0.28)",
              backgroundColor: "rgba(15, 23, 32, 0.78)",
              backdropFilter: "blur(4px)",
              boxShadow: "0 3px 12px rgba(0, 0, 0, 0.28)",
              color: "rgba(255, 255, 255, 0.82)",
              fontSize: 10,
              lineHeight: 1.55,
            }}
          >
            <Box
              sx={{
                mb: 0.25,
                color: semanticTokens.analysis.focus,
                fontWeight: 700,
                letterSpacing: "0.04em",
              }}
            >
              判讀順序
            </Box>
            <Box>1　價格相對雲層</Box>
            <Box>2　價格相對基準線</Box>
            <Box>3　TK 距離變化</Box>
            <Box>4　雲層厚度</Box>
          </Box>
        </Box>

        {/* 2. CMF Chart (25%) */}
        <ResponsiveContainer width="100%" height="25%">
          <ComposedChart
            data={mergedData}
            margin={{ top: 5, right: 0, left: 0, bottom: 5 }}
            syncId="ichiSync"
          >
            <defs>
              {/* Bullish CMF Area Gradient (Taiwan Red) */}
              <linearGradient id="colorCmfBull" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff4d4f" stopOpacity={0.24} />
                <stop offset="100%" stopColor="#ff4d4f" stopOpacity={0.0} />
              </linearGradient>
              {/* Bearish CMF Area Gradient (Taiwan Green) - Fades from bottom up to 0 */}
              <linearGradient id="colorCmfBear" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#52c41a" stopOpacity={0.24} />
                <stop offset="100%" stopColor="#52c41a" stopOpacity={0.0} />
              </linearGradient>
              {/* Premium Glow Filter for CMF Line */}
              <filter id="cmfGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.06} stroke="#fff" />
            <XAxis dataKey="t" hide />
            <YAxis
              domain={cmfDomain as any}
              tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 10 }}
              tickFormatter={(value) => value.toFixed(2)}
              stroke="rgba(255,255,255,0.3)"
              label={{
                value: "CMF",
                angle: -90,
                position: "insideLeft",
                fill: "rgba(255, 255, 255, 0.7)",
                style: { fontSize: 10, fontWeight: "bold" },
              }}
            />
            <RechartsTooltip
              content={<ChartTooltip showSignals={true} showIchimoku={false} />}
              isAnimationActive={false}
            />

            {/* Base Reference Lines */}
            <ReferenceLine
              y={0}
              stroke="rgba(255, 255, 255, 0.4)"
              strokeWidth={1}
            />
            <ReferenceLine
              y={0.1}
              stroke="rgba(255, 77, 79, 0.45)"
              strokeDasharray="3 3"
              label={{
                value: "+0.10 強勢吸籌",
                position: "insideBottomLeft",
                fill: "rgba(255, 77, 79, 0.75)",
                fontSize: 10,
                fontWeight: "bold",
              }}
            />
            <ReferenceLine
              y={-0.1}
              stroke="rgba(82, 196, 26, 0.45)"
              strokeDasharray="3 3"
              label={{
                value: "-0.10 資金流出",
                position: "insideTopLeft",
                fill: "rgba(82, 196, 26, 0.75)",
                fontSize: 10,
                fontWeight: "bold",
              }}
            />

            {/* Bullish Positive Flow Area */}
            <Area
              type="monotone"
              dataKey="cmfBull"
              stroke="none"
              fill="url(#colorCmfBull)"
              baseValue={0}
              connectNulls={false}
              isAnimationActive={false}
              legendType="none"
            />

            {/* Bearish Negative Flow Area */}
            <Area
              type="monotone"
              dataKey="cmfBear"
              stroke="none"
              fill="url(#colorCmfBear)"
              baseValue={0}
              connectNulls={false}
              isAnimationActive={false}
              legendType="none"
            />

            {/* Premium Silver-White CMF Line */}
            <Line
              type="monotone"
              dataKey="cmf"
              stroke="rgba(255, 255, 255, 0.85)"
              strokeWidth={1.8}
              dot={false}
              activeDot={{
                r: 4,
                stroke: "rgba(255, 255, 255, 0.95)",
                strokeWidth: 1,
                fill: "#fff",
              }}
              name="CMF"
            />

            {/* Muted and Subdued CMF EMA Line */}
            <Line
              type="monotone"
              dataKey="cmfEma5"
              stroke="rgba(255, 183, 77, 0.45)"
              strokeWidth={1.2}
              strokeDasharray="4 3"
              dot={false}
              activeDot={false}
              name={`EMA${cmfEmaPeriod}`}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </Box>
    );
  },
);

export default IchimokuChart;
