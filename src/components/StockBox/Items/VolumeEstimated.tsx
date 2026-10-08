import { Box, Tooltip, Typography } from "@mui/material";
import { TaType } from "../../../types";
import { useTranslation } from "react-i18next";
import { WATCHLIST_RADIUS } from "../constants";

export default function VolumeEstimated({
  deals,
  estimatedVolume,
}: {
  deals: TaType;
  estimatedVolume: number;
}) {
  const { t } = useTranslation();
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
        {t("stock.estimatedVolume")}
      </Typography>
      <Tooltip
        title={`${t("stock.previousVolume")} ${deals.length > 0 && deals[deals.length - 2].v}`}
        slotProps={{ tooltip: { sx: { borderRadius: WATCHLIST_RADIUS } } }}
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
