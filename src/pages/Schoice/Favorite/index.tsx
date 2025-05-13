import { Container, Grid2, Typography } from "@mui/material";
import { useContext, useEffect, useState } from "react";
import ResultTable from "../../../components/ResultTable/ResultTable";
import { ActionButtonType } from "../../../components/ResultTable/types";
import { DatabaseContext } from "../../../context/DatabaseContext";
import useStocksStore from "../../../store/Stock.store";
import useDatabaseQuery from "../../../hooks/useDatabaseQuery";

export default function Favorite() {
  const { stocks } = useStocksStore();
  const { dates } = useContext(DatabaseContext);
  const [result, setResult] = useState<any[]>([]);

  const query = useDatabaseQuery();

  useEffect(() => {
    const sql = `SELECT * FROM daily_deal JOIN stock ON daily_deal.stock_id = stock.id WHERE t="${
      dates[0]
    }" AND stock_id IN ('${stocks.map((r) => r.id).join("','")}')`;
    query(sql).then((result) => {
      if (result) setResult(result);
    });
  }, [stocks, dates]);

  return (
    <Container>
      <Grid2 container>
        <Grid2 size={12}>
          <Typography variant="h5" gutterBottom textTransform="uppercase">
            Favorite
          </Typography>
          <ResultTable {...{ result }} type={ActionButtonType.Decrease} />
        </Grid2>
      </Grid2>
    </Container>
  );
}
