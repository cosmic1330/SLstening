interface VolumeEstimationOptions {
  currentVolume: number;
  currentTime?: Date;
  historicalPattern?: {
    opening: number;  // 開盤30分鐘佔比 (09:00-09:30)
    morning: number;  // 早盤佔比 (09:30-11:30)
    midday: number;   // 午盤佔比 (11:30-13:25)
    closing: number;  // 收盤佔比 (13:25-13:30)
  };
}

export default function estimateTWSEVolume(
  options: VolumeEstimationOptions
): number {
  const {
    currentVolume,
    currentTime = new Date(),
    historicalPattern = {
      opening: 0.25,  // 預設開盤佔25%
      morning: 0.45,  // 早盤佔45%
      midday: 0.20,   // 午盤佔20%
      closing: 0.10   // 收盤佔10%
    }
  } = options;

  // 設定交易時段
  const marketOpen = new Date(currentTime);
  marketOpen.setHours(9, 0, 0, 0); // 09:00:00

  const marketClose = new Date(currentTime);
  marketClose.setHours(13, 30, 0, 0); // 13:30:00

  // 檢查非交易時段
  if (currentTime < marketOpen) return 0;
  if (currentTime >= marketClose) return currentVolume;

  // 定義關鍵時間點
  const openingEnd = new Date(marketOpen);
  openingEnd.setMinutes(30); // 09:30

  const morningEnd = new Date(marketOpen);
  morningEnd.setHours(11, 30, 0); // 11:30

  const closingStart = new Date(marketClose);
  closingStart.setMinutes(25); // 13:25

  // 計算已完成的時段佔比
  let completedRatio = 0;
  let currentPeriodRatio = 0;

  if (currentTime < openingEnd) {
    // 開盤時段 (09:00-09:30)
    const periodMinutes = 30;
    const minutesPassed = (currentTime.getTime() - marketOpen.getTime()) / (1000 * 60);
    currentPeriodRatio = historicalPattern.opening * (minutesPassed / periodMinutes);
    completedRatio = currentPeriodRatio;
  } 
  else if (currentTime < morningEnd) {
    // 早盤時段 (09:30-11:30)
    completedRatio = historicalPattern.opening;
    const periodMinutes = 120;
    const minutesPassed = (currentTime.getTime() - openingEnd.getTime()) / (1000 * 60);
    currentPeriodRatio = historicalPattern.morning * (minutesPassed / periodMinutes);
    completedRatio += currentPeriodRatio;
  } 
  else if (currentTime < closingStart) {
    // 午盤時段 (11:30-13:25)
    completedRatio = historicalPattern.opening + historicalPattern.morning;
    const periodMinutes = 115;
    const minutesPassed = (currentTime.getTime() - morningEnd.getTime()) / (1000 * 60);
    currentPeriodRatio = historicalPattern.midday * (minutesPassed / periodMinutes);
    completedRatio += currentPeriodRatio;
  } 
  else {
    // 收盤時段 (13:25-13:30)
    completedRatio = historicalPattern.opening + historicalPattern.morning + historicalPattern.midday;
    const periodMinutes = 5;
    const minutesPassed = (currentTime.getTime() - closingStart.getTime()) / (1000 * 60);
    currentPeriodRatio = historicalPattern.closing * (minutesPassed / periodMinutes);
    completedRatio += currentPeriodRatio;
  }

  // 計算預估量 (避免除以零)
  const estimatedVolume = completedRatio > 0 
    ? (currentVolume / completedRatio) 
    : currentVolume;

  return Math.round(estimatedVolume);
}
