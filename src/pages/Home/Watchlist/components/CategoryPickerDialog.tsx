import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import HistoryIcon from "@mui/icons-material/History";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PushPinIcon from "@mui/icons-material/PushPin";
import { Alert, Button, Dialog, DialogActions, DialogContent, useMediaQuery, useTheme } from "@mui/material";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import useStocksStore from "../../../../store/Stock.store";
import { semanticTokens } from "../../../../theme";
import { categoryDisplayName, groupCategories } from "../categoryGroups";
import CategoryPickerHeader from "./CategoryPickerHeader";
import CategorySection from "./CategorySection";

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
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const defaultName = t("watchlist.defaultName");
  const groups = useMemo(() => groupCategories({ categories, pinnedCategoryIds, recentCategoryIds, query: "", defaultName, locale: i18n.resolvedLanguage ?? i18n.language }), [categories, defaultName, i18n.language, i18n.resolvedLanguage, pinnedCategoryIds, recentCategoryIds]);
  const activeCategory = categories.find((category) => category.id === activeCategoryId);
  const activeName = activeCategory ? categoryDisplayName(activeCategory, defaultName) : defaultName;

  const selectCategory = async (id: string) => {
    if (id === activeCategoryId) { onClose(); return; }
    setPending(true);
    setError("");
    try {
      await setActiveCategory(id);
      onClose();
    } catch {
      setError(t("watchlist.saveFailed"));
    } finally {
      setPending(false);
    }
  };

  const sectionProps = { defaultName, pending, activeCategoryId, onSelect: (id: string) => void selectCategory(id) };
  return (
    <Dialog
      open={open}
      onClose={pending ? undefined : onClose}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="sm"
      slotProps={{ paper: { sx: { bgcolor: semanticTokens.analysis.surface, color: semanticTokens.analysis.text, backgroundImage: "none", border: `1px solid ${semanticTokens.analysis.border}`, borderRadius: { xs: 0, sm: 1.5 }, boxShadow: "none", display: "flex", flexDirection: "column", overflow: "hidden", width: "100%", maxWidth: "100%" } } }}
    >
      <CategoryPickerHeader activeName={activeName} pending={pending} onClose={onClose} />
      <DialogContent sx={{ px: { xs: 2.5, sm: 3 }, pt: "8px !important", pb: { xs: 3, sm: 3.5 }, minHeight: 0, overflowY: "auto", overflowX: "hidden", flex: "1 1 auto" }}>
        {error ? <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert> : null}
        <CategorySection {...sectionProps} label={t("watchlist.defaultSection")} items={groups.defaultCategory ? [groups.defaultCategory] : []} icon={<LockOutlinedIcon fontSize="small" />} columns={{ xs: 1, sm: 1 }} />
        <CategorySection {...sectionProps} label={t("watchlist.pinned")} items={groups.pinned} icon={<PushPinIcon fontSize="small" />} columns={{ xs: 1, sm: 2 }} />
        <CategorySection {...sectionProps} label={t("watchlist.recent")} items={groups.recent} icon={<HistoryIcon fontSize="small" />} columns={{ xs: 1, sm: 2 }} />
        <CategorySection {...sectionProps} label={t("watchlist.allCategories")} items={groups.others} icon={<FolderOutlinedIcon fontSize="small" />} columns={{ xs: 1, sm: 2 }} />
      </DialogContent>
      <DialogActions sx={{ position: "sticky", bottom: 0, px: { xs: 2.5, sm: 3 }, py: { xs: 2, sm: 2.5 }, borderTop: `1px solid ${semanticTokens.analysis.borderSubtle}`, bgcolor: semanticTokens.analysis.surface, flexShrink: 0, zIndex: 1 }}>
        <Button fullWidth variant="outlined" disabled={pending} sx={{ minHeight: 44 }} onClick={() => { onClose(); onManage(); }}>{t("watchlist.manage")}</Button>
      </DialogActions>
    </Dialog>
  );
}
