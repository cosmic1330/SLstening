import { dateFormat } from "@ch20026103/anysis";
import { Mode } from "@ch20026103/anysis/dist/esm/stockSkills/utils/dateFormat";
import { fetch } from "@tauri-apps/plugin-http";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import pLimit from "p-limit";
import { useCallback, useContext, useMemo, useRef, useState } from "react";
import StockDataManager from "../classes/StockDataManager";
import { DatabaseContext } from "../context/DatabaseContext";
import useStocksStore, { StockField } from "../store/Stock.store";

export enum Status {
  Download = "Download",
  SaveDB = "SaveDB",
  Idle = "Idle",
}
export default function useHighConcurrencyDeals(LIMIT: number = 10) {
  const [errorCount, setErrorCount] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [count, setCount] = useState(0);
  const [status, setStatus] = useState(Status.Idle);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { db } = useContext(DatabaseContext);
  const { menu } = useStocksStore();

  // 包裝請求並追蹤進度
  const wrappedFetch = useCallback(
    async (signal: AbortSignal, stock: StockField) => {
      try {
        const response = await fetch(
          `https://tw.quote.finance.yahoo.net/quote/q?type=ta&perd=d&mkt=10&sym=${stock.id}&v=1&callback=`,
          { method: "GET", signal }
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const text = await response.text();
        const ta_index = text.indexOf('"ta":');
        if (ta_index === -1) {
          throw new Error("Invalid response format");
        }
        const json_ta = "{" + text.slice(ta_index).replace(");", "");
        const parse = JSON.parse(json_ta);
        const ta = parse.ta;
        setCompleted((prev) => prev + 1);
        return { ta, stock };
      } catch (error: any) {
        console.error(error);
        if (error?.message?.indexOf("Request canceled") == -1) {
          setErrorCount((prev) => prev + 1); // 記錄失敗數量
        }
        throw error;
      }
    },
    []
  );

  const fetchData = useCallback(async () => {
    if(status !== Status.Idle) return;
    // 取消之前的請求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setStatus(Status.Download);
    try {
      if (!db) {
        throw new Error("Database not initialized");
      }
      setCompleted(() => 0);
      setErrorCount(() => 0);
      // 為新的請求創建一個新的 AbortController
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      const { signal } = abortController;
      const limit = pLimit(LIMIT);
      if (menu.length === 0) {
        throw new Error("Menu is empty or not loaded correctly");
      }

      const result = await Promise.all(
        menu.map((stock) => limit(() => wrappedFetch(signal, stock)))
      );

      // 清空資料表
      await db.execute("DELETE FROM weekly_skills;");
      await db.execute("DELETE FROM weekly_deal;");
      await db.execute("DELETE FROM skills;");
      await db.execute("DELETE FROM daily_deal;");
      await db.execute("DELETE FROM stock;");

      setStatus(Status.SaveDB);
      for (let i = 0; i < result.length; i++) {
        const { ta, stock } = result[i];
        const stockDataManager = new StockDataManager(ta, db, stock);
        await stockDataManager.saveStockTable();
        await stockDataManager.dailyProcessor();
        await stockDataManager.weeklyProcessor();
        setCount((prev) => prev + 1);
      }

      // 通知使用者更新完成
      let permissionGranted = await isPermissionGranted();
      if (!permissionGranted) {
        const permission = await requestPermission();
        permissionGranted = permission === "granted";
      }
      if (permissionGranted) {
        sendNotification({
          title: "Update Deals & Skills",
          body: `Completed: ${completed}, Error: ${errorCount}. Update Success ! 🎉 `,
        });
      }

      localStorage.setItem(
        "slitenting-sqliteUpdateDate",
        dateFormat(new Date().getTime(), Mode.TimeStampToString)
      );
    } catch (error) {
      console.error(error);
    }
    setStatus(Status.Idle);
  }, [db, wrappedFetch, menu, status]);

  const update = useCallback(() => {
    fetchData();
  }, [fetchData]);

  const persent = useMemo(() => {
    if (completed === 0) {
      return 0;
    }
    return Math.round(((completed + errorCount) / menu.length) * 100);
  }, [completed, menu]);

  return { update, persent, count, status };
}
