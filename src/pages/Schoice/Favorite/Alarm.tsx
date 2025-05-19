import { Card, CardContent, Chip, Stack, Typography, Grid2, Box } from "@mui/material";
import { useState, useEffect, useContext } from "react";
import useSchoiceStore from "../../../store/Schoice.store";
import useFindStocksByPrompt from "../../../hooks/useFindStocksByPrompt";
import { StockStoreType } from "../../../types";
import useDatabaseQuery from "../../../hooks/useDatabaseQuery";
import { DatabaseContext } from "../../../context/DatabaseContext";

export default function Alarm({ stocks }: { stocks: StockStoreType[] }) {
  const { alarms } = useSchoiceStore();
  const { dates } = useContext(DatabaseContext);
  const { getPromptSqlScripts, getCombinedSqlScript } = useFindStocksByPrompt();
  const query = useDatabaseQuery();

  const [stockAlarmMap, setStockAlarmMap] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function fetchData() {
      setLoading(true);
      const stocksObj = stocks.reduce((acc, stock) => {
        acc[stock.id] = [];
        return acc;
      }, {} as Record<string, string[]>);
      for (let key of Object.keys(alarms)) {
        const promptItem = alarms[key];
        const sqls = await getPromptSqlScripts(
          promptItem,
          stocks.map((stock) => stock.id)
        );
        const conbineSql = getCombinedSqlScript(sqls);
        const ids = (await query(conbineSql)) as { stock_id: string }[];
        for (let { stock_id } of ids) {
          if (stocksObj[stock_id]) {
            stocksObj[stock_id].push(alarms[key].name);
          }
        }
      }
      if (!ignore) setStockAlarmMap(stocksObj);
      setLoading(false);
    }
    if (stocks.length && Object.keys(alarms).length) fetchData();
    else setStockAlarmMap({});
    return () => { ignore = true; };
  }, [alarms, stocks]);

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="h6" gutterBottom color="primary" >
        Alarm 警示條件對照
      </Typography>
      {stocks.length === 0 ? (
        <Typography color="text.secondary">無追蹤股票</Typography>
      ) : (
        <Grid2 container spacing={2}>
          {stocks
            .filter((stock) =>
              stockAlarmMap[stock.id] && stockAlarmMap[stock.id].length > 0
            )
            .map((stock) => (
              <Grid2 key={stock.id} size={3}>
                <Card sx={{ borderRadius: 2, minHeight: 120, boxShadow: 3 }}>
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      {stock.id} {stock.name}
                    </Typography>
                    {loading ? (
                      <Typography color="text.secondary">載入中...</Typography>
                    ) : (
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        {stockAlarmMap[stock.id].map((alarm, idx) => (
                          <Chip key={idx} label={alarm} color="warning" size="small" />
                        ))}
                      </Stack>
                    )}
                  </CardContent>
                </Card>
              </Grid2>
            ))}
        </Grid2>
      )}
    </Box>
  );
}
