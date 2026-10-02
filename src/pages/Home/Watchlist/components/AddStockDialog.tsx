import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import SearchIcon from "@mui/icons-material/Search";
import {
  Alert,
  Autocomplete,
  Box,
  CircularProgress,
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
import { StockStoreType } from "../../../../types";
import {
  playfulDialogContentSx,
  playfulDialogPaperSx,
  playfulDialogTitleSx,
  playfulFieldSx,
  playfulIconButtonSx,
  playfulPalette,
  playfulPanelSx,
} from "./playfulStyles";

interface AddStockDialogProps {
  open: boolean;
  activeCategoryId: string;
  onClose: () => void;
}

interface SortableStockRowProps {
  stock: StockStoreType;
  index: number;
  total: number;
  pending: boolean;
  onRemove: (stockId: string) => void;
  onMove: (stockId: string, offset: -1 | 1) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

function SortableStockRow({
  stock,
  index,
  total,
  pending,
  onRemove,
  onMove,
  onDragStart,
  onDragEnd,
}: SortableStockRowProps) {
  const { t } = useTranslation();
  const controls = useDragControls();
  const reduceMotion = useReducedMotion();

  return (
    <Reorder.Item
      value={stock.id}
      drag={reduceMotion ? false : "y"}
      dragListener={false}
      dragControls={controls}
      layout={reduceMotion ? (false as unknown as true) : true}
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
          border: `2px solid rgba(25, 25, 25, 0.16)`,
          borderRadius: 2,
          bgcolor: "rgba(255, 255, 255, 0.78)",
          boxShadow: "2px 3px 0 rgba(25, 25, 25, 0.18)",
        }}
      >
        {reduceMotion ? (
          <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }}>
            <IconButton
              disabled={pending || index === 0}
              aria-label={t("watchlist.moveUp", { name: stock.name })}
              onClick={() => onMove(stock.id, -1)}
              sx={playfulIconButtonSx(playfulPalette.muted)}
            >
              <ArrowUpwardIcon aria-hidden="true" />
            </IconButton>
            <IconButton
              disabled={pending || index === total - 1}
              aria-label={t("watchlist.moveDown", { name: stock.name })}
              onClick={() => onMove(stock.id, 1)}
              sx={playfulIconButtonSx(playfulPalette.muted)}
            >
              <ArrowDownwardIcon aria-hidden="true" />
            </IconButton>
          </Stack>
        ) : (
          <IconButton
            disabled={pending}
            aria-label={t("watchlist.dragHandle", { name: stock.name })}
            onPointerDown={(event) => {
              if (pending || reduceMotion) return;
              onDragStart();
              controls.start(event);
            }}
            sx={{
              color: playfulPalette.muted,
              cursor: pending ? "default" : "grab",
              "&:active": { cursor: "grabbing" },
              ...playfulIconButtonSx(playfulPalette.muted),
            }}
          >
            <DragIndicatorIcon aria-hidden="true" />
          </IconButton>
        )}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            fontWeight={800}
            sx={{ overflowWrap: "anywhere", lineHeight: 1.25, fontFamily: '"Roboto Mono", "SFMono-Regular", Consolas, monospace', fontVariantNumeric: "tabular-nums" }}
          >
            {stock.id}
          </Typography>
          <Typography
            variant="caption"
            sx={{ display: "block", color: playfulPalette.muted, overflowWrap: "anywhere" }}
          >
            {stock.name}
          </Typography>
        </Box>
        <IconButton
          disabled={pending}
          aria-label={t("watchlist.removeFromCurrent", { name: stock.name })}
          onClick={() => onRemove(stock.id)}
          sx={{
            ...playfulIconButtonSx(playfulPalette.danger),
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
  const activeCategoryName = activeCategory && activeCategory.id !== "default-watchlist" && !activeCategory.isDefault
    ? activeCategory.name
    : t("watchlist.defaultName");

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

  const handleMove = (stockId: string, offset: -1 | 1) => {
    if (pendingRef.current) return;
    const before = [...draftIdsRef.current];
    const index = before.indexOf(stockId);
    const nextIndex = index + offset;
    if (index < 0 || nextIndex < 0 || nextIndex >= before.length) return;
    const next = [...before];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    setDraft(next);
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
      slotProps={{ paper: { sx: playfulDialogPaperSx } }}
    >
      <DialogTitle component="div" sx={playfulDialogTitleSx}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1.5}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
              <Box aria-hidden="true" sx={{ width: 38, height: 38, flexShrink: 0, display: "grid", placeItems: "center", border: `2px solid ${playfulPalette.outline}`, borderRadius: 2, bgcolor: playfulPalette.blue, boxShadow: `2px 2px 0 ${playfulPalette.outline}` }}>
                <SearchIcon fontSize="small" />
              </Box>
              <Typography component="h2" sx={{ minWidth: 0, color: playfulPalette.ink, fontSize: { xs: "1.25rem", sm: "1.4rem" }, fontWeight: 950, lineHeight: 1.15, overflowWrap: "anywhere" }}>
                {t("watchlist.manageStocks")}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1, flexWrap: "wrap" }}>
              <Typography component="span" sx={{ color: playfulPalette.muted, fontSize: "0.78rem", fontWeight: 700, overflowWrap: "anywhere" }}>
                {t("watchlist.currentCategoryName", { name: activeCategoryName })}
              </Typography>
              <Typography component="span" sx={{ px: 0.9, py: 0.35, border: `1.5px solid ${playfulPalette.outline}`, borderRadius: 99, bgcolor: playfulPalette.yellow, color: playfulPalette.ink, fontSize: "0.7rem", fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>
                {t("watchlist.stockCount", { count: currentStocks.length })}
              </Typography>
            </Stack>
          </Box>
          <IconButton
            disabled={pending}
            aria-label={t("watchlist.close")}
            onClick={resetAndClose}
            sx={{ ...playfulIconButtonSx(), bgcolor: playfulPalette.yellow, "&:hover": { bgcolor: playfulPalette.yellow } }}
          >
            <CloseIcon aria-hidden="true" />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent
        sx={{
          ...playfulDialogContentSx,
          display: "flex",
          flexDirection: "column",
        }}
        aria-busy={pending}
      >
        {error ? (
          <Alert severity="error" role="alert" sx={{ mb: 1.5, flexShrink: 0, border: `2px solid ${playfulPalette.outline}`, borderRadius: 2, bgcolor: playfulPalette.dangerSoft, color: playfulPalette.ink, fontWeight: 750 }}>
            {error}
          </Alert>
        ) : null}

        {pending ? (
          <Stack direction="row" spacing={0.75} alignItems="center" role="status" aria-live="polite" sx={{ mb: 1.25, color: playfulPalette.blueDark, fontSize: "0.78rem", fontWeight: 850 }}>
            <CircularProgress size={15} sx={{ color: playfulPalette.blueDark }} aria-hidden="true" />
            {t("watchlist.saving")}
          </Stack>
        ) : null}

        <Box
          component="section"
          aria-labelledby="search-add-stock-title"
          sx={{ ...playfulPanelSx, flexShrink: 0, bgcolor: "rgba(107, 183, 232, 0.20)" }}
        >
          <Typography
            id="search-add-stock-title"
            component="h3"
            sx={{ mb: 1.1, color: playfulPalette.ink, fontSize: "0.96rem", fontWeight: 950 }}
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
            slotProps={{
              paper: {
                sx: {
                  mt: 0.75,
                  border: `2px solid ${playfulPalette.outline}`,
                  borderRadius: 2,
                  bgcolor: playfulPalette.paper,
                  color: playfulPalette.ink,
                  boxShadow: `4px 5px 0 ${playfulPalette.outline}`,
                  "& .MuiAutocomplete-noOptions": {
                    color: playfulPalette.muted,
                  },
                  "& .MuiAutocomplete-option": {
                    color: playfulPalette.ink,
                  },
                  "& .MuiAutocomplete-option.Mui-focused": {
                    bgcolor: "rgba(107, 183, 232, 0.28)",
                    boxShadow: `inset 0 0 0 2px ${playfulPalette.blueDark}`,
                    color: playfulPalette.ink,
                  },
                  "& .MuiAutocomplete-option[aria-selected=\"true\"]": {
                    bgcolor: "rgba(201, 189, 242, 0.32)",
                    color: playfulPalette.ink,
                  },
                },
              },
              listbox: {
                sx: {
                  color: playfulPalette.ink,
                  "& .MuiAutocomplete-option": {
                    color: playfulPalette.ink,
                  },
                  "& .MuiAutocomplete-option.Mui-focused": {
                    bgcolor: "rgba(107, 183, 232, 0.28)",
                    boxShadow: `inset 0 0 0 2px ${playfulPalette.blueDark}`,
                    color: playfulPalette.ink,
                  },
                },
              },
            }}
            renderOption={(props, option) => {
              const isCurrent = draftIds.includes(option.id);
              return (
                <Box component="li" {...props} sx={{ minHeight: 56, minWidth: 0, borderBottom: "1px solid rgba(25, 25, 25, 0.12)", color: playfulPalette.ink, "&:hover": { bgcolor: "rgba(107, 183, 232, 0.15)" }, "&.Mui-focused": { bgcolor: "rgba(107, 183, 232, 0.28)", boxShadow: `inset 0 0 0 2px ${playfulPalette.blueDark}` }, "&[aria-selected=\"true\"]": { bgcolor: "rgba(201, 189, 242, 0.32)" } }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%", minWidth: 0 }}>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography fontWeight={900} sx={{ overflowWrap: "anywhere", fontFamily: '"Roboto Mono", "SFMono-Regular", Consolas, monospace', fontVariantNumeric: "tabular-nums" }}>
                        {option.id}
                      </Typography>
                      <Typography variant="caption" sx={{ color: playfulPalette.muted, overflowWrap: "anywhere" }}>
                        {option.name}
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ flexShrink: 0, textAlign: "right", color: playfulPalette.blueDark, fontWeight: 900 }}>
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
                sx={playfulFieldSx}
              />
            )}
          />
        </Box>

        <Box
          component="section"
          aria-labelledby="current-category-stocks-title"
          sx={{
            ...playfulPanelSx,
            bgcolor: "rgba(168, 216, 184, 0.24)",
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
            sx={{ mb: 1, flexShrink: 0, color: playfulPalette.ink, fontSize: "0.96rem", fontWeight: 950 }}
          >
            {t("watchlist.currentCategoryStocks")}
          </Typography>
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              pr: 0.5,
              pl: 0.25,
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
                  index={draftIds.indexOf(stock.id)}
                  total={currentStocks.length}
                  pending={pending}
                  onRemove={(stockId) => void handleRemove(stockId)}
                  onMove={handleMove}
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
                <Typography sx={{ color: playfulPalette.muted, fontWeight: 700, textAlign: "center", maxWidth: 280 }}>
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
