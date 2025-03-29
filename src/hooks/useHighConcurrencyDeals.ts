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
import DatabaseController from "../classes/DatabaseController";
import StockDataManager from "../classes/StockDataManager";
import { DatabaseContext } from "../context/DatabaseContext";
import useSchoiceStore from "../store/Schoice.store";
import useStocksStore from "../store/Stock.store";
import { StockStoreType, TaType } from "../types";
import generateDealDataDownloadUrl, {
  UrlTaPerdOptions,
  UrlType,
} from "../utils/generateDealDataDownloadUrl";
import useDownloadStocks from "./useDownloadStocks";

export enum Status {
  Download = "Download",
  SaveDB = "SaveDB",
  Idle = "Idle",
}

export default function useHighConcurrencyDeals(LIMIT: number = 10) {
  const { handleDownloadMenu } = useDownloadStocks();
  const [errorCount, setErrorCount] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [count, setCount] = useState(0);
  const [status, setStatus] = useState(Status.Idle);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { db } = useContext(DatabaseContext);
  const { menu } = useStocksStore();
  const { changeSqliteUpdateDate, changeDataCount } = useSchoiceStore();

  // 包裝請求並追蹤進度
  const wrappedFetch = useCallback(
    async (signal: AbortSignal, stock: StockStoreType) => {
      try {
        const response = await fetch(
          generateDealDataDownloadUrl({
            type: UrlType.Ta,
            id: stock.id,
            perd: UrlTaPerdOptions.Day,
          }),
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
        const ta = parse.ta as TaType;
        setCompleted((prev) => prev + 1);
        return { ta, stock };
      } catch (error: any) {
        if (error?.message?.indexOf("Request canceled") == -1) {
          throw error;
        } else {
          throw new Error("Cancel");
        }
      }
    },
    []
  );

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, [abortControllerRef.current]);

  const fetchData = useCallback(async () => {
    let record = 0;
    if (status !== Status.Idle) return;
    // 取消之前的請求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setStatus(Status.Download);
    try {
      if (!db) {
        throw new Error("Database not initialized");
      }

      // 清空資料表
      const databaseController = new DatabaseController(db);
      await databaseController.clearTable();

      setCompleted(() => 0);
      setErrorCount(() => 0);
      // 為新的請求創建一個新的 AbortController
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      const { signal } = abortController;
      const limit = pLimit(LIMIT);
      if (menu.length === 0) {
        await handleDownloadMenu();
      }

      const result = await Promise.all(
        menu.map((stock) => {
          const res = limit(() => wrappedFetch(signal, stock));
          setCount((prev) => prev + 1);
          return res;
        })
      ).catch((error) => {
        if (error?.message === "Cancel") {
          throw new Error("Cancel");
        }
        setErrorCount((prev) => prev + 1); // 記錄失敗數量
      });

      if (!result) return;
      setStatus(Status.SaveDB);
      changeSqliteUpdateDate(
        dateFormat(new Date().getTime(), Mode.TimeStampToString)
      );
      for (let i = 0; i < result.length; i++) {
        if (!result[i]) break;
        const { ta, stock } = result[i];
        if (sessionStorage.getItem("schoice:update:stop") === "true") {
          sessionStorage.removeItem("schoice:update:stop");
          throw new Error("Cancel");
        }
        const stockDataManager = new StockDataManager(ta, db, stock);
        await stockDataManager.saveStockTable();
        await stockDataManager.dailyProcessor();
        await stockDataManager.weeklyProcessor();
        record++;
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
          body: `Update Success ! 🎉 `,
        });
      }
    } catch (error) {
      if ((error as Error)?.message !== "Cancel") {
        console.log("Failed:" + (error as Error)?.message);
      }
    }
    changeDataCount(record);
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

  return { update, persent, count, stop, status };
}
