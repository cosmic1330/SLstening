import { Box, Button, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { playfulButtonSx, playfulPalette } from "./playfulStyles";

interface WatchlistEmptyStateProps {
  empty: boolean;
  noMatches: boolean;
  onAdd: () => void;
}

export default function WatchlistEmptyState({ empty, noMatches, onAdd }: WatchlistEmptyStateProps) {
  const { t } = useTranslation();
  if (!empty && !noMatches) return null;
  if (noMatches) return <Typography sx={{ position: "absolute", top: "50%", width: "100%", color: "text.secondary", textAlign: "center" }}>{t("watchlist.noStockMatches")}</Typography>;
  return <Box sx={{ position: "absolute", top: "45%", left: 24, right: 24, textAlign: "center" }}><Typography sx={{ color: "text.secondary", fontWeight: 700 }}>{t("watchlist.empty")}</Typography><Button sx={{ ...playfulButtonSx(playfulPalette.blue), mt: 1 }} onClick={onAdd}>{t("watchlist.addStock")}</Button></Box>;
}
