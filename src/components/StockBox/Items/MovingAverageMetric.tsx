import RemoveIcon from "@mui/icons-material/Remove";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { Box, Stack, Tooltip, Typography } from "@mui/material";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { semanticTokens } from "../../../theme";
import MetricTooltipTrigger from "./MetricTooltipTrigger";

export interface MovingAverageMetricProps {
  period: 5 | 10 | 20;
  lastPrice: number;
  ma: number;
  deductionValue: number;
  tomorrowDeductionValue: number;
  deductionTime: string;
  tomorrowDeductionTime: string;
}

export default function MovingAverageMetric({ period, lastPrice, ma, deductionValue, tomorrowDeductionValue, deductionTime, tomorrowDeductionTime }: MovingAverageMetricProps) {
  const { t } = useTranslation();
  const isUpward = useMemo(() => lastPrice > deductionValue && lastPrice > tomorrowDeductionValue && lastPrice > ma, [deductionValue, lastPrice, ma, tomorrowDeductionValue]);
  const signalColor = isUpward ? semanticTokens.market.gain : semanticTokens.market.neutral;
  const diffColor = (value: number) => lastPrice > value ? semanticTokens.market.gain : semanticTokens.market.neutral;
  const label = t("stock.ma", { period });
  return (
    <Tooltip
      title={(
        <Box sx={{ p: 1.5, minWidth: 220 }}>
          <Typography variant="overline" sx={{ color: semanticTokens.analysis.textMuted, fontWeight: 700, display: "block", mb: 1 }}>{label} {t("Pages.Detail.GlassBar.details")}</Typography>
          <Stack spacing={1}>
            <Stack direction="row" justifyContent="space-between" alignItems="center"><Typography variant="body2">{label}</Typography><Typography variant="body2" sx={{ fontWeight: 800, color: diffColor(ma) }}>{ma}</Typography></Stack>
            <Box sx={{ height: "1px", width: "100%", bgcolor: semanticTokens.analysis.divider }} />
            <Stack direction="row" justifyContent="space-between"><Box><Typography variant="caption" sx={{ color: semanticTokens.analysis.textMuted, display: "block", fontWeight: 700 }}>{t("Pages.Detail.summary.day")}</Typography><Typography variant="caption" sx={{ color: semanticTokens.analysis.textMuted }}>{deductionTime}</Typography></Box><Typography variant="body2" sx={{ alignSelf: "center", fontWeight: 800, color: diffColor(deductionValue) }}>{deductionValue}</Typography></Stack>
            <Stack direction="row" justifyContent="space-between"><Box><Typography variant="caption" sx={{ color: semanticTokens.analysis.textMuted, display: "block", fontWeight: 700 }}>{t("Pages.Detail.GlassBar.next")}</Typography><Typography variant="caption" sx={{ color: semanticTokens.analysis.textMuted }}>{tomorrowDeductionTime}</Typography></Box><Typography variant="body2" sx={{ alignSelf: "center", fontWeight: 800, color: diffColor(tomorrowDeductionValue) }}>{tomorrowDeductionValue}</Typography></Stack>
          </Stack>
        </Box>
      )}
      arrow
      enterTouchDelay={0}
      leaveTouchDelay={5000}
    >
      <MetricTooltipTrigger ariaLabel={`${label}: ${ma}, ${t(isUpward ? "stock.signalPositive" : "stock.signalNeutral")}`}>
        <Stack direction="column" spacing={0} alignItems="center" sx={{ width: "100%" }}>
          <Typography sx={{ fontSize: "11px", fontWeight: 700, color: semanticTokens.analysis.textMuted, textTransform: "uppercase", display: "flex", alignItems: "center" }}>
            {isUpward ? <TrendingUpIcon aria-hidden="true" sx={{ fontSize: 14, mr: 0.25 }} /> : <RemoveIcon aria-hidden="true" sx={{ fontSize: 14, mr: 0.25 }} />}
            {label}
          </Typography>
          <Typography sx={{ fontSize: "14px", fontWeight: 800, color: signalColor, lineHeight: 1.2 }}>{ma}</Typography>
        </Stack>
      </MetricTooltipTrigger>
    </Tooltip>
  );
}
