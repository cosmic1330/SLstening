import { dateFormat } from "@ch20026103/anysis";
import { Mode } from "@ch20026103/anysis/dist/esm/stockSkills/utils/dateFormat";
import { error } from "@tauri-apps/plugin-log";
import { useCallback, useContext } from "react";
import { stockDailyQueryBuilder } from "../../../classes/StockDailyQueryBuilder";
import { stockFundamentalQueryBuilder } from "../../../classes/StockFundamentalQueryBuilder";
import { stockHourlyQueryBuilder } from "../../../classes/StockHourlyQueryBuilder";
import { stockWeeklyQueryBuilder } from "../../../classes/StockWeeklyQueryBuilder";
import { DatabaseContext } from "../../../context/DatabaseContext";
import { PromptItem } from "../../../types";

export default function useBacktestFunc() {
  const { db, dates } = useContext(DatabaseContext);
  const query = useCallback(
    async (sqlQuery: string) => {
      try {
        if (!db) return;
        const res = (await db?.select(sqlQuery)) as any[];
        return res;
      } catch (e) {
        error(`Error executing query: ${e}`);
        return [];
      }
    },
    [db]
  );

  const getWeekDates = useCallback(
    async (date: string) => {
      try {
        const queryWeekDate = `
        WITH RECURSIVE dates AS (
          SELECT t
          FROM weekly_deal
          WHERE t <= "${date}"
          GROUP BY t
          ORDER BY t DESC
          LIMIT 4
        )
        SELECT t FROM dates
        ORDER BY t DESC;
      `;
        const weeklyDates = await query(queryWeekDate);
        return weeklyDates;
      } catch (error) {
        return [];
      }
    },
    [query]
  );

  const getHourDates = useCallback(
    async (date: string) => {
      try {
        const num = dateFormat(date, Mode.StringToNumber) * 10000 + 1400;
        // 取得明天的timestamp
        const queryHourDate = `
        SELECT DISTINCT ts
        FROM hourly_deal
        WHERE ts <= ${num}
        ORDER BY ts DESC
        LIMIT 24;
      `;
        const hourlyDates: { ts: number }[] | undefined = await query(
          queryHourDate
        );
        return hourlyDates || [];
      } catch (error) {
        return [];
      }
    },
    [query]
  );

  const get = useCallback(
    async (stockId: string, date: number, select: PromptItem) => {
      if (!select) return;
      if (
        select.value.daily.length === 0 &&
        select.value.weekly.length === 0 &&
        select.value.hourly.length === 0 &&
        select.value.fundamental.length === 0
      ) {
        return;
      }

      let dailySQL = "";
      const date_index = dates.findIndex(
        (d) => d === dateFormat(date, Mode.NumberToString)
      );
      if (date_index === -1) {
        console.error("Date not found in dates array:" + date);
        return;
      }
      if (select.value.daily.length > 0) {
        const customDailyConditions = select.value.daily.map((prompt) =>
          stockDailyQueryBuilder.generateExpression(prompt).join(" ")
        );
        const sqlDailyQuery = stockDailyQueryBuilder.generateSqlQuery({
          conditions: customDailyConditions,
          dates: dates.filter((_, index) => index >= date_index),
        });
        dailySQL = sqlDailyQuery;
      }

      let weeklySQL = "";
      if (select.value.weekly.length > 0) {
        const customWeeklyConditions = select.value.weekly.map((prompt) =>
          stockWeeklyQueryBuilder.generateExpression(prompt).join(" ")
        );
        const weeklyDateResults = await getWeekDates(dates[date_index]);
        if (weeklyDateResults) {
          const sqlWeeklyQuery = stockWeeklyQueryBuilder.generateSqlQuery({
            conditions: customWeeklyConditions,
            dates: weeklyDateResults.map((result) => result.t), // 直接傳入查詢到的週資料日期
            weeksRange: weeklyDateResults.length,
          });
          weeklySQL = sqlWeeklyQuery;
        }
      }

      let hourlySQL = "";
      if (select.value.hourly?.length > 0) {
        const customHourlyConditions = select.value.hourly.map((prompt) =>
          stockHourlyQueryBuilder.generateExpression(prompt).join(" ")
        );
        const hourlyDateResults = await getHourDates(dates[date_index]);
        if (hourlyDateResults) {
          const sqlHourlyQuery = stockHourlyQueryBuilder.generateSqlQuery({
            conditions: customHourlyConditions,
            dates: hourlyDateResults.map((result) => result.ts),
          });
          hourlySQL = sqlHourlyQuery;
        }
      }

      let fundamentalSQL = "";
      if (select.value.fundamental?.length > 0) {
        const customFundamentalConditions = select.value.fundamental.map(
          (prompt) =>
            stockFundamentalQueryBuilder.generateExpression(prompt).join(" ")
        );
        fundamentalSQL = stockFundamentalQueryBuilder.generateSqlQuery({
          conditions: customFundamentalConditions,
        });
      }

      // 合併查詢
      const combinedSQL = [dailySQL, weeklySQL, hourlySQL, fundamentalSQL]
        .filter((sql) => sql)
        .join("\nINTERSECT\n");
      const res: { stock_id: string }[] | undefined = await query(combinedSQL);
      const finded = res?.find((r) => r.stock_id === stockId);
      if (finded) {
        const sql = `SELECT * FROM daily_deal WHERE t="${dates[date_index]}" AND daily_deal.stock_id = "${stockId}"`;
        const a = await query(sql);
        if (a && a.length > 0) {
          return a[0];
        }
      }
      return null;
    },
    [dates, query]
  );

  return get;
}
