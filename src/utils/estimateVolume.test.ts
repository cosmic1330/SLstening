import { describe, it, expect, beforeEach } from 'vitest';
import estimateIntradayVolume from './estimateVolume';

// Helper to create a Date object for a specific time on a fixed day
const createTime = (hour: number, minute: number) => {
  // Use a fixed date (e.g., Jan 1, 2024) to ensure consistency
  return new Date(2024, 0, 1, hour, minute, 0);
};

describe('estimateIntradayVolume', () => {
  // Default options for common tests
  const defaultOptions = {
    currentVolume: 1000,
    currentTime: createTime(10, 0), // Default to 10:00 AM
  };

  // Test time period classification and isTradingTime
  describe('Time Period Classification and isTradingTime', () => {
    it('should classify as "beforeMarket" before 9:00 AM', () => {
      const result = estimateIntradayVolume({
        ...defaultOptions,
        currentTime: createTime(8, 59),
      });
      expect(result.currentPeriod).toBe('beforeMarket');
      expect(result.isTradingTime).toBe(false);
      expect(result.message).toContain('無法進行有效預估');
    });

    it('should classify as "opening" between 9:00 AM and 9:05 AM', () => {
      const result = estimateIntradayVolume({
        ...defaultOptions,
        currentTime: createTime(9, 2),
      });
      expect(result.currentPeriod).toBe('opening');
      expect(result.isTradingTime).toBe(true);
    });

    it('should classify as "morning" between 9:05 AM and 11:30 AM', () => {
      const result = estimateIntradayVolume({
        ...defaultOptions,
        currentTime: createTime(10, 30),
      });
      expect(result.currentPeriod).toBe('morning');
      expect(result.isTradingTime).toBe(true);
    });

    it('should classify as "midday" between 11:30 AM and 1:25 PM', () => {
      const result = estimateIntradayVolume({
        ...defaultOptions,
        currentTime: createTime(12, 0),
      });
      expect(result.currentPeriod).toBe('midday');
      expect(result.isTradingTime).toBe(true);
    });

    it('should classify as "closing" between 1:25 PM and 1:30 PM', () => {
      const result = estimateIntradayVolume({
        ...defaultOptions,
        currentTime: createTime(13, 27),
      });
      expect(result.currentPeriod).toBe('closing');
      expect(result.isTradingTime).toBe(true);
    });

    it('should classify as "afterMarket" after 1:30 PM', () => {
      const result = estimateIntradayVolume({
        ...defaultOptions,
        currentTime: createTime(13, 31),
      });
      expect(result.currentPeriod).toBe('afterMarket');
      expect(result.isTradingTime).toBe(false);
      expect(result.message).toContain('無法進行有效預估');
    });
  });

  // Test periodProgress calculation
  describe('periodProgress calculation', () => {
    it('should calculate periodProgress correctly for "opening" period', () => {
      // 9:00 AM to 9:05 AM (5 minutes)
      const result = estimateIntradayVolume({
        ...defaultOptions,
        currentTime: createTime(9, 2), // 2 minutes into 5-minute period
      });
      expect(result.currentPeriod).toBe('opening');
      expect(result.periodProgress).toBeCloseTo((2 / 5) * 100, 1); // 40%
    });

    it('should calculate periodProgress correctly for "morning" period', () => {
      // 9:05 AM to 11:30 AM (145 minutes)
      const result = estimateIntradayVolume({
        ...defaultOptions,
        currentTime: createTime(10, 0), // 55 minutes into 145-minute period
      });
      expect(result.currentPeriod).toBe('morning');
      const expectedProgressRaw = ((10 * 60 + 0) - (9 * 60 + 5)) / ((11 * 60 + 30) - (9 * 60 + 5)) * 100;
      expect(result.periodProgress).toBeCloseTo(expectedProgressRaw, 1);
    });

    it('should calculate periodProgress correctly for "midday" period', () => {
      // 11:30 AM to 1:25 PM (115 minutes)
      const result = estimateIntradayVolume({
        ...defaultOptions,
        currentTime: createTime(12, 30), // 60 minutes into 115-minute period
      });
      expect(result.currentPeriod).toBe('midday');
      const expectedProgressRaw = ((12 * 60 + 30) - (11 * 60 + 30)) / ((13 * 60 + 25) - (11 * 60 + 30)) * 100;
      expect(result.periodProgress).toBeCloseTo(expectedProgressRaw, 1);
    });

    it('should calculate periodProgress correctly for "closing" period', () => {
      // 1:25 PM to 1:30 PM (5 minutes)
      const result = estimateIntradayVolume({
        ...defaultOptions,
        currentTime: createTime(13, 28), // 3 minutes into 5-minute period
      });
      expect(result.currentPeriod).toBe('closing');
      expect(result.periodProgress).toBeCloseTo((3 / 5) * 100, 1); // 60%
    });
  });

  // Test estimatedVolume calculation
  describe('estimatedVolume calculation', () => {
    it('should estimate total volume correctly in "opening" period', () => {
      // At 9:02 AM (40% into opening period), current volume 1000
      // Opening period is 15% of total volume.
      // So, 1000 / (0.15 * 0.40) = 1000 / 0.06 = 16666.66 -> 16667
      const result = estimateIntradayVolume({
        currentVolume: 1000,
        currentTime: createTime(9, 2),
      });
      expect(result.estimatedVolume).toBe(16667);
    });

    it('should estimate total volume correctly in "morning" period', () => {
      // At 10:17 AM, current volume 10000
      // periodProgress (raw) = 72 / 145
      // totalExpectedProgress = 0.15 (opening) + 0.55 * (72 / 145) = 0.15 + 0.27310344827586205 = 0.42310344827586205
      // estimatedVolume = 10000 / 0.42310344827586205 = 23635.000000000004 -> rounded to 23635
      const result = estimateIntradayVolume({
        currentVolume: 10000,
        currentTime: createTime(10, 17),
      });
      expect(result.estimatedVolume).toBe(23635); // Corrected expected value
    });

    it('should handle custom historical patterns', () => {
      const customPatterns = {
        opening: 0.2,
        morning: 0.4,
        midday: 0.3,
        closing: 0.1,
      };
      // At 9:02 AM (40% into opening period), current volume 1000
      // Opening period is 20% of total volume.
      // So, 1000 / (0.20 * 0.40) = 1000 / 0.08 = 12500
      const result = estimateIntradayVolume({
        currentVolume: 1000,
        currentTime: createTime(9, 2),
        historicalPatterns: customPatterns,
      });
      expect(result.estimatedVolume).toBe(12500);
    });
  });

  // Test message generation and optional parameters
  describe('Message generation and optional parameters', () => {
    it('should include previousDayVolume ratio in message if provided', () => {
      const result = estimateIntradayVolume({
        ...defaultOptions,
        previousDayVolume: 50000,
        currentTime: createTime(10, 0), // Morning period
        currentVolume: 10000, // Example volume
      });
      // Estimated volume for 10:00 AM (from previous test) is 27896
      // periodProgress for 10:00 AM: (55 / 145) = 0.37931... -> rounded to 37.9%
      // totalExpectedProgress = 0.15 + 0.55 * 0.379 = 0.15 + 0.20845 = 0.35845
      // estimatedVolume = 10000 / 0.35845 = 27896.4 -> 27896
      // Ratio = (27896 / 50000) * 100 = 55.792 -> 56%
      expect(result.message).toContain('預估量為前一日交易量的 56%。');
      expect(result.estimatedRatio).toBe(56);
    });

    it('should include avg5DaysVolume ratio in message if provided', () => {
      const result = estimateIntradayVolume({
        ...defaultOptions,
        avg5DaysVolume: 60000,
        currentTime: createTime(10, 0), // Morning period
        currentVolume: 10000, // Example volume
      });
      // Estimated volume for 10:00 AM (from previous test) is 27896
      // Ratio = (27896 / 60000) * 100 = 46.493 -> 46%
      expect(result.message).toContain('預估量為5日均量的 46%。');
      expect(result.ratioToAvg5Days).toBe(46);
    });

    it('should include both ratios if both previousDayVolume and avg5DaysVolume are provided', () => {
      const result = estimateIntradayVolume({
        ...defaultOptions,
        previousDayVolume: 50000,
        avg5DaysVolume: 60000,
        currentTime: createTime(10, 0), // Morning period
        currentVolume: 10000, // Example volume
      });
      expect(result.message).toContain('預估量為前一日交易量的 56%。');
      expect(result.message).toContain('預估量為5日均量的 46%。');
    });

    it('should include current period and progress in message', () => {
      const result = estimateIntradayVolume({
        ...defaultOptions,
        currentTime: createTime(9, 2), // Opening period, 40% progress
      });
      expect(result.message).toContain('目前處於opening (進度 40%)');
    });
  });

  // Test edge cases for time boundaries
  describe('Time Boundary Edge Cases', () => {
    it('should correctly handle start of opening period (9:00 AM)', () => {
      const result = estimateIntradayVolume({
        currentVolume: 100,
        currentTime: createTime(9, 0),
      });
      expect(result.currentPeriod).toBe('opening');
      expect(result.periodProgress).toBe(0); // At the very start
      expect(result.estimatedVolume).toBe(100);
    });

    it('should correctly handle end of opening period (9:05 AM)', () => {
      const result = estimateIntradayVolume({
        currentVolume: 1000,
        currentTime: createTime(9, 5),
      });
      expect(result.currentPeriod).toBe('opening');
      expect(result.periodProgress).toBe(100); // At the very end
      expect(result.estimatedVolume).toBe(6667);
    });

    it('should correctly handle start of morning period (9:06 AM)', () => {
      const result = estimateIntradayVolume({
        currentVolume: 100,
        currentTime: createTime(9, 6),
      });
      expect(result.currentPeriod).toBe('morning');
      const expectedProgressRaw = (1 / 145) * 100; // 1 minute into 145 mins.
      expect(result.periodProgress).toBeCloseTo(expectedProgressRaw, 1);
    });

    it('should correctly handle end of closing period (1:30 PM)', () => {
      const result = estimateIntradayVolume({
        currentVolume: 1000,
        currentTime: createTime(13, 30),
      });
      expect(result.currentPeriod).toBe('closing');
      expect(result.periodProgress).toBe(100); // At the very end
      expect(result.estimatedVolume).toBe(1000);
    });
  });
});