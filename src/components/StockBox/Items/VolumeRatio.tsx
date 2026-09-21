import { Stack, Tooltip, Typography } from "@mui/material";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import MetricTooltipTrigger from "./MetricTooltipTrigger";

const sections = [
  { min: 0, max: 0.5, labelKey: "extremelyLow", color: "#69F0AE" },
  { min: 0.5, max: 0.8, labelKey: "low", color: "#69F0AE" },
  { min: 0.8, max: 1.5, labelKey: "normal", color: "rgba(255,255,255,0.8)" },
  { min: 1.5, max: 2.5, labelKey: "moderatelyHigh", color: "#FF5252" },
  { min: 2.5, max: 5, labelKey: "high", color: "#FF5252" },
  { min: 5, max: Infinity, labelKey: "extreme", color: "#FF5252" },
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
            color: "rgba(255,255,255,0.7)",
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
