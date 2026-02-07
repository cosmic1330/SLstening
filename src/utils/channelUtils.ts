export interface ChannelPoint {
  index: number;
  value: number;
}

export interface ChannelResult {
  slope: number;
  upperIntercept: number;
  lowerIntercept: number;
  type: "ascending" | "descending" | "horizontal";
}

// Helper function for linear regression (slope and intercept)
function linearRegression(
  x: number[],
  y: number[],
): { slope: number; intercept: number } | null {
  const n = x.length;
  if (n < 2) return null;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumXX += x[i] * x[i];
  }

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return null;

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

/**
 * Finds local maxima and minima in a series of price data.
 */
export function findLocalExtrema(
  data: (number | null)[],
  window: number = 3,
  type: "high" | "low",
): ChannelPoint[] {
  const extrema: ChannelPoint[] = [];

  for (let i = 1; i < data.length - 1; i++) {
    const current = data[i];
    if (current === null || current === undefined) continue;

    let isExtremum = true;
    const actualWindow = Math.min(window, i, data.length - 1 - i);

    for (let j = i - actualWindow; j <= i + actualWindow; j++) {
      if (i === j) continue;
      const compare = data[j];
      if (compare === null || compare === undefined) continue;

      if (type === "high") {
        if (compare > current) {
          isExtremum = false;
          break;
        }
      } else {
        if (compare < current) {
          isExtremum = false;
          break;
        }
      }
    }

    if (isExtremum) {
      extrema.push({ index: i, value: current });
    }
  }

  return extrema;
}

/**
 * Calculates a parallel channel based on highs and lows.
 * @param highs Array of high prices
 * @param lows Array of low prices
 * @param window Rolling window for extrema detection
 */
export function calculateChannel(
  highs: (number | null)[],
  lows: (number | null)[],
  window: number = 3,
): ChannelResult | null {
  // Exclude the last point (today's price) as requested by the user
  const calculationHighs = highs.slice(0, -1);
  const calculationLows = lows.slice(0, -1);

  const peaks = findLocalExtrema(calculationHighs, window, "high");
  const troughs = findLocalExtrema(calculationLows, window, "low");

  // Require at least 2 peaks and 2 troughs for a valid channel
  if (peaks.length < 2 || troughs.length < 2) return null;

  // Use a unified slope from all extrema to guarantee parallelism
  const allExtrema = [...peaks, ...troughs];
  const xCoords = allExtrema.map((p) => p.index);
  const yCoords = allExtrema.map((p) => p.value);
  const reg = linearRegression(xCoords, yCoords);
  if (!reg) return null;

  const slope = reg.slope;

  // Adjust intercepts to bound the entire range of peaks and troughs
  let upperIntercept = -Infinity;
  for (const p of peaks) {
    const b = p.value - slope * p.index;
    if (b > upperIntercept) upperIntercept = b;
  }

  let lowerIntercept = Infinity;
  for (const p of troughs) {
    const b = p.value - slope * p.index;
    if (b < lowerIntercept) lowerIntercept = b;
  }

  // Basic classification
  let type: "ascending" | "descending" | "horizontal" = "horizontal";
  if (slope > 0.0001) type = "ascending";
  else if (slope < -0.0001) type = "descending";

  return { slope, upperIntercept, lowerIntercept, type };
}
