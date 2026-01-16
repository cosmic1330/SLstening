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
    if (tickDeals && tickDeals.avgPrices && tickDeals.avgPrices.length > 0) {
      const avgPriceValue = tickDeals.avgPrices[tickDeals.avgPrices.length - 1];
      const avgPrice = Math.round(avgPriceValue * 100) / 100;
      const color = lastPrice > avgPrice ? "#fff" : "#4caf50";
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

  if (avgPrice === null) return null;

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
