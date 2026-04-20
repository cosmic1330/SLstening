import { Box, Stack, Tooltip, Typography } from "@mui/material";
import { useMemo } from "react";

function TooltipContent({
  lastPrice,
  ma,
  deduction_value,
  tomorrow_deduction_value,
  deduction_time,
  tomorrow_deduction_time,
  label,
}: {
  lastPrice: number;
  ma: number;
  deduction_value: number;
  tomorrow_deduction_value: number;
  deduction_time: string;
  tomorrow_deduction_time: string;
  label: string;
}) {
  const getDiffColor = (val: number) => (lastPrice > val ? "#FF5252" : "#69F0AE");

  return (
    <Box sx={{ p: 1.5, minWidth: 220 }}>
      <Typography variant="overline" sx={{ color: "rgba(255,255,255,0.7)", fontWeight: 900, display: "block", mb: 1 }}>
        {label} 詳情
      </Typography>
      <Stack spacing={1}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="rgba(255,255,255,0.9)">當前 {label}</Typography>
          <Typography variant="body2" sx={{ fontWeight: 900, color: getDiffColor(ma) }}>{ma}</Typography>
        </Stack>
        <Box sx={{ height: "1px", width: "100%", bgcolor: "rgba(255,255,255,0.2)" }} />
        <Stack direction="row" justifyContent="space-between">
          <Box>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)", display: "block", fontWeight: 700 }}>今日扣抵</Typography>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)" }}>{deduction_time}</Typography>
          </Box>
          <Typography variant="body2" sx={{ alignSelf: "center", fontWeight: 900, color: getDiffColor(deduction_value) }}>
            {deduction_value}
          </Typography>
        </Stack>
        <Stack direction="row" justifyContent="space-between">
          <Box>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)", display: "block", fontWeight: 700 }}>明日扣抵</Typography>
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.4)" }}>{tomorrow_deduction_time}</Typography>
          </Box>
          <Typography variant="body2" sx={{ alignSelf: "center", fontWeight: 900, color: getDiffColor(tomorrow_deduction_value) }}>
            {tomorrow_deduction_value}
          </Typography>
        </Stack>
      </Stack>
    </Box>
  );
}

export default function Ma20({
  lastPrice,
  ma20,
  ma20_deduction_value,
  ma20_tomorrow_deduction_value,
  ma20_deduction_time,
  ma20_tomorrow_deduction_time,
}: {
  lastPrice: number;
  ma20: number;
  ma20_deduction_value: number;
  ma20_tomorrow_deduction_value: number;
  ma20_deduction_time: string;
  ma20_tomorrow_deduction_time: string;
}) {
  const isUpward = useMemo(() => {
    return lastPrice > ma20_deduction_value && lastPrice > ma20_tomorrow_deduction_value && lastPrice > ma20;
  }, [ma20_deduction_value, ma20_tomorrow_deduction_value, lastPrice, ma20]);

  return (
    <Tooltip
      title={
        <TooltipContent
          label="MA20"
          ma={ma20}
          deduction_value={ma20_deduction_value}
          tomorrow_deduction_value={ma20_tomorrow_deduction_value}
          deduction_time={ma20_deduction_time}
          tomorrow_deduction_time={ma20_tomorrow_deduction_time}
          lastPrice={lastPrice}
        />
      }
      arrow
      enterTouchDelay={0}
      leaveTouchDelay={5000}
    >
      <Stack direction="column" spacing={0} alignItems="center" sx={{ width: "100%" }}>
        <Typography
          sx={{
            fontSize: "9px",
            fontWeight: 900,
            color: "rgba(255,255,255,0.7)", 
            textTransform: "uppercase",
          }}
        >
          MA20
        </Typography>
        <Typography
          sx={{
            fontSize: "12px",
            fontWeight: 900,
            color: isUpward ? "#FF5252" : "#69F0AE",
            lineHeight: 1.2,
          }}
        >
          {ma20}
        </Typography>
      </Stack>
    </Tooltip>
  );
}
