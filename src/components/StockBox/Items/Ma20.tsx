import { Box, Grid, Stack, Tooltip, Typography } from "@mui/material";
import { useMemo } from "react";

function TooltipConent({
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
  return (
    <Box sx={{ p: 1, minWidth: 200 }}>
      <Grid container spacing={1}>
        <Grid size={6}>
          <Typography variant="caption" color="rgba(255,255,255,0.7)">
            MA20
          </Typography>
        </Grid>
        <Grid size={6} textAlign="right">
          <Typography
            variant="body2"
            color={lastPrice > ma20 ? "#ef5350" : "#4caf50"}
            fontWeight="bold"
          >
            {ma20}
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
            color={lastPrice > ma20_deduction_value ? "#ef5350" : "#4caf50"}
          >
            {ma20_deduction_value}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            {ma20_deduction_time}
          </Typography>
        </Grid>

        <Grid size={6}>
          <Typography variant="caption" color="rgba(255,255,255,0.7)">
            Tomorrow-Deduction
          </Typography>
        </Grid>
        <Grid size={6} textAlign="right">
          <Typography
            variant="body2"
            color={
              lastPrice > ma20_tomorrow_deduction_value ? "#ef5350" : "#4caf50"
            }
          >
            {ma20_tomorrow_deduction_value}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            {ma20_tomorrow_deduction_time}
          </Typography>
        </Grid>
      </Grid>
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
  const check = useMemo(() => {
    if (
      lastPrice > ma20_deduction_value &&
      lastPrice > ma20_tomorrow_deduction_value &&
      lastPrice > ma20
    )
      return true;
    return false;
  }, [ma20_deduction_value, ma20_tomorrow_deduction_value, lastPrice, ma20]);

  return (
    <Tooltip
      title={
        <TooltipConent
          {...{
            lastPrice,
            ma20,
            ma20_deduction_value,
            ma20_tomorrow_deduction_value,
            ma20_deduction_time,
            ma20_tomorrow_deduction_time,
          }}
        />
      }
      arrow
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        width="100%"
      >
        <Typography variant="caption" fontWeight={600} color="#fff">
          MA20
        </Typography>
        <Typography
          variant="body2"
          color={check ? "#ef5350" : "#4caf50"}
          fontWeight="700"
        >
          {ma20}
        </Typography>
      </Stack>
    </Tooltip>
  );
}
