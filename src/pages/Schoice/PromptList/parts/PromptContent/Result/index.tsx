import { useCallback, useContext, useEffect, useState } from "react";
import { stockDailyQueryBuilder } from "../../../../../../classes/StockDailyQueryBuilder";
import { stockWeeklyQueryBuilder } from "../../../../../../classes/StockWeeklyQueryBuilder";
import { DatabaseContext } from "../../../../../../context/DatabaseContext";
import useSchoiceStore, {
  Prompts,
  PromptType,
} from "../../../../../../store/Schoice.store";
import ResultTable from "../../../../../../components/ResultTable/ResultTable";

export default function Result({
  select,
}: {
  select: {
    id: string;
    name: string;
    value: {
      daily: Prompts;
      weekly: Prompts;
    };
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
      } catch (error) {
        console.error(error);
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

  const run = useCallback(async () => {
    if (!select) return;
    if (select.value.daily.length === 0 && select.value.weekly.length === 0) {
      setResult([]);
      return;
    }

    let dailySQL = "";
    if (select.value.daily.length > 0) {
      const customDailyConditions = select.value.daily.map((prompt) =>
        stockDailyQueryBuilder.generateExpression(prompt).join(" ")
      );
      const sqlDailyQuery = stockDailyQueryBuilder.generateSqlQuery({
        todayDate,
        conditions: customDailyConditions,
        dates: Object.values(dates),
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
    // 合併查詢
    const combinedSQL = [dailySQL, weeklySQL]
      .filter((sql) => sql)
      .join("\nINTERSECT\n");
    query(combinedSQL).then((res: { stock_id: string }[] | undefined) => {
      if (res) {
        const sql = `SELECT * FROM daily_deal JOIN stock ON daily_deal.stock_id = stock.id WHERE t="${
          dates[todayDate]
        }" AND stock_id IN ('${res.map((r) => r.stock_id).join("','")}')`;
        query(sql).then((result) => {
          if (result) setResult(result);
        });
      }
    });
  }, [dates, select, query, todayDate]);

  useEffect(() => {
    run();
  }, [run]);

  return result ? <ResultTable {...{ result }} /> : "讀取中...";
}
