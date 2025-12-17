import { Box, Grid, Stack, Tooltip, Typography } from "@mui/material";
import { useMemo } from "react";

function TooltipConent({
  lastPrice,
  ma10,
  ma10_deduction_value,
  ma10_tomorrow_deduction_value,
  ma10_deduction_time,
  ma10_tomorrow_deduction_time,
}: {
  lastPrice: number;
  ma10: number;
  ma10_deduction_value: number;
  ma10_tomorrow_deduction_value: number;
  ma10_deduction_time: string;
  ma10_tomorrow_deduction_time: string;
}) {
  return (
    <Box sx={{ p: 1, minWidth: 200 }}>
      <Grid container spacing={1}>
        <Grid size={6}>
          <Typography variant="caption" color="rgba(255,255,255,0.7)">
            MA10
          </Typography>
        </Grid>
        <Grid size={6} textAlign="right">
          <Typography
            variant="body2"
            color={lastPrice > ma10 ? "#4caf50" : "#ef5350"}
            fontWeight="bold"
          >
            {ma10}
          </Typography>
        </Grid>

        <Grid size={6}>
          <Typography variant="caption" color="rgba(255,255,255,0.7)">
            Deduction
          </Typography>
        </Grid>
        <Grid size={6} textAlign="right">
          <Typography
            variant="body2"
            color={lastPrice > ma10_deduction_value ? "#4caf50" : "#ef5350"}
          >
            {ma10_deduction_value}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            {ma10_deduction_time}
          </Typography>
        </Grid>

        <Grid size={6}>
          <Typography variant="caption" color="rgba(255,255,255,0.7)">
            T-Deduction
          </Typography>
        </Grid>
        <Grid size={6} textAlign="right">
          <Typography
            variant="body2"
            color={
              lastPrice > ma10_tomorrow_deduction_value ? "#4caf50" : "#ef5350"
            }
          >
            {ma10_tomorrow_deduction_value}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            {ma10_tomorrow_deduction_time}
          </Typography>
        </Grid>
      </Grid>
    </Box>
  );
}

export default function Ma10({
  lastPrice,
  ma10,
  ma10_deduction_value,
  ma10_tomorrow_deduction_value,
  ma10_deduction_time,
  ma10_tomorrow_deduction_time,
}: {
  lastPrice: number;
  ma10: number;
  ma10_deduction_value: number;
  ma10_tomorrow_deduction_value: number;
  ma10_deduction_time: string;
  ma10_tomorrow_deduction_time: string;
}) {
  const check = useMemo(() => {
    if (
      lastPrice > ma10_deduction_value &&
      lastPrice > ma10_tomorrow_deduction_value &&
      lastPrice > ma10
    )
      return true;
    return false;
  }, [ma10_deduction_value, ma10_tomorrow_deduction_value, lastPrice, ma10]);

  return (
    <Tooltip
      title={
        <TooltipConent
          {...{
            lastPrice,
            ma10,
            ma10_deduction_value,
            ma10_tomorrow_deduction_value,
            ma10_deduction_time,
            ma10_tomorrow_deduction_time,
          }}
        />
      }
      arrow
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" width="100%">
        <Typography variant="caption" color="text.secondary" fontWeight={600} color="#fff">
          MA10
        </Typography>
        <Typography
          variant="body2"
          color={check ? "#4caf50" : "#ef5350"}
          fontWeight="700"
        >
          {ma10}
        </Typography>
      </Stack>
    </Tooltip>
  );
}
