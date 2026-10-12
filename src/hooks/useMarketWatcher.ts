import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import useMarketDataStore from "../store/MarketData.store";
import { TickDealsType } from "../types";
import { getFrontendSubscriberCount } from "./useMarketSubscriber";

// Rust 端傳過來的 Event 結構
interface MarketEventPayload {
  type: "Tick" | "Indicators";
  payload: any;
}

/**
 * useMarketWatcher Hook
 * 全域監聽來自 Rust 的 'market-update' 事件。
 * 應在 App.tsx 或其他高層級組件中僅載入一次。
 */
export default function useMarketWatcher() {
  const updateTick = useMarketDataStore((state) => state.updateTick);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let disposed = false;
    let listenerRemoved = false;

    const removeListener = () => {
      if (!unlisten || listenerRemoved) return;

      listenerRemoved = true;
      unlisten();
    };

    const setupListener = async () => {
      try {
        unlisten = await listen<MarketEventPayload>("market-update", (event) => {
          const { type, payload } = event.payload;

          if (type === "Tick") {
            // Native polling can finish after the last card unsubscribed. Do
            // not let that delayed event resurrect a long-lived tick entry;
            // one-shot marketApi fallback requests write directly to the
            // store and do not pass through this event path.
            if (typeof payload?.id !== "string" || getFrontendSubscriberCount(payload.id) <= 0) return;
            // 將 Rust 端的 MarketTick 轉換為前端的 TickDealsType
            const tick: TickDealsType = {
              id: payload.id,
              name: (payload.name && payload.name !== "null") ? payload.name : undefined,
              price: payload.price,
              changePercent: payload.change_percent,
              ts: payload.refreshed_ts,
              closes: payload.closes,
              avgPrices: payload.avg_prices,
              previousClose: payload.previous_close,
              timestamps: payload.timestamps,
              volume: payload.volume || undefined,
            };
            updateTick(tick);
          } else if (type === "Indicators") {
            // 下一階段實作
            console.log("Indicators update received:", payload.id);
          }
        });

        if (disposed) removeListener();
      } catch {
        // Native event registration can fail while a webview is closing. The
        // effect has no recovery action, but the rejection must not escape.
      }
    };

    void setupListener();

    return () => {
      disposed = true;
      removeListener();
    };
  }, [updateTick]);
}
