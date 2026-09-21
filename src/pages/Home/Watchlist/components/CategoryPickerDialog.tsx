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
        minHeight: compact ? 72 : 78,
        px: { xs: 1.25, sm: 1.5 },
        py: { xs: 1.25, sm: 1.5 },
        borderRadius: 0.75,
        justifyContent: "stretch",
        textAlign: "left",
        color: "inherit",
        position: "relative",
        bgcolor: selected ? semanticTokens.analysis.focusTint : "transparent",
        border: 0,
        borderBottom: `1px solid ${semanticTokens.analysis.borderSubtle}`,
        borderLeft: selected ? `2px solid ${semanticTokens.analysis.focus}` : "2px solid transparent",
        boxSizing: "border-box",
        transition: "background-color 180ms ease, border-color 180ms ease",
        "&:hover": {
          bgcolor: selected ? semanticTokens.analysis.focusTintStrong : semanticTokens.analysis.focusTint,
          borderBottomColor: selected ? semanticTokens.analysis.focusBorder : semanticTokens.analysis.border,
        },
        "&:focus-visible": {
          outline: `2px solid ${semanticTokens.analysis.focus}`,
          outlineOffset: 2,
        },
        "@media (prefers-reduced-motion: reduce)": { transition: "none" },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.25} width="100%" minWidth={0}>
        <Box sx={{ width: 26, height: 26, flexShrink: 0, display: "grid", placeItems: "center", color: selected ? semanticTokens.analysis.focus : semanticTokens.analysis.textMuted }}>{icon}</Box>
        <Box flex={1} minWidth={0}>
          <Typography noWrap fontWeight={800} sx={{ fontSize: { xs: "0.9rem", sm: "0.95rem" }, lineHeight: 1.3 }}>{categoryDisplayName(category, defaultName)}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.35, fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}>{t("watchlist.stockCount", { count: category.stockIds.length })}</Typography>
        </Box>
        {selected ? <CheckCircleIcon color="primary" fontSize="small" aria-label={t("watchlist.currentCategory")} sx={{ flexShrink: 0 }} /> : null}
      </Stack>
    </ButtonBase>;
  };

  const section = (label: string, items: CategoryType[], icon: React.ReactNode, columns: { xs: number; sm: number }) => items.length ? <Box component="section" mt={3}>
    <Stack direction="row" alignItems="center" spacing={0.75} mb={1.5} px={0.25} color="text.secondary">
      {icon}
      <Typography variant="subtitle2" fontWeight={900} letterSpacing="0.02em" lineHeight={1.2} sx={{ flex: 1 }}>{label}</Typography>
      <Typography variant="caption" sx={{ color: semanticTokens.analysis.textMuted, fontVariantNumeric: "tabular-nums" }}>{items.length}</Typography>
    </Stack>
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: `repeat(${columns.xs}, minmax(0, 1fr))`, sm: `repeat(${columns.sm}, minmax(0, 1fr))` }, columnGap: { xs: 1.5, sm: 2.5 }, rowGap: 1, minWidth: 0 }}>
      {items.map((category) => categoryCard(category, icon, true))}
    </Box>
  </Box> : null;

  return <Dialog
    open={open}
    onClose={pending ? undefined : onClose}
    fullScreen={fullScreen}
    fullWidth
    maxWidth="sm"
    PaperProps={{ sx: { bgcolor: semanticTokens.analysis.surface, color: semanticTokens.analysis.text, backgroundImage: "none", border: `1px solid ${semanticTokens.analysis.border}`, borderRadius: { xs: 0, sm: 1.5 }, boxShadow: "none", display: "flex", flexDirection: "column", overflow: "hidden", width: "100%", maxWidth: "100%" } }}
  >
    <DialogTitle component="div" sx={{ px: { xs: 2.5, sm: 3 }, pt: { xs: 2.5, sm: 3 }, pb: { xs: 2, sm: 2.5 }, flexShrink: 0 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Box minWidth={0} flex={1}>
          <Typography component="h2" variant="h6" fontWeight={900}>{t("watchlist.chooseCategory")}</Typography>
          <Box sx={{ mt: 1.5, px: 1.5, py: 1.1, borderRadius: 1, bgcolor: semanticTokens.analysis.inset, border: `1px solid ${semanticTokens.analysis.borderSubtle}`, maxWidth: "100%" }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 700, whiteSpace: { xs: "normal", sm: "nowrap" }, overflowWrap: "anywhere", lineHeight: 1.4 }}>
              {t("watchlist.currentCategoryName", { name: activeCategory ? categoryDisplayName(activeCategory, defaultName) : defaultName })}
            </Typography>
          </Box>
        </Box>
        <IconButton disabled={pending} aria-label={t("watchlist.close")} onClick={onClose} sx={{ minWidth: 44, minHeight: 44 }}><CloseIcon /></IconButton>
      </Stack>
    </DialogTitle>
    <DialogContent sx={{ px: { xs: 2.5, sm: 3 }, pt: "8px !important", pb: { xs: 3, sm: 3.5 }, minHeight: 0, overflowY: "auto", overflowX: "hidden", flex: "1 1 auto" }}>
      {error ? <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert> : null}
      {groups.defaultCategory ? section(t("watchlist.defaultSection"), [groups.defaultCategory], <LockOutlinedIcon fontSize="small" />, { xs: 1, sm: 1 }) : null}
      {section(t("watchlist.pinned"), groups.pinned, <PushPinIcon fontSize="small" />, { xs: 1, sm: 2 })}
      {section(t("watchlist.recent"), groups.recent, <HistoryIcon fontSize="small" />, { xs: 1, sm: 2 })}
      {section(t("watchlist.allCategories"), groups.others, <FolderOutlinedIcon fontSize="small" />, { xs: 1, sm: 2 })}
    </DialogContent>
    <DialogActions sx={{ position: "sticky", bottom: 0, px: { xs: 2.5, sm: 3 }, py: { xs: 2, sm: 2.5 }, borderTop: `1px solid ${semanticTokens.analysis.borderSubtle}`, bgcolor: semanticTokens.analysis.surface, flexShrink: 0, zIndex: 1 }}>
      <Button fullWidth variant="outlined" disabled={pending} sx={{ minHeight: 44 }} onClick={() => { onClose(); onManage(); }}>{t("watchlist.manage")}</Button>
    </DialogActions>
  </Dialog>;
}

export { ExpandMoreIcon };
