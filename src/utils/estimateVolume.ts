interface VolumeEstimationOptions {
  currentVolume: number;
  currentTime: Date;
  previousDayVolume?: number;
  avg5DaysVolume?: number;
  historicalPatterns?: {
      // 各時段歷史平均交易量占比
      opening: number;    // 開盤 (09:00-09:05)
      morning: number;   // 早盤 (09:05-11:30)
      midday: number;    // 午盤 (11:30-13:25)
      closing: number;   // 收盤 (13:25-13:30)
  };
}

interface VolumeEstimationResult {
  currentVolume: number;
  currentTime: string;
  timeProgress: number;
  estimatedVolume: number;
  estimatedRatio?: number;
  ratioToAvg5Days?: number;
  message: string;
  isTradingTime: boolean;
  currentPeriod: string;
  periodProgress: number;
}

export default function estimateIntradayVolume(options: VolumeEstimationOptions): VolumeEstimationResult {
  // 台股交易時間設定
  const tradingHours = {
      start: { hour: 9, minute: 0 },
      openingEnd: { hour: 9, minute: 5 },    // 開盤時段結束
      morningEnd: { hour: 11, minute: 30 },  // 早盤結束
      closingStart: { hour: 13, minute: 25 }, // 收盤時段開始
      end: { hour: 13, minute: 30 }          // 收盤
  };

  // 預設歷史交易量分布模式 (可從實際數據統計得出)
  const defaultPatterns = {
      opening: 0.15,   // 開盤5分鐘通常佔15%
      morning: 0.55,   // 早盤佔55%
      midday: 0.20,    // 午盤佔20%
      closing: 0.10    // 收盤5分鐘佔10%
  };

  const patterns = options.historicalPatterns || defaultPatterns;

  // 當前時間分析
  const currentHours = options.currentTime.getHours();
  const currentMinutes = options.currentTime.getMinutes();
  const currentTimeInMinutes = currentHours * 60 + currentMinutes;

  // 計算各時段邊界
  const start = tradingHours.start.hour * 60 + tradingHours.start.minute;
  const openingEnd = tradingHours.openingEnd.hour * 60 + tradingHours.openingEnd.minute;
  const morningEnd = tradingHours.morningEnd.hour * 60 + tradingHours.morningEnd.minute;
  const closingStart = tradingHours.closingStart.hour * 60 + tradingHours.closingStart.minute;
  const end = tradingHours.end.hour * 60 + tradingHours.end.minute;

  // 判斷當前時段
  let currentPeriod = '';
  let periodProgress = 0;
  let isTradingTime = false;

  if (currentTimeInMinutes < start) {
      currentPeriod = 'beforeMarket';
  } else if (currentTimeInMinutes >= start && currentTimeInMinutes <= openingEnd) {
      currentPeriod = 'opening';
      periodProgress = (currentTimeInMinutes - start) / (openingEnd - start);
      isTradingTime = true;
  } else if (currentTimeInMinutes > openingEnd && currentTimeInMinutes <= morningEnd) {
      currentPeriod = 'morning';
      periodProgress = (currentTimeInMinutes - openingEnd) / (morningEnd - openingEnd);
      isTradingTime = true;
  } else if (currentTimeInMinutes > morningEnd && currentTimeInMinutes <= closingStart) {
      currentPeriod = 'midday';
      periodProgress = (currentTimeInMinutes - morningEnd) / (closingStart - morningEnd);
      isTradingTime = true;
  } else if (currentTimeInMinutes > closingStart && currentTimeInMinutes <= end) {
      currentPeriod = 'closing';
      periodProgress = (currentTimeInMinutes - closingStart) / (end - closingStart);
      isTradingTime = true;
  } else {
      currentPeriod = 'afterMarket';
  }

  // 計算預估量
  let estimatedVolume = options.currentVolume;
  let timeProgress = 0;

  if (isTradingTime) {
      // 計算各時段預期交易量
      const expectedPatterns = {
          opening: patterns.opening,
          morning: patterns.morning,
          midday: patterns.midday,
          closing: patterns.closing
      };

      // 計算已完成時段的預期交易量
      let expectedVolumeBeforeCurrentPeriod = 0;
      let expectedVolumeInCurrentPeriod = 0;

      switch (currentPeriod) {
          case 'opening':
              expectedVolumeInCurrentPeriod = expectedPatterns.opening * periodProgress;
              break;
          case 'morning':
              expectedVolumeBeforeCurrentPeriod = expectedPatterns.opening;
              expectedVolumeInCurrentPeriod = expectedPatterns.morning * periodProgress;
              break;
          case 'midday':
              expectedVolumeBeforeCurrentPeriod = expectedPatterns.opening + expectedPatterns.morning;
              expectedVolumeInCurrentPeriod = expectedPatterns.midday * periodProgress;
              break;
          case 'closing':
              expectedVolumeBeforeCurrentPeriod = expectedPatterns.opening + expectedPatterns.morning + expectedPatterns.midday;
              expectedVolumeInCurrentPeriod = expectedPatterns.closing * periodProgress;
              break;
      }

      const totalExpectedProgress = expectedVolumeBeforeCurrentPeriod + expectedVolumeInCurrentPeriod;
      timeProgress = totalExpectedProgress;

      // 避免除以零的情況
      if (totalExpectedProgress > 0) {
          estimatedVolume = options.currentVolume / totalExpectedProgress;
      }
  }

  // 格式化輸出
  const formattedTime = `${currentHours.toString().padStart(2, '0')}:${currentMinutes.toString().padStart(2, '0')}`;

  const result: VolumeEstimationResult = {
      currentVolume: options.currentVolume,
      currentTime: formattedTime,
      timeProgress: Math.round(timeProgress * 1000) / 10,
      estimatedVolume: Math.round(estimatedVolume),
      isTradingTime,
      currentPeriod: currentPeriod,
      periodProgress: Math.round(periodProgress * 1000) / 10,
      message: ''
  };

  // 非交易時段處理
  if (!isTradingTime) {
      result.message = `無法進行有效預估`;
      return result;
  }

  // 添加參考數據分析
  if (options.previousDayVolume) {
      result.estimatedRatio = Math.round((estimatedVolume / options.previousDayVolume) * 100);
      result.message += `預估量為前一日交易量的 ${result.estimatedRatio}%。`;
  }

  if (options.avg5DaysVolume) {
      result.ratioToAvg5Days = Math.round((estimatedVolume / options.avg5DaysVolume) * 100);
      result.message += ` 預估量為5日均量的 ${result.ratioToAvg5Days}%。`;
  }

  // 添加時段分析
  result.message += ` 目前處於${result.currentPeriod} (進度 ${result.periodProgress}%)`;

  return result;
}
