import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { Stack, Typography, Tooltip } from "@mui/material";
import { TickDealsType } from "../../../types";
import { useTranslation } from "react-i18next";
import { semanticTokens } from "../../../theme";
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
            color: semanticTokens.analysis.textMuted,
            textTransform: "uppercase",
            display: "flex",
            alignItems: "center",
          }}
        >
          {isAbove ? <TrendingUpIcon aria-hidden="true" sx={{ fontSize: 14, mr: 0.25 }} /> : <TrendingDownIcon aria-hidden="true" sx={{ fontSize: 14, mr: 0.25 }} />}
          {t("stock.averagePrice")}
        </Typography>
        <Typography
          sx={{
            fontSize: "14px",
            fontWeight: 800,
            color: isAbove ? semanticTokens.market.gain : semanticTokens.market.loss,
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
