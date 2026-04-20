import { Stack, Typography, Tooltip } from "@mui/material";
import { TickDealsType } from "../../../types";

export default function AvgPrice({
  lastPrice,
  tickDeals,
}: {
  lastPrice: number;
  tickDeals: TickDealsType | null;
}) {
  const avgPrice = tickDeals?.avgPrices[tickDeals.avgPrices.length - 1] || 0;
  const isAbove = lastPrice >= avgPrice;

  return (
    <Tooltip title={`當前均價: ${avgPrice}`} arrow enterTouchDelay={0}>
      <Stack direction="column" spacing={0} alignItems="center" sx={{ width: "100%" }}>
        <Typography
          sx={{
            fontSize: "9px",
            fontWeight: 900,
            color: "rgba(255,255,255,0.7)",
            textTransform: "uppercase",
          }}
        >
          MA Price
        </Typography>
        <Typography
          sx={{
            fontSize: "12px",
            fontWeight: 900,
            color: isAbove ? "#FF5252" : "#69F0AE",
            lineHeight: 1.2,
          }}
        >
          {avgPrice > 0 ? avgPrice.toFixed(2) : "--"}
        </Typography>
      </Stack>
    </Tooltip>
  );
}
