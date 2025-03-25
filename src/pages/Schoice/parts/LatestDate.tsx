import PetsIcon from "@mui/icons-material/Pets";
import { Grid2, Stack, Typography } from "@mui/material";
import { useCallback, useContext, useEffect, useState } from "react";
import { DatabaseContext } from "../../../context/DatabaseContext";
import useSchoiceStore from "../../../store/Schoice.store";
import useStocksStore from "../../../store/Stock.store";

export default function LatestDate() {
  const { db } = useContext(DatabaseContext);
  const { menu, sqliteUpdateDate } = useStocksStore();
  const { changeDataCount } = useSchoiceStore();
  const [count, setCount] = useState<string>("Loading...");

  const fetchDate = useCallback(async () => {
    try {
      const result = (await db?.select(
        `SELECT COUNT(*) AS counts FROM stock`
      )) as { counts: string }[];
      if (!result || result.length === 0) {
        setCount("N/A");
        return;
      }
      setCount(result[0].counts);
      changeDataCount(parseInt(result[0].counts));
    } catch (error) {
      console.error(error);
    }
  }, [db, sqliteUpdateDate]);

  useEffect(() => {
    fetchDate();
  }, [fetchDate]);

  return (
    <Stack>
      <Grid2 container spacing={2}>
        <Grid2 size={6}>
          <Typography variant="body1">Data Date:</Typography>
        </Grid2>
        <Grid2 size={6}>
          <Typography variant="body1" textAlign="right">
            {sqliteUpdateDate || "N/A"}
          </Typography>
        </Grid2>
      </Grid2>
      <Grid2 container spacing={2}>
        <Grid2>
          <Typography variant="body1">Stock Counts:</Typography>
        </Grid2>
        <Grid2 display="flex" flexWrap="nowrap">
          <PetsIcon fontSize="small" />
          <Typography variant="body1" textAlign="right">
            {menu.length} / {count}
          </Typography>
        </Grid2>
      </Grid2>
    </Stack>
  );
}
