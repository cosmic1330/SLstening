import { useEffect, useState } from "react";
import { Outlet } from "react-router";
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useTranslation } from "react-i18next";
import DebugInfo from "../components/DebugInfo";
import useMarketWatcher from "../hooks/useMarketWatcher";
import useStocksStore from "../store/Stock.store";
import useDebugStore from "../store/debug.store";
import { isNativeRuntime } from "../account/native";
import { useOptionalUser } from "../context/UserContext";

function AccountSyncNotice() {
  const { t } = useTranslation();
  const user = useOptionalUser();
  const nativeSessionError = user?.nativeSessionError ?? null;
  const retryNativeSession = user?.retryNativeSession ?? (() => undefined);
  const syncStatus = useStocksStore((state) => state.syncStatus);
  const syncError = useStocksStore((state) => state.syncError);
  const importLegacy = useStocksStore((state) => state.importLegacy);
  const repairLegacy = useStocksStore((state) => state.repairLegacy);
  const keepLegacyCurrent = useStocksStore((state) => state.keepLegacyCurrent);
  const legacyRepairAvailable = useStocksStore((state) => state.legacyRepairAvailable);
  const legacyRepairMissingCount = useStocksStore((state) => state.legacyRepairMissingCount ?? 0);
  const legacyUnresolvedStockIds = useStocksStore((state) => state.legacyUnresolvedStockIds ?? []);
  const accountUserId = useStocksStore((state) => state.accountUserId);
  const accountEpoch = useStocksStore((state) => state.accountEpoch);
  const reload = useStocksStore((state) => state.reload);
  const [repairDismissed, setRepairDismissed] = useState(false);
  useEffect(() => setRepairDismissed(false), [accountUserId, accountEpoch]);

  const importable = syncStatus === "importable";
  const nativeRetry = isNativeRuntime() && Boolean(nativeSessionError);
  const repairDialogOpen = legacyRepairAvailable && !repairDismissed && !nativeRetry;
  const repairInProgress = legacyRepairAvailable && (syncStatus === "repairing" || syncStatus === "loading");
  const repairConflict = legacyRepairAvailable && syncStatus === "conflict";
  const repairFailed = legacyRepairAvailable && syncStatus === "error";
  const unresolvedOnly = !importable && !repairDialogOpen && !legacyRepairAvailable && !nativeRetry && legacyUnresolvedStockIds.length > 0 && syncStatus === "synced";
  const runAction = (action: () => void | Promise<unknown>) => {
    try {
      void Promise.resolve(action()).catch(() => undefined);
    } catch {
      // Store actions own the visible error state. The UI must never create an
      // unhandled rejection when a retry action fails synchronously.
    }
  };
  const retry = () => {
    if (nativeRetry) {
      runAction(retryNativeSession);
      return;
    }
    if (importable) {
      runAction(importLegacy);
      return;
    }
    if (repairInProgress) return;
    runAction(reload);
  };
  const repairError = (syncError ?? "UNKNOWN_ERROR").slice(0, 240);
  const unresolvedMessage = legacyUnresolvedStockIds.length > 0
    ? t("accountSync.legacyUnresolved", { count: legacyUnresolvedStockIds.length, ids: legacyUnresolvedStockIds.join(", ") })
    : null;
  const repairMessageKey = repairInProgress
    ? "accountSync.repairing"
    : repairConflict
      ? "accountSync.repairConflict"
      : repairFailed
        ? "accountSync.repairFailed"
        : "accountSync.legacyRepairAvailable";
  const showInlineNotice = !repairDialogOpen && !legacyRepairAvailable && (
    importable || nativeRetry || unresolvedOnly || syncStatus === "error" || syncStatus === "conflict"
  );
  if (!repairDialogOpen && !showInlineNotice) return null;

  const closeRepairDialog = () => {
    if (!repairInProgress) setRepairDismissed(true);
  };
  const repairAction = () => {
    if (repairInProgress) return;
    runAction(repairConflict ? reload : repairLegacy);
  };
  const keepCurrent = () => {
    if (!repairInProgress) runAction(keepLegacyCurrent);
  };
  const inlineMessageKey = nativeRetry
    ? "accountSync.nativeError"
    : importable
      ? "accountSync.legacyAvailable"
      : unresolvedOnly
        ? "accountSync.legacyUnresolved"
        : "accountSync.error";
  return (
    <>
      <Dialog
        data-testid="account-sync-repair-dialog"
        open={repairDialogOpen}
        onClose={(_event, _reason) => closeRepairDialog()}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: { m: 1, width: "calc(100% - 16px)" } }}
        aria-labelledby="account-sync-repair-title"
      >
        <DialogTitle id="account-sync-repair-title" sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
          {t("accountSync.legacyRepairTitle")}
          <IconButton
            onClick={closeRepairDialog}
            disabled={repairInProgress}
            size="small"
            aria-label={t("a11y.close")}
            sx={{ p: 0.5 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography>{t(repairMessageKey, { error: repairError, count: legacyRepairMissingCount })}</Typography>
          {unresolvedMessage ? <Typography sx={{ mt: 1 }}>{unresolvedMessage}</Typography> : null}
          {repairInProgress ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
              <CircularProgress size={16} aria-label={t("accountSync.repairing")} />
              <Typography variant="body2">{t("accountSync.repairing")}</Typography>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1, flexWrap: "wrap", "& > button": { flex: { xs: "1 1 100%", sm: "1 1 auto" }, m: 0 } }}>
          {repairInProgress ? (
            <Button disabled fullWidth aria-label={t("accountSync.repairing")}>{t("accountSync.repairing")}</Button>
          ) : (
            <>
              <Button onClick={repairAction} aria-label={t(repairConflict ? "accountSync.reloadForRepair" : "accountSync.repair")}>
                {t(repairConflict ? "accountSync.reloadForRepair" : "accountSync.repair")}
              </Button>
              <Button onClick={keepCurrent} aria-label={t("accountSync.keepCurrent")}>{t("accountSync.keepCurrent")}</Button>
              <Button onClick={closeRepairDialog} aria-label={t("accountSync.decideLater")}>{t("accountSync.decideLater")}</Button>
            </>
          )}
        </DialogActions>
      </Dialog>
      {showInlineNotice ? (
        <Box data-testid="account-sync-inline-notice" sx={{ width: "100%", maxWidth: 640, mx: "auto", px: 1, pt: 1 }}>
          <Alert severity={importable || unresolvedOnly ? "info" : "error"} sx={{ alignItems: "flex-start" }}>
            <Box sx={{ width: "100%", minWidth: 0 }}>
              <Box>{t(inlineMessageKey, { error: repairError, count: legacyUnresolvedStockIds.length, ids: legacyUnresolvedStockIds.join(", ") })}</Box>
              {unresolvedMessage && !unresolvedOnly ? <Box sx={{ mt: 0.5 }}>{unresolvedMessage}</Box> : null}
              <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", mt: 1 }}>
                <Button color="inherit" size="small" disabled={syncStatus === "loading"} onClick={retry} aria-label={t(importable ? "accountSync.import" : "accountSync.retry")}>
                  {t(importable ? "accountSync.import" : "accountSync.retry")}
                </Button>
              </Box>
            </Box>
          </Alert>
        </Box>
      ) : null}
    </>
  );
}

export default function AuthenticatedRuntime() {
  const reload = useStocksStore((state) => state.reload);
  useMarketWatcher();

  useEffect(() => {
    void reload();

    let unlisten: (() => void) | undefined;
    let disposed = false;
    if (isNativeRuntime()) {
      void import("@tauri-apps/api/event").then(({ listen }) => listen<{ userId: string; epoch: number }>("account-state-updated", (event) => {
        const current = useStocksStore.getState();
        if (current.accountUserId === event.payload.userId && current.accountEpoch === event.payload.epoch) void reload();
      })).then((cleanup) => {
        if (disposed) cleanup();
        else unlisten = cleanup;
      });
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "d") {
        event.preventDefault();
        useDebugStore.getState().toggleVisibility();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      disposed = true;
      window.removeEventListener("keydown", handleKeyDown);
      unlisten?.();
    };
  }, [reload]);

  return <><AccountSyncNotice /><Outlet /><DebugInfo /></>;
}
