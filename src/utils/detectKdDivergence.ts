import { SignalType } from "../types";

export enum KdSignalType {
  BEARISH_DIVERGENCE = "頂背離",
  BULLISH_DIVERGENCE = "底背離",
}

type Item = { t: number; c: number; k: number; d: number };

export default function detectKdDivergence(
  data: Item[]
): SignalType<KdSignalType>[] {
  if (data.length < 10) return [];
  const signals: SignalType<KdSignalType>[] = [];
  const crossPoints = [];

  // 1. 找出黃金交叉與死亡交叉點
  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1];
    const curr = data[i];
    if (prev.k < prev.d && curr.k > curr.d) {
      crossPoints.push({ type: "golden", index: i });
    } else if (prev.k > prev.d && curr.k < curr.d) {
      crossPoints.push({ type: "death", index: i });
    }
  }

  // 2. 找出每個黃金交叉到死亡交叉之間的 K 高點
  const kdHighs = [];
  for (let i = 0; i < crossPoints.length - 1; i++) {
    const start = crossPoints[i];
    const end = crossPoints[i + 1];
    if (start.type === "golden" && end.type === "death") {
      let maxK = -Infinity;
      let maxIndex = -1;
      for (let j = start.index; j <= end.index; j++) {
        if (data[j].k > maxK) {
          maxK = data[j].k;
          maxIndex = j;
        }
      }
      kdHighs.push({
        index: maxIndex,
        k: data[maxIndex].k,
        close: data[maxIndex].c,
      });
    }
  }

  // 3. 比較最近兩個 KD 高點（頂背離）
  if (kdHighs.length >= 2) {
    const lastHigh = kdHighs[kdHighs.length - 1];
    const prevHigh = kdHighs[kdHighs.length - 2];
    const priceHigherHigh = lastHigh.close > prevHigh.close;
    const kLowerHigh = lastHigh.k < prevHigh.k;
    // 4. 確認最後是否發生死亡交叉（代表波段結束）
    const lastCross = crossPoints[crossPoints.length - 1];
    const hasRecentDeathCross =
      lastCross &&
      lastCross.type === "death" &&
      lastCross.index >= lastHigh.index;
    if (priceHigherHigh && kLowerHigh && hasRecentDeathCross) {
      signals.push({
        t: data[lastHigh.index].t,
        type: KdSignalType.BEARISH_DIVERGENCE,
        description: "價格創新高但KD未創新高，且波段結束，出現頂背離訊號。",
      });
    }
  }

  return signals;
}
