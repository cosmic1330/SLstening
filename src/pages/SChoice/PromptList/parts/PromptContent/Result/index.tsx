import { useCallback, useContext, useEffect, useState } from "react";
import { DatabaseContext } from "../../../../../../context/DatabaseContext";
import useSchoiceStore, {
  Prompts,
  PromptType,
} from "../../../../../../store/Schoice.store";
import generateExpression from "../../../../../../utils/generateExpression";
import generateSqlQuery from "../../../../../../utils/generateSqlQuery";
import ResultTable from "./ResultTable";

type DatabaseResult = {
  c: number;
  d: number;
  d1: number;
  k: number;
  k1: number;
  name: string;
  stock_id: string;
  t: string;
  type: string;
};

export default function Result({
  select,
}: {
  select: {
    id: string;
    name: string;
    value: Prompts;
    type: PromptType;
  };
}) {
  const { db, dates } = useContext(DatabaseContext);
  const { todayDate } = useSchoiceStore();

  const [result, setResult] = useState<DatabaseResult[]>([]);

  const query = useCallback(
    async (sqlQuery: string) => {
      try {
        if (!db) return;
        const res = (await db?.select(sqlQuery)) as DatabaseResult[];
        setResult(res);
      } catch (error) {
        console.error(error);
      }
    },
    [db]
  );

  useEffect(() => {
    if (!select) return;
    // 客製化條件
    const customConditions = select.value.map((prompt) =>
      generateExpression(prompt).join(" ")
    );
    // 動態生成查詢語句
    const sqlQuery = generateSqlQuery({
      todayDate, // 可以動態設定今天日期
      conditions: customConditions,
      dates,
    });
    query(sqlQuery);
  }, [dates, select, query, todayDate]);

  return result ? <ResultTable {...{ result }} /> : "讀取中...";
}
