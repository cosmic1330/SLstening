import { Stack, Tooltip, Typography } from "@mui/material";
import { useMemo } from "react";

const sections = [
  { min: 0, max: 0.5, title: "極限縮量", color: "#69F0AE" },
  { min: 0.5, max: 0.8, title: "量縮", color: "#69F0AE" },
  { min: 0.8, max: 1.5, title: "常態", color: "rgba(255,255,255,0.8)" },
  { min: 1.5, max: 2.5, title: "溫和放量", color: "#FF5252" },
  { min: 2.5, max: 5, title: "放量", color: "#FF5252" },
  { min: 5, max: Infinity, title: "巨量", color: "#FF5252" },
];

export default function VolumeRatio({
  estimatedVolume,
  avgDaysVolume,
}: {
  estimatedVolume: number;
  avgDaysVolume: number;
}) {
  const ratio = useMemo(
    () => Math.round((estimatedVolume / avgDaysVolume) * 10) / 10,
    [estimatedVolume, avgDaysVolume],
  );

  const section = useMemo(() => {
    return sections.find((s) => ratio >= s.min && ratio < s.max) || sections[2];
  }, [ratio]);

  return (
    <Tooltip title={`預估量 / 十日均量: ${ratio}倍`} arrow enterTouchDelay={0}>
      <Stack
        direction="column"
        spacing={0}
        alignItems="center"
        sx={{ width: "100%" }}
      >
        <Typography
          sx={{
            fontSize: "9px",
            fontWeight: 900,
            color: "rgba(255,255,255,0.7)",
            textTransform: "uppercase",
          }}
        >
          Vol Ratio
        </Typography>
        <Typography
          sx={{
            fontSize: "12px",
            fontWeight: 900,
            color: section.color,
            lineHeight: 1.2,
          }}
        >
          {section.title} {ratio}
        </Typography>
      </Stack>
    </Tooltip>
  );
}
