import { Box, Typography } from "@mui/material";
import { TaType } from "../../../types";

export default function Volume({ deals }: { deals: TaType }) {
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
        成交量
      </Typography>
      <Typography variant="body2" fontWeight="bold" textAlign="center">
        {deals.length > 0 && deals[deals.length - 1].v}
      </Typography>
    </Box>
  );
}
