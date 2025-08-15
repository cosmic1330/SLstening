import { describe, it, expect } from 'vitest';
import generateDealDataDownloadUrl from './generateDealDataDownloadUrl';
import { UrlType, UrlTaPerdOptions } from '../types'; // Import necessary enums

describe('generateDealDataDownloadUrl', () => {
  const testId = '2330.TW';

  // Test UrlType.Tick
  it('should generate correct URL for UrlType.Tick', () => {
    const url = generateDealDataDownloadUrl({ type: UrlType.Tick, id: testId });
    expect(url).toBe(`https://tw.stock.yahoo.com/_td-stock/api/resource/FinanceChartService.ApacLibraCharts;symbols=["${testId}"];type=tick`);
  });

  it('should ignore perd parameter for UrlType.Tick', () => {
    const url = generateDealDataDownloadUrl({ type: UrlType.Tick, id: testId, perd: UrlTaPerdOptions.Day });
    expect(url).toBe(`https://tw.stock.yahoo.com/_td-stock/api/resource/FinanceChartService.ApacLibraCharts;symbols=["${testId}"];type=tick`);
  });

  // Test UrlType.Ta
  it('should generate correct URL for UrlType.Ta with perd', () => {
    const url = generateDealDataDownloadUrl({ type: UrlType.Ta, id: testId, perd: UrlTaPerdOptions.Day });
    expect(url).toBe(`https://tw.quote.finance.yahoo.net/quote/q?type=ta&perd=${UrlTaPerdOptions.Day}&mkt=10&sym=${testId}&v=1&callback=`);
  });

  it('should throw error for UrlType.Ta if perd is missing', () => {
    expect(() => generateDealDataDownloadUrl({ type: UrlType.Ta, id: testId })).toThrow('Invalid URL type or parameters');
  });

  // Test UrlType.Indicators
  it('should generate correct URL for UrlType.Indicators with perd and id', () => {
    const url = generateDealDataDownloadUrl({ type: UrlType.Indicators, id: testId, perd: UrlTaPerdOptions.Month });
    expect(url).toBe(`https://tw.stock.yahoo.com/_td-stock/api/resource/FinanceChartService.ApacLibraCharts;period=${UrlTaPerdOptions.Month};symbols=["${testId}"]`);
  });

  it('should throw error for UrlType.Indicators if perd is missing', () => {
    expect(() => generateDealDataDownloadUrl({ type: UrlType.Indicators, id: testId })).toThrow('Invalid URL type or parameters');
  });

  it('should throw error for UrlType.Indicators if id is missing (though type definition makes id required)', () => {
    // This test case is more for robustness, as TypeScript should prevent `id` from being missing.
    // However, if `id` were optional in the function signature, this would be a valid test.
    // For now, we'll test with `id: ''` to simulate a missing or empty ID.
    expect(() => generateDealDataDownloadUrl({ type: UrlType.Indicators, id: '', perd: UrlTaPerdOptions.Month })).toThrow('Invalid URL type or parameters');
  });

  // Test invalid type or parameters
  it('should throw error for unknown UrlType', () => {
    // Cast to any to simulate an invalid type not covered by enum
    expect(() => generateDealDataDownloadUrl({ type: 'unknown' as any, id: testId })).toThrow('Invalid URL type or parameters');
  });

  it('should throw error if id is missing for any type that implicitly requires it (e.g., Tick)', () => {
    // Although type definition makes id required, testing with empty string for robustness
    expect(() => generateDealDataDownloadUrl({ type: UrlType.Tick, id: '' })).toThrow('Invalid URL type or parameters');
  });
});