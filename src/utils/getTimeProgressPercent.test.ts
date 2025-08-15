import { describe, it, expect, vi, afterEach } from 'vitest';
import getTimeProgressPercent from './getTimeProgressPercent';

describe('getTimeProgressPercent', () => {
  // Use a fixed timestamp for the day, e.g., Jan 1, 2024
  const fixedDayTimestamp = new Date(2024, 0, 1, 0, 0, 0, 0).getTime(); // Jan 1, 2024, 00:00:00

  // Clean up mocks after each test
  afterEach(() => {
    vi.useRealTimers(); // Restore original Date object
  });

  it('should return 0% if current time is before 9:00 AM', () => {
    vi.setSystemTime(new Date(2024, 0, 1, 8, 59, 59)); // 8:59:59 AM
    expect(getTimeProgressPercent(fixedDayTimestamp)).toBe(0);
  });

  it('should return 0% exactly at 9:00 AM', () => {
    vi.setSystemTime(new Date(2024, 0, 1, 9, 0, 0)); // 9:00:00 AM
    expect(getTimeProgressPercent(fixedDayTimestamp)).toBe(0);
  });

  it('should return 100% if current time is after 1:30 PM', () => {
    vi.setSystemTime(new Date(2024, 0, 1, 13, 30, 1)); // 1:30:01 PM
    expect(getTimeProgressPercent(fixedDayTimestamp)).toBe(100);
  });

  it('should return 100% exactly at 1:30 PM', () => {
    vi.setSystemTime(new Date(2024, 0, 1, 13, 30, 0)); // 1:30:00 PM
    expect(getTimeProgressPercent(fixedDayTimestamp)).toBe(100);
  });

  it('should return approximately 50% at the midpoint (11:15 AM)', () => {
    // Total duration: 9:00 AM to 1:30 PM = 4 hours 30 minutes = 270 minutes
    // Midpoint: 9:00 AM + 135 minutes = 11:15 AM
    vi.setSystemTime(new Date(2024, 0, 1, 11, 15, 0)); // 11:15:00 AM
    // (135 / 270) * 100 = 50
    expect(getTimeProgressPercent(fixedDayTimestamp)).toBe(50);
  });

  it('should return correct percentage at 10:00 AM', () => {
    // 10:00 AM is 60 minutes from 9:00 AM
    // (60 / 270) * 100 = 22.22... -> rounded to 22
    vi.setSystemTime(new Date(2024, 0, 1, 10, 0, 0));
    expect(getTimeProgressPercent(fixedDayTimestamp)).toBe(22);
  });

  it('should return correct percentage at 12:00 PM', () => {
    // 12:00 PM is 180 minutes from 9:00 AM
    // (180 / 270) * 100 = 66.66... -> rounded to 67
    vi.setSystemTime(new Date(2024, 0, 1, 12, 0, 0));
    expect(getTimeProgressPercent(fixedDayTimestamp)).toBe(67);
  });

  it('should handle seconds and milliseconds correctly (rounding)', () => {
    // Just before 1:30 PM, should round to 99 or 100
    vi.setSystemTime(new Date(2024, 0, 1, 13, 29, 59, 999)); // 1 second before 1:30
    // Progress = (269.999 / 270) * 100 = 99.999... -> rounded to 100
    expect(getTimeProgressPercent(fixedDayTimestamp)).toBe(100);
  });
});