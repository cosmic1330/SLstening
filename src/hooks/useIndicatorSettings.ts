import { useCallback, useState } from "react";
import useStocksStore from "../store/Stock.store";
import { DEFAULT_INDICATOR_SETTINGS, readLegacyIndicatorSettings } from "../account/snapshot";
import { isNativeRuntime } from "../account/native";
import type { IndicatorSettings } from "../account/types";

export type { IndicatorSettings } from "../account/types";

const LEGACY_KEY = "slitenting-indicator-settings";

export default function useIndicatorSettings() {
  const accountUserId = useStocksStore((state) => state.accountUserId);
  const hydrated = useStocksStore((state) => state.hydrated);
  const accountSettings = useStocksStore((state) => state.indicatorSettings);
  const updateAccountSetting = useStocksStore((state) => state.updateIndicatorSetting);
  const resetAccountSettings = useStocksStore((state) => state.resetIndicatorSettings);
  const nativeRuntime = isNativeRuntime();
  // A native account transition must never fall back to another account's
  // legacy localStorage values. Legacy settings are only read by browser
  // runtime, or by the explicit legacy import path in the account store.
  const [legacySettings, setLegacySettings] = useState<IndicatorSettings>(() => (
    nativeRuntime ? { ...DEFAULT_INDICATOR_SETTINGS } : readLegacyIndicatorSettings()
  ));
  const accountReady = Boolean(accountUserId) && hydrated;
  const accountScoped = nativeRuntime ? accountReady : Boolean(accountUserId);
  const settings = nativeRuntime
    ? (accountReady ? accountSettings : DEFAULT_INDICATOR_SETTINGS)
    : (accountScoped ? accountSettings : legacySettings);

  const updateSetting = useCallback((key: keyof IndicatorSettings, value: number) => {
    if (nativeRuntime && !accountReady) return;
    const next = { ...settings, [key]: value };
    if (accountScoped) {
      // Queue a key-level update. The store merges against its latest state
      // when the mutation actually runs, so rapid slider edits cannot replay
      // an older closure and overwrite a newer setting.
      void updateAccountSetting(key, value);
      return;
    }
    setLegacySettings(next);
    globalThis.localStorage?.setItem(LEGACY_KEY, JSON.stringify(next));
  }, [accountReady, accountScoped, nativeRuntime, settings, updateAccountSetting]);

  const resetSettings = useCallback(() => {
    if (nativeRuntime && !accountReady) return;
    if (accountScoped) {
      void resetAccountSettings();
      return;
    }
    globalThis.localStorage?.removeItem(LEGACY_KEY);
    setLegacySettings({ ...DEFAULT_INDICATOR_SETTINGS });
  }, [accountReady, accountScoped, nativeRuntime, resetAccountSettings]);

  return { settings, updateSetting, resetSettings, isLoading: nativeRuntime && !accountReady };
}
