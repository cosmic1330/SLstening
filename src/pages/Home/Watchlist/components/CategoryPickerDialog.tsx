import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import HistoryIcon from "@mui/icons-material/History";
import PushPinIcon from "@mui/icons-material/PushPin";
import { Button, Dialog, DialogActions, DialogContent, useMediaQuery, useTheme } from "@mui/material";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import useStocksStore from "../../../../store/Stock.store";
import { semanticTokens } from "../../../../theme";
import { categoryDisplayName, groupCategories } from "../categoryGroups";
import CategoryPickerHeader from "./CategoryPickerHeader";
import CategorySection from "./CategorySection";
import { WATCHLIST_RADIUS } from "../../../../components/StockBox/constants";

interface CategoryPickerDialogProps {
  open: boolean;
  onClose: () => void;
  onManage: () => void;
}

export default function CategoryPickerDialog({ open, onClose, onManage }: CategoryPickerDialogProps) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const categories = useStocksStore((state) => state.categories);
  const activeCategoryId = useStocksStore((state) => state.activeCategoryId);
  const pinnedCategoryIds = useStocksStore((state) => state.pinnedCategoryIds);
  const recentCategoryIds = useStocksStore((state) => state.recentCategoryIds);
  const setActiveCategory = useStocksStore((state) => state.setActiveCategory);
  const groups = useMemo(() => groupCategories({ categories, pinnedCategoryIds, recentCategoryIds, query: "", locale: i18n.resolvedLanguage ?? i18n.language }), [categories, i18n.language, i18n.resolvedLanguage, pinnedCategoryIds, recentCategoryIds]);
  const activeCategory = categories.find((category) => category.id === activeCategoryId);
  const activeName = activeCategory ? categoryDisplayName(activeCategory) : t("watchlist.noCategorySelected");

  const selectCategory = (id: string) => {
    if (id === activeCategoryId) { onClose(); return; }
    onClose();
    try {
      void Promise.resolve(setActiveCategory(id)).catch(() => undefined);
    } catch {
      // Persistence errors are reflected by the account sync notice.
    }
  };

  const sectionProps = { pending: false, activeCategoryId, onSelect: selectCategory };
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="sm"
      slotProps={{ paper: { sx: { bgcolor: semanticTokens.analysis.surface, color: semanticTokens.analysis.text, backgroundImage: "none", border: `1px solid ${semanticTokens.analysis.border}`, borderRadius: WATCHLIST_RADIUS, boxShadow: "none", display: "flex", flexDirection: "column", overflow: "hidden", width: "100%", maxWidth: "100%" } } }}
    >
      <CategoryPickerHeader activeName={activeName} pending={false} onClose={onClose} />
      <DialogContent sx={{ px: { xs: 2.5, sm: 3 }, pt: "8px !important", pb: { xs: 3, sm: 3.5 }, minHeight: 0, overflowY: "auto", overflowX: "hidden", flex: "1 1 auto" }}>
        <CategorySection {...sectionProps} label={t("watchlist.pinned")} items={groups.pinned} icon={<PushPinIcon fontSize="small" />} columns={{ xs: 1, sm: 2 }} />
        <CategorySection {...sectionProps} label={t("watchlist.recent")} items={groups.recent} icon={<HistoryIcon fontSize="small" />} columns={{ xs: 1, sm: 2 }} />
        <CategorySection {...sectionProps} label={t("watchlist.allCategories")} items={groups.others} icon={<FolderOutlinedIcon fontSize="small" />} columns={{ xs: 1, sm: 2 }} />
      </DialogContent>
      <DialogActions sx={{ position: "sticky", bottom: 0, px: { xs: 2.5, sm: 3 }, py: { xs: 2, sm: 2.5 }, borderTop: `1px solid ${semanticTokens.analysis.borderSubtle}`, bgcolor: semanticTokens.analysis.surface, flexShrink: 0, zIndex: 1 }}>
        <Button fullWidth variant="outlined" sx={{ minHeight: 44, borderRadius: WATCHLIST_RADIUS }} onClick={() => { onClose(); onManage(); }}>{t("watchlist.manage")}</Button>
      </DialogActions>
    </Dialog>
  );
}
