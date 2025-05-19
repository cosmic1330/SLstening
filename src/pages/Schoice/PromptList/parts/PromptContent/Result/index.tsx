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
import useDatabaseQuery from "../../../../../../hooks/useDatabaseQuery";
import useFindStocksByPrompt from "../../../../../../hooks/useFindStocksByPrompt";
import { get } from "react-hook-form";

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
  const { getPromptSqlScripts, getCombinedSqlScript, getStocksData } =
    useFindStocksByPrompt();
  const { dates } = useContext(DatabaseContext);
  const { todayDate, filterStocks } = useSchoiceStore();

  const [result, setResult] = useState<any[]>([]);

  const query = useDatabaseQuery();

  const run = useCallback(async () => {
    if (!select) return;
    const sqls = await getPromptSqlScripts(
      select,
      filterStocks?.map((item) => item.id)
    );
    if (sqls.length === 0) return;
    // 合併查詢
    const combinedSQL = getCombinedSqlScript(sqls);
    query(combinedSQL).then(async (res: { stock_id: string }[] | undefined) => {
      if (res) {
        const result = await getStocksData(
          dates[todayDate],
          res.map((r) => r.stock_id)
        );
        if (result) setResult(result);
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
