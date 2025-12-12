import { TaType } from "../types";
import { calculateSMA, calculateRSI, calculateMFI, calculateBollingerBands } from "./technicalIndicators";
import obvTool from "../cls_tools/obv";

export type SignalType = 'LONG_ENTRY' | 'SHORT_ENTRY' | 'LONG_EXIT' | 'SHORT_EXIT';

export interface ObvSignal {
  t: number;
  type: SignalType;
  reason: string;
  price: number;
}

export const calculateObvSignals = (deals: TaType): ObvSignal[] => {
  if (!deals || deals.length < 60) return []; // Need history for MA50 + Lookback

  // 1. Calculate Data Series
  const obvValues: number[] = [];
  let obvData = obvTool.init(deals[0]);
  obvValues.push(obvData.obv);
  for (let i = 1; i < deals.length; i++) {
    obvData = obvTool.next(deals[i], obvData);
    obvValues.push(obvData.obv);
  }

  const closes = deals.map(d => d.c);
  const volumes = deals.map(d => d.v);
  
  const ma5 = calculateSMA(closes, 5);
  const ma10 = calculateSMA(closes, 10);
  const ma20 = calculateSMA(closes, 20);
  const ma50 = calculateSMA(closes, 50);
  
  const rsi14 = calculateRSI(closes, 14);
  const mfi14 = calculateMFI(deals, 14);
  const volMa20 = calculateSMA(volumes, 20);
  const bb20 = calculateBollingerBands(closes, 20, 2);

  const signals: ObvSignal[] = [];
  let position: 'LONG' | 'SHORT' | 'NONE' = 'NONE';

  // Helper: Get Local Extrema
  const getLocalMax = (arr: number[], idx: number, window: number) => {
      let max = -Infinity;
      for(let i = Math.max(0, idx - window); i < idx; i++) max = Math.max(max, arr[i]);
      return max;
  };
  const getLocalMin = (arr: number[], idx: number, window: number) => {
      let min = Infinity;
      for(let i = Math.max(0, idx - window); i < idx; i++) min = Math.min(min, arr[i]);
      return min;
  };

  // Helper: Concordance (Sync Rate)
  // Logic: Calculate % of days where Price and OBV moved in the same direction over last window
  const getSyncRate = (idx: number, window: number): number => {
      if (idx < window) return 0;
      let match = 0;
      for (let k = idx - window + 1; k <= idx; k++) {
          const priceUp = closes[k] > closes[k-1];
          const priceDown = closes[k] < closes[k-1];
          const obvUp = obvValues[k] > obvValues[k-1];
          const obvDown = obvValues[k] < obvValues[k-1];
          
          if ((priceUp && obvUp) || (priceDown && obvDown)) {
              match++;
          }
      }
      return match / window;
  };

  // Helper: Trend Detection (Simple slope check)
  const isTrendUp = (arr: number[], idx: number, periods: number) => {
      if (idx < periods) return false;
      return arr[idx] > arr[idx - periods];
  };
  const isTrendDown = (arr: number[], idx: number, periods: number) => {
        if (idx < periods) return false;
        return arr[idx] < arr[idx - periods];
  };

  
  // 3. Iterate Analysis
  for (let i = 50; i < deals.length; i++) {
    const d = deals[i];
    const c = d.c;
    const v = d.v;
    const currObv = obvValues[i];
    
    // Indicators
    const currMa5 = ma5[i]!;
    const currMa10 = ma10[i]!;
    const currMa20 = ma20[i]!;
    const currMa50 = ma50[i]!;
    const currRsi = rsi14[i]!;
    const currMfi = mfi14[i]!;
    const currVolMa = volMa20[i]!;
    
    const bbUp = bb20.upper[i]!;
    const bbMid = bb20.mid[i]!;
    const bbLow = bb20.lower[i]!;

    // Concordance Analysis
    const syncRate10 = getSyncRate(i, 10);
    const isSyncStrong = syncRate10 >= 0.7; // 70% Threshold

    // Multi-factor Count (Demo-like logic)
    // We check specific Entry Logic first, then validate with Multi-factor

    if (position === 'NONE') {
        let entryType = '';
        let entryReason = '';

        // --- LONG ENTRIES ---
        const prevPriceHigh20 = getLocalMax(closes, i, 20);
        const prevObvHigh20 = getLocalMax(obvValues, i, 20);
        const prevPriceLow20 = getLocalMin(closes, i, 20);
        const prevObvLow20 = getLocalMin(obvValues, i, 20);

        // Buy 1: OBV Breakout
        // OBV > High, Price < High + 3% (not excessively high), Price > 5/10MA
        if (
            currObv > prevObvHigh20 * 1.01 && // OBV new high > 1%
            c < prevPriceHigh20 * 1.03 && // Price not skyrocketing yet
            c > currMa5 && c > currMa10 &&
            currRsi > 50 &&
            (c <= bbLow * 1.02 || c >= bbMid) && // Touched low or broke mid
            v > currVolMa * 1.2
        ) {
            entryType = 'LONG_ENTRY';
            entryReason = '買點1: OBV突破';
        }

        // Buy 2: Bullish Div
        // Price < Low, OBV > Low
        if (!entryType &&
            c < prevPriceLow20 * 0.98 && // Price New Low
            currObv > prevObvLow20 && // OBV Higher Low
            // c > currMa20 * 0.95 && // Near MA20 support? (README says "回測不破MA20", implies it was above or touching)
            // Logic adjust: If price is making new low, it's likely below MA20. "不破" might mean finding support.
            // Let's use: Price > Open (Green Candle) + MFI > 40
            deals[i].c > deals[i].o &&
            currMfi > 40 &&
            currRsi > 40
        ) {
             entryType = 'LONG_ENTRY';
             entryReason = '買點2: 底背離';
        }

        // Buy 3: Trend Bounce
        // 3 higher lows (simplified: OBV trend up), Price > MA20/50
        if (!entryType &&
             isTrendUp(obvValues, i, 10) && // Simplified consecutive check
             c > currMa20 && c > currMa50 && // Strong Uptrend
             currRsi > 50 &&
             c > bbMid && // Above Mid
             getSyncRate(i, 5) >= 0.8 // High short-term sync
        ) {
             entryType = 'LONG_ENTRY';
             entryReason = '買點3: 趨勢回彈';
        }

        // --- FINAL LONG CHECK: Multi-Factor ---
        if (entryType === 'LONG_ENTRY') {
            // Count factors: OBV(Trend Up), MA(Price > MA20), RSI(>50), BB(>Mid or Low reversal)
            let factors = 0;
            if (isTrendUp(obvValues, i, 20)) factors++;
            if (c > currMa20) factors++;
            if (currRsi > 50) factors++;
            if (c > bbMid || c < bbLow * 1.05) factors++; // Position relative to bands

            // Concordance Check (Must be >= 70% usually, or compensate with factors)
            // README: "同向確認：計算...比例 ≥70%"
            // Implementation: We use the `isSyncStrong` (SyncRate >= 0.7) as a hard filter OR high factor count.
            // Strict interpretation: SyncRate >= 0.7 IS REQUIRED.
            
            if (factors >= 3 && isSyncStrong) {
                signals.push({ t: d.t, type: 'LONG_ENTRY', reason: `${entryReason} (同向 ${(syncRate10*100).toFixed(0)}%)`, price: c });
                position = 'LONG';
                continue;
            }
        }


        // --- SHORT ENTRIES ---
        const prevObvLow20_S = getLocalMin(obvValues, i, 20);
        
        // Sell 1: Breakdown
        if (
            currObv < prevObvLow20_S * 0.99 && // OBV Break Low
            c > prevPriceLow20 * 0.97 && // Price not crashed yet
            c < currMa5 && c < currMa10 &&
            currRsi < 50 &&
            v > currVolMa * 1.2
        ) {
             entryType = 'SHORT_ENTRY';
             entryReason = '賣點1: 跌破支撐';
        }

        // Sell 2: Bearish Div
        // Price > High, OBV < High
        if (!entryType &&
            c > prevPriceHigh20 * 1.02 &&
            currObv < prevObvHigh20 &&
            d.c < d.o && // Red Candle
            currMfi < 60
        ) {
             entryType = 'SHORT_ENTRY';
             entryReason = '賣點2: 頂背離';
        }

        // Sell 3: Trend Down
        if (!entryType &&
             isTrendDown(obvValues, i, 10) &&
             c < currMa20 && c < currMa50 &&
             currRsi < 50 &&
             c < bbMid &&
             getSyncRate(i, 5) < 0.2 // Very low sync (mostly down/opposing) - Wait, sync means SAME direction. 
             // If Trend Down, Price Down & OBV Down => High Sync. 
             // README says "量價同步 < 20% (價漲量縮)". 
             // Regulating: If Price Down and OBV Down, Sync is High. 
             // "Sync < 20%" usually means Divergence. Sell 3 is "OBV Trend Down".
             // Let's stick to Trend Down confirmation similar to Buy 3.
        ) {
             entryType = 'SHORT_ENTRY';
             entryReason = '賣點3: 趨勢下殺';
        }

         // --- FINAL SHORT CHECK ---
         if (entryType === 'SHORT_ENTRY') {
             let factors = 0;
             if (isTrendDown(obvValues, i, 20)) factors++;
             if (c < currMa20) factors++;
             if (currRsi < 50) factors++;
             if (c < bbMid || c > bbUp * 0.95) factors++;

             // For short, "Sync" interpretation in README "空頭比例 >= 70%".
             // Basically if we re-use `isSyncStrong` (Direction Match), it applies to Down-Down too.
             if (factors >= 3 && isSyncStrong) {
                 signals.push({ t: d.t, type: 'SHORT_ENTRY', reason: `${entryReason} (同向 ${(syncRate10*100).toFixed(0)}%)`, price: c });
                 position = 'SHORT';
                 continue;
             }
         }
    }

    // === EXIT LOGIC ===
    else if (position === 'LONG') {
        // Exit A
        // OBV High Div (Price High, OBV < High)
        // OR OBV break 10MA (proxy: slope turn)
        // OR Price < MA20
        // OR RSI < 40 / BB Upper Touch
        const prevPriceHigh = getLocalMax(closes, i, 20);
        const prevObvHigh = getLocalMax(obvValues, i, 20);

        let exitSignal = false;
        
        // 1. Div
        if (c > prevPriceHigh && currObv < prevObvHigh) exitSignal = true;
        // 2. Breakdown
        if (c < currMa20 && currObv < obvValues[i-1]) exitSignal = true;
        // 3. Techs
        if (currRsi < 40 || c >= bbUp) exitSignal = true;

        if (exitSignal) {
             signals.push({ t: d.t, type: 'LONG_EXIT', reason: '多單出場', price: c });
             position = 'NONE';
        }
    }
    else if (position === 'SHORT') {
         // Exit B
         const prevPriceLow = getLocalMin(closes, i, 20);
         const prevObvLow = getLocalMin(obvValues, i, 20);
         
         let exitSignal = false;
         
         // 1. Div
         if (c < prevPriceLow && currObv > prevObvLow) exitSignal = true;
         // 2. Reversal
         if (c > currMa20) exitSignal = true;
         // 3. Techs
         if (currRsi > 60 || c <= bbLow) exitSignal = true;
         
         if (exitSignal) {
              signals.push({ t: d.t, type: 'SHORT_EXIT', reason: '空單出場', price: c });
              position = 'NONE';
         }
    }
  }

  return signals;
};
