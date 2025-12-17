import { Box, Grid, Stack, Tooltip, Typography } from "@mui/material";
import { useMemo } from "react";

function TooltipConent({
  lastPrice,
  ma5,
  ma5_deduction_value,
  ma5_tomorrow_deduction_value,
  ma5_deduction_time,
  ma5_tomorrow_deduction_time,
}: {
  lastPrice: number;
  ma5: number;
  ma5_deduction_value: number;
  ma5_tomorrow_deduction_value: number;
  ma5_deduction_time: string;
  ma5_tomorrow_deduction_time: string;
}) {
  return (
    <Box sx={{ p: 1, minWidth: 200 }}>
      <Grid container spacing={1}>
        <Grid size={6}>
          <Typography variant="body2" color="#fff">
            MA5
          </Typography>
        </Grid>
        <Grid size={6} textAlign="right">
          <Typography
            variant="body2"
            color={lastPrice > ma5 ? "#4caf50" : "#ef5350"}
            fontWeight="bold"
          >
            {ma5}
          </Typography>
        </Grid>

        <Grid size={6}>
          <Typography variant="body2" color="#fff">
            Deduction
          </Typography>
        </Grid>
        <Grid size={6} textAlign="right">
          <Typography
            variant="body2"
            color={lastPrice > ma5_deduction_value ? "#4caf50" : "#ef5350"}
          >
            {ma5_deduction_value}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
             {ma5_deduction_time}
          </Typography>
        </Grid>

        <Grid size={6}>
          <Typography variant="caption" color="#fff">
            T-Deduction
          </Typography>
        </Grid>
        <Grid size={6} textAlign="right">
          <Typography
            variant="body2"
            color={
              lastPrice > ma5_tomorrow_deduction_value ? "#4caf50" : "#ef5350"
            }
          >
            {ma5_tomorrow_deduction_value}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            {ma5_tomorrow_deduction_time}
          </Typography>
        </Grid>
      </Grid>
    </Box>
  );
}

export default function Ma5({
  lastPrice,
  ma5,
  ma5_deduction_value,
  ma5_tomorrow_deduction_value,
  ma5_deduction_time,
  ma5_tomorrow_deduction_time,
}: {
  lastPrice: number;
  ma5: number;
  ma5_deduction_value: number;
  ma5_tomorrow_deduction_value: number;
  ma5_deduction_time: string;
  ma5_tomorrow_deduction_time: string;
}) {
  const check = useMemo(() => {
    if (
      lastPrice > ma5_deduction_value &&
      lastPrice > ma5_tomorrow_deduction_value &&
      lastPrice > ma5
    )
      return true;
    return false;
  }, [ma5_deduction_value, ma5_tomorrow_deduction_value, lastPrice, ma5]);

  return (
    <Tooltip
      title={
        <TooltipConent
          {...{
            lastPrice,
            ma5,
            ma5_deduction_value,
            ma5_tomorrow_deduction_value,
            ma5_deduction_time,
            ma5_tomorrow_deduction_time,
          }}
        />
      }
      arrow
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center" width="100%">
        <Typography variant="caption" color="text.secondary" fontWeight={600} color="#fff">
          MA5
        </Typography>
        <Typography
          variant="body2"
          color={check ? "#4caf50" : "#ef5350"}
          fontWeight="700"
        >
          {ma5}
        </Typography>
      </Stack>
    </Tooltip>
  );
}
