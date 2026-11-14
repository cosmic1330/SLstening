import { StepCheck } from "../../../types";
import {
  classifyCloudThickness,
  summarizeProjectedCloud,
} from "./projectedCloud";

// Types derived from what we expect in the data hook
export interface IchimokuCombinedData {
  t: number | string;
  o: number | null;
  h: number | null;
  l: number | null;
  c: number | null;
  v: number | null;
  tenkan: number | null;
  kijun: number | null;
  senkouA: number | null;
  senkouB: number | null;
  chikou: number | null;
  osc: number | null; // MACD
  cmf: number | null; // CMF
  cmfPrev: number | null;
  cmfEma5: number | null; // CMF EMA5
  atr14: number | null;
}

export interface SignalResult {
  t: number | string;
  type: "ACCUMULATION" | "EXIT" | "DIVERGENCE_BULL" | "DIVERGENCE_BEAR";
  reason: string;
  price: number;
}

export interface AnalysisResult {
  steps: {
    label: string;
    description: string;
    checks: StepCheck[];
  }[];
  score: number;
  recommendation: string;
  dateLabel?: string;
}

export const analyzeIchimokuAtPoint = (
  data: IchimokuCombinedData[],
  index: number,
): AnalysisResult => {
  if (index < 0 || index >= data.length) {
    return { steps: [], score: 0, recommendation: "No Data", dateLabel: "-" };
  }

  const current = data[index];
  const dateStr = current.t ? String(current.t) : "-";
  // Simple formatting YYYYMMDD -> YYYY-MM-DD
  const formattedDate =
    dateStr.length === 8
      ? `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`
      : dateStr;
  let contextIndex = index;
  if (current.c === null || current.c === 0) {
    contextIndex = index;
    while (
      contextIndex >= 0 &&
      (data[contextIndex].c === null || data[contextIndex].c === 0)
    ) {
      contextIndex--;
    }
    if (contextIndex === -1)
      return { steps: [], score: 0, recommendation: "No Price Data" };
  }

  const marketContext = data[contextIndex];
  const price = marketContext.c as number;
  const hasCurrentCloud =
    current.senkouA !== null && current.senkouB !== null;
  const cloudTop = hasCurrentCloud
    ? Math.max(current.senkouA as number, current.senkouB as number)
    : null;
  const isAboveCloud = cloudTop !== null && price > cloudTop;
  const cloudThickness = hasCurrentCloud
    ? Math.abs((current.senkouA as number) - (current.senkouB as number))
    : 0;
  const atr14 = marketContext.atr14 || 0;
  const cloudAtrRatio = atr14 > 0 ? cloudThickness / atr14 : null;
  const cloudAtrText =
    cloudAtrRatio === null ? "ATR 資料不足" : `${cloudAtrRatio.toFixed(2)} 倍 ATR`;
  const currentThickness = hasCurrentCloud
    ? classifyCloudThickness(cloudThickness, atr14)
    : null;

  const cmf = marketContext.cmf || 0;
  const cmfEma5 = marketContext.cmfEma5 || 0;
  const prevCmfEma5 =
    contextIndex > 0 ? data[contextIndex - 1].cmfEma5 || 0 : 0;
  const isCmfSlopeUp = cmfEma5 > prevCmfEma5;

  const isTkGold =
    marketContext.tenkan !== null &&
    marketContext.kijun !== null &&
    marketContext.tenkan > marketContext.kijun;

  // 2. Future State (Next 26 Bars relative to index)
  const futureData = data.slice(index + 1, index + 27);
  const projectedCloud = summarizeProjectedCloud(futureData, atr14);
  const isCloudExpanding =
    projectedCloud?.thicknessTrend === "expanding";
  const isCloudContracting =
    projectedCloud?.thicknessTrend === "contracting";

  // Matrix Logic Refinement
  let rec = "觀望 (Wait)";
  let score = 0;

  // Base Scoring
  if (isAboveCloud) score += 40;
  if (isTkGold) score += 20;
  if (cmf > 0.1) score += 20;
  if (isCmfSlopeUp) score += 10;

  score = Math.max(0, Math.min(100, score));

  if (score >= 85) rec = "重倉持有 (Strong Buy)";
  else if (score >= 65) rec = "偏多操作 (Long)";
  else if (score >= 45) rec = "結構調整 (Neutral)";
  else if (score >= 25) rec = "減碼觀望 (Weak)";
  else rec = "絕對空倉 (Strong Sell)";

  const analysisSteps: AnalysisResult["steps"] = [
    {
      label: "I. 趨勢結構 (Current)",
      description: "當前雲層與 TK 狀態",
      checks: [
        {
          label: "價格高於雲層 (多頭排列)",
          status: isAboveCloud ? "pass" : "fail",
        },
        {
          label: isTkGold ? "TK 金叉 (動能向上)" : "TK 死叉/無方向",
          status: isTkGold ? "pass" : "fail",
        },
        {
          label:
            currentThickness === "thick"
              ? `雲層較厚（${cloudAtrText}），價格通常較難一次穿越`
              : currentThickness === "thin"
                ? `雲層很薄（${cloudAtrText}），較容易被價格穿越`
                : currentThickness === "normal"
                  ? `雲層厚度一般（${cloudAtrText}）`
                  : "目前沒有可判讀的雲層",
          status: currentThickness === "thick" ? "pass" : "manual",
        },
      ],
    },
    {
      label: "II. 資金動能 (Flow)",
      description: "CMF 資金流強度",
      checks: [
        {
          label: "資金流入 (CMF > 0)",
          status: cmf > 0 ? "pass" : "fail",
        },
        {
          label: isCmfSlopeUp ? "動能加速 (Slope Up)" : "動能減緩 (Slope Down)",
          status: isCmfSlopeUp ? "pass" : "fail",
        },
        {
          label: cmf > 0.15 ? "強勢吸籌區 (>0.15)" : "資金參與度中等",
          status: cmf > 0.15 ? "pass" : "manual",
        },
      ],
    },
    {
      label: "III. 26 期後雲層參考",
      description: "把目前算出的雲層向右移 26 期；這不是價格預測",
      checks: [
        {
          label: "只觀察雲層區間與厚度，不以 A／B 排列判斷多空",
          status: "manual",
        },
        {
          label: isCloudExpanding
            ? "厚度：雲層逐漸變厚，通常較難一次穿越"
            : isCloudContracting
              ? "厚度：雲層逐漸變薄，較容易被價格穿越"
              : "厚度：變化不大",
          status: isCloudExpanding
            ? "pass"
            : isCloudContracting
              ? "fail"
              : "manual",
        },
      ],
    },
  ];

  return {
    steps: analysisSteps,
    score,
    recommendation: rec,
    dateLabel: formattedDate,
  };
};

export const calculateIchimokuSignals = (
  data: IchimokuCombinedData[],
): {
  signals: SignalResult[];
  lastAnalysis: AnalysisResult;
} => {
  const signals: SignalResult[] = [];
  let lastSignalState: "buy" | "neutral" = "neutral";

  // We need at least 52 bars for full Ichimoku + CMF(21)
  const minBars = 52;

  if (data.length < minBars) {
    return {
      signals: [],
      lastAnalysis: {
        steps: [],
        score: 0,
        recommendation: "Insufficient Data",
      },
    };
  }

  // --- Signal Loop ---
  data.forEach((current, i) => {
    if (i < 52) return;
    const prev = data[i - 1];

    const price = current.c;
    const high = current.h;
    const low = current.l;

    // Safety check
    if (price === null || high === null || low === null) return;

    const cloudTop =
      current.senkouA !== null && current.senkouB !== null
        ? Math.max(current.senkouA, current.senkouB)
        : null;
    const cloudBottom =
      current.senkouA !== null && current.senkouB !== null
        ? Math.min(current.senkouA, current.senkouB)
        : null;

    // 1. Structure
    const isAboveCloud = cloudTop !== null && price > cloudTop;
    const isBelowCloud = cloudBottom !== null && price < cloudBottom;
    const isInCloud =
      cloudTop !== null &&
      cloudBottom !== null &&
      price <= cloudTop &&
      price >= cloudBottom;

    // 2. TK Cross / State
    const isTkGold =
      current.tenkan !== null &&
      current.kijun !== null &&
      current.tenkan > current.kijun;

    // Kijun Slope
    const prevKijun = prev.kijun;
    const currKijun = current.kijun;
    const isKijunUp =
      prevKijun !== null && currKijun !== null && currKijun > prevKijun;
    const isKijunFlat =
      prevKijun !== null && currKijun !== null && currKijun === prevKijun;
    const isKijunStable = isKijunUp || isKijunFlat;

    // 3. CMF State
    const cmf = current.cmf;
    const cmfEma5 = current.cmfEma5;
    const prevCmfEma5 = prev.cmfEma5;

    const isCmfBull = cmf !== null && cmf > 0;

    const isCmfEmaUp =
      cmfEma5 !== null && prevCmfEma5 !== null && cmfEma5 > prevCmfEma5;
    const isCmfEmaDown =
      cmfEma5 !== null && prevCmfEma5 !== null && cmfEma5 < prevCmfEma5;

    // --- Signal Logic ---

    if (lastSignalState === "neutral") {
      // A. Strong Bullish Setup (3-in-1)
      const isStrongBullish =
        isAboveCloud && isTkGold && isKijunStable && isCmfBull && isCmfEmaUp;

      if (isStrongBullish) {
        lastSignalState = "buy";
      }

      // B. Early Accumulation (CMF Leading)

      // A. Early Accumulation (CMF Leading)
      const isAccumulation =
        (isInCloud || isBelowCloud) && (cmf || -1) > -0.05 && isCmfEmaUp;

      if (isAccumulation) {
        const prevPrev = data[i - 2];
        const isPrevCmfEmaUp =
          prev.cmfEma5 !== null &&
          prevPrev &&
          prevPrev.cmfEma5 !== null &&
          prev.cmfEma5 > prevPrev.cmfEma5;

        const wasAccumulation =
          !(
            (prev.c || 0) >
            (prev.senkouA && prev.senkouB
              ? Math.max(prev.senkouA, prev.senkouB)
              : 0)
          ) &&
          (prev.cmf || -1) > -0.05 &&
          isPrevCmfEmaUp;

        if (!wasAccumulation) {
          signals.push({
            t: current.t,
            type: "ACCUMULATION",
            reason: "吸籌 (Accumulation)",
            price: low * 0.99,
          });
        }
      }
    } else if (lastSignalState === "buy") {
      let exitTrigger = false;
      let pResult = "EXIT";

      const isPriceHigh = price > (prev.h || 0);
      if (isPriceHigh && isCmfEmaDown && (cmf || 0) < (prev.cmf || 0)) {
        signals.push({
          t: current.t,
          type: "EXIT",
          reason: "資金衰竭 (Exhaustion)",
          price: high * 1.02,
        });
      }

      const isKijunBreak = currKijun !== null && price < currKijun;
      if (isKijunBreak && (cmf || 0) < 0.05) {
        exitTrigger = true;
        pResult = "跌破基準 (Kijun Break)";
      }

      if (isBelowCloud) {
        exitTrigger = true;
        pResult = "趨勢崩壞 (Structure Break)";
      }

      const isTkDead =
        current.tenkan !== null &&
        current.kijun !== null &&
        current.tenkan < current.kijun;

      if (isTkDead && (cmf || 0) < 0) {
        exitTrigger = true;
        pResult = "空頭反轉 (TK Dead & CMF<0)";
      }

      if ((cmf || 0) < -0.05) {
        exitTrigger = true;
        pResult = "資金撤離 (CMF Stop)";
      }

      if (exitTrigger) {
        signals.push({
          t: current.t,
          type: "EXIT",
          reason: pResult,
          price: high * 1.02,
        });
        lastSignalState = "neutral";
      }
    }

    // --- CMF Divergence Logic (Integrated) ---
    const lookback = 20;
    if (i > 30) {
      // 1. Bullish Divergence (底背離)
      let minPriceIdx = i;
      for (let j = i - lookback; j < i; j++) {
        if (
          data[j].c !== null &&
          data[j].c! < (data[minPriceIdx].c || Infinity)
        )
          minPriceIdx = j;
      }

      if (minPriceIdx === i) {
        let prevMinPriceIdx = -1;
        const startIdx = Math.max(0, i - lookback * 2);
        for (let j = startIdx; j < i - lookback; j++) {
          if (
            data[j].c !== null &&
            (prevMinPriceIdx === -1 || data[j].c! < data[prevMinPriceIdx].c!)
          )
            prevMinPriceIdx = j;
        }

        if (prevMinPriceIdx !== -1 && data[i].c! < data[prevMinPriceIdx].c!) {
          if (
            data[i].cmf !== null &&
            data[prevMinPriceIdx].cmf !== null &&
            data[i].cmf! > data[prevMinPriceIdx].cmf!
          ) {
            signals.push({
              t: current.t,
              type: "DIVERGENCE_BULL",
              reason: "底背離：價格創新低但 CMF 資金流背離抬升",
              price: low * 0.98,
            });
          }
        }
      }

      // 2. Bearish Divergence (頂背離)
      let maxPriceIdx = i;
      for (let j = i - lookback; j < i; j++) {
        if (
          data[j].c !== null &&
          data[j].c! > (data[maxPriceIdx].c || -Infinity)
        )
          maxPriceIdx = j;
      }

      if (maxPriceIdx === i) {
        let prevMaxPriceIdx = -1;
        const startIdx = Math.max(0, i - lookback * 2);
        for (let j = startIdx; j < i - lookback; j++) {
          if (
            data[j].c !== null &&
            (prevMaxPriceIdx === -1 || data[j].c! > data[prevMaxPriceIdx].c!)
          )
            prevMaxPriceIdx = j;
        }

        if (prevMaxPriceIdx !== -1 && data[i].c! > data[prevMaxPriceIdx].c!) {
          if (
            data[i].cmf !== null &&
            data[prevMaxPriceIdx].cmf !== null &&
            data[i].cmf! < data[prevMaxPriceIdx].cmf!
          ) {
            signals.push({
              t: current.t,
              type: "DIVERGENCE_BEAR",
              reason: "頂背離：價格創新高但 CMF 資金流背離下降",
              price: high * 1.02,
            });
          }
        }
      }
    }
  });

  // --- Final Snapshot Analysis (Using the last real price bar) ---
  let lastRealIdx = -1;
  for (let k = data.length - 1; k >= 0; k--) {
    if (data[k].c !== null) {
      lastRealIdx = k;
      break;
    }
  }

  const lastAnalysis = analyzeIchimokuAtPoint(data, lastRealIdx);

  return {
    signals,
    lastAnalysis,
  };
};
