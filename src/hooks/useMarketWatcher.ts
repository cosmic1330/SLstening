import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import useMarketDataStore from "../store/MarketData.store";
import { TickDealsType } from "../types";

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

    const setupListener = async () => {
      unlisten = await listen<MarketEventPayload>("market-update", (event) => {
        const { type, payload } = event.payload;

        if (type === "Tick") {
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
    };

    setupListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, [updateTick]);
}
