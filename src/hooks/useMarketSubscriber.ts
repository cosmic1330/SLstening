import { invoke } from "@tauri-apps/api/core";
import { useEffect } from "react";

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
  useEffect(() => {
    // 只有在啟用且可見時才真正對後端訂閱
    const shouldSubscribe = enabled && isVisible;

    if (shouldSubscribe) {
      invoke("subscribe_stock", { symbol: id }).catch((err) => {
        console.error(`Failed to subscribe to ${id}:`, err);
      });

      return () => {
        invoke("unsubscribe_stock", { symbol: id }).catch((err) => {
          console.error(`Failed to unsubscribe from ${id}:`, err);
        });
      };
    }
  }, [id, enabled, isVisible]);
}
