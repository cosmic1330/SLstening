import {
  compareTaipeiCalendarDate,
  getTaipeiDateTimeParts,
  taipeiMinutesSinceMidnight,
} from "./taipeiTime";

const MARKET_OPEN_MINUTES = 9 * 60;
const MARKET_CLOSE_MINUTES = 13 * 60 + 30;

export default function getTimeProgressPercent(timestamp: number): number {
  const sessionDate = getTaipeiDateTimeParts(timestamp);
  const now = getTaipeiDateTimeParts(new Date());
  if (!sessionDate || !now) return 0;

  const dateOrder = compareTaipeiCalendarDate(now, sessionDate);
  if (dateOrder < 0) return 0;
  if (dateOrder > 0) return 100;

  const currentMinutes = taipeiMinutesSinceMidnight(now);
  if (currentMinutes <= MARKET_OPEN_MINUTES) return 0;
  if (currentMinutes >= MARKET_CLOSE_MINUTES) return 100;

  return Math.round(
    ((currentMinutes - MARKET_OPEN_MINUTES) /
      (MARKET_CLOSE_MINUTES - MARKET_OPEN_MINUTES)) *
      100,
  );
}
