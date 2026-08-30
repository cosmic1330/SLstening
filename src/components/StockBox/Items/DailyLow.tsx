import { Stack, Typography } from "@mui/material";
import { useMemo } from "react";
import { TaType } from "../../../types";
import { useTranslation } from "react-i18next";

export default function DailyLow({
  deals,
  lastPrice,
}: {
  deals: TaType;
  lastPrice: number;
}) {
  const { t } = useTranslation();
  const { low, color } = useMemo(() => {
    if (deals.length >= 2) {
      const low = deals[deals.length - 2].l;
      const color = lastPrice < low ? "#4caf50" : "#fff";
      return { low, color };
    }
    return { low: null, color: "#fff" };
  }, [deals, lastPrice]);

  if (low === null) return null;

  return (
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      width="100%"
    >
      <Typography variant="caption" fontWeight={600} color="#fff">
        {t("stock.dailyLow")}
      </Typography>
      <Typography variant="body2" color={color} fontWeight="bold">
        {low}
      </Typography>
    </Stack>
  );
}
