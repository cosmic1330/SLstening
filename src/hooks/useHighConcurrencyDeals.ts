import { Boll, dateFormat, Kd, Ma, Macd, Obv, Rsi } from "@ch20026103/anysis";
import { Mode } from "@ch20026103/anysis/dist/esm/stockSkills/utils/dateFormat";
import { fetch } from "@tauri-apps/plugin-http";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import pLimit from "p-limit";
import { useCallback, useContext, useMemo, useRef, useState } from "react";
import { DatabaseContext } from "../context/DatabaseContext";
import useStocksStore, { StockField } from "../store/Stock.store";
export default function useHighConcurrencyDeals(LIMIT: number = 10) {
  const [errorCount, setErrorCount] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [loading, setLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { db } = useContext(DatabaseContext);
  const { update_sqlite_update_date, menu } = useStocksStore();

  const addData = useCallback(
    async (stock: StockField, ta: any) => {
      try {
        const boll = new Boll();
        const ma = new Ma();
        const macd = new Macd();
        const kd = new Kd();
        const rsi = new Rsi();
        const obv = new Obv();
        // 寫入第一筆資料
        const init = ta[0];
        let t = dateFormat(init.t, Mode.NumberToString);
        let ma5_data = ma.init(init, 5);
        let ma10_data = ma.init(init, 10);
        let ma20_data = ma.init(init, 20);
        let ma60_data = ma.init(init, 60);
        let ma120_data = ma.init(init, 120);
        let boll_data = boll.init(init);
        let macd_data = macd.init(init);
        let kd_data = kd.init(init, 9);
        let rsi5_data = rsi.init(init, 5);
        let rsi10_data = rsi.init(init, 10);
        let obv_data = obv.init(init, 5);

        if (!db) {
          throw new Error("Database not initialized");
        }
        await db.execute(
          "INSERT INTO stock (id, name, industry_group, market_type) VALUES ($1, $2, $3, $4)",
          [stock.id, stock.name, stock.group, stock.type]
        );
        await db.execute(
          "INSERT INTO daily_deal (stock_id, t, c, o, h, l, v) VALUES ($1, $2, $3, $4, $5, $6, $7)",
          [stock.id, t, init.c, init.o, init.h, init.l, init.v]
        );
        await db.execute(
          `INSERT INTO skills (stock_id,
          t,
          ma5,
          ma5_ded,
          ma10,
          ma10_ded,
          ma20,
          ma20_ded,
          ma60,
          ma60_ded,
          ma120,
          ma120_ded,
          macd,
          dif,
          osc,
          k,
          d,
          rsi5,
          rsi10,
          bollUb,
          bollMa,
          bollLb,
          obv,
          obv5) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)`,
          [
            stock.id,
            t,
            ma5_data.ma,
            ma5_data.exclusionValue.d,
            ma10_data.ma,
            ma10_data.exclusionValue.d,
            ma20_data.ma,
            ma20_data.exclusionValue.d,
            ma60_data.ma,
            ma60_data.exclusionValue.d,
            ma120_data.ma,
            ma120_data.exclusionValue.d,
            macd_data.macd,
            macd_data.dif[macd_data.dif.length - 1] || 0,
            macd_data.osc,
            kd_data.k,
            kd_data.d,
            rsi5_data.rsi,
            rsi10_data.rsi,
            boll_data.bollUb,
            boll_data.bollMa,
            boll_data.bollLb,
            obv_data.obv,
            obv_data.obvMa,
          ]
        );
        // 逐筆寫入資料
        for (let i = 1; i < ta.length; i++) {
          const value = ta[i];
          t = dateFormat(value.t, Mode.NumberToString);
          ma5_data = ma.next(value, ma5_data, 5);
          ma10_data = ma.next(value, ma10_data, 10);
          ma20_data = ma.next(value, ma20_data, 20);
          ma60_data = ma.next(value, ma60_data, 60);
          ma120_data = ma.next(value, ma120_data, 120);
          boll_data = boll.next(value, boll_data, 20);
          macd_data = macd.next(value, macd_data);
          kd_data = kd.next(value, kd_data, 9);
          rsi5_data = rsi.next(value, rsi5_data, 5);
          rsi10_data = rsi.next(value, rsi10_data, 10);
          obv_data = obv.next(value, obv_data, 5);

          // 將資料寫入資料庫
          await db.execute(
            "INSERT INTO daily_deal (stock_id, t, c, o, h, l, v) VALUES ($1, $2, $3, $4, $5, $6, $7)",
            [stock.id, t, value.c, value.o, value.h, value.l, value.v]
          );
          await db.execute(
            `INSERT INTO skills (stock_id,
          t,
          ma5,
          ma5_ded,
          ma10,
          ma10_ded,
          ma20,
          ma20_ded,
          ma60,
          ma60_ded,
          ma120,
          ma120_ded,
          macd,
          dif,
          osc,
          k,
          d,
          rsi5,
          rsi10,
          bollUb,
          bollMa,
          bollLb,
          obv,
          obv5) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)`,
            [
              stock.id,
              t,
              ma5_data.ma,
              ma5_data.exclusionValue.d,
              ma10_data.ma,
              ma10_data.exclusionValue.d,
              ma20_data.ma,
              ma20_data.exclusionValue.d,
              ma60_data.ma,
              ma60_data.exclusionValue.d,
              ma120_data.ma,
              ma120_data.exclusionValue.d,
              macd_data.macd,
              macd_data.dif[macd_data.dif.length - 1] || 0,
              macd_data.osc,
              kd_data.k,
              kd_data.d,
              rsi5_data.rsi,
              rsi10_data.rsi,
              boll_data.bollUb,
              boll_data.bollMa,
              boll_data.bollLb,
              obv_data.obv,
              obv_data.obvMa,
            ]
          );
        }
      } catch (error) {
        console.error(error);
        throw error;
      }
    },
    [db]
  );

  // 包裝請求並追蹤進度
  const wrappedFetch = useCallback(
    async (url: string, signal: AbortSignal, stock: StockField) => {
      try {
        const response = await fetch(url, { method: "GET", signal });
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
    // 取消之前的請求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setLoading(true);
    try {
      if (!db) {
        throw new Error("Database not initialized");
      }
      await db.execute("DELETE FROM skills;");
      await db.execute("DELETE FROM daily_deal;");
      await db.execute("DELETE FROM stock;");
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
        menu.map((stock) =>
          limit(() =>
            wrappedFetch(
              `https://tw.quote.finance.yahoo.net/quote/q?type=ta&perd=d&mkt=10&sym=${stock.id}&v=1&callback=`,
              signal,
              stock
            )
          )
        )
      );
      for (let i = 0; i < result.length; i++) {
        const { ta, stock } = result[i];
        await addData(stock, ta);
        console.log(`Completed: ${i + 1}/${menu.length}`);
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
      update_sqlite_update_date(
        dateFormat(new Date().getTime(), Mode.TimeStampToString)
      );
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  }, [db, update_sqlite_update_date, wrappedFetch, menu]);

  const update = useCallback(() => {
    fetchData();
  }, [fetchData]);

  const persent = useMemo(() => {
    if (completed === 0) {
      return 0;
    }
    return Math.round(((completed + errorCount) / menu.length) * 100);
  }, [completed, menu]);

  return { update, loading, persent };
}
