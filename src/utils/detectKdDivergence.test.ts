import { describe, it, expect } from 'vitest';
import detectKdDivergence from './detectKdDivergence';

describe('detectKdDivergence', () => {
  it('should return an empty array for empty data', () => {
    expect(detectKdDivergence([])).toEqual([]);
  });
});