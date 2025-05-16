import { dateFormat } from "@ch20026103/anysis";
import { Mode } from "@ch20026103/anysis/dist/esm/stockSkills/utils/dateFormat";
import { useCallback, useContext, useRef } from "react";
import { stockDailyQueryBuilder } from "../../../classes/StockDailyQueryBuilder";
import { stockHourlyQueryBuilder } from "../../../classes/StockHourlyQueryBuilder";
import { stockWeeklyQueryBuilder } from "../../../classes/StockWeeklyQueryBuilder";
import { DatabaseContext } from "../../../context/DatabaseContext";
import { PromptItem } from "../../../types";
import useDatabaseQuery from "../../../hooks/useDatabaseQuery";
import { StockType } from "@ch20026103/anysis/dist/esm/stockSkills/types";

export default function useBacktestFunc() {
  const { dates } = useContext(DatabaseContext);
  const data_memory = useRef<{
    date?: number;
    data?: { [stock_id: string]: StockType };
  }>({ date: undefined, data: {} });
  const buy_memory = useRef<string[]>([]);
  const sell_memory = useRef<string[]>([]);
  const query = useDatabaseQuery();

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
    async (
      stockId: string,
      date: number,
      inWait: boolean,
      { select, type }: { select: PromptItem; type: string }
    ): Promise<StockType | null> => {
      if (!select) return null;
      if (
        select.value.daily.length === 0 &&
        select.value.weekly.length === 0 &&
        select.value.hourly.length === 0
      ) {
        return null;
      }

      if (data_memory.current.date === date) {
        if (type === "buy" && buy_memory.current.includes(stockId)) {
          const data = data_memory.current.data;
          if (data && data[stockId]) {
            return data_memory.current.data?.[stockId] ?? null;
          }
        } else if (type === "sell" && sell_memory.current.includes(stockId)) {
          const data = data_memory.current.data;
          if (data && (data[stockId] || inWait)) {
            return data_memory.current.data?.[stockId] ?? null;
          }
        }
        return null;
      }

      let dailySQL = "";
      const date_index = dates.findIndex(
        (d) => d === dateFormat(date, Mode.NumberToString)
      );
      if (date_index === -1) {
        console.error("Date not found in dates array:" + date);
        return null;
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

      // 取得今日資料
      const sql = `SELECT * FROM daily_deal WHERE t="${dates[date_index]}"`;
      const stocks_data = await query(sql);
      if (stocks_data) {
        const data = stocks_data.reduce((acc, cur) => {
          acc[cur.stock_id] = cur;
          return acc;
        }, {} as { [stock_id: string]: { stock_id: string } });
        data_memory.current = { date, data };
      } else {
        data_memory.current = { date, data: {} }; // 保證 data 不為 undefined
      }

      // 合併查詢
      const memory = type === "buy" ? buy_memory : sell_memory;
      const combinedSQL = [dailySQL, weeklySQL, hourlySQL]
        .filter((sql) => sql)
        .join("\nINTERSECT\n");
      const res: { stock_id: string }[] | undefined = await query(combinedSQL);
      if (res) {
        memory.current = res.map((item) => item.stock_id);
        return data_memory.current.data?.[stockId] ?? null; // 保證回傳 null
      }
      return null;
    },
    [dates, query]
  );

  return get;
}
