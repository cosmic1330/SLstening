import { Stack, Typography } from "@mui/material";
import { useMemo } from "react";
import { TickDealsType } from "../../../types";

export default function AvgPrice({
  lastPrice,
  tickDeals,
}: {
  lastPrice: number;
  tickDeals: TickDealsType | null;
}) {
  const { avgPrice, color } = useMemo(() => {
    if (tickDeals) {
      const avgPrice =
        Math.round(tickDeals.avgPrices[tickDeals.avgPrices.length - 1] * 100) /
        100;
      const color = lastPrice > avgPrice ? "#ef5350" : "#4caf50";
      return {
        avgPrice,
        color,
      };
    }
    return {
      avgPrice: null,
      color: "#fff",
    };
  }, [tickDeals, lastPrice]);
  return (
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      width="100%"
    >
      <Typography variant="caption" fontWeight={600} color="#fff">
        日均
      </Typography>
      <Typography variant="body2" color={color} fontWeight="bold">
        {avgPrice}
      </Typography>
    </Stack>
  );
}
