import assert from "node:assert/strict";
import { test } from "vitest";
import { UrlTaPerdOptions } from "../types";
import { calculateMarketDeals, classifyMarketPower, classifyMarketTrend,
  collectTrendChanges, formatMarketTime, MarketTrend } from "./marketAnalysis";

test("power requires two consecutive changes and distinguishes sign", () => {
  for (const values of [[1, 3, 2], [-1, -3, -2], [2, 2, 2], [1, 2, 2], [-2, -1, 0]]) {
    assert.equal(classifyMarketPower(values), "無明顯力道");
  }
  assert.equal(classifyMarketPower([1, 2, 3]), "多方力道漸強");
  assert.equal(classifyMarketPower([3, 2, 1]), "多方力道漸弱");
  assert.equal(classifyMarketPower([-1, -2, -3]), "空方力道漸強");
  assert.equal(classifyMarketPower([-3, -2, -1]), "空方力道漸弱");
  assert.equal(classifyMarketPower([-1, 0, 1]), "多方力道漸強");
  for (const values of [[], [1, 2], [null, 1, 2], [1, NaN, 2], [1, 2, Infinity]]) {
    assert.equal(classifyMarketPower(values), "資料不足");
  }
});

test("history retains re-entry, neutral and direct reversals without inventing a warmup reversal", () => {
  const sequence: MarketTrend[] = ["資料不足", "多頭", "多頭", "震盪", "多頭", "空頭", "震盪"];
  const points = sequence.map((trend, t) => ({ trend, t }));
  assert.deepEqual(collectTrendChanges(points).map(p => p.t), [3, 4, 5, 6]);
});

test("moving averages and MACD wait for warmup; calculations are repeatable and do not mutate input", () => {
  const ta = Array.from({ length: 65 }, (_, i) => ({
    t: 202611050000 + i, o: 100 + i, c: 100 + i, h: 101 + i, l: 99 + i, v: 100,
  }));
  const original = structuredClone(ta);
  const deals = calculateMarketDeals(ta);
  assert.equal(deals[3].ma5, null);
  assert.equal(deals[4].ma5, 102);
  assert.equal(deals[19].ma20, 109.5);
  assert.equal(deals[59].ma60, 129.5);
  assert.equal(deals[32].osc, null);
  assert.ok(Number.isFinite(deals[33].osc));
  assert.equal(classifyMarketPower(deals.slice(31, 34).map(d => d.osc)), "資料不足");
  assert.equal(classifyMarketTrend(deals[18], UrlTaPerdOptions.Day), "資料不足");
  assert.equal(classifyMarketTrend(deals[19], UrlTaPerdOptions.Day), "多頭");
  assert.equal(classifyMarketTrend(deals[58], UrlTaPerdOptions.Hour), "資料不足");
  assert.equal(classifyMarketTrend(deals[59], UrlTaPerdOptions.Hour), "多頭");
  assert.equal(classifyMarketTrend({ ...deals[59], ma5: 120, ma10: 121, ma20: 122 }, UrlTaPerdOptions.Hour), "空頭");
  assert.equal(classifyMarketTrend({ ...deals[59], ma5: 120 }, UrlTaPerdOptions.Hour), "震盪");
  assert.deepEqual(calculateMarketDeals(ta), deals);
  assert.deepEqual(ta, original);
  assert.deepEqual(calculateMarketDeals([]), []);
});

test("hourly history includes the time while daily dates stay date-only", () => {
  assert.equal(formatMarketTime(202611051330), "2026-11-05 13:30");
  assert.equal(formatMarketTime(20261105), "2026-11-05");
});
