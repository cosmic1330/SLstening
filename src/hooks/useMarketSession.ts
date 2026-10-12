import { useEffect, useState, useSyncExternalStore } from "react";
import { inferMarketGroup } from "../account/snapshot";
import { FutureIds } from "../types";
import { isNasdaqMarketOpen, isTaiwanMarketOpen, isWtxMarketOpen } from "../utils/marketUtils";
import { MarketSession } from "../utils/marketResourceState";

export const marketSessionForSymbol = (symbol: string, date = new Date(), marketGroup?: string): MarketSession => {
  if (symbol === FutureIds.WTX) return isWtxMarketOpen(date) ? "open" : "closed";
  if (symbol === FutureIds.NASDAQ || symbol === FutureIds.NASDAQ_FUTURE) return isNasdaqMarketOpen(date) ? "open" : "closed";
  const group = marketGroup?.trim().toUpperCase();
  const explicitTaiwan = group === "TW" || group === "TAIWAN" || group?.includes("TAIWAN") || group?.includes("台灣");
  const explicitUs = group === "US" || group === "USA" || group?.includes("US MARKET") || group?.includes("美股");
  const isUs = explicitUs || (!explicitTaiwan && inferMarketGroup(symbol) === "US");
  return (isUs ? isNasdaqMarketOpen(date) : isTaiwanMarketOpen(date)) ? "open" : "closed";
};

const documentVisibilityListeners = new Set<() => void>();
const readDocumentVisibility = () =>
  typeof document === "undefined" || document.visibilityState === "visible";
const notifyDocumentVisibility = () => {
  documentVisibilityListeners.forEach((listener) => listener());
};
const subscribeDocumentVisibility = (listener: () => void) => {
  documentVisibilityListeners.add(listener);
  if (documentVisibilityListeners.size === 1 && typeof document !== "undefined") {
    document.addEventListener("visibilitychange", notifyDocumentVisibility);
  }
  return () => {
    documentVisibilityListeners.delete(listener);
    if (documentVisibilityListeners.size === 0 && typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", notifyDocumentVisibility);
    }
  };
};

export const useDocumentVisibility = () => {
  return useSyncExternalStore(subscribeDocumentVisibility, readDocumentVisibility, () => true);
};
export const useMarketSession = (symbol: string, marketGroup?: string) => {
  const documentVisible = useDocumentVisibility();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!documentVisible) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [documentVisible]);
  return marketSessionForSymbol(symbol, new Date(now), marketGroup);
};
export const useFreshnessNow = (updatedAt: number | undefined, staleAfterMs: number, session: MarketSession) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { if (!updatedAt || session !== "open") return; const delay = Math.max(0, updatedAt + staleAfterMs - Date.now()); const timer = window.setTimeout(() => setNow(Date.now()), delay); return () => window.clearTimeout(timer); }, [updatedAt, staleAfterMs, session]);
  return now;
};
