import { dateFormat } from "@ch20026103/anysis";
import { Mode } from "@ch20026103/anysis/dist/esm/stockSkills/utils/dateFormat";
import { fetch } from "@tauri-apps/plugin-http";
import { useCallback, useContext, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import SqliteDataManager from "../classes/SqliteDataManager";
import { DatabaseContext } from "../context/DatabaseContext";
import useSchoiceStore from "../store/Schoice.store";
import useStocksStore from "../store/Stock.store";
import {
  DealTableOptions,
  SkillsTableOptions,
  StockStoreType,
  TaType,
  TimeSharingDealTableOptions,
  TimeSharingSkillsTableOptions,
} from "../types";
import generateDealDataDownloadUrl, {
  UrlTaPerdOptions,
  UrlType,
} from "../utils/generateDealDataDownloadUrl";
import useDownloadStocks from "./useDownloadStocks";

export enum Status {
  Download = "Download",
  Idle = "Idle",
}

export default function useHighConcurrencyDeals() {
  const { handleDownloadMenu } = useDownloadStocks();
  const [downloaded, setDownloaded] = useState(0);
  const [status, setStatus] = useState(Status.Idle);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { db, fetchDates, dates } = useContext(DatabaseContext);
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
          {
            method: "GET",
            signal,
          }
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

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    sessionStorage.setItem("schoice:update:stop", "true");
  }, [abortControllerRef.current]);

  const run = useCallback(async () => {
    if (status !== Status.Idle) return;
    // case pre:取消之前的請求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (sessionStorage.getItem("schoice:update:stop") === "true") {
      sessionStorage.removeItem("schoice:update:stop");
    }
    setStatus(Status.Download);
    if (!db) {
      console.log("Database not initialized");
      return;
    }

    // case 1-1: 移除大於第二筆日期的資料(刪除最後一筆資料)
    const sqliteDataManager = new SqliteDataManager(db);
    sqliteDataManager.deleteLatestDailyDeal(dates[1]);

    setDownloaded(() => 0);
    // case 1-2: 為新的請求創建一個新的 AbortController
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const { signal } = abortController;
    if (menu.length === 0) {
      await handleDownloadMenu();
    }

    changeDataCount(0);
    for (let i = 0; i < menu.length; i++) {
      if (sessionStorage.getItem("schoice:update:stop") === "true") {
        break;
      }
      const stock = menu[i];
      // case 1-3: 寫入股票代號資料
      try {
        await sqliteDataManager.saveStockTable(stock);
      } catch (error) {}
      // case 1-3: 寫入交易資料
      try {
        // daily
        const daily = await getTaFetch(signal, stock, UrlTaPerdOptions.Day);
        const daily_date = daily.map((item) =>
          dateFormat(item.t, Mode.NumberToString)
        );
        const sqlite_daily_deal = await sqliteDataManager.getStockDates(
          stock,
          DealTableOptions.DailyDeal
        );
        const sqlite_daily_deal_date_set = new Set(
          sqlite_daily_deal.map((item) => item.t)
        );
        const sqlite_daily_skills = await sqliteDataManager.getStockDates(
          stock,
          SkillsTableOptions.DailySkills
        );
        const sqlite_daily_skills_date_set = new Set(
          sqlite_daily_skills.map((item) => item.t)
        );
        const lose_daily_deal_set = new Set(
          daily_date.filter((item) => !sqlite_daily_deal_date_set.has(item))
        );
        const lose_daily_skills_set = new Set(
          daily_date.filter((item) => !sqlite_daily_skills_date_set.has(item))
        );
        // weekly
        const weekly = await getTaFetch(signal, stock, UrlTaPerdOptions.Week);
        const weekly_date = weekly.map((item) =>
          dateFormat(item.t, Mode.NumberToString)
        );
        const sqlite_weekly_deal = await sqliteDataManager.getStockDates(
          stock,
          DealTableOptions.WeeklyDeal
        );
        const sqlite_weekly_deal_date_set = new Set(
          sqlite_weekly_deal.map((item) => item.t)
        );
        const sqlite_weekly_skills = await sqliteDataManager.getStockDates(
          stock,
          SkillsTableOptions.WeeklySkills
        );
        const sqlite_weekly_skills_date_set = new Set(
          sqlite_weekly_skills.map((item) => item.t)
        );
        const lose_weekly_deal_set = new Set(
          weekly_date.filter((item) => !sqlite_weekly_deal_date_set.has(item))
        );
        const lose_weekly_skills_set = new Set(
          weekly_date.filter((item) => !sqlite_weekly_skills_date_set.has(item))
        );
        // hourly
        const hourly = await getTaFetch(signal, stock, UrlTaPerdOptions.Hour);
        const hourly_date = hourly.map((item) => item.t);
        const sqlite_hourly_deal = await sqliteDataManager.getStockTimeSharing(
          stock,
          TimeSharingDealTableOptions.HourlyDeal
        );
        const sqlite_hourly_deal_date_set = new Set(
          sqlite_hourly_deal.map((item) => item.ts)
        );
        const sqlite_hourly_skills =
          await sqliteDataManager.getStockTimeSharing(
            stock,
            TimeSharingSkillsTableOptions.HourlySkills
          );
        const sqlite_hourly_skills_date_set = new Set(
          sqlite_hourly_skills.map((item) => item.ts)
        );
        const lose_hourly_deal_set = new Set(
          hourly_date.filter((item) => !sqlite_hourly_deal_date_set.has(item))
        );
        const lose_hourly_skills_set = new Set(
          hourly_date.filter((item) => !sqlite_hourly_skills_date_set.has(item))
        );

        await Promise.all([
          sqliteDataManager.processor(
            daily,
            stock,
            {
              dealType: DealTableOptions.DailyDeal,
              skillsType: SkillsTableOptions.DailySkills,
            },
            {
              lose_deal_set: lose_daily_deal_set,
              lose_skills_set: lose_daily_skills_set,
            }
          ),
          sqliteDataManager.processor(
            weekly,
            stock,
            {
              dealType: DealTableOptions.WeeklyDeal,
              skillsType: SkillsTableOptions.WeeklySkills,
            },
            {
              lose_deal_set: lose_weekly_deal_set,
              lose_skills_set: lose_weekly_skills_set,
            }
          ),
          sqliteDataManager.timeSharingProcessor(
            hourly,
            stock,
            {
              dealType: TimeSharingDealTableOptions.HourlyDeal,
              skillsType: TimeSharingSkillsTableOptions.HourlySkills,
            },
            {
              lose_deal_set: lose_hourly_deal_set,
              lose_skills_set: lose_hourly_skills_set,
            }
          ),
        ]);
        setDownloaded((prev) => prev + 1);
        changeDataCount(i + 1);
      } catch (error) {
        console.log(error);
      }
    }

    changeSqliteUpdateDate(
      dateFormat(new Date().getTime(), Mode.TimeStampToString)
    );
    toast.success("Update Success ! 🎉");
    if (fetchDates) fetchDates();

    setStatus(Status.Idle);
  }, [db, menu, status, dates, fetchDates]);

  const persent = useMemo(() => {
    if (downloaded === 0) return 0;
    return Math.round((downloaded / menu.length) * 100);
  }, [downloaded, menu]);

  return { run, persent, stop, status };
}
