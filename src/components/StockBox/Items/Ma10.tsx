import { Box, Grid, Tooltip, Typography } from "@mui/material";
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
    <Box>
      <Grid container>
        <Grid size={6}>
          <Typography variant="body2" color="#fff">
            ma10
          </Typography>
        </Grid>
        <Grid size={6}>
          <Typography
            variant="body2"
            color={lastPrice > ma10 ? "#fff" : "#e58282"}
          >
            {ma10}
          </Typography>
        </Grid>

        <Grid size={6}>
          <Typography variant="body2" color="#fff">
            ma10扣抵
          </Typography>
        </Grid>
        <Grid size={6}>
          <Typography
            variant="body2"
            color={lastPrice > ma10_deduction_value ? "#fff" : "#e58282"}
          >
            {ma10_deduction_value}
          </Typography>
          <Typography
            variant="body2"
            color={lastPrice > ma10_deduction_value ? "#fff" : "#e58282"}
          >
            {ma10_deduction_time}
          </Typography>
        </Grid>
        <Grid size={6}>
          <Typography variant="body2" color="#fff">
            明日ma10扣抵
          </Typography>
        </Grid>
        <Grid size={6}>
          <Typography
            variant="body2"
            color={
              lastPrice > ma10_tomorrow_deduction_value ? "#fff" : "#e58282"
            }
          >
            {ma10_tomorrow_deduction_value}
          </Typography>
          <Typography
            variant="body2"
            color={
              lastPrice > ma10_tomorrow_deduction_value ? "#fff" : "#e58282"
            }
          >
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
    <Box>
      <Typography
        variant="body2"
        gutterBottom
        component="div"
        color="#fff"
        textAlign="center"
      >
        ma10
      </Typography>
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
      >
        <Typography
          variant="body2"
          color={check ? "#fff" : "#e58282"}
          fontWeight="bold"
          textAlign="center"
        >
          {ma10}
        </Typography>
      </Tooltip>
    </Box>
  );
}
