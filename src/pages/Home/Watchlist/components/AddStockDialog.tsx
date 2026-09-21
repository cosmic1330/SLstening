import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import SearchIcon from "@mui/icons-material/Search";
import {
  Alert,
  Autocomplete,
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Reorder, useDragControls, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import useStocksStore from "../../../../store/Stock.store";
import { primitiveTokens, semanticTokens } from "../../../../theme";
import { StockStoreType } from "../../../../types";

interface AddStockDialogProps {
  open: boolean;
  activeCategoryId: string;
  onClose: () => void;
}

interface SortableStockRowProps {
  stock: StockStoreType;
  pending: boolean;
  onRemove: (stockId: string) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

function SortableStockRow({
  stock,
  pending,
  onRemove,
  onDragStart,
  onDragEnd,
}: SortableStockRowProps) {
  const { t } = useTranslation();
  const controls = useDragControls();
  const reduceMotion = useReducedMotion();

  return (
    <Reorder.Item
      value={stock.id}
      drag="y"
      dragListener={false}
      dragControls={controls}
      layout={reduceMotion ? undefined : true}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.16 }}
      style={{ listStyle: "none" }}
      onDragEnd={onDragEnd}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.5}
        sx={{
          minHeight: 56,
          px: 0.75,
          mb: 0.75,
          borderRadius: primitiveTokens.radius.md,
          bgcolor: semanticTokens.analysis.surfaceSubtle,
        }}
      >
        <IconButton
          disabled={pending}
          aria-label={t("watchlist.dragHandle", { name: stock.name })}
          onPointerDown={(event) => {
            if (pending) return;
            onDragStart();
            controls.start(event);
          }}
          sx={{
            minWidth: 44,
            minHeight: 44,
            color: semanticTokens.analysis.textMuted,
            cursor: pending ? "default" : "grab",
            "&:active": { cursor: "grabbing" },
          }}
        >
          <DragIndicatorIcon aria-hidden="true" />
        </IconButton>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            fontWeight={800}
            sx={{ overflowWrap: "anywhere", lineHeight: 1.25 }}
          >
            {stock.id}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", overflowWrap: "anywhere" }}
          >
            {stock.name}
          </Typography>
        </Box>
        <IconButton
          disabled={pending}
          aria-label={t("watchlist.removeFromCurrent", { name: stock.name })}
          onClick={() => onRemove(stock.id)}
          sx={{
            minWidth: 44,
            minHeight: 44,
            color: semanticTokens.market.loss,
          }}
        >
          <DeleteOutlineIcon aria-hidden="true" />
        </IconButton>
      </Stack>
    </Reorder.Item>
  );
}

const sameOrder = (left: string[], right: string[]) =>
  left.length === right.length && left.every((id, index) => id === right[index]);

export default function AddStockDialog({
  open,
  activeCategoryId,
  onClose,
}: AddStockDialogProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const categories = useStocksStore((state) => state.categories);
  const menu = useStocksStore((state) => state.menu);
  const stocks = useStocksStore((state) => state.stocks);
  const addStockToCategory = useStocksStore((state) => state.addStockToCategory);
  const removeStockFromCategory = useStocksStore((state) => state.removeStockFromCategory);
  const updateStockOrder = useStocksStore((state) => state.updateStockOrder);

  const [draftIds, setDraftIds] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const draftIdsRef = useRef<string[]>([]);
  const dragBeforeRef = useRef<string[] | null>(null);
  const pendingRef = useRef(false);

  const activeCategory = useMemo(
    () => categories.find((category) => category.id === activeCategoryId),
    [activeCategoryId, categories],
  );
  const stockById = useMemo(() => {
    const result = new Map<string, StockStoreType>();
    [...menu, ...stocks].forEach((stock) => result.set(stock.id, stock));
    return result;
  }, [menu, stocks]);
  const currentStockIds = activeCategory?.stockIds ?? [];
  const currentStocks = useMemo(
    () =>
      draftIds
        .map((id) => stockById.get(id))
        .filter((stock): stock is StockStoreType => Boolean(stock)),
    [draftIds, stockById],
  );
  const options = useMemo(() => [...stockById.values()], [stockById]);

  useEffect(() => {
    if (!open) return;
    const next = [...currentStockIds];
    draftIdsRef.current = next;
    setDraftIds(next);
    setSearchInput("");
    setError("");
    dragBeforeRef.current = null;
  }, [activeCategoryId, open]);

  const startMutation = () => {
    if (pendingRef.current) return false;
    pendingRef.current = true;
    setPending(true);
    setError("");
    return true;
  };

  const finishMutation = () => {
    pendingRef.current = false;
    setPending(false);
  };

  const setDraft = (next: string[]) => {
    draftIdsRef.current = next;
    setDraftIds(next);
  };

  const handleRemove = async (stockId: string) => {
    if (!startMutation()) return;
    const before = [...draftIdsRef.current];
    setDraft(before.filter((id) => id !== stockId));
    try {
      await removeStockFromCategory(activeCategoryId, stockId);
    } catch {
      setDraft(before);
      setError(t("watchlist.removeFailed"));
    } finally {
      finishMutation();
    }
  };

  const persistOrder = async (before: string[], next: string[]) => {
    if (!startMutation()) return;
    try {
      await updateStockOrder(activeCategoryId, next);
    } catch {
      setDraft(before);
      setError(t("watchlist.orderSaveFailed"));
    } finally {
      finishMutation();
    }
  };

  const handleDragStart = () => {
    if (!pendingRef.current) dragBeforeRef.current = [...draftIdsRef.current];
  };

  const handleDragEnd = () => {
    const before = dragBeforeRef.current;
    dragBeforeRef.current = null;
    if (!before) return;
    const next = [...draftIdsRef.current];
    if (sameOrder(before, next)) return;
    void persistOrder(before, next);
  };

  const handleStockSelect = async (stock: StockStoreType | null) => {
    setSearchInput("");
    if (!stock || pendingRef.current) return;

    const before = [...draftIdsRef.current];
    const alreadyInCategory = before.includes(stock.id);
    if (alreadyInCategory && before[0] === stock.id) return;

    const next = [stock.id, ...before.filter((id) => id !== stock.id)];
    if (!startMutation()) return;
    setDraft(next);
    try {
      if (alreadyInCategory) {
        await updateStockOrder(activeCategoryId, next);
      } else {
        await addStockToCategory(activeCategoryId, stock.id);
      }
    } catch {
      setDraft(before);
      setError(
        t(
          alreadyInCategory
            ? "watchlist.orderSaveFailed"
            : "watchlist.addFailed",
        ),
      );
    } finally {
      finishMutation();
    }
  };

  const resetAndClose = () => {
    if (pendingRef.current) return;
    setSearchInput("");
    setError("");
    dragBeforeRef.current = null;
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={pending ? undefined : resetAndClose}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          bgcolor: semanticTokens.analysis.surface,
          color: semanticTokens.analysis.text,
          backgroundImage: "none",
          height: fullScreen ? "100%" : "min(80vh, 720px)",
          maxHeight: fullScreen ? "100%" : "min(80vh, 720px)",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <DialogTitle component="div" sx={{ flexShrink: 0 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography component="h2" variant="h6" fontWeight={900}>
            {t("watchlist.manageStocks")}
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
      <DialogContent
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          overflow: "hidden",
          px: { xs: 2, sm: 3 },
          pb: 3,
        }}
      >
        {error ? (
          <Alert severity="error" role="alert" sx={{ mb: 2, flexShrink: 0 }}>
            {error}
          </Alert>
        ) : null}

        <Box
          component="section"
          aria-labelledby="search-add-stock-title"
          sx={{ flexShrink: 0 }}
        >
          <Typography
            id="search-add-stock-title"
            component="h3"
            variant="subtitle1"
            fontWeight={900}
            sx={{ mb: 1 }}
          >
            {t("watchlist.searchAddStock")}
          </Typography>
          <Autocomplete
            options={options}
            value={null}
            inputValue={searchInput}
            disabled={pending}
            onInputChange={(_, value) => setSearchInput(value)}
            onChange={(_, value) => void handleStockSelect(value)}
            getOptionLabel={(item) => `${item.id} ${item.name}`}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            noOptionsText={t("watchlist.noStockMatches")}
            renderOption={(props, option) => {
              const isCurrent = draftIds.includes(option.id);
              return (
                <Box component="li" {...props} sx={{ minHeight: 52, minWidth: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%", minWidth: 0 }}>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography fontWeight={800} sx={{ overflowWrap: "anywhere" }}>
                        {option.id}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>
                        {option.name}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="primary" sx={{ flexShrink: 0, textAlign: "right" }}>
                      {t(isCurrent ? "watchlist.moveToTop" : "watchlist.addToCurrent")}
                    </Typography>
                  </Stack>
                </Box>
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                autoFocus
                label={t("watchlist.stockSearch")}
                placeholder={t("watchlist.searchAddStock")}
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon aria-hidden="true" />
                    </InputAdornment>
                  ),
                }}
              />
            )}
          />
        </Box>

        <Box
          component="section"
          aria-labelledby="current-category-stocks-title"
          sx={{
            mt: 3,
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
          }}
        >
          <Typography
            id="current-category-stocks-title"
            component="h3"
            variant="subtitle1"
            fontWeight={900}
            sx={{ mb: 1, flexShrink: 0 }}
          >
            {t("watchlist.currentCategoryStocks")}
          </Typography>
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              pr: 0.5,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Reorder.Group
              axis="y"
              values={draftIds}
              onReorder={setDraft}
              style={{ listStyle: "none", margin: 0, padding: 0 }}
            >
              {currentStocks.map((stock) => (
                <SortableStockRow
                  key={stock.id}
                  stock={stock}
                  pending={pending}
                  onRemove={(stockId) => void handleRemove(stockId)}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                />
              ))}
            </Reorder.Group>
            {!currentStocks.length ? (
              <Box
                sx={{
                  flex: 1,
                  minHeight: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  py: 3,
                }}
              >
                <Typography color="text.secondary" textAlign="center">
                  {t("watchlist.currentCategoryEmpty")}
                </Typography>
              </Box>
            ) : null}
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
