import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import CloseIcon from "@mui/icons-material/Close";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, Typography, useMediaQuery, useTheme } from "@mui/material";
import { Reorder, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import useStocksStore from "../../../../store/Stock.store";
import { semanticTokens } from "../../../../theme";
import { StockStoreType } from "../../../../types";

interface StockSortDialogProps { open: boolean; categoryId: string; stocks: StockStoreType[]; onClose: () => void; }
const move = (ids: string[], index: number, offset: number) => { const target = index + offset; if (target < 0 || target >= ids.length) return ids; const next = [...ids]; [next[index], next[target]] = [next[target], next[index]]; return next; };

export default function StockSortDialog({ open, categoryId, stocks, onClose }: StockSortDialogProps) {
  const { t } = useTranslation(); const theme = useTheme(); const fullScreen = useMediaQuery(theme.breakpoints.down("sm")); const reduceMotion = useReducedMotion();
  const updateStockOrder = useStocksStore((state) => state.updateStockOrder);
  const [draft, setDraft] = useState<string[]>([]); const [pending, setPending] = useState(false); const [error, setError] = useState("");
  useEffect(() => { if (open) { setDraft(stocks.map((stock) => stock.id)); setError(""); } }, [open, stocks]);
  const save = async () => { setPending(true); setError(""); try { await updateStockOrder(categoryId, draft); onClose(); } catch { setError(t("watchlist.saveFailed")); } finally { setPending(false); } };
  return <Dialog open={open} onClose={pending ? undefined : onClose} fullScreen={fullScreen} fullWidth maxWidth="sm" PaperProps={{ sx: { bgcolor: semanticTokens.analysis.surface, color: semanticTokens.analysis.text, backgroundImage: "none" } }}><DialogTitle component="div"><Stack direction="row" alignItems="center" justifyContent="space-between"><Typography component="h2" variant="h6" fontWeight={900}>{t("watchlist.sortStocks")}</Typography><IconButton disabled={pending} aria-label={t("watchlist.close")} onClick={onClose} sx={{ minWidth: 44, minHeight: 44 }}><CloseIcon /></IconButton></Stack></DialogTitle><DialogContent>{error ? <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert> : null}<Typography color="text.secondary" mb={2}>{t("watchlist.sortHint")}</Typography><Reorder.Group axis="y" values={draft} onReorder={setDraft} style={{ listStyle: "none", margin: 0, padding: 0 }}>{draft.map((id, index) => { const stock = stocks.find((item) => item.id === id); if (!stock) return null; return <Reorder.Item key={id} value={id} dragListener={!reduceMotion} style={{ listStyle: "none" }}><Stack direction="row" alignItems="center" sx={{ minHeight: 52, px: 1, mb: 0.75, borderRadius: 1.5, bgcolor: semanticTokens.analysis.surfaceSubtle }}><DragIndicatorIcon aria-hidden="true" sx={{ mr: 1, color: "text.secondary" }} /><Typography flex={1} fontWeight={700}>{stock.id} · {stock.name}</Typography><IconButton disabled={pending || index === 0} aria-label={t("watchlist.moveUp", { name: stock.name })} onClick={() => setDraft((ids) => move(ids, index, -1))} sx={{ minWidth: 44, minHeight: 44 }}><ArrowUpwardIcon /></IconButton><IconButton disabled={pending || index === draft.length - 1} aria-label={t("watchlist.moveDown", { name: stock.name })} onClick={() => setDraft((ids) => move(ids, index, 1))} sx={{ minWidth: 44, minHeight: 44 }}><ArrowDownwardIcon /></IconButton></Stack></Reorder.Item>; })}</Reorder.Group></DialogContent><DialogActions sx={{ p: 2 }}><Button disabled={pending} onClick={onClose} sx={{ minHeight: 44 }}>{t("watchlist.cancel")}</Button><Button disabled={pending} variant="contained" onClick={() => void save()} sx={{ minHeight: 44 }}>{t("watchlist.saveOrder")}</Button></DialogActions></Dialog>;
}
