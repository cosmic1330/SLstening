import { Stack, Tooltip, Typography } from "@mui/material";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import MetricTooltipTrigger from "./MetricTooltipTrigger";
import { semanticTokens } from "../../../theme";

const sections = [
  { min: 0, max: 0.5, labelKey: "extremelyLow", color: semanticTokens.market.loss },
  { min: 0.5, max: 0.8, labelKey: "low", color: semanticTokens.market.loss },
  { min: 0.8, max: 1.5, labelKey: "normal", color: semanticTokens.analysis.textMuted },
  { min: 1.5, max: 2.5, labelKey: "moderatelyHigh", color: semanticTokens.market.gain },
  { min: 2.5, max: 5, labelKey: "high", color: semanticTokens.market.gain },
  { min: 5, max: Infinity, labelKey: "extreme", color: semanticTokens.market.gain },
];

export default function VolumeRatio({
  estimatedVolume,
  avgDaysVolume,
}: {
  estimatedVolume: number;
  avgDaysVolume: number;
}) {
  const { t } = useTranslation();
  const ratio = useMemo(
    () => Math.round((estimatedVolume / avgDaysVolume) * 10) / 10,
    [estimatedVolume, avgDaysVolume],
  );

  const section = useMemo(() => {
    return sections.find((s) => ratio >= s.min && ratio < s.max) || sections[2];
  }, [ratio]);

  return (
    <Tooltip title={`${t("stock.volumeRatio")}: ${ratio}`} arrow enterTouchDelay={0}>
      <MetricTooltipTrigger ariaLabel={`${t("stock.volumeRatio")}: ${ratio}`}>
      <Stack
        direction="column"
        spacing={0}
        alignItems="center"
        sx={{ width: "100%" }}
      >
        <Typography
          sx={{
            fontSize: "11px",
            fontWeight: 700,
            color: semanticTokens.analysis.textMuted,
            textTransform: "uppercase",
          }}
        >
          {t("stock.volumeRatio")}
        </Typography>
        <Typography
          sx={{
            fontSize: "14px",
            fontWeight: 800,
            color: section.color,
            lineHeight: 1.2,
          }}
        >
          {t(`stock.volumeRatioStatus.${section.labelKey}`)} {ratio}
        </Typography>
      </Stack>
      </MetricTooltipTrigger>
    </Tooltip>
  );
}
