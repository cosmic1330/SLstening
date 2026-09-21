import AddIcon from "@mui/icons-material/Add";
import ClearIcon from "@mui/icons-material/Clear";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import SearchIcon from "@mui/icons-material/Search";
import {
  Alert,
  Box,
  Button,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Skeleton,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { STOCK_BOX_HEIGHT } from "../../../components/StockBox";
import LazyStockBox from "../../../components/StockBox/LazyStockBox";
import VirtualizedStockList from "../../../components/VirtualizedStockList";
import useElementHeight from "../../../hooks/useElementHeight";
import useStocksStore, { isDefaultCategory } from "../../../store/Stock.store";
import { analysisTheme, semanticTokens } from "../../../theme";
import { StockStoreType } from "../../../types";
import AddStockDialog from "./components/AddStockDialog";
import CategoryManageDialog from "./components/CategoryManageDialog";
import CategoryPickerDialog, {
  ExpandMoreIcon,
} from "./components/CategoryPickerDialog";
import StockSortDialog from "./components/StockSortDialog";

export default function Watchlist() {
  const { t } = useTranslation();
  const { ref, height } = useElementHeight<HTMLDivElement>();
  const {
    categories,
    stocks,
    menu,
    activeCategoryId,
    hydrated,
    removeStockFromCategory,
  } = useStocksStore();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const active =
    categories.find((category) => category.id === activeCategoryId) ??
    categories[0];
  const currentStocks = useMemo(
    () =>
      !active
        ? []
        : active.stockIds
            .map(
              (id) =>
                menu.find((stock) => stock.id === id) ??
                stocks.find((stock) => stock.id === id),
            )
            .filter((stock): stock is StockStoreType => Boolean(stock)),
    [active, menu, stocks],
  );
  const filteredStocks = useMemo(() => {
    const value = query.trim().toLocaleLowerCase();
    return value
      ? currentStocks.filter((stock) =>
          `${stock.id} ${stock.name}`.toLocaleLowerCase().includes(value),
        )
      : currentStocks;
  }, [currentStocks, query]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void listen("api-blocked", () => setBlocked(true)).then((value) => {
      unlisten = value;
    });
    return () => unlisten?.();
  }, []);

  if (!hydrated)
    return (
      <Box p={2} height="100%" bgcolor={semanticTokens.analysis.canvas}>
        <Skeleton height={56} />
        <Skeleton height={220} sx={{ mt: 2 }} />
      </Box>
    );

  const activeName =
    active && isDefaultCategory(active)
      ? t("watchlist.defaultName")
      : (active?.name ?? "");
  const closeOverflow = () => setMenuAnchor(null);
  const header = (
    <Box
      sx={{
        p: 1.5,
        bgcolor: semanticTokens.analysis.canvas,
        color: semanticTokens.analysis.text,
      }}
    >
      <Stack direction="row" spacing={0.5} alignItems="center">
        <Button
          onClick={() => setPickerOpen(true)}
          endIcon={<ExpandMoreIcon />}
          aria-label={t("watchlist.openCategoryPicker", { name: activeName })}
          sx={{
            minHeight: 44,
            minWidth: 0,
            flex: 1,
            justifyContent: "flex-start",
            color: "inherit",
            px: 1,
          }}
        >
          <Box textAlign="left" minWidth={0}>
            <Typography noWrap fontWeight={800}>
              {activeName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t("watchlist.summary", { count: currentStocks.length })}
            </Typography>
          </Box>
        </Button>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          sx={{ minHeight: 44, whiteSpace: "nowrap", px: { xs: 1.25, sm: 2 } }}
          onClick={() => setAddOpen(true)}
        >
          {t("watchlist.addStock")}
        </Button>
        <Tooltip title={t("watchlist.more")}>
          <IconButton
            aria-label={t("watchlist.more")}
            sx={{
              minWidth: 44,
              minHeight: 44,
              color: semanticTokens.analysis.text,
            }}
            onClick={(event) => setMenuAnchor(event.currentTarget)}
          >
            <MoreVertIcon />
          </IconButton>
        </Tooltip>
      </Stack>
      <TextField
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        fullWidth
        placeholder={t("watchlist.filterStocks")}
        inputProps={{ "aria-label": t("watchlist.filterStocks") }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
          endAdornment: query ? (
            <InputAdornment position="end">
              <IconButton
                aria-label={t("watchlist.clearStockFilter")}
                onClick={() => setQuery("")}
                sx={{ minWidth: 44, minHeight: 44 }}
              >
                <ClearIcon />
              </IconButton>
            </InputAdornment>
          ) : undefined,
        }}
        sx={{
          mt: 1,
          "& .MuiOutlinedInput-root": { minHeight: 44, color: "inherit" },
        }}
      />
    </Box>
  );

  return (
    <ThemeProvider theme={analysisTheme}>
      <Box
        sx={{
          position: "relative",
          height: "100%",
          bgcolor: semanticTokens.analysis.canvas,
          color: semanticTokens.analysis.text,
        }}
      >
        <Box ref={ref} height="100%">
          <VirtualizedStockList
            stocks={filteredStocks}
            height={height}
            itemHeight={STOCK_BOX_HEIGHT}
            header={header}
            renderItem={(stock) => (
              <LazyStockBox
                stock={stock}
                canDelete={false}
                onRemove={() =>
                  active && void removeStockFromCategory(active.id, stock.id)
                }
              />
            )}
          />
        </Box>
        {!currentStocks.length ? (
          <Box
            sx={{
              position: "absolute",
              top: "45%",
              left: 24,
              right: 24,
              textAlign: "center",
            }}
          >
            <Typography>{t("watchlist.empty")}</Typography>
            <Button
              sx={{ mt: 1, minHeight: 44 }}
              variant="contained"
              onClick={() => setAddOpen(true)}
            >
              {t("watchlist.addStock")}
            </Button>
          </Box>
        ) : null}
        {currentStocks.length > 0 && !filteredStocks.length ? (
          <Typography
            sx={{
              position: "absolute",
              top: "50%",
              width: "100%",
              textAlign: "center",
            }}
          >
            {t("watchlist.noStockMatches")}
          </Typography>
        ) : null}
        <AddStockDialog
          open={addOpen}
          activeCategoryId={active?.id ?? "default-watchlist"}
          onClose={() => setAddOpen(false)}
        />
        <CategoryPickerDialog
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onManage={() => setManageOpen(true)}
        />
        <CategoryManageDialog
          open={manageOpen}
          onClose={() => setManageOpen(false)}
        />
        <StockSortDialog
          open={sortOpen}
          categoryId={active?.id ?? "default-watchlist"}
          stocks={currentStocks}
          onClose={() => setSortOpen(false)}
        />
        <Menu
          open={Boolean(menuAnchor)}
          anchorEl={menuAnchor}
          onClose={closeOverflow}
        >
          <MenuItem
            onClick={() => {
              closeOverflow();
              setManageOpen(true);
            }}
            sx={{ minHeight: 44 }}
          >
            {t("watchlist.manage")}
          </MenuItem>
          <MenuItem
            disabled={currentStocks.length < 2}
            onClick={() => {
              closeOverflow();
              setSortOpen(true);
            }}
            sx={{ minHeight: 44 }}
          >
            {t("watchlist.sortStocks")}
          </MenuItem>
        </Menu>
        <Snackbar
          open={blocked}
          autoHideDuration={6000}
          onClose={() => setBlocked(false)}
        >
          <Alert severity="error">{t("home.yahooRateLimited")}</Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}
