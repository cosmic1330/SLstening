import { describe, it, expect } from 'vitest';
import formatDateTime from './formatDateTime';

describe('formatDateTime', () => {
  it('should format a given timestamp into YYYYMMDDHHMI integer format', () => {
    // Example: March 5, 2024, 14:30:00 (local time)
    const timestamp = new Date(2024, 2, 5, 14, 30, 0).getTime(); // Month is 0-indexed (March is 2)
    expect(formatDateTime(timestamp)).toBe(202403051430);
  });

  it('should correctly pad single-digit month, day, hour, and minute', () => {
    // January 1, 2023, 08:05:00 AM (local time)
    const timestamp = new Date(2023, 0, 1, 8, 5, 0).getTime();
    expect(formatDateTime(timestamp)).toBe(202301010805);
  });

  it('should handle different years correctly', () => {
    // December 31, 2022, 23:59:00 (local time)
    const timestamp = new Date(2022, 11, 31, 23, 59, 0).getTime();
    expect(formatDateTime(timestamp)).toBe(202212312359);
  });
});