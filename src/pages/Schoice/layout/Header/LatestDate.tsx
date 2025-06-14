import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import PetsIcon from "@mui/icons-material/Pets";
import { Box, Stack, Tooltip, Typography } from "@mui/material";
import { error } from "@tauri-apps/plugin-log";
import { useContext, useEffect, useState } from "react";
import SqliteDataManager from "../../../../classes/SqliteDataManager";
import { DatabaseContext } from "../../../../context/DatabaseContext";
import useSchoiceStore from "../../../../store/Schoice.store";

export default function LatestDate() {
  const [stocksCount, setStocksCount] = useState(0);
  const { dataCount, changeDataCount } = useSchoiceStore();
  const { db, dates } = useContext(DatabaseContext);

  useEffect(() => {
    if (!db) return;
    const sqliteDataManager = new SqliteDataManager(db);
    sqliteDataManager
      .getLatestDailyDealCount()
      .then((result) => {
        changeDataCount(result.count);
      })
      .catch((e) => {
        error(`Error getting latest daily deal count: ${e}`);
      });
    sqliteDataManager
      .getStocksCount()
      .then((result) => {
        setStocksCount(result);
      })
      .catch((e) => {
        error(`Error getting stocks count: ${e}`);
      });
  }, [db]);

  return (
    <Box>
      <Tooltip title="Last update date">
        <Stack direction="row" spacing={1} justifyContent="flexstart">
          <CalendarMonthIcon fontSize="small" />
          <Typography variant="body1" textAlign="right">
            {dates[0] || "N/A"}
          </Typography>
        </Stack>
      </Tooltip>

      <Tooltip title="Total data of stocks">
        <Stack direction="row" spacing={1} justifyContent="flexstart">
          <PetsIcon fontSize="small" />
          <Typography variant="body1" textAlign="right">
            {stocksCount} / {dataCount}
          </Typography>
        </Stack>
      </Tooltip>
    </Box>
  );
}
