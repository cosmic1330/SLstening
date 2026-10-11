import { describe, expect, it } from "vitest";
import {
  CLOUD_BACKUP_MAX_BYTES,
  cloudBackupPayload,
  cloudBackupPayloadBytes,
} from "../cloudBackup";
import type { AccountSnapshot } from "../types";

const snapshot = (name: string): AccountSnapshot => ({
  stocks: [{ id: "2330", name, group: "TW", type: "stock" }],
  categories: [{ id: "group-a", name: "Watch", stockIds: ["2330"] }],
  activeCategoryId: "group-a",
  pinnedCategoryIds: [],
  recentCategoryIds: [],
  indicatorSettings: {
    ma5: 5, ma10: 10, ma20: 20, ma60: 60, boll: 30, kd: 9, mfi: 14, rsi: 14,
    ma120: 120, ma240: 240, emaShort: 5, emaLong: 10, cmf: 21, cmfEma: 5,
    atrLen: 10, atrMult: 3, donchian: 20, cci: 26,
  },
});

describe("cloud backup payload", () => {
  it("matches the compact Desktop wire fields and UTF-8 byte length", () => {
    const value = snapshot("台積電");
    expect(cloudBackupPayload(value)).toEqual([{
      id: "group-a",
      name: "Watch",
      stocks: [{ symbol: "2330", name: "台積電" }],
    }]);
    expect(cloudBackupPayloadBytes(value)).toBe(
      new TextEncoder().encode(JSON.stringify(cloudBackupPayload(value))).length,
    );
  });

  it("saves 47 UTF-8 bytes per category membership versus the legacy shape", () => {
    const value = snapshot("台積電");
    const compact = JSON.stringify(cloudBackupPayload(value));
    const legacy = compact.replace(
      '"name":"台積電"',
      '"name":"台積電","price":"---","change":"0.0","isPositive":true',
    );
    expect(new TextEncoder().encode(legacy).length - cloudBackupPayloadBytes(value)).toBe(47);
  });

  it("measures oversized Unicode payloads above the Rust capacity", () => {
    const value = snapshot("名".repeat(200));
    value.stocks = Array.from({ length: 300 }, (_, index) => ({
      id: `TW${index}`,
      name: "名".repeat(200),
      group: "TW",
      type: "stock",
    }));
    value.categories = [{ id: "group-a", name: "Watch", stockIds: value.stocks.map((stock) => stock.id) }];
    expect(cloudBackupPayloadBytes(value)).toBeGreaterThan(CLOUD_BACKUP_MAX_BYTES);
  });
});
