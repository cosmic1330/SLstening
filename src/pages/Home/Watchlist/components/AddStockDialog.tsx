import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import useStocksStore from "../../../../store/Stock.store";
import { semanticTokens } from "../../../../theme";
import { CategoryType, StockStoreType } from "../../../../types";
import { categoryDisplayName, groupCategories } from "../categoryGroups";

interface AddStockDialogProps {
  open: boolean;
  activeCategoryId: string;
  onClose: () => void;
}

export default function AddStockDialog({
  open,
  activeCategoryId,
  onClose,
}: AddStockDialogProps) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const {
    menu,
    stocks,
    categories,
    pinnedCategoryIds,
    recentCategoryIds,
    setStockCategories,
  } = useStocksStore();
  const [stock, setStock] = useState<StockStoreType | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [categoryQuery, setCategoryQuery] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const defaultName = t("watchlist.defaultName");

  const options = useMemo(() => {
    const byId = new Map<string, StockStoreType>();
    [...menu, ...stocks].forEach((item) => byId.set(item.id, item));
    return [...byId.values()];
  }, [menu, stocks]);

  const groups = useMemo(
    () =>
      groupCategories({
        categories,
        pinnedCategoryIds,
        recentCategoryIds,
        query: categoryQuery,
        defaultName,
        locale: i18n.resolvedLanguage ?? i18n.language,
      }),
    [
      categories,
      categoryQuery,
      defaultName,
      i18n.language,
      i18n.resolvedLanguage,
      pinnedCategoryIds,
      recentCategoryIds,
    ],
  );

  useEffect(() => {
    if (!stock) {
      setSelectedIds([]);
      return;
    }
    const memberships = categories
      .filter((category) => category.stockIds.includes(stock.id))
      .map((category) => category.id);
    setSelectedIds(memberships.length ? memberships : [activeCategoryId]);
  }, [activeCategoryId, categories, stock]);

  const resetAndClose = () => {
    if (pending) return;
    setStock(null);
    setSelectedIds([]);
    setCategoryQuery("");
    setError("");
    onClose();
  };

  const save = async () => {
    if (!stock || !selectedIds.length || pending) return;
    setPending(true);
    setError("");
    try {
      await setStockCategories(stock, selectedIds);
      setPending(false);
      resetAndClose();
    } catch {
      setError(t("watchlist.saveFailed"));
      setPending(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedIds((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId],
    );
  };

  const renderCategory = (category: CategoryType) => (
    <FormControlLabel
      key={category.id}
      disabled={pending}
      sx={{
        minHeight: 48,
        mx: 0,
        px: 1,
        borderRadius: 1.5,
        "&:hover": { bgcolor: semanticTokens.analysis.surfaceSubtle },
      }}
      control={
        <Checkbox
          checked={selectedIds.includes(category.id)}
          onChange={() => toggleCategory(category.id)}
          inputProps={{
            "aria-label": t("watchlist.toggleCategory", {
              name: categoryDisplayName(category, defaultName),
            }),
          }}
        />
      }
      label={
        <Stack direction="row" width="100%" alignItems="center">
          <Typography flex={1}>
            {categoryDisplayName(category, defaultName)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t("watchlist.stockCount", { count: category.stockIds.length })}
          </Typography>
        </Stack>
      }
    />
  );

  const renderGroup = (label: string, items: CategoryType[]) =>
    items.length ? (
      <Box component="section" mt={2}>
        <Typography variant="overline" color="text.secondary" fontWeight={800}>
          {label}
        </Typography>
        <Stack>{items.map(renderCategory)}</Stack>
      </Box>
    ) : null;

  return (
    <Dialog
      open={open}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="md"
      onClose={pending ? undefined : resetAndClose}
      PaperProps={{
        sx: {
          bgcolor: semanticTokens.analysis.surface,
          color: semanticTokens.analysis.text,
          backgroundImage: "none",
        },
      }}
    >
      <DialogTitle component="div">
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography component="h2" variant="h6" fontWeight={900}>
            {t("watchlist.addStock")}
          </Typography>
          <IconButton
            disabled={pending}
            aria-label={t("watchlist.close")}
            onClick={resetAndClose}
            sx={{ minWidth: 44, minHeight: 44 }}
          >
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Autocomplete
          options={options}
          value={stock}
          disabled={pending}
          onChange={(_, value) => {
            setStock(value);
            setError("");
          }}
          getOptionLabel={(item) => `${item.id} ${item.name}`}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          renderInput={(params) => (
            <TextField
              {...params}
              autoFocus
              label={t("watchlist.stockSearch")}
              sx={{ mt: 1 }}
            />
          )}
        />
        {stock ? (
          <>
            <TextField
              fullWidth
              disabled={pending}
              value={categoryQuery}
              onChange={(event) => setCategoryQuery(event.target.value)}
              label={t("watchlist.categorySearch")}
              sx={{ mt: 2 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start"><SearchIcon /></InputAdornment>
                ),
              }}
            />
            {groups.defaultCategory
              ? renderGroup(t("watchlist.defaultSection"), [groups.defaultCategory])
              : null}
            {renderGroup(t("watchlist.pinned"), groups.pinned)}
            {renderGroup(t("watchlist.recent"), groups.recent)}
            {renderGroup(t("watchlist.allCategories"), groups.others)}
            {groups.visibleCount === 0 ? (
              <Typography textAlign="center" color="text.secondary" py={4}>
                {t("watchlist.noCategories")}
              </Typography>
            ) : null}
          </>
        ) : null}
        {stock && !selectedIds.length ? (
          <Typography color="error" role="alert" mt={1}>
            {t("watchlist.categoryRequired")}
          </Typography>
        ) : null}
        {error ? (
          <Typography color="error" role="alert" mt={1}>
            {error}
          </Typography>
        ) : null}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button disabled={pending} onClick={resetAndClose} sx={{ minHeight: 44 }}>
          {t("watchlist.cancel")}
        </Button>
        <Button
          variant="contained"
          disabled={!stock || !selectedIds.length || pending}
          onClick={() => void save()}
          sx={{ minHeight: 44, minWidth: 112 }}
          startIcon={pending ? <CircularProgress size={18} color="inherit" /> : undefined}
        >
          {pending ? t("watchlist.saving") : t("watchlist.save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
