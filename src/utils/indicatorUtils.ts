import boll from "../cls_tools/boll";
import cmf from "../cls_tools/cmf";
import emaTool from "../cls_tools/ema";
import kd from "../cls_tools/kd";
import ma from "../cls_tools/ma";
import macd from "../cls_tools/macd";
import mfi from "../cls_tools/mfi";
import obv from "../cls_tools/obv";
import obvEma from "../cls_tools/obvEma";
import rsi from "../cls_tools/rsi";
import { IndicatorSettings } from "../hooks/useIndicatorSettings";
import { TaType } from "../types";

export interface EnhancedDealData {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  ma5: number | null;
  ma10: number | null;
  ma20: number | null;
  ma60: number | null;
  ma120: number | null;
  ma240: number | null;
  deduction5: number | null;
  deduction10: number | null;
  deduction20: number | null;
  deduction60: number | null;
  deduction120: number | null;
  deduction240: number | null;
  volMa10: number | null;
  volMa20: number | null;
  bollMa: number | null;
  bollUb: number | null;
  bollLb: number | null;
  bandWidth: number | null;
  k: number | null;
  d: number | null;
  j: number | null;
  rsi: number | null;
  mfi: number | null;
  obv: number | null;
  obvEma: number | null;
  obvMa20: number | null;
  cmf: number | null;
  osc: number | null;
  dif: number | null;
  hma: number | null;
  ema50: number | null;
  atr: number | null;
  supertrend: number | null;
  trailStop: number | null;
  direction: number | null;
  buySignal: number | null;
  exitSignal: number | null;
  trend: string;
}

/**
 * Utility to calculate all commonly used indicators at once.
 * This reduces boilerplate and ensure consistent calculation across components.
 */
export function calculateIndicators(
  deals: TaType,
  settings: IndicatorSettings,
): EnhancedDealData[] {
  if (!deals || deals.length === 0) return [];

  let ma5Data = ma.init(deals[0], settings.ma5);
  let ma10Data = ma.init(deals[0], settings.ma10);
  let ma20Data = ma.init(deals[0], settings.ma20);
  let ma60Data = ma.init(deals[0], settings.ma60);
  let ma120Data = ma.init(deals[0], settings.ma120);
  let ma240Data = ma.init(deals[0], settings.ma240);
  let volMa10Data = ma.init({ ...deals[0], c: deals[0].v }, settings.ma10);
  let volMa20Data = ma.init({ ...deals[0], c: deals[0].v }, settings.ma20);
  let bollData = boll.init(deals[0]);
  let kdData = kd.init(deals[0], settings.kd);
  let rsiData = rsi.init(deals[0], settings.rsi);
  let mfiData = mfi.init(deals[0], settings.mfi);
  let macdData = macd.init(deals[0]);
  let obvData = obv.init(deals[0]);
  let obvEmaData = obvEma.init(obvData.obv, 10);
  let obvMa20Data = ma.init({ ...deals[0], c: obvData.obv }, 20);
  let cmfData = cmf.init(deals[0]);

  // ATR & SuperTrend state
  let prevAtr = 0;
  let prevUpperBand = 0;
  let prevLowerBand = 0;
  let prevFinalUpperBand = 0;
  let prevFinalLowerBand = 0;
  let prevSuperTrend = 0;
  let prevDirection = 1;
  let prevHmaVal: number | null = null;

  // Volume filter state
  const volSeries: number[] = [];

  // V7 Strategy state
  let ema50Data = emaTool.init(deals[0], settings.trendFilter || 50);
  let isLong = false;
  let trailStop = 0;
  const highSeries: number[] = [];
  const closeSeriesForHma: number[] = []; // Renamed to avoid confusion

  return deals.map((deal, i) => {
    if (i > 0) {
      ma5Data = ma.next(deal, ma5Data, settings.ma5);
      ma10Data = ma.next(deal, ma10Data, settings.ma10);
      ma20Data = ma.next(deal, ma20Data, settings.ma20);
      ma60Data = ma.next(deal, ma60Data, settings.ma60);
      ma120Data = ma.next(deal, ma120Data, settings.ma120);
      ma240Data = ma.next(deal, ma240Data, settings.ma240);
      volMa10Data = ma.next({ ...deal, c: deal.v }, volMa10Data, settings.ma10);
      volMa20Data = ma.next({ ...deal, c: deal.v }, volMa20Data, settings.ma20);
      bollData = boll.next(deal, bollData, settings.boll);
      kdData = kd.next(deal, kdData, settings.kd);
      rsiData = rsi.next(deal, rsiData, settings.rsi);
      mfiData = mfi.next(deal, mfiData, settings.mfi);
      macdData = macd.next(deal, macdData);
      obvData = obv.next(deal, obvData);
      obvEmaData = obvEma.next(obvData.obv, obvEmaData, 10);
      obvMa20Data = ma.next({ ...deal, c: obvData.obv }, obvMa20Data, 20);
      cmfData = cmf.next(deal, cmfData, settings.cmf, settings.cmfEma);
    }

    const ma5 = ma5Data.ma ? ma5Data.ma : null;
    const ma10 = ma10Data.ma ? ma10Data.ma : null;
    const ma20 = ma20Data.ma ? ma20Data.ma : null;
    const ma60 = ma60Data.ma ? ma60Data.ma : null;
    const ma120 = ma120Data.ma ? ma120Data.ma : null;
    const ma240 = ma240Data.ma ? ma240Data.ma : null;

    const deduction5 =
      ma5Data.dataset && ma5Data.dataset.length >= settings.ma5
        ? ma5Data.dataset[0].t
        : null;
    const deduction10 =
      ma10Data.dataset && ma10Data.dataset.length >= settings.ma10
        ? ma10Data.dataset[0].t
        : null;
    const deduction20 =
      ma20Data.dataset && ma20Data.dataset.length >= settings.ma20
        ? ma20Data.dataset[0].t
        : null;
    const deduction60 =
      ma60Data.dataset && ma60Data.dataset.length >= settings.ma60
        ? ma60Data.dataset[0].t
        : null;
    const deduction120 =
      ma120Data.dataset && ma120Data.dataset.length >= settings.ma120
        ? ma120Data.dataset[0].t
        : null;
    const deduction240 =
      ma240Data.dataset && ma240Data.dataset.length >= settings.ma240
        ? ma240Data.dataset[0].t
        : null;

    const bollMa = bollData.bollMa ? bollData.bollMa : null;
    const bollUb = bollData.bollUb ? bollData.bollUb : null;
    const bollLb = bollData.bollLb ? bollData.bollLb : null;

    let bandWidth = null;
    if (bollUb !== null && bollLb !== null && bollMa !== null && bollMa !== 0) {
      bandWidth = (bollUb - bollLb) / bollMa;
    }

    const volMa10 = volMa10Data.ma ? volMa10Data.ma : null;
    const volMa20 = volMa20Data.ma ? volMa20Data.ma : null;

    let trend = "震盪";
    if (ma5 && ma10 && ma20 && ma60 && ma240) {
      if (ma5 > ma10 && ma10 > ma20 && ma20 > ma60 && ma60 > ma240)
        trend = "多頭";
      else if (ma5 < ma10 && ma10 < ma20 && ma20 < ma60 && ma60 < ma240)
        trend = "空頭";
    }

    // --- ATR & SuperTrend Calculation ---
    const atrLen = settings.atrLen || 14;
    const atrMult = settings.atrMult || 2.5;

    let tr = deal.h - deal.l;
    if (i > 0) {
      tr = Math.max(
        tr,
        Math.abs(deal.h - deals[i - 1].c),
        Math.abs(deal.l - deals[i - 1].c),
      );
    }

    let atr = tr;
    if (i === 0) {
      atr = tr;
    } else if (i < atrLen) {
      atr = (prevAtr * i + tr) / (i + 1);
    } else {
      atr = (prevAtr * (atrLen - 1) + tr) / atrLen; // RMA
    }
    prevAtr = atr;

    const src = (deal.h + deal.l) / 2;
    const basicUpperBand = src + atrMult * atr;
    const basicLowerBand = src - atrMult * atr;

    let finalUpperBand = basicUpperBand;
    let finalLowerBand = basicLowerBand;

    if (i > 0) {
      if (
        basicUpperBand < prevFinalUpperBand ||
        deals[i - 1].c > prevFinalUpperBand
      ) {
        finalUpperBand = basicUpperBand;
      } else {
        finalUpperBand = prevFinalUpperBand;
      }

      if (
        basicLowerBand > prevFinalLowerBand ||
        deals[i - 1].c < prevFinalLowerBand
      ) {
        finalLowerBand = basicLowerBand;
      } else {
        finalLowerBand = prevFinalLowerBand;
      }
    }

    let direction = prevDirection;
    let supertrend = 0;

    if (i > 0) {
      if (prevSuperTrend === prevFinalUpperBand) {
        direction = deal.c > finalUpperBand ? -1 : 1;
      } else {
        direction = deal.c < finalLowerBand ? 1 : -1;
      }
    }
    supertrend = direction === -1 ? finalLowerBand : finalUpperBand;

    prevFinalUpperBand = finalUpperBand;
    prevFinalLowerBand = finalLowerBand;
    prevSuperTrend = supertrend;
    prevDirection = direction;

    // --- HMA Calculation (Keep for reference if needed) ---
    const hmaLength = settings.hmaLength || 20;
    const halfLength = Math.floor(hmaLength / 2);
    const sqrtLength = Math.floor(Math.sqrt(hmaLength));
    closeSeriesForHma.push(deal.c);
    const wmaHalf = calculateWMA(closeSeriesForHma, halfLength);
    const wmaFull = calculateWMA(closeSeriesForHma, hmaLength);
    let hmaVal = null;
    if (wmaHalf !== null && wmaFull !== null) {
      // Need a way to store diffs between bars. For simplicity, we just use a local array
      // Note: This is a bit expensive to recalculate every time if not careful
      const diffs = [];
      for (let j = 0; j < closeSeriesForHma.length; j++) {
        const wh = calculateWMA(closeSeriesForHma.slice(0, j + 1), halfLength);
        const wf = calculateWMA(closeSeriesForHma.slice(0, j + 1), hmaLength);
        if (wh !== null && wf !== null) diffs.push(2 * wh - wf);
      }
      hmaVal = calculateWMA(diffs, sqrtLength);
    }

    // --- V7 Strategy Calculations ---
    if (i > 0) {
      ema50Data = emaTool.next(deal, ema50Data, settings.trendFilter || 50);
    }
    const ema50 = ema50Data.ema;

    // Highest High of previous N days
    const fastLookback = settings.fastLookback || 10;
    let recentHigh = null;
    if (highSeries.length >= fastLookback) {
      recentHigh = Math.max(...highSeries.slice(-fastLookback));
    }
    highSeries.push(deal.h);

    // ... existing ATR calculation is actually RMA, which is standard for Pinescript ta.atr
    // We'll keep the existing ATR logic but ensure it uses atrLen

    // --- Volume Filter & Signals ---
    volSeries.push(deal.v);
    if (volSeries.length > 5) volSeries.shift();
    const volAvg = volSeries.reduce((a, b) => a + b, 0) / volSeries.length;
    const volFilter = deal.v > volAvg;

    let buySignal = null;
    let exitSignal = null;

    // --- V7 Entry/Exit Logic ---
    let currentBarTrailStop = isLong ? trailStop : null;

    if (i > 0) {
      const prevDeal = deals[i - 1];
      
      // 進場：價格向上突破前高 且 高於 EMA 50
      const breakout = recentHigh !== null && deal.c > recentHigh && prevDeal.c <= recentHigh;
      const buyCondition = breakout && deal.c > (ema50 || 0);

      if (buyCondition && !isLong) {
        buySignal = deal.l * 0.99;
        isLong = true;
        trailStop = deal.c - atr * atrMult;
        currentBarTrailStop = trailStop;
      }

      // 追蹤止損邏輯
      if (isLong) {
        const currentStop = deal.c - atr * atrMult;
        trailStop = Math.max(currentStop, trailStop);
        currentBarTrailStop = trailStop;
        
        // 出場：跌破止損線
        if (deal.c < trailStop) {
          exitSignal = deal.h * 1.01;
          isLong = false;
          // We keep currentBarTrailStop as trailStop for this candle to show the line where it was hit
        }
      }
    }

    prevHmaVal = hmaVal;

    return {
      ...deal,
      ma5,
      ma10,
      ma20,
      ma60,
      ma120,
      ma240,
      deduction5,
      deduction10,
      deduction20,
      deduction60,
      deduction120,
      deduction240,
      volMa10,
      volMa20,
      bollMa,
      bollUb,
      bollLb,
      bandWidth,
      k: kdData.k ? kdData.k : null,
      d: kdData.d ? kdData.d : null,
      j: kdData.j ? kdData.j : null,
      rsi: rsiData.rsi ? rsiData.rsi : null,
      mfi: mfiData.mfi ? mfiData.mfi : null,
      obv: obvData.obv,
      obvEma: obvEmaData.ema,
      obvMa20: obvMa20Data.ma,
      cmf: cmfData.cmf,
      osc: macdData.osc ? macdData.osc : null,
      dif: macdData.dif ? macdData.dif[macdData.dif.length - 1] : null,
      hma: hmaVal,
      ema50,
      atr,
      supertrend,
      trailStop: currentBarTrailStop,
      direction,
      buySignal,
      exitSignal,
      trend,
    };
  });
}

function calculateWMA(series: number[], period: number): number | null {
  if (series.length < period) return null;
  let sum = 0;
  let weightSum = 0;
  for (let i = 0; i < period; i++) {
    const weight = period - i;
    sum += series[series.length - 1 - i] * weight;
    weightSum += weight;
  }
  return sum / weightSum;
}
