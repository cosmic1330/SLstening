import { useCallback, useState } from "react";

export interface IndicatorSettings {
  ma5: number;
  ma10: number;
  ma20: number;
  ma60: number;
  boll: number;
  kd: number;
  mfi: number;
  rsi: number;
  ma120: number;
  ma240: number;
  emaShort: number;
  emaLong: number;
  cmf: number;
  cmfEma: number;
  hmaLength: number;
  atrLen: number;
  atrMult: number;
  atrVolSwitch: number;
  fastLookback: number;
  trendFilter: number;
}

const DEFAULT_SETTINGS: IndicatorSettings = {
  ma5: 5,
  ma10: 10,
  ma20: 30,
  ma60: 60,
  boll: 30,
  kd: 9,
  mfi: 14,
  rsi: 5,
  ma120: 120,
  ma240: 240,
  emaShort: 5,
  emaLong: 10,
  cmf: 21,
  cmfEma: 5,
  hmaLength: 20,
  atrLen: 14,
  atrMult: 2.5,
  atrVolSwitch: 1,
  fastLookback: 10,
  trendFilter: 50,
};

export default function useIndicatorSettings() {
  const [settings, setSettings] = useState<IndicatorSettings>(() => {
    const saved = localStorage.getItem("slitenting-indicator-settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!localStorage.getItem("slitenting-indicator-settings-ma30-migrated")) {
          if (parsed.ma20 === 20) parsed.ma20 = 30;
          if (parsed.boll === 20) parsed.boll = 30;
          localStorage.setItem("slitenting-indicator-settings-ma30-migrated", "true");
          localStorage.setItem("slitenting-indicator-settings", JSON.stringify({ ...DEFAULT_SETTINGS, ...parsed }));
        }
        return { ...DEFAULT_SETTINGS, ...parsed };
      } catch (e) {
        return DEFAULT_SETTINGS;
      }
    }
    localStorage.setItem("slitenting-indicator-settings-ma30-migrated", "true");
    return DEFAULT_SETTINGS;
  });

  const updateSetting = useCallback(
    (key: keyof IndicatorSettings, value: number) => {
      setSettings((prev) => {
        const next = { ...prev, [key]: value };
        localStorage.setItem(
          "slitenting-indicator-settings",
          JSON.stringify(next)
        );
        return next;
      });
    },
    []
  );

  const resetSettings = useCallback(() => {
    localStorage.removeItem("slitenting-indicator-settings");
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return { settings, updateSetting, resetSettings };
}
