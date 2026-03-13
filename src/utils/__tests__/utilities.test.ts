import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import formatDateTime from '../formatDateTime';
import checkTimeRange from '../checkTimeRange';
import getTimeProgressPercent from '../getTimeProgressPercent';

describe('Utility Functions', () => {
  describe('formatDateTime', () => {
    it('should format timestamp to YYYYMMDDHHmm in Taipei timezone', () => {
      // 2024-05-20 09:30:00 UTC+8
      const ts = new Date('2024-05-20T09:30:00+08:00').getTime();
      expect(formatDateTime(ts)).toBe(202405200930);
    });

    it('should handle midnight correctly', () => {
      const ts = new Date('2024-05-20T00:00:00+08:00').getTime();
      expect(formatDateTime(ts)).toBe(202405200000);
    });

    it('should force "00" for even hours', () => {
      const ts = new Date('2024-05-20T10:00:00+08:00').getTime();
      expect(formatDateTime(ts)).toBe(202405201000);
    });
  });

  describe('checkTimeRange', () => {
    it('should return true for valid trading time (Tue 10:00 AM)', () => {
      const date = new Date('2024-05-21T10:00:00+08:00'); // Tuesday
      expect(checkTimeRange(date)).toBe(true);
    });

    it('should return false for weekend (Sat 10:00 AM)', () => {
      const date = new Date('2024-05-18T10:00:00+08:00'); // Saturday
      expect(checkTimeRange(date)).toBe(false);
    });

    it('should return false for early morning (Tue 08:30 AM)', () => {
      const date = new Date('2024-05-21T08:30:00+08:00');
      expect(checkTimeRange(date)).toBe(false);
    });

    it('should return false for after market (Tue 02:00 PM)', () => {
      const date = new Date('2024-05-21T14:00:00+08:00');
      expect(checkTimeRange(date)).toBe(false);
    });

    it('should return true for exactly 09:00 AM', () => {
       const date = new Date('2024-05-21T09:00:00+08:00');
       expect(checkTimeRange(date)).toBe(true);
    });

    it('should return true for exactly 01:30 PM', () => {
        const date = new Date('2024-05-21T13:30:00+08:00');
        expect(checkTimeRange(date)).toBe(true);
    });
  });

  describe('getTimeProgressPercent', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return 0 before market open', () => {
      const baseDate = new Date('2024-05-21T08:00:00+08:00');
      vi.setSystemTime(baseDate);
      expect(getTimeProgressPercent(baseDate.getTime())).toBe(0);
    });

    it('should return 100 after market close', () => {
      const baseDate = new Date('2024-05-21T14:00:00+08:00');
      vi.setSystemTime(baseDate);
      expect(getTimeProgressPercent(baseDate.getTime())).toBe(100);
    });

    it('should return 50 at mid-market (approx 11:15 AM)', () => {
      // Start 9:00, End 13:30 -> Total 270 minutes. 50% is 135 minutes after 9:00.
      // 9:00 + 2h 15m = 11:15
      const baseDate = new Date('2024-05-21T11:15:00+08:00');
      vi.setSystemTime(baseDate);
      expect(getTimeProgressPercent(baseDate.getTime())).toBe(50);
    });
  });
});
