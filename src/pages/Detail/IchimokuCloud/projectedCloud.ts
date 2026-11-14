export const CLOUD_THICK_ATR_RATIO = 1;
export const CLOUD_THIN_ATR_RATIO = 0.5;

export type CloudDirection = "bullish" | "bearish" | "neutral";
export type CloudThickness = "thick" | "normal" | "thin";
export type CloudThicknessTrend = "expanding" | "contracting" | "stable";

interface CloudPoint {
  senkouA: number | null;
  senkouB: number | null;
}

export interface ProjectedCloudSummary {
  direction: CloudDirection;
  majorityDirection: CloudDirection;
  thickness: CloudThickness;
  thicknessTrend: CloudThicknessTrend;
  firstThickness: number;
  lastThickness: number;
  thicknessAtrRatio: number | null;
  twistPeriods: number[];
}

export const getCloudDirection = (
  senkouA: number,
  senkouB: number,
): CloudDirection => {
  if (senkouA > senkouB) return "bullish";
  if (senkouA < senkouB) return "bearish";
  return "neutral";
};

export const classifyCloudThickness = (
  thickness: number,
  atr: number,
): CloudThickness => {
  if (!Number.isFinite(atr) || atr <= 0) return "normal";
  const ratio = thickness / atr;
  if (ratio > CLOUD_THICK_ATR_RATIO) return "thick";
  if (ratio < CLOUD_THIN_ATR_RATIO) return "thin";
  return "normal";
};

export const summarizeProjectedCloud = (
  points: CloudPoint[],
  atr: number,
): ProjectedCloudSummary | null => {
  const validPoints = points.flatMap((point, index) => {
    if (point.senkouA === null || point.senkouB === null) return [];
    return [{
      index,
      direction: getCloudDirection(point.senkouA, point.senkouB),
      thickness: Math.abs(point.senkouA - point.senkouB),
    }];
  });

  if (validPoints.length === 0) return null;

  let bullishCount = 0;
  let bearishCount = 0;
  let previousDirection: CloudDirection | null = null;
  const twistPeriods: number[] = [];

  validPoints.forEach((point) => {
    if (point.direction === "bullish") bullishCount++;
    if (point.direction === "bearish") bearishCount++;

    if (point.direction === "neutral") return;
    if (previousDirection !== null && point.direction !== previousDirection) {
      twistPeriods.push(point.index + 1);
    }
    previousDirection = point.direction;
  });

  const firstThickness = validPoints[0].thickness;
  const lastPoint = validPoints[validPoints.length - 1];
  const lastThickness = lastPoint.thickness;
  const thicknessTrend =
    lastThickness > firstThickness * 1.1
      ? "expanding"
      : lastThickness < firstThickness * 0.9
        ? "contracting"
        : "stable";
  const majorityDirection =
    bullishCount > bearishCount
      ? "bullish"
      : bearishCount > bullishCount
        ? "bearish"
        : "neutral";

  return {
    direction: lastPoint.direction,
    majorityDirection,
    thickness: classifyCloudThickness(lastThickness, atr),
    thicknessTrend,
    firstThickness,
    lastThickness,
    thicknessAtrRatio:
      Number.isFinite(atr) && atr > 0 ? lastThickness / atr : null,
    twistPeriods,
  };
};
