import { Alert, Box, Snackbar } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import LazyStockBox from "../../../components/StockBox/LazyStockBox";
import VirtualizedStockList from "../../../components/VirtualizedStockList";
import useElementHeight from "../../../hooks/useElementHeight";
import useStocksStore, { isDefaultCategory } from "../../../store/Stock.store";
import { analysisTheme, semanticTokens } from "../../../theme";
import { StockStoreType } from "../../../types";
import AddStockDialog from "./components/AddStockDialog";
import CategoryManageDialog from "./components/CategoryManageDialog";
import CategoryPickerDialog from "./components/CategoryPickerDialog";
import StockSortDialog from "./components/StockSortDialog";
import WatchlistEmptyState from "./components/WatchlistEmptyState";
import WatchlistLoadingState from "./components/WatchlistLoadingState";
import WatchlistOverflowMenu from "./components/WatchlistOverflowMenu";
import WatchlistToolbar from "./components/WatchlistToolbar";
import { STOCK_BOX_HEIGHT } from "../../../components/StockBox/constants";

export default function Watchlist() {
  const { t } = useTranslation();
  const { ref, height } = useElementHeight<HTMLDivElement>();
  const categories = useStocksStore((state) => state.categories);
  const stocks = useStocksStore((state) => state.stocks);
  const menu = useStocksStore((state) => state.menu);
  const activeCategoryId = useStocksStore((state) => state.activeCategoryId);
  const hydrated = useStocksStore((state) => state.hydrated);
  const removeStockFromCategory = useStocksStore((state) => state.removeStockFromCategory);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

  const active = useMemo(() => categories.find((category) => category.id === activeCategoryId) ?? categories[0], [activeCategoryId, categories]);
  const currentStocks = useMemo(() => !active ? [] : active.stockIds.map((id) => menu.find((stock) => stock.id === id) ?? stocks.find((stock) => stock.id === id)).filter((stock): stock is StockStoreType => Boolean(stock)), [active, menu, stocks]);
  const filteredStocks = useMemo(() => {
    const value = query.trim().toLocaleLowerCase();
    return value ? currentStocks.filter((stock) => `${stock.id} ${stock.name}`.toLocaleLowerCase().includes(value)) : currentStocks;
  }, [currentStocks, query]);
  const activeName = active && isDefaultCategory(active) ? t("watchlist.defaultName") : (active?.name ?? "");

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void listen("api-blocked", () => setBlocked(true)).then((value) => { unlisten = value; });
    return () => unlisten?.();
  }, []);

  const renderItem = useCallback((stock: StockStoreType) => (
    <LazyStockBox stock={stock} canDelete={false} onRemove={() => { if (active) void removeStockFromCategory(active.id, stock.id); }} />
  ), [active, removeStockFromCategory]);
  const header = useMemo(() => (
    <WatchlistToolbar activeName={activeName} stockCount={currentStocks.length} query={query} onOpenPicker={() => setPickerOpen(true)} onOpenAdd={() => setAddOpen(true)} onOpenMenu={setMenuAnchor} onQueryChange={setQuery} onClearQuery={() => setQuery("")} menuOpen={Boolean(menuAnchor)} />
  ), [activeName, currentStocks.length, menuAnchor, query]);

  if (!hydrated) return <WatchlistLoadingState />;

  return (
    <ThemeProvider theme={analysisTheme}>
      <Box sx={{ position: "relative", height: "100%", bgcolor: semanticTokens.analysis.canvas, color: semanticTokens.analysis.text }}>
        <Box ref={ref} height="100%">
          <VirtualizedStockList stocks={filteredStocks} height={height} itemHeight={STOCK_BOX_HEIGHT} header={header} renderItem={renderItem} />
        </Box>
        <WatchlistEmptyState empty={!currentStocks.length} noMatches={currentStocks.length > 0 && !filteredStocks.length} onAdd={() => setAddOpen(true)} />
        <AddStockDialog open={addOpen} activeCategoryId={active?.id ?? "default-watchlist"} onClose={() => setAddOpen(false)} />
        <CategoryPickerDialog open={pickerOpen} onClose={() => setPickerOpen(false)} onManage={() => setManageOpen(true)} />
        <CategoryManageDialog open={manageOpen} onClose={() => setManageOpen(false)} />
        <StockSortDialog open={sortOpen} categoryId={active?.id ?? "default-watchlist"} stocks={currentStocks} onClose={() => setSortOpen(false)} />
        <WatchlistOverflowMenu anchorEl={menuAnchor} hasMultipleStocks={currentStocks.length >= 2} onClose={() => setMenuAnchor(null)} onManage={() => setManageOpen(true)} onSort={() => setSortOpen(true)} />
        <Snackbar open={blocked} autoHideDuration={6000} onClose={() => setBlocked(false)}><Alert severity="error">{t("home.yahooRateLimited")}</Alert></Snackbar>
      </Box>
    </ThemeProvider>
  );
}
