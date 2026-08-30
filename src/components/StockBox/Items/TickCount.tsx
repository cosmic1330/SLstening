import { Stack, Typography, Tooltip } from "@mui/material";
import { TickDealsType } from "../../../types";
import { useTranslation } from "react-i18next";

export default function TickCount({
  tickDeals,
}: {
  tickDeals: TickDealsType | null;
}) {
  const { t } = useTranslation();
  const count = tickDeals?.closes.length || 0;

  return (
    <Tooltip title={`${t("stock.tickCount")}: ${count}`} arrow enterTouchDelay={0}>
      <Stack direction="column" spacing={0} alignItems="center" sx={{ width: "100%" }}>
        <Typography
          sx={{
            fontSize: "9px",
            fontWeight: 900,
            color: "rgba(255,255,255,0.7)",
            textTransform: "uppercase",
          }}
        >
          {t("stock.tickCount")}
        </Typography>
        <Typography
          sx={{
            fontSize: "12px",
            fontWeight: 900,
            color: "#fff",
            lineHeight: 1.2,
          }}
        >
          {count > 0 ? count : "--"}
        </Typography>
      </Stack>
    </Tooltip>
  );
}
