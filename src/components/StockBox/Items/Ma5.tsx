import { Box, Grid2, Tooltip, Typography } from "@mui/material";
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
    <Box>
      <Grid2 container>
        <Grid2 size={6}>
          <Typography variant="body2" color="#fff">
            ma5
          </Typography>
        </Grid2>
        <Grid2 size={6}>
          <Typography
            variant="body2"
            color={lastPrice > ma5 ? "#fff" : "#e58282"}
          >
            {ma5}
          </Typography>
        </Grid2>

        <Grid2 size={6}>
          <Typography variant="body2" color="#fff">
            ma5扣抵
          </Typography>
        </Grid2>
        <Grid2 size={6}>
          <Typography
            variant="body2"
            color={lastPrice > ma5_deduction_value ? "#fff" : "#e58282"}
          >
            {ma5_deduction_value}
          </Typography>
          <Typography
            variant="body2"
            color={lastPrice > ma5_deduction_value ? "#fff" : "#e58282"}
          >
            {ma5_deduction_time}
          </Typography>
        </Grid2>
        <Grid2 size={6}>
          <Typography variant="body2" color="#fff">
            明日ma5扣抵
          </Typography>
        </Grid2>
        <Grid2 size={6}>
          <Typography
            variant="body2"
            color={
              lastPrice > ma5_tomorrow_deduction_value ? "#fff" : "#e58282"
            }
          >
            {ma5_tomorrow_deduction_value}
          </Typography>
          <Typography
            variant="body2"
            color={
              lastPrice > ma5_tomorrow_deduction_value ? "#fff" : "#e58282"
            }
          >
            {ma5_tomorrow_deduction_time}
          </Typography>
        </Grid2>
      </Grid2>
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
    <Box>
      <Typography
        variant="body2"
        gutterBottom
        component="div"
        color="#fff"
        textAlign="center"
      >
        ma5
      </Typography>
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
      >
        <Typography
          variant="body2"
          color={check ? "#fff" : "#e58282"}
          fontWeight="bold"
          textAlign="center"
        >
          {ma5}
        </Typography>
      </Tooltip>
    </Box>
  );
}
