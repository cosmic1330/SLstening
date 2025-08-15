import { describe, it, expect } from 'vitest';
import checkTimeRange from './checkTimeRange';

describe('checkTimeRange', () => {
  // Helper function to create a Date object for a specific weekday and time
  // Monday = 1, Tuesday = 2, ..., Friday = 5
  const createDate = (dayOfWeek: number, hours: number, minutes: number) => {
    // Use a fixed date (e.g., a Monday in 2024) to control the day of the week
    // 2024-03-04 is a Monday
    const date = new Date(2024, 2, 4, hours, minutes, 0);
    // Adjust the day of the week if needed (e.g., for Tuesday, add 1 day)
    date.setDate(date.getDate() + (dayOfWeek - date.getDay() + 7) % 7);
    return date;
  };

  // Test cases for valid times within range (weekday)
  it('should return true for a weekday at 9:00 AM', () => {
    const date = createDate(1, 9, 0); // Monday, 9:00 AM
    expect(checkTimeRange(date)).toBe(true);
  });

  it('should return true for a weekday at 12:00 PM', () => {
    const date = createDate(3, 12, 0); // Wednesday, 12:00 PM
    expect(checkTimeRange(date)).toBe(true);
  });

  it('should return true for a weekday at 1:30 PM', () => {
    const date = createDate(5, 13, 30); // Friday, 1:30 PM
    expect(checkTimeRange(date)).toBe(true);
  });

  // Test cases for valid times outside range (weekday)
  it('should return false for a weekday at 8:59 AM', () => {
    const date = createDate(1, 8, 59); // Monday, 8:59 AM
    expect(checkTimeRange(date)).toBe(false);
  });

  it('should return false for a weekday at 1:31 PM', () => {
    const date = createDate(2, 13, 31); // Tuesday, 1:31 PM
    expect(checkTimeRange(date)).toBe(false);
  });

  it('should return false for a weekday at 2:00 PM', () => {
    const date = createDate(4, 14, 0); // Thursday, 2:00 PM
    expect(checkTimeRange(date)).toBe(false);
  });

  // Test cases for weekend days
  it('should return false for a Saturday within range time', () => {
    const date = createDate(6, 10, 0); // Saturday, 10:00 AM
    expect(checkTimeRange(date)).toBe(false);
  });

  it('should return false for a Sunday within range time', () => {
    const date = createDate(0, 11, 0); // Sunday, 11:00 AM
    expect(checkTimeRange(date)).toBe(false);
  });

  // Test cases for invalid input
  it('should return false for null input', () => {
    expect(checkTimeRange(null)).toBe(false);
  });

  it('should return false for undefined input', () => {
    expect(checkTimeRange(undefined)).toBe(false);
  });

  it('should return false for an invalid date string', () => {
    expect(checkTimeRange('not a date')).toBe(false);
  });

  it('should return false for an empty object input', () => {
    expect(checkTimeRange({})).toBe(false);
  });
});