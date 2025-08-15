import { describe, it, expect, vi } from 'vitest';
import analyzeIndicatorsData, { IndicatorsDateTimeType } from './analyzeIndicatorsData';

// Mock external and local dependencies
vi.mock('@ch20026103/anysis', () => ({
  dateFormat: vi.fn((timestamp, mode) => {
    // Simple mock: if mode is TimeStampToNumber, return a fixed date number
    // Otherwise, return a different fixed number to distinguish
    if (mode === 1) { // Assuming Mode.TimeStampToNumber is 1 or similar
      return Math.floor(timestamp / 1000 / 60 / 60 / 24); // Mock date number
    }
    return timestamp; // Return original timestamp for other modes
  }),
}));

vi.mock('./formatDateTime', () => ({
  default: vi.fn((timestamp) => {
    // Simple mock: return a fixed datetime number
    return Math.floor(timestamp / 1000); // Mock datetime number
  }),
}));

// Import the mocked functions to assert on their calls
import { dateFormat } from '@ch20026103/anysis';
import formatDateTime from './formatDateTime';

describe('analyzeIndicatorsData', () => {
  const mockJsonData = [{
    chart: {
      indicators: {
        quote: [
          {
            open: [100, 101, null, 103],
            close: [99, 102, null, 104],
            high: [105, 106, null, 107],
            low: [98, 99, null, 100],
            volume: [1000, 2000, null, 3000],
          },
        ],
      },
      timestamp: [1672531200, 1672617600, 1672704000, 1672790400], // Jan 1, 2, 3, 4 2023 UTC
    },
  }];
  const jsonString = JSON.stringify(mockJsonData);

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  it('should parse JSON and extract data correctly', () => {
    const result = analyzeIndicatorsData(jsonString, IndicatorsDateTimeType.DateTime);

    expect(result.length).toBe(3); // Expect 3 entries because one 'open' is null

    expect(result[0]).toEqual({
      t: Math.floor(mockJsonData[0].chart.timestamp[0] * 1000 / 1000), // Mocked formatDateTime output
      o: 100,
      c: 99,
      h: 105,
      l: 98,
      v: 1000,
    });

    expect(result[1]).toEqual({
      t: Math.floor(mockJsonData[0].chart.timestamp[1] * 1000 / 1000), // Mocked formatDateTime output
      o: 101,
      c: 102,
      h: 106,
      l: 99,
      v: 2000,
    });

    expect(result[2]).toEqual({
      t: Math.floor(mockJsonData[0].chart.timestamp[3] * 1000 / 1000), // Mocked formatDateTime output (index 3 because index 2 was null)
      o: 103,
      c: 104,
      h: 107,
      l: 100,
      v: 3000,
    });
  });

  it('should use dateFormat for IndicatorsDateTimeType.Date', () => {
    analyzeIndicatorsData(jsonString, IndicatorsDateTimeType.Date);

    expect(dateFormat).toHaveBeenCalledTimes(mockJsonData[0].chart.timestamp.length);
    expect(dateFormat).toHaveBeenCalledWith(mockJsonData[0].chart.timestamp[0] * 1000, expect.any(Number)); // Check first call
    expect(formatDateTime).not.toHaveBeenCalled(); // Ensure formatDateTime is not called
  });

  it('should use formatDateTime for IndicatorsDateTimeType.DateTime', () => {
    analyzeIndicatorsData(jsonString, IndicatorsDateTimeType.DateTime);

    expect(formatDateTime).toHaveBeenCalledTimes(mockJsonData[0].chart.timestamp.length);
    expect(formatDateTime).toHaveBeenCalledWith(mockJsonData[0].chart.timestamp[0] * 1000); // Check first call
    expect(dateFormat).not.toHaveBeenCalled(); // Ensure dateFormat is not called
  });

  it('should filter out entries where open is null', () => {
    const result = analyzeIndicatorsData(jsonString, IndicatorsDateTimeType.DateTime);
    expect(result.length).toBe(3); // Original data has 4 entries, one is null
    // Ensure the entry corresponding to null 'open' is skipped
    expect(result.some(entry => entry.o === null)).toBe(false);
  });

  it('should throw error for invalid JSON string', () => {
    const invalidJson = '{"chart": "invalid"}'; // Missing required nested structure
    expect(() => analyzeIndicatorsData(invalidJson, IndicatorsDateTimeType.DateTime)).toThrow();
  });

  it('should throw error for non-JSON string', () => {
    const nonJson = 'not a json string';
    expect(() => analyzeIndicatorsData(nonJson, IndicatorsDateTimeType.DateTime)).toThrow();
  });
});