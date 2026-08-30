/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest";
import { carouselOwnsEvent } from "./interaction";

describe("carouselOwnsEvent", () => {
  it("accepts viewport-owned chart interactions and ignores controls or prevented events", () => {
    const viewport = document.createElement("div");
    const chart = document.createElement("div");
    const input = document.createElement("input");
    viewport.append(chart, input);

    expect(carouselOwnsEvent({ target: chart, currentTarget: viewport, defaultPrevented: false })).toBe(true);
    expect(carouselOwnsEvent({ target: input, currentTarget: viewport, defaultPrevented: false })).toBe(false);
    expect(carouselOwnsEvent({ target: chart, currentTarget: viewport, defaultPrevented: true })).toBe(false);
  });
});
