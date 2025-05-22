import { Container, Grid2, Typography } from "@mui/material";
import { useContext, useEffect, useState } from "react";
import ResultTable from "../../../components/ResultTable/ResultTable";
import { ActionButtonType } from "../../../components/ResultTable/types";
import { DatabaseContext } from "../../../context/DatabaseContext";
import useStocksStore from "../../../store/Stock.store";
import useFindStocksByPrompt from "../../../hooks/useFindStocksByPrompt";
import Alarm from "./Alarm";

export default function Favorite() {
  const { stocks, reload } = useStocksStore();
  const { dates } = useContext(DatabaseContext);
  const [result, setResult] = useState<any[]>([]);
  const { getStocksData } = useFindStocksByPrompt();

  useEffect(() => {
    reload();
  }, []);

  useEffect(() => {
    if (dates?.length === 0 || stocks.length === 0) return;
    getStocksData(
      dates[0],
      stocks.map((r) => r.id)
    ).then((result) => {
      if (result) setResult(result);
    });
  }, [stocks, dates, getStocksData]);

  return (
    <Container>
      <Grid2 container>
        <Grid2 size={12}>
          <Typography variant="h5" gutterBottom textTransform="uppercase">
            Favorite
          </Typography>
          <Alarm stocks={stocks}/>
          <ResultTable {...{ result }} type={ActionButtonType.Decrease} />
        </Grid2>
      </Grid2>
    </Container>
  );
}
