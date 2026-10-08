import { useEffect } from "react";
import { Outlet } from "react-router";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import DebugInfo from "../components/DebugInfo";
import useMarketWatcher from "../hooks/useMarketWatcher";
import useStocksStore from "../store/Stock.store";
import useDebugStore from "../store/debug.store";
import { getNativeIndicatorSettings, isNativeRuntime } from "../account/native";
import type { IndicatorSettings } from "../account/types";
import { useOptionalUser } from "../context/UserContext";

function AccountSyncNotice() {
  const { t } = useTranslation();
  const user = useOptionalUser();
  const nativeSessionError = user?.nativeSessionError ?? null;
  const retryNativeSession = user?.retryNativeSession ?? (() => undefined);
  const syncStatus = useStocksStore((state) => state.syncStatus);
  const syncError = useStocksStore((state) => state.syncError);
  const reload = useStocksStore((state) => state.reload);
  const nativeRetry = isNativeRuntime() && Boolean(nativeSessionError);
  if (!nativeRetry && syncStatus !== "error") return null;
  const retry = () => {
    try { void Promise.resolve(nativeRetry ? retryNativeSession() : reload()).catch(() => undefined); } catch { /* visible state owns the error */ }
  };
  return (
    <Box data-testid="account-sync-inline-notice" sx={{ width: "100%", maxWidth: 640, mx: "auto", px: 1, pt: 1 }}>
      <Alert severity="error" sx={{ alignItems: "flex-start" }}>
        <Box sx={{ width: "100%" }}>
          <Typography>{nativeRetry ? t("accountSync.nativeError", { error: nativeSessionError }) : t("accountSync.error", { error: syncError ?? "UNKNOWN_ERROR" })}</Typography>
          <Button color="inherit" size="small" onClick={retry} aria-label={t("accountSync.retry")}>{t("accountSync.retry")}</Button>
        </Box>
      </Alert>
    </Box>
  );
}

function LegacySettingsDialog() {
  const { t } = useTranslation();
  const open = useStocksStore((state) => state.legacySettingsPrompt);
  const error = useStocksStore((state) => state.legacySettingsError);
  const keep = useStocksStore((state) => state.keepLegacySettings);
  const remove = useStocksStore((state) => state.deleteLegacySettings);
  const run = (action: () => Promise<void>) => {
    try { void Promise.resolve(action()).catch(() => undefined); } catch { /* store publishes a retryable error */ }
  };
  return (
    <Dialog open={open} fullWidth maxWidth="xs" aria-labelledby="legacy-settings-title">
      <DialogTitle id="legacy-settings-title">{t("accountSync.legacySettingsTitle")}</DialogTitle>
      <DialogContent dividers>
        <Typography>{t("accountSync.legacySettingsMessage")}</Typography>
        {error ? <Alert role="alert" severity="error" sx={{ mt: 2 }}>{t("accountSync.legacySettingsDeleteFailed", { error })}</Alert> : null}
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1, flexWrap: "wrap" }}>
        <Button onClick={() => run(keep)} aria-label={t("accountSync.keepLegacySettings")}>{t("accountSync.keepLegacySettings")}</Button>
        <Button color="error" onClick={() => run(remove)} aria-label={t("accountSync.deleteLegacySettings")}>{t("accountSync.deleteLegacySettings")}</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function AuthenticatedRuntime() {
  const reload = useStocksStore((state) => state.reload);
  useMarketWatcher();

  useEffect(() => {
    const runReload = () => {
      try { void Promise.resolve(reload()).catch(() => undefined); } catch { /* fire-and-forget */ }
    };
    if (!isNativeRuntime()) runReload();
    let unlisten: (() => void) | undefined;
    let disposed = false;
    if (isNativeRuntime()) {
      void import("@tauri-apps/api/event").then(async ({ listen }) => {
        let preferenceEventVersion = 0;
        const stateCleanup = await listen<{ userId: string; epoch: number }>("account-state-updated", (event) => {
          const current = useStocksStore.getState();
          if (current.accountUserId === event.payload.userId && current.accountEpoch === event.payload.epoch) runReload();
        });
        const preferenceCleanup = await listen<{ userId: string; epoch: number; indicatorSettings: IndicatorSettings }>("account-local-preferences-updated", (event) => {
          const current = useStocksStore.getState();
          if (current.accountUserId !== event.payload.userId || current.accountEpoch !== event.payload.epoch) return;
          preferenceEventVersion += 1;
          current.applyIndicatorSettings(event.payload.indicatorSettings);
        });
        const current = useStocksStore.getState();
        if (current.accountUserId && current.accountEpoch !== null) {
          try {
            const before = preferenceEventVersion;
            const settingsBefore = { ...current.indicatorSettings };
            const local = await getNativeIndicatorSettings(current.accountEpoch);
            const latest = useStocksStore.getState();
            if (local && before === preferenceEventVersion && latest.accountUserId === current.accountUserId && latest.accountEpoch === current.accountEpoch && JSON.stringify(latest.indicatorSettings) === JSON.stringify(settingsBefore)) latest.applyIndicatorSettings(local);
          } catch { /* startup owns visible preference errors */ }
        }
        return () => { stateCleanup(); preferenceCleanup(); };
      }).then((cleanup) => { if (disposed) cleanup(); else unlisten = cleanup; }).catch(() => undefined);
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "d") { event.preventDefault(); useDebugStore.getState().toggleVisibility(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => { disposed = true; window.removeEventListener("keydown", handleKeyDown); unlisten?.(); };
  }, [reload]);

  return <><AccountSyncNotice /><LegacySettingsDialog /><Outlet /><DebugInfo /></>;
}
