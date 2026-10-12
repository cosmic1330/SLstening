import { invoke } from "@tauri-apps/api/core";
import { useEffect } from "react";
import { reportHandledError } from "../diagnostics";
import useMarketDataStore from "../store/MarketData.store";
import { useDocumentVisibility } from "./useMarketSession";

/**
 * Keep the scroll debounce short enough for a visible card to join the
 * backend warm-up batch without letting every transient mount subscribe.
 */
export const MARKET_SUBSCRIPTION_DEBOUNCE_MS = 200;

// A symbol can be rendered by more than one surface at once (for example a
// watchlist card and an index card). Keep the frontend ownership count in
// addition to Rust's refcount so live data is cleared only after the final
// consumer has released it.
const frontendSubscriberCounts = new Map<string, number>();

const retainFrontendSubscriber = (symbol: string) => {
  frontendSubscriberCounts.set(symbol, (frontendSubscriberCounts.get(symbol) ?? 0) + 1);
};

const releaseFrontendSubscriber = (symbol: string) => {
  const next = (frontendSubscriberCounts.get(symbol) ?? 0) - 1;
  if (next > 0) {
    frontendSubscriberCounts.set(symbol, next);
    return;
  }
  frontendSubscriberCounts.delete(symbol);
  useMarketDataStore.getState().clearTick(symbol);
};

export const getFrontendSubscriberCount = (symbol: string) =>
  frontendSubscriberCounts.get(symbol) ?? 0;

/**
 * useMarketSubscriber Hook
 * 用於單個股票卡片的訂閱管理。
 * 當組件掛載並啟用監控時通知 Rust 後端開始跟蹤該股票。
 */
export default function useMarketSubscriber(
  id: string,
  enabled: boolean = true,
  isVisible: boolean = true,
) {
  const documentVisible = useDocumentVisibility();

  useEffect(() => {
    // 只有在啟用且可見時才真正對後端訂閱
    const shouldSubscribe = enabled && isVisible && documentVisible;

    if (shouldSubscribe) {
      let isSubscribed = false;
      let effectActive = true;
      // The backend coalesces symbols across this short visibility window.
      const timer = setTimeout(() => {
        if (!effectActive) return;
        console.log(`[Subscriber] Subscribing to: ${id}`);
        isSubscribed = true;
        retainFrontendSubscriber(id);
        invoke("subscribe_stock", { symbol: id }).catch((err) => {
          reportHandledError("market_subscribe", err, "MARKET_SUBSCRIBE_FAILED");
          if (isSubscribed) {
            isSubscribed = false;
            releaseFrontendSubscriber(id);
          }
        });
      }, MARKET_SUBSCRIPTION_DEBOUNCE_MS);

      return () => {
        effectActive = false;
        clearTimeout(timer);
        if (isSubscribed) {
          isSubscribed = false;
          console.log(`[Subscriber] Unsubscribing from: ${id}`);
          invoke("unsubscribe_stock", { symbol: id }).catch((err) => {
            reportHandledError("market_unsubscribe", err, "MARKET_UNSUBSCRIBE_FAILED");
          });
          releaseFrontendSubscriber(id);
        }
      };
    }
  }, [id, enabled, isVisible, documentVisible]);
}
