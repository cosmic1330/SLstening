import { Box, Typography } from "@mui/material";
import { TaType } from "../../../types";
import { useTranslation } from "react-i18next";

export default function PreVolume({ deals }: { deals: TaType }) {
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
        {t("stock.previousVolume")}
      </Typography>
      <Typography variant="body2" fontWeight="bold" textAlign="center" color="#fff">
        {deals.length > 0 && deals[deals.length - 2].v}
      </Typography>
    </Box>
  );
}
