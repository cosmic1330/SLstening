import { Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { normalizeLanguage } from "../../../i18n";
import { semanticTokens } from "../../../theme";

// Helper to format YYYYMMDD number to Date string
const formatDateTick = (tick: number | string) => {
  const str = tick.toString();
  if (str.length === 8) {
    return `${str.slice(0, 4)}/${str.slice(4, 6)}/${str.slice(6)}`;
  }
  return str;
};

interface ChartTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string | number;
  showSignals?: boolean;
  hideKeys?: string[];
  dateFormatter?: (tick: number | string) => string;
  showIchimoku?: boolean;
  showMESS?: boolean;
}

const SIGNAL_KEYS = [
  "BUY",
  "SELL",
  "FAKE",
  "ACCUMULATION",
  "WEAKNESS",
  "EXIT",
  "buySignal",
  "exitSignal",
  "golden",
  "death",
  "obvDivergenceEntry",
  "fakeBreakout",
  "accumulation",
  "exitWeakness",
  "stopLoss",
  "accumulationSignal",
  "entry_long",
  "entry_short",
];

const ChartTooltip = ({
  active,
  payload,
  label,
  showSignals = true,
  hideKeys = [],
  dateFormatter = formatDateTick,
  showIchimoku = true,
  showMESS = true,
}: ChartTooltipProps) => {
  const { t, i18n } = useTranslation();
  const numberFormat = new Intl.NumberFormat(
    normalizeLanguage(i18n.resolvedLanguage),
    { maximumFractionDigits: 2 },
  );
  if (active && payload && payload.length && label !== undefined) {
    const data = payload[0].payload;
    const dateStr = dateFormatter(label);
    const closeValue = Number(data.c);
    const kijunValue = Number(data.kijun);
    const hasClose =
      data.c !== null && data.c !== undefined && Number.isFinite(closeValue);
    const hasKijun =
      data.kijun !== null &&
      data.kijun !== undefined &&
      Number.isFinite(kijunValue);
    const hasCloud =
      data.senkouA !== null &&
      data.senkouA !== undefined &&
      data.senkouB !== null &&
      data.senkouB !== undefined &&
      Number.isFinite(Number(data.senkouA)) &&
      Number.isFinite(Number(data.senkouB));
    const cloudTop = hasCloud
      ? Math.max(Number(data.senkouA), Number(data.senkouB))
      : null;
    const cloudBottom = hasCloud
      ? Math.min(Number(data.senkouA), Number(data.senkouB))
      : null;
    const cloudPosition =
      hasClose && cloudTop !== null && cloudBottom !== null
        ? closeValue > cloudTop
          ? "above"
          : closeValue < cloudBottom
            ? "below"
            : "inside"
        : null;
    const baselinePosition =
      hasClose && hasKijun
        ? closeValue > kijunValue
          ? "above"
          : closeValue < kijunValue
            ? "below"
            : "balanced"
        : null;
    const thicknessLabel = data.thicknessStatus?.includes("較厚")
      ? "較厚"
      : data.thicknessStatus?.includes("很薄")
        ? "很薄"
        : "一般";
    const futureThicknessLabel = data.futureReason?.includes("較厚")
      ? "較厚"
      : data.futureReason?.includes("很薄")
        ? "很薄"
        : "一般";
    const futureRange =
      cloudBottom !== null && cloudTop !== null
        ? `${numberFormat.format(cloudBottom)}–${numberFormat.format(cloudTop)}`
        : "資料不足";
    const futureThicknessTrend =
      data.cloudThicknessTrend === "expanding"
        ? "正在變厚"
        : data.cloudThicknessTrend === "contracting"
          ? "正在變薄"
          : "變化不大";
    const tkDistanceAtr =
      data.tkDistanceAtr === null || data.tkDistanceAtr === undefined
        ? null
        : Number(data.tkDistanceAtr);
    const tkDistanceAbs =
      tkDistanceAtr !== null && Number.isFinite(tkDistanceAtr)
        ? Math.abs(tkDistanceAtr)
        : null;
    const tkDistanceTrend =
      data.tkDistanceTrend === "expanding"
        ? "擴大"
        : data.tkDistanceTrend === "contracting"
          ? "縮小"
          : "持平";
    const tkMomentumMessage =
      tkDistanceAbs === null
        ? "目前無法判斷短期動能"
        : tkDistanceAbs < 0.25
          ? "兩線接近，短期方向不明"
          : (tkDistanceAtr as number) > 0
            ? tkDistanceTrend === "擴大"
              ? "多方動能增強"
              : tkDistanceTrend === "縮小"
                ? "留意多方動能減弱"
                : "多方動能變化不大"
            : tkDistanceTrend === "擴大"
              ? "空方動能增強"
              : tkDistanceTrend === "縮小"
                ? "留意空方動能減弱"
                : "空方動能變化不大";
    const ichimokuRows = data.isFuture
      ? [
          {
            label: "雲層範圍",
            value: futureRange,
            detail: "右側雲層是目前資料向右平移後形成的價格區間",
            color: "#B0BEC5",
          },
          {
            label: "穿越難度",
            value: `雲層${futureThicknessLabel}`,
            detail: data.futureReason || "雲層厚度只代表價格穿越區間的相對難度",
            color:
              futureThicknessLabel === "較厚"
                ? "#69c0ff"
                : futureThicknessLabel === "很薄"
                  ? "#ffd666"
                  : "#d9d9d9",
          },
          {
            label: "厚度變化",
            value: futureThicknessTrend,
            detail:
              futureThicknessTrend === "正在變厚"
                ? "區間正在擴大，價格一次穿越的難度可能增加"
                : futureThicknessTrend === "正在變薄"
                  ? "區間正在收窄，價格穿越的難度可能降低"
                  : "區間寬度與前一期相比沒有明顯改變",
            color: "#B0BEC5",
          },
        ]
      : [
          {
            label: "趨勢環境（雲層）",
            value:
              cloudPosition === "above"
                ? "價格在雲層上方"
                : cloudPosition === "below"
                  ? "價格在雲層下方"
                  : cloudPosition === "inside"
                    ? "價格在雲層內"
                    : "資料不足",
            detail:
              cloudPosition === "above"
                ? "整體結構偏多"
                : cloudPosition === "below"
                  ? "整體結構偏空"
                  : cloudPosition === "inside"
                    ? "方向不明，容易震盪"
                    : "目前無法判斷雲層位置",
            color:
              cloudPosition === "above"
                ? "#ff6b6b"
                : cloudPosition === "below"
                  ? "#73d13d"
                  : "#ffd666",
          },
          {
            label: "短中期強弱（基準線）",
            value:
              baselinePosition === "above"
                ? "價格在基準線上方"
                : baselinePosition === "below"
                  ? "價格在基準線下方"
                  : baselinePosition === "balanced"
                    ? "價格接近基準線"
                    : "資料不足",
            detail:
              baselinePosition === "above"
                ? `短中期動能偏強｜基準線 ${numberFormat.format(kijunValue)}`
                : baselinePosition === "below"
                  ? `短中期動能偏弱｜基準線 ${numberFormat.format(kijunValue)}`
                  : baselinePosition === "balanced"
                    ? `價格接近中期平衡｜基準線 ${numberFormat.format(kijunValue)}`
                    : "目前無法判斷基準線位置",
            color:
              baselinePosition === "above"
                ? "#ff6b6b"
                : baselinePosition === "below"
                  ? "#73d13d"
                  : "#ffd666",
          },
          {
            label: "短期動能（轉換線）",
            value:
              tkDistanceAbs === null
                ? "資料不足"
                : tkDistanceAbs < 0.25
                  ? "兩線接近"
                  : (tkDistanceAtr as number) > 0
                    ? "轉換線在上"
                    : "轉換線在下",
            detail:
              tkDistanceAbs === null
                ? "目前無法計算 TK 距離"
                : `TK 距離 ${numberFormat.format(tkDistanceAbs)} 倍 ATR｜距離${tkDistanceTrend}｜${tkMomentumMessage}`,
            color:
              tkDistanceAbs === null || tkDistanceAbs < 0.25
                ? "#ffd666"
                : (tkDistanceAtr as number) > 0
                  ? "#4FC3F7"
                  : "#73d13d",
          },
          {
            label: "穿越難度（雲層厚度）",
            value: `雲層${thicknessLabel}`,
            detail:
              data.thicknessStatus || "雲層厚度只代表價格穿越區間的相對難度",
            color:
              thicknessLabel === "較厚"
                ? "#69c0ff"
                : thicknessLabel === "很薄"
                  ? "#ffd666"
                  : "#d9d9d9",
          },
        ];

    // Sort payload: Signal entries first, then Indicators
    const sortedPayload = [...payload].sort((a, b) => {
      const isSignalA = SIGNAL_KEYS.includes(a.dataKey);
      const isSignalB = SIGNAL_KEYS.includes(b.dataKey);
      if (isSignalA && !isSignalB) return -1;
      if (!isSignalA && isSignalB) return 1;
      return 0;
    });

    return (
      <div
        style={{
          backgroundColor: "rgba(20, 20, 30, 0.9)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          backdropFilter: "blur(4px)",
          borderRadius: 8,
          boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
          padding: "12px",
          textAlign: "left",
          color: "#fff", // Default text color
        }}
      >
        <p
          style={{
            color: "#eee",
            marginBottom: 8,
            margin: 0,
            fontWeight: "bold",
            fontSize: "0.9rem",
          }}
        >
          {dateStr}
        </p>

        {showSignals && data.signalReason && (
          <div
            style={{
              marginTop: 8,
              marginBottom: 8,
              padding: "4px 8px",
              backgroundColor: "rgba(33, 150, 243, 0.2)",
              borderRadius: 4,
              borderLeft: "4px solid #2196f3",
            }}
          >
            <Typography
              variant="body2"
              fontWeight="bold"
              color="#64b5f6"
              style={{ whiteSpace: "pre-wrap" }}
            >
              {data.signalReason}
            </Typography>
          </div>
        )}

        {/* Market Environment (Strict MESS) */}
        {showMESS && data.marketType && (
          <div
            style={{
              marginTop: 8,
              marginBottom: 8,
              padding: "8px",
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              borderRadius: 4,
              border: `1px solid ${data.marketType === "趨勢" ? "#2196f3" : "rgba(255,255,255,0.2)"}`,
            }}
          >
            <Typography
              variant="caption"
              display="block"
              style={{
                color: semanticTokens.analysis.focus,
                fontWeight: "bold",
                marginBottom: 4,
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              {t("Pages.Detail.tooltip.marketEnvironment")}
            </Typography>
            <Typography
              variant="body2"
              fontWeight="bold"
              style={{
                color:
                  data.marketType === "趨勢"
                    ? "#2196f3"
                    : data.marketType === "寬震"
                      ? "#ce93d8"
                      : "#fff",
                marginBottom: 2,
              }}
            >
              {data.marketType} (
              {data.mss === undefined ? "0.0" : numberFormat.format(data.mss)})
            </Typography>
            <Typography variant="caption" style={{ color: "#bbb" }}>
              {t("Pages.Detail.tooltip.diagnosis")}：
              {data.diagnostic || t("Pages.Detail.tooltip.noSignal")}
            </Typography>
          </div>
        )}

        {/* Ichimoku analysis: answer environment, balance, then cloud thickness */}
        {showIchimoku && (data.currentStatus || data.futureTrend) && (
          <div
            style={{
              marginTop: 8,
              marginBottom: 8,
              backgroundColor: "rgba(255, 255, 255, 0.045)",
              borderRadius: 8,
              border: `1px ${
                data.isFuture ? "dashed" : "solid"
              } rgba(255, 255, 255, 0.2)`,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                padding: "8px 10px",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <Typography
                variant="caption"
                style={{
                  color: semanticTokens.analysis.focus,
                  fontWeight: "bold",
                  letterSpacing: 0.5,
                }}
              >
                一目雲判讀
              </Typography>
              <span
                style={{
                  padding: "2px 7px",
                  borderRadius: 999,
                  backgroundColor: data.isFuture
                    ? "rgba(105, 192, 255, 0.14)"
                    : "rgba(255, 255, 255, 0.08)",
                  color: data.isFuture ? "#91d5ff" : "#d9d9d9",
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                {data.isFuture ? "26 期後雲層" : "目前位置"}
              </span>
            </div>

            {data.isFuture && (
              <div
                style={{
                  padding: "6px 10px",
                  backgroundColor: "rgba(105, 192, 255, 0.07)",
                  color: "#bfbfbf",
                  fontSize: 10,
                  lineHeight: 1.45,
                }}
              >
                由目前資料計算並向右平移，只是雲層結構參考，不是價格預測。
              </div>
            )}

            <div
              style={{
                display: "grid",
                gap: 6,
                padding: "8px",
              }}
            >
              {ichimokuRows.map((row) => (
                <div
                  key={row.label}
                  style={{
                    padding: "7px 8px",
                    borderRadius: 6,
                    backgroundColor: "rgba(0,0,0,0.16)",
                    borderLeft: `3px solid ${row.color}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      gap: 12,
                    }}
                  >
                    <Typography
                      variant="caption"
                      style={{ color: "#bfbfbf", fontSize: 10 }}
                    >
                      {row.label}
                    </Typography>
                    <Typography
                      variant="caption"
                      fontWeight="bold"
                      style={{ color: row.color, textAlign: "right" }}
                    >
                      {row.value}
                    </Typography>
                  </div>
                  <Typography
                    variant="caption"
                    display="block"
                    style={{
                      color: "#e8e8e8",
                      fontSize: 11,
                      lineHeight: 1.45,
                      marginTop: 2,
                    }}
                  >
                    {row.detail}
                  </Typography>
                </div>
              ))}
            </div>
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "4px 12px",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            paddingTop: "6px",
          }}
        >
          {sortedPayload.map((entry: any, index: number) => {
            if (hideKeys.includes(entry.dataKey)) return null;
            if (entry.value === null || entry.value === undefined) return null;

            const itemColor =
              entry.color &&
              entry.color !== "#000" &&
              entry.color !== "#000000" &&
              entry.color !== "none"
                ? entry.color
                : "#fff";

            // Determine if item should take full width (e.g. cloud ranges or long labels)
            const isFullWidth =
              Array.isArray(entry.value) ||
              entry.name.length > 8 ||
              (typeof entry.dataKey === "string" &&
                entry.dataKey.includes("Status"));

            return (
              <div
                key={index}
                style={{
                  gridColumn: isFullWidth ? "span 2" : "auto",
                  color: itemColor,
                  fontSize: "0.75rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "1px solid rgba(255,255,255,0.03)",
                  paddingBottom: "1px",
                }}
              >
                <span
                  style={{
                    opacity: 0.7,
                    marginRight: "8px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {entry.name}:
                </span>
                <span style={{ fontWeight: 700, fontFamily: "monospace" }}>
                  {Array.isArray(entry.value)
                    ? entry.value
                        .map((v: any) =>
                          typeof v === "number" ? numberFormat.format(v) : v,
                        )
                        .join("-")
                    : typeof entry.value === "number"
                      ? numberFormat.format(entry.value)
                      : entry.value}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

export default ChartTooltip;
