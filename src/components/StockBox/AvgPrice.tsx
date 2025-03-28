import { Box, Typography } from "@mui/material";
import { useMemo } from "react";
import { TodayDealsType } from "../../hooks/useDeals";

export default function AvgPrice({
  lastPrice,
  todayDeals,
}: {
  lastPrice: number;
  todayDeals: TodayDealsType | null;
}) {
  const { avgPrice, color } = useMemo(() => {
    if (todayDeals) {
      const avgPrice =
        Math.round(
          todayDeals.avgPrices[todayDeals.avgPrices.length - 1] * 100
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
  }, [todayDeals, lastPrice]);
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
