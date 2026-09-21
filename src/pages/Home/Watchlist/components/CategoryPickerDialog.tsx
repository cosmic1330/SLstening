import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import HistoryIcon from "@mui/icons-material/History";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PushPinIcon from "@mui/icons-material/PushPin";
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import useStocksStore from "../../../../store/Stock.store";
import { semanticTokens } from "../../../../theme";
import { CategoryType } from "../../../../types";
import { categoryDisplayName, groupCategories } from "../categoryGroups";

interface CategoryPickerDialogProps {
  open: boolean;
  onClose: () => void;
  onManage: () => void;
}

export default function CategoryPickerDialog({ open, onClose, onManage }: CategoryPickerDialogProps) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const { categories, activeCategoryId, pinnedCategoryIds, recentCategoryIds, setActiveCategory } = useStocksStore();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const defaultName = t("watchlist.defaultName");
  const groups = useMemo(() => groupCategories({
    categories,
    pinnedCategoryIds,
    recentCategoryIds,
    query: "",
    defaultName,
    locale: i18n.resolvedLanguage ?? i18n.language,
  }), [categories, defaultName, i18n.language, i18n.resolvedLanguage, pinnedCategoryIds, recentCategoryIds]);
  const activeCategory = categories.find((category) => category.id === activeCategoryId);

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

  const categoryCard = (category: CategoryType, icon: React.ReactNode, compact = false) => {
    const selected = category.id === activeCategoryId;
    return <ButtonBase
      key={category.id}
      disabled={pending}
      aria-current={selected ? "true" : undefined}
      onClick={() => void selectCategory(category.id)}
      sx={{
        width: "100%",
        minWidth: 0,
        minHeight: compact ? 64 : 72,
        p: 1.25,
        borderRadius: 2,
        justifyContent: "stretch",
        textAlign: "left",
        color: "inherit",
        bgcolor: selected ? semanticTokens.analysis.focusTintStrong : semanticTokens.analysis.surfaceSubtle,
        border: `1px solid ${selected ? semanticTokens.analysis.focusBorder : semanticTokens.analysis.borderSubtle}`,
        transition: "background-color 180ms ease, border-color 180ms ease",
        "&:hover": { bgcolor: selected ? semanticTokens.analysis.focusTintStrong : semanticTokens.analysis.focusTint },
        "@media (prefers-reduced-motion: reduce)": { transition: "none" },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} width="100%" minWidth={0}>
        <Box sx={{ width: 36, height: 36, flexShrink: 0, borderRadius: 1.5, display: "grid", placeItems: "center", bgcolor: selected ? semanticTokens.analysis.focusTintStrong : semanticTokens.analysis.inset, color: selected ? "primary.main" : "text.secondary" }}>{icon}</Box>
        <Box flex={1} minWidth={0}>
          <Typography noWrap fontWeight={800}>{categoryDisplayName(category, defaultName)}</Typography>
          <Typography variant="caption" color="text.secondary">{t("watchlist.stockCount", { count: category.stockIds.length })}</Typography>
        </Box>
        {selected ? <CheckCircleIcon color="primary" fontSize="small" aria-label={t("watchlist.currentCategory")} /> : null}
      </Stack>
    </ButtonBase>;
  };

  const section = (label: string, items: CategoryType[], icon: React.ReactNode, columns: { xs: number; sm: number }) => items.length ? <Box component="section" mt={2.25}>
    <Stack direction="row" alignItems="center" spacing={0.75} mb={1} color="text.secondary">{icon}<Typography variant="overline" fontWeight={900} letterSpacing="0.08em">{label}</Typography></Stack>
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: `repeat(${columns.xs}, minmax(0, 1fr))`, sm: `repeat(${columns.sm}, minmax(0, 1fr))` }, gap: 1 }}>
      {items.map((category) => categoryCard(category, icon, true))}
    </Box>
  </Box> : null;

  return <Dialog
    open={open}
    onClose={pending ? undefined : onClose}
    fullScreen={fullScreen}
    fullWidth
    maxWidth="sm"
    PaperProps={{ sx: { bgcolor: semanticTokens.analysis.surface, color: semanticTokens.analysis.text, backgroundImage: "none", border: `1px solid ${semanticTokens.analysis.border}` } }}
  >
    <DialogTitle component="div" sx={{ pb: 1 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Box minWidth={0}>
          <Typography component="h2" variant="h6" fontWeight={900}>{t("watchlist.chooseCategory")}</Typography>
          <Typography variant="body2" color="text.secondary" noWrap>{t("watchlist.currentCategoryName", { name: activeCategory ? categoryDisplayName(activeCategory, defaultName) : defaultName })}</Typography>
        </Box>
        <IconButton disabled={pending} aria-label={t("watchlist.close")} onClick={onClose} sx={{ minWidth: 44, minHeight: 44 }}><CloseIcon /></IconButton>
      </Stack>
    </DialogTitle>
    <DialogContent sx={{ pt: "8px !important", pb: 2 }}>
      {error ? <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert> : null}
      {groups.defaultCategory ? section(t("watchlist.defaultSection"), [groups.defaultCategory], <LockOutlinedIcon fontSize="small" />, { xs: 1, sm: 1 }) : null}
      {section(t("watchlist.pinned"), groups.pinned, <PushPinIcon fontSize="small" />, { xs: 2, sm: 2 })}
      {section(t("watchlist.recent"), groups.recent, <HistoryIcon fontSize="small" />, { xs: 1, sm: 2 })}
      {section(t("watchlist.allCategories"), groups.others, <FolderOutlinedIcon fontSize="small" />, { xs: 1, sm: 2 })}
    </DialogContent>
    <DialogActions sx={{ position: "sticky", bottom: 0, p: 2, borderTop: `1px solid ${semanticTokens.analysis.borderSubtle}`, bgcolor: semanticTokens.analysis.surface }}>
      <Button fullWidth variant="outlined" disabled={pending} sx={{ minHeight: 44 }} onClick={() => { onClose(); onManage(); }}>{t("watchlist.manage")}</Button>
    </DialogActions>
  </Dialog>;
}

export { ExpandMoreIcon };
