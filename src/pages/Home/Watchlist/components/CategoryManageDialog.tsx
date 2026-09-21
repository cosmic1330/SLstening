import AddIcon from "@mui/icons-material/Add";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PushPinIcon from "@mui/icons-material/PushPin";
import PushPinOutlinedIcon from "@mui/icons-material/PushPinOutlined";
import SearchIcon from "@mui/icons-material/Search";
import {
  Alert,
  Box,
  Button,
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
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import useStocksStore, { isDefaultCategory } from "../../../../store/Stock.store";
import { semanticTokens } from "../../../../theme";
import { CategoryType } from "../../../../types";

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
  const {
    categories,
    stocks,
    pinnedCategoryIds,
    addCategory,
    renameCategory,
    removeCategory,
    togglePinnedCategory,
    reorderPinnedCategories,
  } = useStocksStore();
  const [pinnedDraft, setPinnedDraft] = useState<string[]>([]);
  const [editor, setEditor] = useState<{ id?: string; name: string } | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<CategoryType | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (open) {
      setPinnedDraft(pinnedCategoryIds);
      setEditor(null);
      setDeleteCandidate(null);
      setError("");
      setQuery("");
    }
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

  const close = () => {
    if (!pending) onClose();
  };

  return (
    <Dialog open={open} onClose={close} fullScreen={fullScreen} fullWidth maxWidth="sm" PaperProps={{ sx: { bgcolor: semanticTokens.analysis.surface, color: semanticTokens.analysis.text, backgroundImage: "none" } }}>
      <DialogTitle component="div">
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography component="h2" variant="h6" fontWeight={900}>{t("watchlist.manage")}</Typography>
          <IconButton disabled={pending} aria-label={t("watchlist.close")} onClick={close} sx={{ minWidth: 44, minHeight: 44 }}><CloseIcon /></IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent>
        {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
        {deleteCandidate ? (
          <Stack spacing={2} py={1}>
            <Typography variant="h6">{t("watchlist.deleteTitle", { name: deleteCandidate.name })}</Typography>
            <Typography color="text.secondary">{t("watchlist.deleteMessage", { count: orphanCount })}</Typography>
          </Stack>
        ) : (
          <>
            {editor ? (
              <Box component="form" onSubmit={(event) => { event.preventDefault(); void saveName(); }} sx={{ p: 1.5, mb: 2, border: `1px solid ${semanticTokens.analysis.border}`, borderRadius: 2 }}>
                <TextField autoFocus fullWidth disabled={pending} label={t("watchlist.categoryName")} value={editor.name} onChange={(event) => setEditor({ ...editor, name: event.target.value })} error={Boolean(error)} />
                <Stack direction="row" justifyContent="flex-end" spacing={1} mt={1}>
                  <Button disabled={pending} onClick={() => { setEditor(null); setError(""); }} sx={{ minHeight: 44 }}>{t("watchlist.cancel")}</Button>
                  <Button disabled={pending} type="submit" variant="contained" sx={{ minHeight: 44 }}>{t("watchlist.save")}</Button>
                </Stack>
              </Box>
            ) : (
              <Button fullWidth variant="outlined" startIcon={<AddIcon />} onClick={() => setEditor({ name: "" })} sx={{ minHeight: 44, mb: 2 }}>{t("watchlist.newCategory")}</Button>
            )}
            {defaultCategory ? (
              <Stack direction="row" alignItems="center" spacing={1} sx={{ minHeight: 52, px: 1 }}>
                <LockOutlinedIcon fontSize="small" aria-hidden="true" />
                <Box flex={1}><Typography fontWeight={800}>{t("watchlist.defaultName")}</Typography><Typography variant="caption" color="text.secondary">{t("watchlist.defaultLocked")}</Typography></Box>
                <Typography variant="caption" color="text.secondary">{t("watchlist.stockCount", { count: defaultCategory.stockIds.length })}</Typography>
              </Stack>
            ) : null}
            <Divider sx={{ my: 1 }} />
            <TextField
              fullWidth
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              label={t("watchlist.categorySearch")}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
              sx={{ mb: 1 }}
            />
            <Stack spacing={0.5}>
              {filteredCategories.map((category) => {
                const pinned = pinnedDraft.includes(category.id);
                return (
                  <Stack key={category.id} direction="row" alignItems="center" spacing={0.5} sx={{ minHeight: 52, px: 1, borderRadius: 1.5, bgcolor: category.id === editor?.id ? semanticTokens.analysis.surfaceSubtle : "transparent" }}>
                    <Box flex={1} minWidth={0}><Typography noWrap fontWeight={700}>{category.name}</Typography><Typography variant="caption" color="text.secondary">{t("watchlist.stockCount", { count: category.stockIds.length })}</Typography></Box>
                    <Tooltip title={pinned ? t("watchlist.unpin") : t("watchlist.pin")}><IconButton disabled={pending} aria-label={pinned ? t("watchlist.unpinCategory", { name: category.name }) : t("watchlist.pinCategory", { name: category.name })} onClick={() => void togglePin(category.id)} sx={{ minWidth: 44, minHeight: 44 }}>{pinned ? <PushPinIcon /> : <PushPinOutlinedIcon />}</IconButton></Tooltip>
                    <Tooltip title={t("watchlist.rename")}><IconButton disabled={pending} aria-label={t("watchlist.renameCategory", { name: category.name })} onClick={() => { setEditor({ id: category.id, name: category.name }); setError(""); }} sx={{ minWidth: 44, minHeight: 44 }}><EditOutlinedIcon /></IconButton></Tooltip>
                    <Tooltip title={t("watchlist.delete")}><IconButton disabled={pending} color="error" aria-label={t("watchlist.deleteCategory", { name: category.name })} onClick={() => setDeleteCandidate(category)} sx={{ minWidth: 44, minHeight: 44 }}><DeleteOutlineIcon /></IconButton></Tooltip>
                  </Stack>
                );
              })}
              {!customCategories.length ? <Typography color="text.secondary" textAlign="center" py={3}>{t("watchlist.noCustomCategories")}</Typography> : null}
              {customCategories.length > 0 && !filteredCategories.length ? <Typography color="text.secondary" textAlign="center" py={3}>{t("watchlist.noCategories")}</Typography> : null}
            </Stack>
            {pinnedCategories.length ? (
              <Box mt={3}>
                <Typography fontWeight={800}>{t("watchlist.pinnedOrder")}</Typography>
                <Typography variant="body2" color="text.secondary" mb={1}>{t("watchlist.pinnedOrderHint")}</Typography>
                <Reorder.Group axis="y" values={pinnedDraft} onReorder={setPinnedDraft} style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {pinnedCategories.map((category, index) => (
                    <Reorder.Item key={category.id} value={category.id} dragListener={!reduceMotion} style={{ listStyle: "none" }}>
                      <Stack direction="row" alignItems="center" sx={{ minHeight: 48, px: 1, mb: 0.5, borderRadius: 1.5, bgcolor: semanticTokens.analysis.surfaceSubtle }}>
                        <PushPinIcon fontSize="small" sx={{ mr: 1 }} /><Typography flex={1}>{category.name}</Typography>
                        <IconButton disabled={index === 0 || pending} aria-label={t("watchlist.moveUp", { name: category.name })} onClick={() => setPinnedDraft((ids) => move(ids, index, -1))} sx={{ minWidth: 44, minHeight: 44 }}><ArrowUpwardIcon /></IconButton>
                        <IconButton disabled={index === pinnedDraft.length - 1 || pending} aria-label={t("watchlist.moveDown", { name: category.name })} onClick={() => setPinnedDraft((ids) => move(ids, index, 1))} sx={{ minWidth: 44, minHeight: 44 }}><ArrowDownwardIcon /></IconButton>
                      </Stack>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              </Box>
            ) : null}
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        {deleteCandidate ? (
          <><Button disabled={pending} onClick={() => setDeleteCandidate(null)} sx={{ minHeight: 44 }}>{t("watchlist.cancel")}</Button><Button disabled={pending} color="error" variant="contained" onClick={() => void confirmDelete()} sx={{ minHeight: 44 }}>{t("watchlist.confirmDelete")}</Button></>
        ) : (
          <><Button disabled={pending} onClick={close} sx={{ minHeight: 44 }}>{t("watchlist.close")}</Button><Button disabled={pending || JSON.stringify(pinnedDraft) === JSON.stringify(pinnedCategoryIds)} variant="contained" onClick={() => void applyPinnedOrder()} sx={{ minHeight: 44 }}>{t("watchlist.applyOrder")}</Button></>
        )}
      </DialogActions>
    </Dialog>
  );
}
