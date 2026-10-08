import { Box, Button, Card, CardContent, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { WATCHLIST_RADIUS } from "../../../../components/StockBox/constants";
import { semanticTokens } from "../../../../theme";
import { playfulButtonSx, playfulPalette } from "./playfulStyles";

interface WatchlistEmptyStateProps {
  empty: boolean;
  noMatches: boolean;
  hasCategory: boolean;
  onAdd: () => void;
  onCreateCategory: () => void;
}

const EMPTY_STATE_ASSETS = {
  categories: "/watchlist-empty-categories.png",
  stocks: "/watchlist-empty-stocks.png",
} as const;

export default function WatchlistEmptyState({ empty, noMatches, hasCategory, onAdd, onCreateCategory }: WatchlistEmptyStateProps) {
  const { t } = useTranslation();
  if (!empty && !noMatches) return null;

  if (noMatches) {
    return (
      <Box component="section" role="status" aria-live="polite" sx={{ position: "absolute", top: "54%", left: 24, right: 24, textAlign: "center", pointerEvents: "none" }}>
        <Typography sx={{ color: semanticTokens.analysis.textMuted, fontWeight: 700 }}>{t("watchlist.noStockMatches")}</Typography>
      </Box>
    );
  }

  const variant = hasCategory ? "stocks" : "categories";
  const titleKey = hasCategory ? "watchlist.emptyNoStocksTitle" : "watchlist.emptyNoCategoriesTitle";
  const descriptionKey = hasCategory ? "watchlist.emptyNoStocksDescription" : "watchlist.emptyNoCategoriesDescription";
  const actionKey = hasCategory ? "watchlist.addStock" : "watchlist.createCategory";
  const onAction = hasCategory ? onAdd : onCreateCategory;
  const titleId = `watchlist-empty-${variant}-title`;
  const descriptionId = `watchlist-empty-${variant}-description`;

  return (
    <Box
      component="section"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      sx={{
        position: "absolute",
        top: { xs: 148, sm: 156 },
        right: { xs: 12, sm: 24 },
        bottom: { xs: 88, sm: 32 },
        left: { xs: 12, sm: 24 },
        display: "grid",
        placeItems: "center",
        minWidth: 0,
        pointerEvents: "none",
      }}
    >
      <Card
        sx={{
          position: "relative",
          width: "100%",
          maxWidth: { xs: 360, sm: 410 },
          maxHeight: "100%",
          overflowY: "auto",
          overflowX: "hidden",
          borderRadius: WATCHLIST_RADIUS,
          border: `1px solid ${semanticTokens.analysis.borderSubtle}`,
          bgcolor: semanticTokens.analysis.surfaceGlass,
          boxShadow: "0 14px 34px rgba(0, 0, 0, 0.22)",
          pointerEvents: "auto",
          "&::before": {
            content: '""',
            position: "absolute",
            zIndex: 0,
            top: -46,
            left: "50%",
            width: 180,
            height: 130,
            borderRadius: "50%",
            bgcolor: "rgba(89, 186, 255, 0.14)",
            filter: "blur(18px)",
            transform: "translateX(-50%)",
            pointerEvents: "none",
          },
        }}
      >
        <CardContent sx={{ position: "relative", zIndex: 1, display: "grid", justifyItems: "center", p: { xs: 1.25, sm: 1.75 }, textAlign: "center", "&:last-child": { pb: { xs: 1.25, sm: 1.75 } } }}>
          <Box
            component="img"
            src={EMPTY_STATE_ASSETS[variant]}
            alt=""
            aria-hidden="true"
            sx={{
              display: "block",
              width: "100%",
              maxWidth: variant === "categories" ? { xs: 128, sm: 152 } : { xs: 168, sm: 204 },
              maxHeight: { xs: 138, sm: 178 },
              objectFit: "contain",
            }}
          />
          <Typography id={titleId} component="h2" variant="h6" sx={{ mt: 0.25, color: semanticTokens.analysis.text, fontWeight: 900, fontSize: { xs: "1.08rem", sm: "1.22rem" }, lineHeight: 1.3 }}>
            {t(titleKey)}
          </Typography>
          <Typography id={descriptionId} sx={{ mt: 0.5, maxWidth: 310, color: semanticTokens.analysis.textMuted, fontSize: { xs: "0.84rem", sm: "0.9rem" }, lineHeight: 1.45 }}>
            {t(descriptionKey)}
          </Typography>
          <Button type="button" sx={{ ...playfulButtonSx(playfulPalette.blue), mt: 1.25 }} onClick={onAction}>
            {t(actionKey)}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
