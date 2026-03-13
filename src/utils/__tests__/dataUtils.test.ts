import { describe, it, expect } from 'vitest';
import { analyzeIndicatorsData, analyzeNasdaqIndicatorsData, IndicatorsDateTimeType } from '../analyzeIndicatorsData';
import translateError from '../translateError';

describe('Data Utilities', () => {
  describe('analyzeIndicatorsData (TWSE)', () => {
    const mockJson = JSON.stringify([
      {
        chart: {
          result: [],
          timestamp: [1716163200], // 2024-05-20
          indicators: {
            quote: [
              {
                open: [100],
                close: [105],
                high: [110],
                low: [95],
                volume: [1000],
              },
            ],
          },
        },
      },
    ]);

    it('should parse TWSE JSON format correctly with Date type', () => {
      const result = analyzeIndicatorsData(mockJson, IndicatorsDateTimeType.Date);
      expect(result).toHaveLength(1);
      expect(result[0].t).toBe(20240520);
      expect(result[0].c).toBe(105);
    });

    it('should parse TWSE JSON format correctly with DateTime type', () => {
        const result = analyzeIndicatorsData(mockJson, IndicatorsDateTimeType.DateTime);
        expect(result).toHaveLength(1);
        expect(result[0].t).toBe(202405200800); // 1716163200 is 2024-05-20 00:00:00 UTC, which is 08:00 Taipei
    });
  });

  describe('analyzeNasdaqIndicatorsData', () => {
    const mockNasdaqJson = JSON.stringify({
      chart: {
        result: [
          {
            timestamp: [1716163200],
            indicators: {
              quote: [
                {
                  open: [200],
                  close: [205],
                  high: [210],
                  low: [195],
                  volume: [2000],
                },
              ],
            },
          },
        ],
      },
    });

    it('should parse Nasdaq JSON format correctly', () => {
      const result = analyzeNasdaqIndicatorsData(mockNasdaqJson, IndicatorsDateTimeType.Date);
      expect(result).toHaveLength(1);
      expect(result[0].t).toBe(20240520);
      expect(result[0].c).toBe(205);
    });
  });

  describe('translateError', () => {
    it('should translate common error messages', () => {
      expect(translateError('invalid email')).toBe('電子郵件格式不正確');
      expect(translateError('email already in use')).toBe('該電子郵件已被註冊');
      expect(translateError('weak password')).toBe('密碼強度不足，請使用更複雜的密碼');
      expect(translateError('invalid login credentials')).toBe('電子郵件或密碼錯誤');
    });

    it('should return original error if no match', () => {
      expect(translateError('something went wrong')).toBe('something went wrong');
    });
  });
});
