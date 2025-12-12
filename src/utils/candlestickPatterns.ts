export interface Candle {
    t: number | string;
    o: number;
    h: number;
    l: number;
    c: number;
    v?: number;
}

export type PatternType = 
    | "Hammer" | "Inverted Hammer" | "Bullish Engulfing" | "Morning Star" | "Piercing Line"
    | "Shooting Star" | "Hanging Man" | "Bearish Engulfing" | "Evening Star" | "Dark Cloud Cover"
    | null;

export interface DetectedPattern {
    type: PatternType;
    signal: "bullish" | "bearish";
    name: string;
}

// WAIT. The user README says:
// 鍛頭線 (Hammer): ... (紅或綠)
// In Taiwan: Red = UP, Green = DOWN.
// Let's assume standard crypto/US colors for code logic naming (Green=Up, Red=Down) BUT check User Context.
// User previous code: "ArrowUp color='#e26d6d'" (Reddish) -> Up is Red.
// So: Red Candle = Close > Open. Green Candle = Close < Open.
// Let's stick to "Bullish Candle" (C > O) and "Bearish Candle" (C < O) to avoid color confusion.

const isBullish = (k: Candle) => k.c > k.o;
const isBearish = (k: Candle) => k.c < k.o;
const bodySize = (k: Candle) => Math.abs(k.c - k.o);
const upperWick = (k: Candle) => k.h - Math.max(k.c, k.o);
const lowerWick = (k: Candle) => Math.min(k.c, k.o) - k.l;
const totalRange = (k: Candle) => k.h - k.l;

export default function detectCandlestickPattern(
    current: Candle,
    prev: Candle,
    prev2: Candle, // For 3-candle patterns
    trend: "up" | "down" | "flat"
): DetectedPattern | null {
    
    const body = bodySize(current);
    const uWick = upperWick(current);
    const lWick = lowerWick(current);
    const range = totalRange(current);
    
    // Thresholds
    const isSmallBody = body < range * 0.3;
    const isLongLowerWick = lWick > body * 2;
    const isLongUpperWick = uWick > body * 2;
    
    // 1. Hammer (Bullish) - Downtrend
    if (trend === "down" && isSmallBody && isLongLowerWick && uWick < body * 0.5) {
        return { type: "Hammer", signal: "bullish", name: "錘頭線" };
    }

    // 2. Inverted Hammer (Bullish) - Downtrend
    if (trend === "down" && isSmallBody && isLongUpperWick && lWick < body * 0.5) {
        return { type: "Inverted Hammer", signal: "bullish", name: "倒錘頭線" };
    }

    // 3. Bullish Engulfing - Downtrend
    if (trend === "down" && isBearish(prev) && isBullish(current)) {
        if (current.c > prev.o && current.o < prev.c) { // Covers body
             return { type: "Bullish Engulfing", signal: "bullish", name: "看漲吞沒" };
        }
    }

    // 4. Morning Star - Downtrend (Bearish -> Small -> Bullish)
    if (trend === "down" && isBearish(prev2)) {
        const isStar = bodySize(prev) < bodySize(prev2) * 0.3; // Small middle candle
        if (isStar && isBullish(current) && current.c > (prev2.o + prev2.c)/2) {
            return { type: "Morning Star", signal: "bullish", name: "晨星" };
        }
    }

    // 5. Piercing Line - Downtrend
    if (trend === "down" && isBearish(prev) && isBullish(current)) {
        if (current.o < prev.l && current.c > (prev.o + prev.c) / 2 && current.c < prev.o) {
             // Technically Piercing opens below low, closes above midpoint. 
             // Simplified: Open lower than prev Close (gap down), Close > Midpoint of prev Body.
             // prev is Bearish (O > C). Midpoint = (O+C)/2. 
             if (current.o < prev.c && current.c > (prev.o + prev.c)/2) {
                  return { type: "Piercing Line", signal: "bullish", name: "刺穿線" };
             }
        }
    }

    // --- Bearish Patterns ---

    // 6. Shooting Star - Uptrend
    if (trend === "up" && isSmallBody && isLongUpperWick && lWick < body * 0.5) {
        return { type: "Shooting Star", signal: "bearish", name: "射擊之星" };
    }

    // 7. Hanging Man - Uptrend
    if (trend === "up" && isSmallBody && isLongLowerWick && uWick < body * 0.5) {
        return { type: "Hanging Man", signal: "bearish", name: "吊人線" };
    }

    // 8. Bearish Engulfing - Uptrend
    if (trend === "up" && isBullish(prev) && isBearish(current)) {
        if (current.c < prev.o && current.o > prev.c) {
            return { type: "Bearish Engulfing", signal: "bearish", name: "看跌吞沒" };
        }
    }

    // 9. Evening Star - Uptrend (Bullish -> Small -> Bearish)
    if (trend === "up" && isBullish(prev2)) {
         const isStar = bodySize(prev) < bodySize(prev2) * 0.3;
         if (isStar && isBearish(current) && current.c < (prev2.o + prev2.c)/2) {
             return { type: "Evening Star", signal: "bearish", name: "黃昏星" };
         }
    }

    // 10. Dark Cloud Cover - Uptrend
    if (trend === "up" && isBullish(prev) && isBearish(current)) {
        // Open > prev High (Gap up), Close < Midpoint
        if (current.o > prev.c && current.c < (prev.o + prev.c)/2 && current.c > prev.o) {
            return { type: "Dark Cloud Cover", signal: "bearish", name: "烏雲蓋頂" };
        }
    }

    return null;
}
