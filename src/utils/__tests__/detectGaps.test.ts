import { describe, it, expect } from 'vitest';
import { detectGaps, GapType, isGapFilled, getRecentGaps, sortGapsBySize } from '../detectGaps';
import { TaType } from '../../types';

describe('detectGaps', () => {
  const mockDeals: TaType = [
    { t: 20240101, o: 100, h: 105, l: 95, c: 102, v: 1000 },
    { t: 20240102, o: 110, h: 115, l: 108, c: 112, v: 1100 }, // UP Gap: 108 > 105
    { t: 20240103, o: 105, h: 107, l: 100, c: 103, v: 1200 }, // DOWN Gap: 107 < 108
    { t: 20240104, o: 102, h: 104, l: 98, c: 100, v: 1300 },
  ];

  it('should detect an upward gap', () => {
    const deals: TaType = [
      { t: 20240101, o: 100, h: 105, l: 95, c: 102, v: 1000 },
      { t: 20240102, o: 110, h: 115, l: 108, c: 112, v: 1100 },
    ];
    const result = detectGaps(deals, 1.0); // 1.0% threshold
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe(GapType.UP);
    expect(result[0].size).toBe(3); // 108 - 105
  });

  it('should detect a downward gap', () => {
    const deals: TaType = [
        { t: 20240102, o: 110, h: 115, l: 108, c: 112, v: 1100 },
        { t: 20240103, o: 100, h: 102, l: 95, c: 98, v: 1200 },
    ];
    const result = detectGaps(deals, 1.0);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe(GapType.DOWN);
    expect(result[0].size).toBe(6); // 108 - 102
  });

  it('should filter out small gaps below threshold', () => {
    const deals: TaType = [
        { t: 20240101, o: 100, h: 100.1, l: 99.9, c: 100, v: 1000 },
        { t: 20240102, o: 100.2, h: 100.3, l: 100.2, c: 100.2, v: 1100 }, // Gap size 0.1, 0.1%
    ];
    const result = detectGaps(deals, 0.5); // 0.5% threshold
    expect(result).toHaveLength(0);
  });

  it('should identify if a gap is filled', () => {
    const gap = {
      date: 20240102,
      type: GapType.UP,
      size: 3,
      sizePercent: 2.9,
      high: 108,
      low: 105,
      previousClose: 102,
      currentOpen: 110,
      previousHigh: 105,
      currentLow: 108,
    };
    
    // Price drops to 104, filling the 105-108 gap
    const subsequentDeals: TaType = [
      { t: 20240103, o: 107, h: 109, l: 104, c: 105, v: 1000 },
    ];
    
    const result = isGapFilled(gap, subsequentDeals);
    expect(result.filled).toBe(true);
    expect(result.fillDate).toBe(20240103);
  });

  it('should return recent gaps', () => {
    const result = getRecentGaps(mockDeals, 1);
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe(20240103);
  });

  it('should sort gaps by size', () => {
    const gaps = [
        { sizePercent: 2 },
        { sizePercent: 5 },
        { sizePercent: 1 },
    ];
    // @ts-ignore
    const sorted = sortGapsBySize(gaps, false); // Descending
    expect(sorted[0].sizePercent).toBe(5);
    expect(sorted[2].sizePercent).toBe(1);
  });
});
