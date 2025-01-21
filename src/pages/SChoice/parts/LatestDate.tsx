import { useContext, useEffect, useState } from "react";
import { DatabaseContext } from "../../../context/DatabaseContext";
import { Box, Typography } from "@mui/material";

export default function LatestDate() {
  const { db } = useContext(DatabaseContext);
  const [date, setDate] = useState<string>("Loading...");

  useEffect(() => {
    const fetchDate = async () => {
      const result = await db?.select(
        "SELECT MAX(t) AS latest_date FROM daily_deal GROUP BY t;"
      ) as { latest_date: string }[];
      setDate(result.length > 0 ? result[0].latest_date : "N/A");
    };

    fetchDate();
  }, [db]);

  return (
    <Box>
      <Typography variant="h6">Latest Date</Typography>
      <Typography variant="body1">{date}</Typography>
    </Box>
  );
}
