import { describe, expect, it } from "vitest";
import emaTool from "../../cls_tools/ema";
import { calculateIndicators } from "../../utils/indicatorUtils";
import { DEFAULT_INDICATOR_SETTINGS } from "../../account/snapshot";
import {
  AGENT_INDICATOR_GOLDEN,
  APP_CANONICAL_EMA_EXPECTED,
  APP_CANONICAL_INDICATOR_EXPECTED,
  APP_CANONICAL_WARMUP_EXPECTED,
  canonicalIndicatorDeals,
  goldenCmfSeries,
  goldenEma,
} from "../indicatorGoldenFixture";

describe("native Agent indicator golden fixture", () => {
  it("matches the EMA and CMF EMA values used by the Rust gateway", () => {
    const fixture = AGENT_INDICATOR_GOLDEN;
    const cmf = goldenCmfSeries(
      fixture.highs,
      fixture.lows,
      fixture.closes,
      fixture.volumes,
      fixture.cmfPeriod,
    );
    const appShortSeries = emaTool.getEma([...fixture.closes], fixture.emaShortPeriod);
    const appLongSeries = emaTool.getEma([...fixture.closes], fixture.emaLongPeriod);
    const appShort = appShortSeries[appShortSeries.length - 1];
    const appLong = appLongSeries[appLongSeries.length - 1];
    expect(appShort).toBeCloseTo(fixture.expected.emaShort, 12);
    expect(appLong).toBeCloseTo(16.785185185185185, 12);
    expect(goldenEma(fixture.closes, fixture.emaShortPeriod)).toBeCloseTo(appShort ?? NaN, 12);
    expect(goldenEma(fixture.closes, fixture.emaLongPeriod)).toBeCloseTo(appLong ?? NaN, 12);
    expect(goldenEma(cmf, fixture.cmfEmaPeriod)).toBeCloseTo(0.1497285613334996, 12);
  });

  it("matches static App canonical values across warmup, seed, and rounded periods", () => {
    const deals = canonicalIndicatorDeals();
    const values = calculateIndicators(deals, DEFAULT_INDICATOR_SETTINGS);
    const appShortSeries = emaTool.getEma(
      deals.map((deal) => deal.c),
      DEFAULT_INDICATOR_SETTINGS.emaShort,
    );
    const appLongSeries = emaTool.getEma(
      deals.map((deal) => deal.c),
      DEFAULT_INDICATOR_SETTINGS.emaLong,
    );
    expect(appShortSeries[appShortSeries.length - 1]).toBeCloseTo(APP_CANONICAL_EMA_EXPECTED.short, 12);
    expect(appLongSeries[appLongSeries.length - 1]).toBeCloseTo(APP_CANONICAL_EMA_EXPECTED.long, 12);
    for (const [indexText, expected] of Object.entries(APP_CANONICAL_WARMUP_EXPECTED)) {
      const index = Number(indexText);
      for (const [key, value] of Object.entries(expected)) {
        const actual = values[index][key as keyof typeof values[number]];
        if (value === null) expect(actual).toBeNull();
        else expect(actual).toBeCloseTo(value, 10);
      }
    }
    const latest = values[values.length - 1];
    for (const [key, value] of Object.entries(APP_CANONICAL_INDICATOR_EXPECTED)) {
      const actual = key === "latest" ? latest.c : latest[key as keyof typeof latest];
      if (value === null) expect(actual).toBeNull();
      else expect(actual).toBeCloseTo(value, 10);
    }
  });
});
