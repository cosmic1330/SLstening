import {
  getTaipeiDateTimeParts,
  taipeiMinutesSinceMidnight,
} from "./taipeiTime";

const MARKET_OPEN_MINUTES = 9 * 60;
const MARKET_CLOSE_MINUTES = 13 * 60 + 30;

// 檢查時間是否在台灣時間非六日 9:00 AM 到 1:30 PM 之間
const checkTimeRange = (time: unknown) => {
  const taipei = getTaipeiDateTimeParts(time as Date | number | string);
  if (!taipei || taipei.weekday === "Sat" || taipei.weekday === "Sun") {
    return false;
  }

  const minutes = taipeiMinutesSinceMidnight(taipei);
  return minutes >= MARKET_OPEN_MINUTES && minutes <= MARKET_CLOSE_MINUTES;
};
export default checkTimeRange;
