import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { ListItemButton, ListItemIcon, ListItemText, Typography } from "@mui/material";
import { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { semanticTokens } from "../../../../theme";
import { CategoryType } from "../../../../types";
import { categoryDisplayName } from "../categoryGroups";

interface CategoryListItemProps {
  category: CategoryType;
  defaultName: string;
  icon: ReactNode;
  selected: boolean;
  pending: boolean;
  onSelect: (id: string) => void;
}

export default function CategoryListItem({ category, defaultName, icon, selected, pending, onSelect }: CategoryListItemProps) {
  const { t } = useTranslation();
  return (
    <ListItemButton
      disabled={pending}
      aria-current={selected ? "true" : undefined}
      onClick={() => onSelect(category.id)}
      sx={{
        minHeight: 72,
        minWidth: 0,
        px: { xs: 1.25, sm: 1.5 },
        py: { xs: 1.25, sm: 1.5 },
        borderRadius: 1,
        borderBottom: `1px solid ${semanticTokens.analysis.borderSubtle}`,
        borderLeft: selected ? `2px solid ${semanticTokens.analysis.focus}` : "2px solid transparent",
        bgcolor: selected ? semanticTokens.analysis.focusTint : "transparent",
        "&:hover": { bgcolor: selected ? semanticTokens.analysis.focusTintStrong : semanticTokens.analysis.surfaceSubtle },
        "&.Mui-focusVisible": { outline: `2px solid ${semanticTokens.analysis.focus}`, outlineOffset: 2 },
      }}
    >
      <ListItemIcon sx={{ minWidth: 34, color: selected ? semanticTokens.analysis.focus : semanticTokens.analysis.textMuted }}>{icon}</ListItemIcon>
      <ListItemText
        primary={<Typography noWrap fontWeight={800} sx={{ fontSize: { xs: "0.9rem", sm: "0.95rem" }, lineHeight: 1.3 }}>{categoryDisplayName(category, defaultName)}</Typography>}
        secondary={<Typography variant="caption" sx={{ display: "block", mt: 0.35, color: semanticTokens.analysis.textMuted, fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}>{t("watchlist.stockCount", { count: category.stockIds.length })}</Typography>}
        sx={{ minWidth: 0, m: 0 }}
      />
      {selected ? <CheckCircleIcon color="primary" fontSize="small" aria-label={t("watchlist.currentCategory")} sx={{ flexShrink: 0, ml: 1 }} /> : null}
    </ListItemButton>
  );
}
