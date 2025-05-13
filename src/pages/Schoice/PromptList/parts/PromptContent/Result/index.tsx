import { dateFormat } from "@ch20026103/anysis";
import { Mode } from "@ch20026103/anysis/dist/esm/stockSkills/utils/dateFormat";
import { Box, Typography } from "@mui/material";
import { useCallback, useContext, useEffect, useState } from "react";
import { stockDailyQueryBuilder } from "../../../../../../classes/StockDailyQueryBuilder";
import { stockHourlyQueryBuilder } from "../../../../../../classes/StockHourlyQueryBuilder";
import { stockWeeklyQueryBuilder } from "../../../../../../classes/StockWeeklyQueryBuilder";
import ResultTable from "../../../../../../components/ResultTable/ResultTable";
import { DatabaseContext } from "../../../../../../context/DatabaseContext";
import useSchoiceStore from "../../../../../../store/Schoice.store";
import { PromptType, PromptValue } from "../../../../../../types";
import { error } from "@tauri-apps/plugin-log";

export default function Result({
  select,
}: {
  select: {
    id: string;
    name: string;
    value: PromptValue;
    type: PromptType;
  };
}) {
  const { db, dates } = useContext(DatabaseContext);
  const { todayDate } = useSchoiceStore();

  const [result, setResult] = useState<any[]>([]);

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

  const run = useCallback(async () => {
    if (!select) return;
    if (
      select.value.daily.length === 0 &&
      select.value.weekly.length === 0 &&
      select.value.hourly.length === 0
    ) {
      setResult([]);
      return;
    }

    let dailySQL = "";
    if (select.value.daily.length > 0) {
      const customDailyConditions = select.value.daily.map((prompt) =>
        stockDailyQueryBuilder.generateExpression(prompt).join(" ")
      );
      const sqlDailyQuery = stockDailyQueryBuilder.generateSqlQuery({
        conditions: customDailyConditions,
        dates: dates.filter((_, index) => index >= todayDate),
      });
      dailySQL = sqlDailyQuery;
    }

    let weeklySQL = "";
    if (select.value.weekly.length > 0) {
      const customWeeklyConditions = select.value.weekly.map((prompt) =>
        stockWeeklyQueryBuilder.generateExpression(prompt).join(" ")
      );
      const weeklyDateResults = await getWeekDates(dates[todayDate]);
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
      const hourlyDateResults = await getHourDates(dates[todayDate]);
      if (hourlyDateResults) {
        const sqlHourlyQuery = stockHourlyQueryBuilder.generateSqlQuery({
          conditions: customHourlyConditions,
          dates: hourlyDateResults.map((result) => result.ts),
        });
        hourlySQL = sqlHourlyQuery;
      }
    }

    // 合併查詢
    const combinedSQL = [dailySQL, weeklySQL, hourlySQL]
      .filter((sql) => sql)
      .join("\nINTERSECT\n");
    query(combinedSQL).then((res: { stock_id: string }[] | undefined) => {
      if (res) {
        const sql = `SELECT * FROM daily_deal 
        JOIN fundamental ON daily_deal.stock_id = fundamental.stock_id 
        JOIN stock ON daily_deal.stock_id = stock.id 
        WHERE t="${dates[todayDate]}" 
        AND daily_deal.stock_id IN ('${res
          .map((r) => r.stock_id)
          .join("','")}')`;
        query(sql).then((result) => {
          if (result) setResult(result);
        });
      }
    });
  }, [dates, select, query, todayDate]);

  useEffect(() => {
    run();
  }, [run]);

  return result ? (
    <Box width="100%">
      <Typography variant="subtitle2" sx={{ mb: 2 }}>
        符合策略結果共 {result.length} 筆
      </Typography>
      <ResultTable {...{ result }} />
    </Box>
  ) : (
    "讀取中..."
  );
}
