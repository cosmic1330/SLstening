import { dateFormat } from "@ch20026103/anysis";
import { Mode } from "@ch20026103/anysis/dist/esm/stockSkills/utils/dateFormat";
import { fetch } from "@tauri-apps/plugin-http";
import { error, info } from "@tauri-apps/plugin-log";
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

type StockFundamentals = {
  PE: string; // 本益比 (Price to Earnings Ratio)
  PB: string; // 股價淨值比 (Price to Book Ratio)
  CashYield: string; // 現金殖利率（最新年度）
  CashYield3Y: string; // 現金殖利率（近三年平均）
  CashYield5Y: string; // 現金殖利率（近五年平均）
};

type StockProfile = {
  ticker_name: string; // 股票代號與名稱（如 "1524 耿鼎"）
  ticker: string; // 股票代號（如 "1524"）
  name: string; // 公司名稱
  local_lang_name: string; // 本地語系公司名稱
  category: string; // 所屬產業類別（如 "汽車"）
  subcategory: string; // 子類別（如 COMMON、ETF 等）
  stock_exchange: string; // 交易所代號（如 "twse"）
  listing_status: "listed" | "delisted"; // 上市狀態
  latest_closing_price: string; // 含日期的收盤資訊（如 "2025-04-29 34.4"）
  latest_close_price: number; // 最新收盤價
  latest_close_price_date: string; // 最新收盤價日期（"YYYY-MM-DD"）
  latest_close_price_diff: number; // 與前一日的價格差
  latest_close_price_diff_pct: number; // 價格變動百分比
  main_business: string; // 主要營業項目
  acw: string; // 未知欄位（可能為內部代號或行業分類）
  chairman: string; // 董事長
  ceo: string; // 執行長
  latest_yoy_monthly_revenue: string; // 最新單月營收年增率（%）
  latest_eps4q: string; // 近四季 EPS（每股盈餘）
  latest_roe4q: string; // 近四季 ROE（股東權益報酬率）
  stock_id: number; // 系統內部用的股票 ID
  country: string; // 國家代號（如 "tw"）
  website_url: string; // 公司網站網址
};

export default function useHighConcurrencyDeals() {
  const { handleDownloadMenu } = useDownloadStocks();
  const [downloaded, setDownloaded] = useState(0);
  const [status, setStatus] = useState(Status.Idle);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { db, fetchDates, dates } = useContext(DatabaseContext);
  const { menu } = useStocksStore();
  const { changeSqliteUpdateDate, changeDataCount } = useSchoiceStore();

  const getFundamentalFetch = useCallback(
    async (
      signal: AbortSignal,
      stock: StockStoreType,
      sqliteDataManager: SqliteDataManager
    ) => {
      try {
        const year = new Date().getFullYear();
        const response = await fetch(
          `https://statementdog.com/api/v2/fundamentals/${stock.id}/${year}/${year}/cf`,
          {
            method: "GET",
            signal,
          }
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const json = await response.json();
        const { LatestValuation, StockInfo } = json.common;
        const LatestValuationData = LatestValuation.data as StockFundamentals;
        const StockInfoData = StockInfo.data as StockProfile;
        await sqliteDataManager.saveFundamentalTable({
          stock_id: stock.id,
          pe: parseFloat(LatestValuationData.PE),
          pb: parseFloat(LatestValuationData.PB),
          dividend_yield: parseFloat(LatestValuationData.CashYield),
          yoy: parseFloat(StockInfoData.latest_yoy_monthly_revenue),
          eps: parseFloat(StockInfoData.latest_eps4q),
          dividend_yield_3y: parseFloat(LatestValuationData.CashYield3Y),
          dividend_yield_5y: parseFloat(LatestValuationData.CashYield5Y),
        });
        return true;
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
      info("Database not initialized");
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
      // case 1-3: 寫入基本面資料
      // case 1-3: 寫入交易資料+
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
          getFundamentalFetch(signal, stock, sqliteDataManager),
        ]);
        setDownloaded((prev) => prev + 1);
        changeDataCount(i + 1);
      } catch (e) {
        error(`Error fetching data for stock ${stock.id}: ${e}`);
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
