import { Box, Stack, Typography, Tooltip } from "@mui/material";
import { TickDealsType } from "../../../types";
import { useTranslation } from "react-i18next";
import MetricTooltipTrigger from "./MetricTooltipTrigger";

export default function AvgPrice({
  lastPrice,
  tickDeals,
}: {
  lastPrice: number;
  tickDeals: TickDealsType | null;
}) {
  const { t } = useTranslation();
  const avgPrice = tickDeals?.avgPrices[tickDeals.avgPrices.length - 1] || 0;
  const isAbove = lastPrice >= avgPrice;

  return (
    <Tooltip title={`${t("stock.averagePrice")}: ${avgPrice}`} arrow enterTouchDelay={0}>
      <MetricTooltipTrigger
        ariaLabel={`${t("stock.averagePrice")}: ${avgPrice > 0 ? avgPrice.toFixed(2) : "--"}, ${t(isAbove ? "stock.aboveAverage" : "stock.belowAverage")}`}
      >
      <Stack direction="column" spacing={0} alignItems="center" sx={{ width: "100%" }}>
        <Typography
          sx={{
            fontSize: "11px",
            fontWeight: 700,
            color: "rgba(255,255,255,0.7)",
            textTransform: "uppercase",
          }}
        >
          <Box component="span" aria-hidden="true" sx={{ mr: 0.35 }}>{isAbove ? "▲" : "▼"}</Box>
          {t("stock.averagePrice")}
        </Typography>
        <Typography
          sx={{
            fontSize: "14px",
            fontWeight: 800,
            color: isAbove ? "#FF5252" : "#69F0AE",
            lineHeight: 1.2,
          }}
        >
          {avgPrice > 0 ? avgPrice.toFixed(2) : "--"}
        </Typography>
      </Stack>
      </MetricTooltipTrigger>
    </Tooltip>
  );
}
