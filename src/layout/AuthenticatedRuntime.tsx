import { useEffect } from "react";
import { Outlet } from "react-router";
import { Alert, Box, Button } from "@mui/material";
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
  const reload = useStocksStore((state) => state.reload);
  if (syncStatus !== "importable" && syncStatus !== "error" && syncStatus !== "conflict") return null;
  const importable = syncStatus === "importable";
  const nativeRetry = isNativeRuntime() && Boolean(nativeSessionError);
  const retry = () => {
    if (nativeRetry) {
      retryNativeSession();
      return;
    }
    void (importable ? importLegacy() : reload());
  };
  return (
    <Box sx={{ position: "fixed", zIndex: 1400, top: 8, left: 8, right: 8, maxWidth: 640, mx: "auto" }}>
      <Alert
        severity={importable ? "info" : "error"}
        action={(
          <Button
            color="inherit"
            size="small"
            onClick={retry}
            aria-label={t(importable ? "accountSync.import" : "accountSync.retry")}
          >
            {t(importable ? "accountSync.import" : "accountSync.retry")}
          </Button>
        )}
      >
        {t(nativeRetry ? "accountSync.nativeError" : importable ? "accountSync.legacyAvailable" : "accountSync.error", { error: syncError ?? "" })}
      </Alert>
    </Box>
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
