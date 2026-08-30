import { useEffect } from "react";
import { Outlet } from "react-router";
import DebugInfo from "../components/DebugInfo";
import useMarketWatcher from "../hooks/useMarketWatcher";
import useStocksStore from "../store/Stock.store";
import useDebugStore from "../store/debug.store";

export default function AuthenticatedRuntime() {
  const reload = useStocksStore((state) => state.reload);
  useMarketWatcher();

  useEffect(() => {
    void reload();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "d") {
        event.preventDefault();
        useDebugStore.getState().toggleVisibility();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [reload]);

  return <><Outlet /><DebugInfo /></>;
}
