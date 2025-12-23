import { Box, Tooltip, Typography } from "@mui/material";
import { TaType } from "../../../types";

export default function VolumeEstimated({
  deals,
  estimatedVolume,
}: {
  deals: TaType;
  estimatedVolume: number;
}) {
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
        估量
      </Typography>
      <Tooltip
        title={`昨日量 ${deals.length > 0 && deals[deals.length - 2].v}`}
      >
        <Typography
          variant="body2"
          color={
            deals.length > 0 && estimatedVolume > deals[deals.length - 2].v
              ? "#fff"
              : "#4caf50"
          }
          fontWeight="bold"
          textAlign="center"
        >
          {deals.length > 0 && estimatedVolume}
        </Typography>
      </Tooltip>
    </Box>
  );
}
