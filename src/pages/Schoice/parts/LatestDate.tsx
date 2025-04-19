import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import PetsIcon from "@mui/icons-material/Pets";
import { Box, Stack, Tooltip, Typography } from "@mui/material";
import { useContext, useEffect } from "react";
import SqliteDataManager from "../../../classes/SqliteDataManager";
import { DatabaseContext } from "../../../context/DatabaseContext";
import useSchoiceStore from "../../../store/Schoice.store";
import useStocksStore from "../../../store/Stock.store";

export default function LatestDate() {
  const { menu } = useStocksStore();
  const {
    dataCount,
    sqliteUpdateDate,
    changeSqliteUpdateDate,
    changeDataCount,
  } = useSchoiceStore();
  const { db } = useContext(DatabaseContext);

  useEffect(() => {
    if (!db) return;
    const sqliteDataManager = new SqliteDataManager(db);
    sqliteDataManager
      .getLatestDailyDealCount()
      .then((result) => {
        changeDataCount(result.count);
        changeSqliteUpdateDate(result.date);
      })
      .catch((error) => {
        console.error(error);
      });
  }, [db]);

  return (
    <Box>
      <Tooltip title="Last update date">
        <Stack direction="row" spacing={1} justifyContent="flexstart">
          <CalendarMonthIcon fontSize="small" />
          <Typography variant="body1" textAlign="right">
            {sqliteUpdateDate}
          </Typography>
        </Stack>
      </Tooltip>

      <Tooltip title="Total data of stocks">
        <Stack direction="row" spacing={1} justifyContent="flexstart">
          <PetsIcon fontSize="small" />
          <Typography variant="body1" textAlign="right">
            {menu.length} / {dataCount}
          </Typography>
        </Stack>
      </Tooltip>
    </Box>
  );
}
