import AddIcon from "@mui/icons-material/Add";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PushPinIcon from "@mui/icons-material/PushPin";
import PushPinOutlinedIcon from "@mui/icons-material/PushPinOutlined";
import SearchIcon from "@mui/icons-material/Search";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Reorder, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import useStocksStore, { isDefaultCategory } from "../../../../store/Stock.store";
import { CategoryType } from "../../../../types";
import {
  playfulButtonSx,
  playfulDialogContentSx,
  playfulDialogPaperSx,
  playfulDialogTitleSx,
  playfulFieldSx,
  playfulIconButtonSx,
  playfulPalette,
  playfulPanelSx,
} from "./playfulStyles";

interface CategoryManageDialogProps {
  open: boolean;
  onClose: () => void;
}

const move = (ids: string[], index: number, offset: number) => {
  const nextIndex = index + offset;
  if (nextIndex < 0 || nextIndex >= ids.length) return ids;
  const next = [...ids];
  [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
  return next;
};

export default function CategoryManageDialog({ open, onClose }: CategoryManageDialogProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const reduceMotion = useReducedMotion();
  const categories = useStocksStore((state) => state.categories);
  const stocks = useStocksStore((state) => state.stocks);
  const pinnedCategoryIds = useStocksStore((state) => state.pinnedCategoryIds);
  const addCategory = useStocksStore((state) => state.addCategory);
  const renameCategory = useStocksStore((state) => state.renameCategory);
  const removeCategory = useStocksStore((state) => state.removeCategory);
  const togglePinnedCategory = useStocksStore((state) => state.togglePinnedCategory);
  const reorderPinnedCategories = useStocksStore((state) => state.reorderPinnedCategories);
  const [pinnedDraft, setPinnedDraft] = useState<string[]>([]);
  const [editor, setEditor] = useState<{ id?: string; name: string } | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<CategoryType | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    setPinnedDraft([...pinnedCategoryIds]);
    setEditor(null);
    setDeleteCandidate(null);
    setError("");
    setQuery("");
  // Seed the draft only when the dialog opens; store updates must not erase an in-progress reorder.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const defaultCategory = categories.find(isDefaultCategory);
  const customCategories = categories.filter((category) => !isDefaultCategory(category));
  const filteredCategories = customCategories.filter((category) => category.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const pinnedCategories = useMemo(
    () => pinnedDraft.map((id) => categories.find((category) => category.id === id)).filter((category): category is CategoryType => Boolean(category)),
    [categories, pinnedDraft],
  );
  const orphanCount = useMemo(() => {
    if (!deleteCandidate) return 0;
    const otherIds = new Set(categories.filter((category) => category.id !== deleteCandidate.id).flatMap((category) => category.stockIds));
    return deleteCandidate.stockIds.filter((id) => !otherIds.has(id) && stocks.some((stock) => stock.id === id)).length;
  }, [categories, deleteCandidate, stocks]);
  const isDraftDirty = JSON.stringify(pinnedDraft) !== JSON.stringify(pinnedCategoryIds);

  const errorText = (value: unknown) => {
    const code = value instanceof Error ? value.message : "";
    return t(`watchlist.errors.${code}`, { defaultValue: t("watchlist.saveFailed") });
  };

  const saveName = async () => {
    if (!editor || pending) return;
    setPending(true);
    setError("");
    try {
      if (editor.id) await renameCategory(editor.id, editor.name);
      else await addCategory(editor.name);
      setEditor(null);
    } catch (value) {
      setError(errorText(value));
    } finally {
      setPending(false);
    }
  };

  const togglePin = async (id: string) => {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      await togglePinnedCategory(id);
      setPinnedDraft((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    } catch (value) {
      setError(errorText(value));
    } finally {
      setPending(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteCandidate || pending) return;
    setPending(true);
    setError("");
    try {
      await removeCategory(deleteCandidate.id);
      setPinnedDraft((current) => current.filter((id) => id !== deleteCandidate.id));
      setDeleteCandidate(null);
    } catch {
      setError(t("watchlist.saveFailed"));
    } finally {
      setPending(false);
    }
  };

  const applyPinnedOrder = async () => {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      await reorderPinnedCategories(pinnedDraft);
    } catch {
      setError(t("watchlist.saveFailed"));
    } finally {
      setPending(false);
    }
  };

  const close = useCallback(() => {
    if (!pending) onClose();
  }, [onClose, pending]);

  return (
    <Dialog
      open={open}
      onClose={close}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="sm"
      slotProps={{ paper: { sx: playfulDialogPaperSx } }}
    >
      <DialogTitle component="div" sx={playfulDialogTitleSx}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1.5}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
            <Box aria-hidden="true" sx={{ width: 38, height: 38, flexShrink: 0, display: "grid", placeItems: "center", border: `2px solid ${playfulPalette.outline}`, borderRadius: 2, bgcolor: playfulPalette.pink, boxShadow: `2px 2px 0 ${playfulPalette.outline}` }}>
              <FolderOutlinedIcon fontSize="small" />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography component="h2" sx={{ color: playfulPalette.ink, fontSize: { xs: "1.25rem", sm: "1.4rem" }, fontWeight: 950, lineHeight: 1.15, overflowWrap: "anywhere" }}>
                {t("watchlist.manage")}
              </Typography>
              <Typography component="p" sx={{ mt: 0.45, color: playfulPalette.muted, fontSize: "0.76rem", fontWeight: 650, lineHeight: 1.35 }}>
                {t("watchlist.pinnedOrderHint")}
              </Typography>
            </Box>
          </Stack>
          <IconButton
            disabled={pending}
            aria-label={t("watchlist.close")}
            onClick={close}
            sx={{ ...playfulIconButtonSx(), bgcolor: playfulPalette.yellow, "&:hover": { bgcolor: playfulPalette.yellow } }}
          >
            <CloseIcon aria-hidden="true" />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent sx={playfulDialogContentSx} aria-busy={pending}>
        {error ? (
          <Alert role="alert" severity="error" sx={{ mb: 1.5, border: `2px solid ${playfulPalette.outline}`, borderRadius: 2, bgcolor: playfulPalette.dangerSoft, color: playfulPalette.ink, fontWeight: 750 }}>
            {error}
          </Alert>
        ) : null}
        {pending ? (
          <Stack direction="row" spacing={0.75} alignItems="center" role="status" aria-live="polite" sx={{ mb: 1.25, color: playfulPalette.blueDark, fontSize: "0.78rem", fontWeight: 850 }}>
            <CircularProgress size={15} sx={{ color: playfulPalette.blueDark }} aria-hidden="true" />
            {t("watchlist.saving")}
          </Stack>
        ) : null}

        {deleteCandidate ? (
          <Box component="section" aria-labelledby="delete-category-title" sx={{ ...playfulPanelSx, bgcolor: playfulPalette.dangerSoft, mt: 0.5 }}>
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <Box aria-hidden="true" sx={{ width: 40, height: 40, flexShrink: 0, display: "grid", placeItems: "center", border: `2px solid ${playfulPalette.outline}`, borderRadius: 2, bgcolor: playfulPalette.danger, color: playfulPalette.white, boxShadow: `2px 2px 0 ${playfulPalette.outline}` }}>
                <DeleteOutlineIcon fontSize="small" />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography id="delete-category-title" component="h3" sx={{ color: playfulPalette.ink, fontSize: "1rem", fontWeight: 950, lineHeight: 1.2, overflowWrap: "anywhere" }}>
                  {t("watchlist.deleteTitle", { name: deleteCandidate.name })}
                </Typography>
                <Typography component="p" sx={{ mt: 0.75, color: playfulPalette.muted, fontSize: "0.82rem", fontWeight: 650, lineHeight: 1.45 }}>
                  {t("watchlist.deleteMessage", { count: orphanCount })}
                </Typography>
              </Box>
            </Stack>
          </Box>
        ) : (
          <>
            {editor ? (
              <Box
                component="form"
                aria-labelledby="category-editor-title"
                onSubmit={(event) => { event.preventDefault(); void saveName(); }}
                sx={{ ...playfulPanelSx, mb: 2, bgcolor: "rgba(244, 181, 208, 0.28)" }}
              >
                <Typography id="category-editor-title" component="h3" sx={{ color: playfulPalette.ink, fontSize: "0.98rem", fontWeight: 950 }}>
                  {editor.id ? t("watchlist.rename") : t("watchlist.newCategory")}
                </Typography>
                <TextField
                  autoFocus
                  fullWidth
                  disabled={pending}
                  label={t("watchlist.categoryName")}
                  value={editor.name}
                  onChange={(event) => setEditor({ ...editor, name: event.target.value })}
                  error={Boolean(error)}
                  sx={{ ...playfulFieldSx, mt: 1.25 }}
                />
                <Stack direction="row" justifyContent="flex-end" spacing={1} mt={1.5}>
                  <Button disabled={pending} type="button" onClick={() => { setEditor(null); setError(""); }} sx={playfulButtonSx(playfulPalette.white)}>
                    {t("watchlist.cancel")}
                  </Button>
                  <Button disabled={pending} type="submit" sx={playfulButtonSx(playfulPalette.blue)}>
                    {t("watchlist.save")}
                  </Button>
                </Stack>
              </Box>
            ) : (
              <Button
                fullWidth
                type="button"
                startIcon={<AddIcon aria-hidden="true" />}
                onClick={() => setEditor({ name: "" })}
                sx={{ ...playfulButtonSx(playfulPalette.blue), mb: 2, justifyContent: "flex-start", px: 1.5 }}
              >
                {t("watchlist.newCategory")}
              </Button>
            )}

            {defaultCategory ? (
              <Box component="section" aria-labelledby="default-watchlist-title" sx={{ ...playfulPanelSx, mb: 2, bgcolor: "rgba(201, 189, 242, 0.28)" }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box aria-hidden="true" sx={{ width: 38, height: 38, flexShrink: 0, display: "grid", placeItems: "center", border: `2px solid ${playfulPalette.outline}`, borderRadius: 2, bgcolor: playfulPalette.lavender, boxShadow: `2px 2px 0 ${playfulPalette.outline}` }}>
                    <LockOutlinedIcon fontSize="small" />
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography id="default-watchlist-title" component="h3" sx={{ color: playfulPalette.ink, fontSize: "0.94rem", fontWeight: 950 }}>
                      {t("watchlist.defaultName")}
                    </Typography>
                    <Typography component="p" sx={{ mt: 0.35, color: playfulPalette.muted, fontSize: "0.74rem", fontWeight: 650, lineHeight: 1.35 }}>
                      {t("watchlist.defaultLocked")}
                    </Typography>
                  </Box>
                  <Typography component="span" sx={{ flexShrink: 0, color: playfulPalette.ink, fontSize: "0.72rem", fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>
                    {t("watchlist.stockCount", { count: defaultCategory.stockIds.length })}
                  </Typography>
                </Stack>
              </Box>
            ) : null}

            <Divider sx={{ mb: 2, borderColor: "rgba(25, 25, 25, 0.18)" }} />
            <TextField
              fullWidth
              value={query}
              disabled={pending}
              onChange={(event) => setQuery(event.target.value)}
              label={t("watchlist.categorySearch")}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon aria-hidden="true" /></InputAdornment> }}
              sx={{ ...playfulFieldSx, mb: 1.25 }}
            />
            <Box component="section" aria-labelledby="custom-category-list-title">
              <Typography id="custom-category-list-title" component="h3" sx={{ mb: 0.75, color: playfulPalette.ink, fontSize: "0.9rem", fontWeight: 950 }}>
                {t("watchlist.categories")}
              </Typography>
              <Stack spacing={0.9}>
                {filteredCategories.map((category) => {
                  const pinned = pinnedDraft.includes(category.id);
                  return (
                    <Stack key={category.id} direction="row" alignItems="center" spacing={0.6} sx={{ minWidth: 0, minHeight: 64, px: 1, py: 0.65, border: `2px solid rgba(25, 25, 25, 0.14)`, borderRadius: 2, bgcolor: category.id === editor?.id ? "rgba(107, 183, 232, 0.24)" : "rgba(255, 255, 255, 0.72)" }}>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography noWrap component="p" sx={{ color: playfulPalette.ink, fontSize: "0.86rem", fontWeight: 850 }}>{category.name}</Typography>
                        <Typography component="p" sx={{ mt: 0.25, color: playfulPalette.muted, fontSize: "0.7rem", fontWeight: 650, fontVariantNumeric: "tabular-nums" }}>{t("watchlist.stockCount", { count: category.stockIds.length })}</Typography>
                      </Box>
                      <Tooltip title={pinned ? t("watchlist.unpin") : t("watchlist.pin")}>
                        <IconButton disabled={pending} aria-label={pinned ? t("watchlist.unpinCategory", { name: category.name }) : t("watchlist.pinCategory", { name: category.name })} onClick={() => void togglePin(category.id)} sx={{ ...playfulIconButtonSx(playfulPalette.blueDark), bgcolor: pinned ? playfulPalette.yellow : playfulPalette.white, "&:hover": { bgcolor: pinned ? playfulPalette.yellow : playfulPalette.white } }}>
                          {pinned ? <PushPinIcon aria-hidden="true" /> : <PushPinOutlinedIcon aria-hidden="true" />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t("watchlist.rename")}>
                        <IconButton disabled={pending} aria-label={t("watchlist.renameCategory", { name: category.name })} onClick={() => { setEditor({ id: category.id, name: category.name }); setError(""); }} sx={playfulIconButtonSx(playfulPalette.blueDark)}>
                          <EditOutlinedIcon aria-hidden="true" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t("watchlist.delete")}>
                        <IconButton disabled={pending} aria-label={t("watchlist.deleteCategory", { name: category.name })} onClick={() => setDeleteCandidate(category)} sx={playfulIconButtonSx(playfulPalette.danger)}>
                          <DeleteOutlineIcon aria-hidden="true" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  );
                })}
                {!customCategories.length ? <Typography sx={{ color: playfulPalette.muted, fontSize: "0.82rem", fontWeight: 650, textAlign: "center", py: 2.5 }}>{t("watchlist.noCustomCategories")}</Typography> : null}
                {customCategories.length > 0 && !filteredCategories.length ? <Typography sx={{ color: playfulPalette.muted, fontSize: "0.82rem", fontWeight: 650, textAlign: "center", py: 2.5 }}>{t("watchlist.noCategories")}</Typography> : null}
              </Stack>
            </Box>

            {pinnedCategories.length ? (
              <Box component="section" aria-labelledby="pinned-order-title" sx={{ ...playfulPanelSx, mt: 2.25, bgcolor: "rgba(243, 211, 109, 0.24)" }}>
                <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.5 }}>
                  <PushPinIcon fontSize="small" aria-hidden="true" />
                  <Typography id="pinned-order-title" component="h3" sx={{ color: playfulPalette.ink, fontSize: "0.94rem", fontWeight: 950 }}>
                    {t("watchlist.pinnedOrder")}
                  </Typography>
                </Stack>
                <Typography component="p" sx={{ mb: 1, color: playfulPalette.muted, fontSize: "0.74rem", fontWeight: 650, lineHeight: 1.4 }}>
                  {t("watchlist.pinnedOrderHint")}
                </Typography>
                <Reorder.Group axis="y" values={pinnedDraft} onReorder={setPinnedDraft} style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {pinnedCategories.map((category, index) => (
                    <Reorder.Item
                      key={category.id}
                      value={category.id}
                      dragListener={!reduceMotion}
                      layout={reduceMotion ? (false as unknown as true) : true}
                      transition={reduceMotion ? { duration: 0 } : { duration: 0.16 }}
                      style={{ listStyle: "none" }}
                    >
                      <Stack direction="row" alignItems="center" spacing={0.4} sx={{ minWidth: 0, minHeight: 56, px: 0.6, mb: 0.75, border: `2px solid rgba(25, 25, 25, 0.14)`, borderRadius: 2, bgcolor: "rgba(255, 255, 255, 0.72)" }}>
                        <PushPinIcon fontSize="small" sx={{ mx: 0.35, color: playfulPalette.blueDark }} aria-hidden="true" />
                        <Typography noWrap component="span" sx={{ minWidth: 0, flex: 1, color: playfulPalette.ink, fontSize: "0.82rem", fontWeight: 800 }}>{category.name}</Typography>
                        <IconButton disabled={index === 0 || pending} aria-label={t("watchlist.moveUp", { name: category.name })} onClick={() => setPinnedDraft((ids) => move(ids, index, -1))} sx={playfulIconButtonSx()}>
                          <ArrowUpwardIcon aria-hidden="true" />
                        </IconButton>
                        <IconButton disabled={index === pinnedDraft.length - 1 || pending} aria-label={t("watchlist.moveDown", { name: category.name })} onClick={() => setPinnedDraft((ids) => move(ids, index, 1))} sx={playfulIconButtonSx()}>
                          <ArrowDownwardIcon aria-hidden="true" />
                        </IconButton>
                      </Stack>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              </Box>
            ) : null}
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ position: "sticky", bottom: 0, flexShrink: 0, zIndex: 1, gap: 1, px: { xs: 2, sm: 3 }, py: { xs: 1.5, sm: 2 }, borderTop: `2px solid ${playfulPalette.outline}`, bgcolor: "rgba(255, 253, 248, 0.96)", flexWrap: "wrap" }}>
        {deleteCandidate ? (
          <>
            <Button disabled={pending} type="button" onClick={() => setDeleteCandidate(null)} sx={{ ...playfulButtonSx(playfulPalette.white), flex: { xs: 1, sm: "initial" } }}>
              {t("watchlist.cancel")}
            </Button>
            <Button disabled={pending} type="button" onClick={() => void confirmDelete()} sx={{ ...playfulButtonSx(playfulPalette.dangerSoft), color: playfulPalette.dangerText, flex: { xs: 1, sm: "initial" } }}>
              {t("watchlist.confirmDelete")}
            </Button>
          </>
        ) : (
          <>
            <Button disabled={pending} type="button" onClick={close} sx={{ ...playfulButtonSx(playfulPalette.white), flex: { xs: 1, sm: "initial" } }}>
              {t("watchlist.close")}
            </Button>
            <Button disabled={pending || !isDraftDirty} type="button" onClick={() => void applyPinnedOrder()} sx={{ ...playfulButtonSx(playfulPalette.blue), flex: { xs: 1, sm: "initial" } }}>
              {t("watchlist.applyOrder")}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
