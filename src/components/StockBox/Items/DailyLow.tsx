import { Stack, Typography } from "@mui/material";
import { useMemo } from "react";
import { TaType } from "../../../types";

export default function DailyLow({
  deals,
  lastPrice,
}: {
  deals: TaType;
  lastPrice: number;
}) {
  const { low, color } = useMemo(() => {
    if (deals.length >= 2) {
      const low = deals[deals.length - 2].l;
      const color = lastPrice < low ? "#4caf50" : "#fff";
      return { low, color };
    }
    return { low: null, color: "#fff" };
  }, [deals, lastPrice]);

  if (low === null) return null;

  return (
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      width="100%"
    >
      <Typography variant="caption" fontWeight={600} color="#fff">
        日均低
      </Typography>
      <Typography variant="body2" color={color} fontWeight="bold">
        {low}
      </Typography>
    </Stack>
  );
}
