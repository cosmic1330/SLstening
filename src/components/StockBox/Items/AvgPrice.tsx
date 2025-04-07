import { Box, Typography } from "@mui/material";
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
        Math.round(
          tickDeals.avgPrices[tickDeals.avgPrices.length - 1] * 100
        ) / 100;
      const color = lastPrice > avgPrice ? "#fff" : "#e58282";
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
    <Box>
      <Typography
        variant="body2"
        gutterBottom
        component="div"
        color="#ff7300"
        textAlign="center"
        fontWeight="bold"
      >
        日均價
      </Typography>
      <Typography
        variant="body2"
        color={color}
        fontWeight="bold"
        textAlign="center"
      >
        {avgPrice}
      </Typography>
    </Box>
  );
}
