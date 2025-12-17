import { Box, Tooltip, Typography } from "@mui/material";
import { useMemo } from "react";

interface VolumeTooltipBoxProps {
  ratio: number;
}

const sections = [
  {
    min: 0,
    max: 0.5,
    label: "0.5以下",
    title: "量縮",
    desc: "成交量極度萎縮，市場極不活躍，通常處於觀望或變盤前夕，值得特別留意是否有轉折機會。",
  },
  {
    min: 0.5,
    max: 0.8,
    label: "0.5–0.8",
    title: "偏低",
    desc: "成交量偏低，市場略顯觀望，需留意後續量能變化。",
  },
  {
    min: 0.8,
    max: 1.5,
    label: "0.8–1.5",
    title: "正常",
    desc: "成交量屬於正常水準，市場交易活躍度與過去相當，適合長線或波段投資者觀察。",
  },
  {
    min: 1.5,
    max: 2.5,
    label: "1.5–2.5",
    title: "溫和",
    desc: "屬於溫和放量，若股價同步上升，通常代表升勢健康，可持續持股；若股價下跌，則跌勢可能延續。",
  },
  {
    min: 2.5,
    max: 5,
    label: "2.5–5",
    title: "放量",
    desc: "明顯放量，若伴隨價格突破重要支撐或壓力，突破的有效性較高，適合積極操作或短線交易。",
  },
  {
    min: 5,
    max: Infinity,
    label: "5以上",
    title: "出大量",
    desc: "劇烈放量，若在低位出現，可能是主力啟動；若在高位出現，則需警惕主力出貨或行情反轉",
  },
];

function VolumeRatioTooltip({ ratio }: VolumeTooltipBoxProps) {
  if (ratio === undefined || ratio === null) return null;

  const section = sections.find((s) => ratio >= s.min && ratio < s.max);
  if (!section) return null;

  return (
    <Box sx={{ p: 1 }}>
      <Typography variant="subtitle2">
        {section.label}（{section.title}）
      </Typography>
      <Typography variant="body2">{section.desc}</Typography>
    </Box>
  );
}

export default function VolumeRatio({
  estimatedVolume,
  avgDaysVolume,
}: {
  estimatedVolume: number;
  avgDaysVolume: number;
}) {
  const ratio = useMemo(
    () => Math.round((estimatedVolume / avgDaysVolume) * 10) / 10,
    [estimatedVolume, avgDaysVolume]
  );
  return (
    <Box>
      <Typography
        variant="body2"
        gutterBottom
        component="div"
        color="#fff"
        textAlign="center"
        noWrap
      >
        量能
      </Typography>
      <Tooltip title={<VolumeRatioTooltip ratio={ratio} />}>
        <Typography
          variant="body2"
          color={ratio >= 1 ? "#ef5350" : "#4caf50"}
          fontWeight="bold"
          textAlign="center"
        >
          {(() => {
            const section = sections.find(
              (s) => ratio >= s.min && ratio < s.max
            );
            return section ? `${section.title} ${ratio}` : "N/A";
          })()}
        </Typography>
      </Tooltip>
    </Box>
  );
}
