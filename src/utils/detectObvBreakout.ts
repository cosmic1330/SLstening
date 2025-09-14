type StockData = {
  obv: number;
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
};

type ObvBreakoutResultItem = {
  signal: "breakUp" | "breakDown" | "none";
  confidence: number;
  trend: number | null; // 對應趨勢線
  t: number;
  obv: number;
};

type ObvBreakoutResult = ObvBreakoutResultItem[];

/**
 * 線性回歸
 */
function linearRegression(xs: number[], ys: number[]) {
  const n = xs.length;
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((sum, x, i) => sum + x * ys[i], 0);
  const sumX2 = xs.reduce((sum, x) => sum + x * x, 0);

  const b = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const a = (sumY - b * sumX) / n;

  return (x: number) => a + b * x;
}

/**
 * OBV 趨勢突破檢測（只取最突出的峰值/低谷）
 */
export default function detectObvBreakout(
  data: StockData[],
  lookback: number = 200,
  confirmBars: number = 2,
  volumeConfirm: boolean = true,
  peakWindow: number = 3 // 相對鄰近範圍判斷峰谷
): ObvBreakoutResult {
  const n = data.length;
  if (n === 0) return [];

  // 初始化結果
  const result: ObvBreakoutResult = data.map(d => ({
    signal: "none",
    confidence: 0,
    trend: null,
    t: d.t,
    obv: d.obv,
  }));

  const sliceStart = Math.max(0, n - lookback);
  const slice = data.slice(sliceStart);
  const obvs = slice.map(d => d.obv);

  // --- 找最突出的局部高低點 ---
  const highs: number[] = [];
  const lows: number[] = [];
  const highIdx: number[] = [];
  const lowIdx: number[] = [];

  for (let i = peakWindow; i < obvs.length - peakWindow; i++) {
    const prev = obvs.slice(i - peakWindow, i);
    const next = obvs.slice(i + 1, i + 1 + peakWindow);

    // 局部高點
    if (obvs[i] > Math.max(...prev) && obvs[i] > Math.max(...next)) {
      highs.push(obvs[i]);
      highIdx.push(i);
    }

    // 局部低點
    if (obvs[i] < Math.min(...prev) && obvs[i] < Math.min(...next)) {
      lows.push(obvs[i]);
      lowIdx.push(i);
    }
  }

  // --- 趨勢線回歸 ---
  let upperTrend: ((x: number) => number) | null = null;
  let lowerTrend: ((x: number) => number) | null = null;

  if (highs.length >= 2) upperTrend = linearRegression(highIdx, highs);
  if (lows.length >= 2) lowerTrend = linearRegression(lowIdx, lows);

  // --- 突破檢測 ---
  let signal: "breakUp" | "breakDown" | "none" = "none";
  let confidence = 0;
  const lastIdx = slice.length - 1;

  // 突破下降線
  if (upperTrend) {
    const recentBreaks = slice
      .slice(-confirmBars)
      .filter((d, i) => d.obv > upperTrend!(lastIdx - confirmBars + i));
    if (recentBreaks.length === confirmBars) {
      signal = "breakUp";
      confidence = 0.7;
    }
  }

  // 跌破上升線
  if (lowerTrend) {
    const recentBreaks = slice
      .slice(-confirmBars)
      .filter((d, i) => d.obv < lowerTrend!(lastIdx - confirmBars + i));
    if (recentBreaks.length === confirmBars) {
      signal = "breakDown";
      confidence = 0.7;
    }
  }

  // 成交量確認
  if (volumeConfirm && signal !== "none") {
    const avgVol = slice.reduce((sum, d) => sum + d.v, 0) / slice.length;
    const lastVol = slice[slice.length - 1].v;
    if (lastVol > avgVol * 1.2) confidence += 0.2;
  }

  // --- 產生趨勢線資料 ---
  slice.forEach((d, i) => {
    const idx = sliceStart + i;
    let trend: number | null = null;

    if (upperTrend && lowerTrend) {
      // 同時有上下趨勢線，可畫平均值
      trend = (upperTrend(i) + lowerTrend(i)) / 2;
    } else if (upperTrend) {
      trend = upperTrend(i);
    } else if (lowerTrend) {
      trend = lowerTrend(i);
    }

    result[idx] = {
      signal,
      confidence: Math.min(confidence, 1),
      trend,
      t: d.t,
      obv: d.obv,
    };
  });

  return result;
}
