import { Container, Grid2, Typography } from "@mui/material";
import ResultTable from "../../../components/ResultTable/ResultTable";
import useStocksStore from "../../../store/Stock.store";
import { useCallback, useContext, useEffect, useState } from "react";
import { DatabaseContext } from "../../../context/DatabaseContext";
import useSchoiceStore from "../../../store/Schoice.store";
import { ActionButtonType } from "../../../components/ResultTable/types";

export default function Favorite() {
  const { stocks } = useStocksStore();
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

  useEffect(() => {
    const sql = `SELECT * FROM daily_deal JOIN stock ON daily_deal.stock_id = stock.id WHERE t="${
      dates[todayDate]
    }" AND stock_id IN ('${stocks.map((r) => r.id).join("','")}')`;
    query(sql).then((result) => {
      if (result) setResult(result);
    });
  }, [stocks, todayDate, dates]);

  return (
    <Container>
      <Grid2 container>
        <Grid2 size={12}>
          <Typography variant="h5" gutterBottom textTransform="uppercase">
            Favorite
          </Typography>
          <ResultTable {...{ result }} type={ActionButtonType.Decrease}/>
        </Grid2>
      </Grid2>
    </Container>
  );
}
