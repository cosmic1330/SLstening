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
import SqliteDataManager from "../classes/SqliteDataManager";
import { DatabaseContext } from "../context/DatabaseContext";
import useSchoiceStore from "../store/Schoice.store";
import useStocksStore from "../store/Stock.store";
import {
  DealTableOptions,
  SkillsTableOptions,
  StockStoreType,
  TaType,
} from "../types";
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
  const [completed, setCompleted] = useState(0);
  const [status, setStatus] = useState(Status.Idle);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { db } = useContext(DatabaseContext);
  const { menu } = useStocksStore();
  const { changeSqliteUpdateDate, changeDataCount } = useSchoiceStore();

  const getTaFetch = useCallback(
    async (
      signal: AbortSignal,
      stock: StockStoreType,
      perd: UrlTaPerdOptions
    ) => {
      try {
        const response = await fetch(
          generateDealDataDownloadUrl({
            type: UrlType.Ta,
            id: stock.id,
            perd,
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
        return ta;
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

  // 包裝請求並追蹤進度
  const wrappedFetch = useCallback(
    async (signal: AbortSignal, stock: StockStoreType) => {
      try {
        const daily = await getTaFetch(signal, stock, UrlTaPerdOptions.Day);
        const weekly = await getTaFetch(signal, stock, UrlTaPerdOptions.Week);
        setCompleted((prev) => prev + 1);
        return { daily, weekly, stock };
      } catch (error) {
        setCompleted((prev) => prev + 1);
        if ((error as Error)?.message === "Cancel") {
          throw new Error("Cancel");
        }
        return null;
      }
    },
    [getTaFetch]
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

      setCompleted(() => 0);
      // 為新的請求創建一個新的 AbortController
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      const { signal } = abortController;
      const limit = pLimit(LIMIT);
      if (menu.length === 0) {
        await handleDownloadMenu();
      }

      const result = await Promise.all(
        menu.map((stock) => limit(() => wrappedFetch(signal, stock)))
      ).catch((error) => {
        if (error?.message === "Cancel") {
          throw new Error("Cancel");
        }
      });
      if (!result) return;

      //開始寫入資料庫
      const promiseList = [];
      setStatus(Status.SaveDB);
      changeSqliteUpdateDate(
        dateFormat(new Date().getTime(), Mode.TimeStampToString)
      );
      changeDataCount(0);
      // case 1-1: 直接寫入資料庫
      const sqliteDataManager = new SqliteDataManager(db);
      await sqliteDataManager.clearTable();

      // case 2-1: 轉換為 CSV 資料
      // const csvDataManager = new CsvDataManager();

      for (let i = 0; i < result.length; i++) {
        const data = result[i];
        if (!data) break;
        const { daily, weekly, stock } = data;
        if (sessionStorage.getItem("schoice:update:stop") === "true") {
          sessionStorage.removeItem("schoice:update:stop");
          throw new Error("Cancel");
        }

        // case 1-2: 直接Insert Sqlite
        await sqliteDataManager.saveStockTable(stock);
        promiseList.push(
          sqliteDataManager.processor(daily, stock, {
            dealType: DealTableOptions.DailyDeal,
            skillsType: SkillsTableOptions.DailySkills,
          }),
          sqliteDataManager.processor(weekly, stock, {
            dealType: DealTableOptions.WeeklyDeal,
            skillsType: SkillsTableOptions.WeeklySkills,
          })
          // 手動產生週資料
          // stockDataManager.weeklyProcessorByDailyData(daily, stock)
        );


        // case 2-2:  轉換為 CSV 資料
        // promiseList.push(
        //   csvDataManager.gererateDealCsvDataByTa(
        //     daily,
        //     stock,
        //     DealTableOptions.DailyDeal
        //   ),
        //   csvDataManager.gererateDealCsvDataByTa(
        //     weekly,
        //     stock,
        //     DealTableOptions.WeeklyDeal
        //   ),
        //   csvDataManager.gererateSkillsCsvDataByTa(
        //     daily,
        //     stock,
        //     SkillsTableOptions.DailySkills
        //   ),
        //   csvDataManager.gererateSkillsCsvDataByTa(
        //     weekly,
        //     stock,
        //     SkillsTableOptions.WeeklySkills
        //   ),
        // );

        record++;
        changeDataCount(record);
      }

      await Promise.all(promiseList);
      // case 2-3: 透過 Rust 產生 CSV 檔案
      // invoke("create_csv_from_json", {
      //   jsonData: JSON.stringify(csvDataManager.dailydeal),
      //   csvName: DealTableOptions.DailyDeal + ".csv",
      //   dataType: CsvDataType.Deal,
      // });
      // invoke("create_csv_from_json", {
      //   jsonData: JSON.stringify(csvDataManager.weeklydeal),
      //   csvName: DealTableOptions.WeeklyDeal + ".csv",
      //   dataType: CsvDataType.Deal,
      // });
      // invoke("create_csv_from_json", {
      //   jsonData: JSON.stringify(csvDataManager.dailyskills),
      //   csvName: SkillsTableOptions.DailySkills + ".csv",
      //   dataType: CsvDataType.Skills,
      // });
      // invoke("create_csv_fro－m_json", {
      //   jsonData: JSON.stringify(csvDataManager.weeklyskills),
      //   csvName: SkillsTableOptions.WeeklySkills + ".csv",
      //   dataType: CsvDataType.Skills,
      // });

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
    setStatus(Status.Idle);
  }, [db, wrappedFetch, menu, status]);

  const update = useCallback(() => {
    fetchData();
  }, [fetchData]);

  const persent = useMemo(() => {
    if (completed === 0) return 0;
    return Math.round((completed / menu.length) * 100);
  }, [completed, menu]);

  return { update, persent, stop, status };
}
