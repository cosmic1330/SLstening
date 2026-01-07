import obvTool from "../../../cls_tools/obv";
import { TaType } from "../../../types";
import { calculateDMI, calculateSMA } from "./technicalIndicators";

export type SignalType =
  | "LONG_ENTRY"
  | "SHORT_ENTRY"
  | "LONG_EXIT"
  | "SHORT_EXIT";

export interface ObvSignal {
  t: number;
  type: SignalType;
  reason: string;
  price: number;
}

/**
 * Helper to find local extrema
 */
const getExtrema = (
  arr: number[],
  idx: number,
  window: number,
  type: "MAX" | "MIN"
) => {
  let val = type === "MAX" ? -Infinity : Infinity;
  // Look back 'window' periods, excluding current index to find *previous* extrema
  const start = Math.max(0, idx - window);
  for (let i = start; i < idx; i++) {
    if (type === "MAX") val = Math.max(val, arr[i]);
    else val = Math.min(val, arr[i]);
  }
  return val;
};

export const calculateObvSignals = (deals: TaType): ObvSignal[] => {
  if (!deals || deals.length < 60) return []; // Need history for MA computations

  // 1. Calculate Core Data
  const closes = deals.map((d) => d.c);
  // OBV Calculation
  const obvValues: number[] = [];
  let obvData = obvTool.init(deals[0]);
  obvValues.push(obvData.obv);
  for (let i = 1; i < deals.length; i++) {
    obvData = obvTool.next(deals[i], obvData);
    obvValues.push(obvData.obv);
  }

  // 2. Calculate Indicators
  // Price MAs
  const ma20 = calculateSMA(closes, 20);

  // OBV MA (Signal Line)
  const obvMa20 = calculateSMA(obvValues, 20);

  // DMI
  const { diPlus, diMinus, adx } = calculateDMI(deals, 14);

  const signals: ObvSignal[] = [];
  let position: "LONG" | "SHORT" | "NONE" = "NONE";

  // 3. Iterate and Find Signals
  // Start from 50 to ensure we have valid MA values
  for (let i = 50; i < deals.length; i++) {
    const d = deals[i];
    const c = d.c;
    const currObv = obvValues[i];
    const prevObv = obvValues[i - 1];

    const currObvMa = obvMa20[i]!;
    const prevObvMa = obvMa20[i - 1]!;

    const currPriceMa20 = ma20[i]!;

    const currDiPlus = diPlus[i] || 0;
    const currDiMinus = diMinus[i] || 0;
    const currAdx = adx[i] || 0;
    const prevDiPlus = diPlus[i - 1] || 0;
    const prevDiMinus = diMinus[i - 1] || 0;

    // Position Status
    const isLong = position === "LONG";
    const isShort = position === "SHORT";
    const isNeutral = position === "NONE";

    // --- ENTRY LOGIC ---
    if (isNeutral) {
      let signalFound = false;
      let signalReason = "";
      let signalType: SignalType | null = null;

      // DMI Filters
      const isUptrend = currDiPlus > currDiMinus && currAdx > 20;
      const isDowntrend = currDiMinus > currDiPlus && currAdx > 20;

      // 1. OBV Golden Cross (Golden Cross)
      // Logic: OBV crosses above its MA20 AND Price is above its MA20 (Trend Confirmation)
      const obvCrossUp = prevObv < prevObvMa && currObv > currObvMa;
      if (obvCrossUp && c > currPriceMa20 && isUptrend) {
        signalType = "LONG_ENTRY";
        signalReason = "OBV黃金交叉 + DMI多頭趨勢";
        signalFound = true;
      }

      // 2. OBV Bullish Divergence (Bottom Divergence)
      // Logic: Price makes a new 20-day low, but OBV is higher than its 20-day low
      if (!signalFound) {
        const prevPriceLow = getExtrema(closes, i, 20, "MIN");
        const prevObvLow = getExtrema(obvValues, i, 20, "MIN");

        // Current close is lower than previous 20-day low
        if (c < prevPriceLow) {
          // BUT OBV is comfortably above its recent low (not making a new low)
          // AND DMI isn't super bearish or starting to turn (DI+ rising?)
          // Divergence is a reversal, so maybe we don't demand full DMI uptrend yet,
          // but at least DI+ > DI- or crossing?
          // Let's require DI+ > DI- for safety to confirm reversal has started
          if (currObv > prevObvLow && currDiPlus > currDiMinus) {
            signalType = "LONG_ENTRY";
            signalReason = "量價底背離 + DMI確認";
            signalFound = true;
          }
        }
      }

      // 3. OBV Breakout (New High)
      // Logic: OBV makes new 20-day high AND Price makes new 20-day high
      if (!signalFound) {
        const prevObvHigh = getExtrema(obvValues, i, 20, "MAX");
        const prevPriceHigh = getExtrema(closes, i, 20, "MAX");

        if (currObv > prevObvHigh && c > prevPriceHigh && isUptrend) {
          signalType = "LONG_ENTRY";
          signalReason = "OBV創新高 + DMI動能強";
          signalFound = true;
        }
      }

      // --- SHORT ENTRIES ---

      // 1. OBV Dead Cross
      if (!signalFound) {
        const obvCrossDown = prevObv > prevObvMa && currObv < currObvMa;
        if (obvCrossDown && c < currPriceMa20 && isDowntrend) {
          signalType = "SHORT_ENTRY";
          signalReason = "OBV死亡交叉 + DMI空頭趨勢";
          signalFound = true;
        }
      }

      // 2. Bearish Divergence (Top Divergence)
      if (!signalFound) {
        const prevPriceHigh = getExtrema(closes, i, 20, "MAX");
        const prevObvHigh = getExtrema(obvValues, i, 20, "MAX");

        if (c > prevPriceHigh) {
          if (currObv < prevObvHigh && currDiMinus > currDiPlus) {
            signalType = "SHORT_ENTRY";
            signalReason = "量價頂背離 + DMI確認";
            signalFound = true;
          }
        }
      }

      // Register Entry
      if (signalFound && signalType) {
        signals.push({
          t: d.t,
          type: signalType,
          reason: signalReason,
          price: c,
        });
        position = signalType === "LONG_ENTRY" ? "LONG" : "SHORT";
      }
    }

    // --- EXIT LOGIC ---
    else if (isLong) {
      // Exit Long Logic
      // 1. OBV Dead Cross (Trend End)
      const obvCrossDown = prevObv > prevObvMa && currObv < currObvMa;
      // 2. Stop Loss (Price falls below MA20)
      const priceBreakdown = c < currPriceMa20 * 0.98;
      // 3. DMI Bearish Cross (Trend reversal warning)
      const dmiBearishCross =
        prevDiPlus > prevDiMinus && currDiPlus < currDiMinus;

      if (obvCrossDown || priceBreakdown || dmiBearishCross) {
        let reason = "跌破支撐離場";
        if (obvCrossDown) reason = "OBV轉弱離場";
        if (dmiBearishCross) reason = "DMI轉空離場";

        signals.push({
          t: d.t,
          type: "LONG_EXIT",
          reason: reason,
          price: c,
        });
        position = "NONE";
      }
    } else if (isShort) {
      // Exit Short Logic
      // 1. OBV Golden Cross (Trend Reversal)
      const obvCrossUp = prevObv < prevObvMa && currObv > currObvMa;
      // 2. Price Reversal (Price breaks above MA20)
      const priceBreakout = c > currPriceMa20 * 1.02;
      // 3. DMI Bullish Cross
      const dmiBullishCross =
        prevDiPlus < prevDiMinus && currDiPlus > currDiMinus;

      if (obvCrossUp || priceBreakout || dmiBullishCross) {
        let reason = "突破壓力回補";
        if (obvCrossUp) reason = "OBV轉強回補";
        if (dmiBullishCross) reason = "DMI轉多回補";

        signals.push({
          t: d.t,
          type: "SHORT_EXIT",
          reason: reason,
          price: c,
        });
        position = "NONE";
      }
    }
  }

  return signals;
};
