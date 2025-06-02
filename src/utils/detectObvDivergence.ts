enum OBVSignalType {
  BEARISH_DIVERGENCE = "頂背離",
  BULLISH_DIVERGENCE = "底背離",
}
interface OBVSignal {
  t: number;
  type: OBVSignalType;
  description: string;
}

// 主判斷函式
function analyzeOBVSignals(
  data: { t: number; c: number; obv: number }[],
  lookbackPeriod: number = 21 // 背離檢測週期
): OBVSignal[] {
  const signals: OBVSignal[] = [];

  // 主迴圈分析
  for (let i = lookbackPeriod; i < data.length; i++) {
    const current = data[i];
    const previousData = data.slice(i - lookbackPeriod, i);

    // 找出 lookback 期間內的前一個高點與低點索引
    let prevHighIdx = 0;
    let prevLowIdx = 0;
    for (let j = 1; j < previousData.length; j++) {
      if (previousData[j].c > previousData[prevHighIdx].c) prevHighIdx = j;
      if (previousData[j].c < previousData[prevLowIdx].c) prevLowIdx = j;
    }
    const prevHigh = previousData[prevHighIdx];
    const prevLow = previousData[prevLowIdx];

    // 頂背離：價格創新高但 OBV 沒有創新高
    if (
      current.c > prevHigh.c &&
      current.obv < prevHigh.obv // OBV 沒有同步創新高
    ) {
      signals.push({
        t: current.t,
        type: OBVSignalType.BEARISH_DIVERGENCE,
        description: `價格創${lookbackPeriod}日新高但OBV未同步，觀察日後是否有K線反轉型態或Obv死叉。`,
      });
    }
    // 底背離：價格創新低但 OBV 沒有創新低
    if (
      current.c < prevLow.c &&
      current.obv > prevLow.obv // OBV 沒有同步創新低
    ) {
      signals.push({
        t: current.t,
        type: OBVSignalType.BULLISH_DIVERGENCE,
        description: `價格創${lookbackPeriod}日新低但OBV未同步，若OBV金叉，且價格突破均線壓力，確認多頭啟動。`,
      });
    }
  }

  return signals;
}

export default analyzeOBVSignals;
