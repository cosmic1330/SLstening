import { useEffect, useState } from "react";

export type MarketInfoSettings = {
  cnn: boolean;
  mm: boolean;
  nasdaq: boolean;
  twse: boolean;
  otc: boolean;
  wtx: boolean;
};

const STORAGE_KEY = "slitenting-market-info-visibility";

const DEFAULT_SETTINGS: MarketInfoSettings = {
  cnn: true,
  mm: true,
  nasdaq: true,
  twse: true,
  otc: true,
  wtx: true,
};

export function useShowMarketInfo() {
  const [settings, setSettings] = useState<MarketInfoSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      } catch (e) {
        return DEFAULT_SETTINGS;
      }
    }
    // Migration from old single setting if exists
    const old = localStorage.getItem("slitenting-showMarketInfo");
    if (old !== null) {
      const isVisible = old === "true";
      return {
        cnn: isVisible,
        mm: isVisible,
        nasdaq: isVisible,
        twse: isVisible,
        otc: isVisible,
        wtx: isVisible,
      };
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setSettings(JSON.parse(e.newValue));
        } catch (err) {
          // ignore
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);

    const interval = setInterval(() => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (JSON.stringify(parsed) !== JSON.stringify(settings)) {
            setSettings(parsed);
          }
        } catch (e) {
          // ignore
        }
      }
    }, 500);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [settings]);

  return settings;
}
