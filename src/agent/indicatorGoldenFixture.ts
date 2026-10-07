/**
 * Cross-runtime indicator fixtures. The canonical fixture below is evaluated
 * by the real app `calculateIndicators` implementation and is duplicated by
 * the Rust parity test. Keeping expected values static prevents a native
 * recurrence from validating itself.
 */
export const AGENT_INDICATOR_GOLDEN = {
  closes: [10, 12, 11, 15, 14, 18, 17, 20],
  highs: [11, 14, 13, 17, 15, 20, 19, 22],
  lows: [9, 10, 9, 13, 12, 15, 14, 18],
  volumes: [100, 120, 80, 150, 130, 160, 110, 180],
  emaShortPeriod: 3,
  emaLongPeriod: 5,
  cmfPeriod: 3,
  cmfEmaPeriod: 2,
  expected: {
    emaShort: 18.1875,
    emaLong: 16.785185185185185,
    cmfEma: 0.1497285613334996,
  },
} as const;

export function goldenEma(values: readonly number[], period: number) {
  if (values.length < period) return null;
  let previous = values.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  for (const value of values.slice(period)) previous = (value * 2 + (period - 1) * previous) / (period + 1);
  return previous;
}

export function goldenCmfSeries(
  highs: readonly number[],
  lows: readonly number[],
  closes: readonly number[],
  volumes: readonly number[],
  period: number,
) {
  const result: number[] = [];
  for (let end = period; end <= closes.length; end += 1) {
    let moneyFlow = 0;
    let volume = 0;
    for (let index = end - period; index < end; index += 1) {
      const range = highs[index] - lows[index];
      if (range !== 0) moneyFlow += ((2 * closes[index] - lows[index] - highs[index]) / range) * volumes[index];
      volume += volumes[index];
    }
    if (volume !== 0) result.push(moneyFlow / volume);
  }
  return result;
}

export function canonicalIndicatorDeals() {
  return Array.from({ length: 80 }, (_, index) => {
    const close = 100 + Math.sin(index / 3) * 7 + index * 0.35;
    return {
      t: index + 1,
      o: close - 0.8,
      h: close + 2.2 + (index % 4) * 0.15,
      l: close - 2.4 - (index % 3) * 0.2,
      c: close,
      v: 1000 + index * 37 + (index % 5) * 11,
    };
  });
}

export const APP_CANONICAL_INDICATOR_EXPECTED = {
  latest: 134.17577433390815,
  ma5: 130.13,
  ma10: 124.84,
  ma20: 121.94,
  ma60: 117.6,
  ema30: 122.57131235281649,
  vma20: 3593.5,
  bollMa: 121.94,
  bollUb: 134.62,
  bollLb: 109.25999999999999,
  bandWidth: 0.20797113334426778,
  k: 81.18,
  d: 70.08,
  j: 103.39,
  rsi: 75.48392844504248,
  mfi: 66.9781352011632,
  obv: 35722,
  obvEma: 22933.91384749985,
  obvMa20: 18597,
  cmf: 0.03252388395343906,
  cmfEma: 0.03420665256365215,
  osc: 1.08,
  dif: 3.22,
  atr: 5.0573070881789315,
  supertrend: 119.02885306937137,
  donchianUb: 136.82577433390813,
  donchianLb: 115.0821260870131,
  donchianMa: 125.95395021046062,
  cci: 160.75349050921702,
  ema200: null,
  ma120: null,
  ma240: null,
} as const;

// Captured from the App's `@ch20026103/anysis` Ema.getEma implementation.
// The TypeScript parity test invokes that package directly while the Rust
// test compares against these fixed values, so native code cannot validate
// itself by sharing its recurrence implementation.
export const APP_CANONICAL_EMA_EXPECTED = {
  short: 130.31451801325775,
  long: 127.25986128299564,
} as const;

export const APP_CANONICAL_WARMUP_EXPECTED = {
  0: { ma5: null, ema30: null, k: null, rsi: null, mfi: null, obv: 1000, cmf: 0, cmfEma: 0, osc: null },
  4: { ma5: 104.56, ema30: null, k: null, rsi: null, mfi: null, obv: 5480, cmf: 0, cmfEma: 0, osc: null },
  9: { ma5: 106.97, ema30: null, k: 48.47, rsi: null, mfi: null, obv: 1445, cmf: 0, cmfEma: 0, osc: null },
  19: { ma5: 102.34, ema30: null, k: 61.61, rsi: 65.59363708200894, mfi: 39.713468607091556, obv: 2370, cmf: 0, cmfEma: 0, osc: null },
  29: { ma5: 112.02, ema30: 106.41387715943544, k: 48.6, rsi: 54.1364256144487, mfi: 60.48983111425408, obv: 1445, cmf: 0.03653491483740586, cmfEma: 0.03555234469680186, osc: null },
  33: { ma5: 105.92, ema30: 106.13613057568881, k: 23.88, rsi: 44.72659349104723, mfi: 41.268467353434744, obv: -7283, cmf: 0.03571039124512102, cmfEma: 0.03542058675704345, osc: -3.78 },
  59: { ma5: 120.89, ema30: 115.07617726271101, k: 76.6, rsi: 73.446329519325, mfi: 53.280356766931995, obv: 19594, cmf: 0.032896728505845296, cmfEma: 0.03427957840397013, osc: 0.78 },
  79: {
    ma5: APP_CANONICAL_INDICATOR_EXPECTED.ma5,
    ema30: APP_CANONICAL_INDICATOR_EXPECTED.ema30,
    k: APP_CANONICAL_INDICATOR_EXPECTED.k,
    rsi: APP_CANONICAL_INDICATOR_EXPECTED.rsi,
    mfi: APP_CANONICAL_INDICATOR_EXPECTED.mfi,
    obv: APP_CANONICAL_INDICATOR_EXPECTED.obv,
    cmf: APP_CANONICAL_INDICATOR_EXPECTED.cmf,
    cmfEma: APP_CANONICAL_INDICATOR_EXPECTED.cmfEma,
    osc: APP_CANONICAL_INDICATOR_EXPECTED.osc,
  },
} as const;
