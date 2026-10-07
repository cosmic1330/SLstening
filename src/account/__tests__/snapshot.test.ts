import { describe, expect, it } from "vitest";
import { emptyAccountSnapshot, hasPersonalData } from "../snapshot";

describe("legacy account import detection", () => {
  it("treats non-default indicator settings as personal data", () => {
    const snapshot = emptyAccountSnapshot();
    expect(hasPersonalData(snapshot)).toBe(false);
    snapshot.indicatorSettings.rsi = 21;
    expect(hasPersonalData(snapshot)).toBe(true);
  });
});
