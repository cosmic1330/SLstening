/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import i18n from "../../../i18n";
import ChartTooltip from "./ChartTooltip";

beforeEach(async () => {
  await i18n.changeLanguage("zh-TW");
});

describe("Ichimoku tooltip", () => {
  it("explains the current cloud, baseline, and thickness separately", () => {
    const data = {
      c: 110,
      kijun: 105,
      senkouA: 102,
      senkouB: 100,
      currentStatus: "位於陽雲上方：偏多強勢",
      thicknessStatus:
        "雲層較厚（1.25 倍 ATR），價格通常較難一次穿越",
      tkDistanceAtr: 0.6,
      tkDistanceTrend: "expanding",
      isFuture: false,
    };

    render(
      <ChartTooltip
        active
        label={20260101}
        payload={[{ payload: data, dataKey: "c", value: 110, name: "收" }]}
        showMESS={false}
      />,
    );

    expect(screen.getByText("一目雲判讀")).toBeTruthy();
    expect(screen.getByText("目前位置")).toBeTruthy();
    expect(screen.getByText("價格在雲層上方")).toBeTruthy();
    expect(screen.getByText("整體結構偏多")).toBeTruthy();
    expect(screen.getByText("價格在基準線上方")).toBeTruthy();
    expect(screen.getByText("短中期動能偏強｜基準線 105")).toBeTruthy();
    expect(screen.getByText("短期動能（轉換線）")).toBeTruthy();
    expect(screen.getByText("轉換線在上")).toBeTruthy();
    expect(
      screen.getByText("TK 距離 0.6 倍 ATR｜距離擴大｜多方動能增強"),
    ).toBeTruthy();
    expect(screen.getByText("雲層較厚")).toBeTruthy();
    expect(
      screen.getByText("雲層較厚（1.25 倍 ATR），價格通常較難一次穿越"),
    ).toBeTruthy();
  });

  it("labels the projected cloud as a reference and omits the baseline row", () => {
    const data = {
      c: null,
      kijun: null,
      senkouA: 102,
      senkouB: 100,
      futureTrend: "26 期後雲層區間",
      futureReason: "雲層很薄（0.40 倍 ATR），較容易被價格穿越",
      cloudThicknessTrend: "contracting",
      isFuture: true,
    };

    render(
      <ChartTooltip
        active
        label="future+1"
        payload={[
          { payload: data, dataKey: "senkouA", value: 102, name: "先行 A" },
        ]}
        showMESS={false}
      />,
    );

    expect(screen.getByText("26 期後雲層")).toBeTruthy();
    expect(
      screen.getByText(
        "由目前資料計算並向右平移，只是雲層結構參考，不是價格預測。",
      ),
    ).toBeTruthy();
    expect(screen.getByText("雲層範圍")).toBeTruthy();
    expect(screen.getByText("100–102")).toBeTruthy();
    expect(
      screen.getByText("右側雲層是目前資料向右平移後形成的價格區間"),
    ).toBeTruthy();
    expect(screen.queryByText("A／B 線排列")).toBeNull();
    expect(screen.getByText("雲層很薄")).toBeTruthy();
    expect(
      screen.getByText("雲層很薄（0.40 倍 ATR），較容易被價格穿越"),
    ).toBeTruthy();
    expect(screen.getByText("厚度變化")).toBeTruthy();
    expect(screen.getByText("正在變薄")).toBeTruthy();
    expect(screen.queryByText("短中期強弱（基準線）")).toBeNull();
  });

  it("warns when the conversion line stays above but approaches the baseline", () => {
    const data = {
      c: 110,
      kijun: 105,
      senkouA: 102,
      senkouB: 100,
      currentStatus: "位於陽雲上方：偏多強勢",
      thicknessStatus: "雲層厚度一般（0.75 倍 ATR）",
      tkDistanceAtr: 0.6,
      tkDistanceTrend: "contracting",
      isFuture: false,
    };

    render(
      <ChartTooltip
        active
        label={20260101}
        payload={[{ payload: data, dataKey: "c", value: 110, name: "收" }]}
        showMESS={false}
      />,
    );

    expect(
      screen.getByText("TK 距離 0.6 倍 ATR｜距離縮小｜留意多方動能減弱"),
    ).toBeTruthy();
  });
});
