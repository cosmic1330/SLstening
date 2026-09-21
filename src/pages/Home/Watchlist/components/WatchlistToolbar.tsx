import AddIcon from "@mui/icons-material/Add";
import ClearIcon from "@mui/icons-material/Clear";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import SearchIcon from "@mui/icons-material/Search";
import { Box, Button, IconButton, InputAdornment, Stack, TextField, Tooltip, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { semanticTokens } from "../../../../theme";

interface WatchlistToolbarProps {
  activeName: string;
  stockCount: number;
  query: string;
  onOpenPicker: () => void;
  onOpenAdd: () => void;
  onOpenMenu: (anchor: HTMLElement) => void;
  onQueryChange: (query: string) => void;
  onClearQuery: () => void;
  menuOpen?: boolean;
}

const WATCHLIST_MENU_ID = "watchlist-overflow-menu";

export default function WatchlistToolbar({ activeName, stockCount, query, onOpenPicker, onOpenAdd, onOpenMenu, onQueryChange, onClearQuery, menuOpen = false }: WatchlistToolbarProps) {
  const { t } = useTranslation();
  return (
    <Box sx={{ p: 1.5, bgcolor: semanticTokens.analysis.canvas, color: semanticTokens.analysis.text }}>
      <Stack direction="row" spacing={0.5} alignItems="center">
        <Button onClick={onOpenPicker} endIcon={<ExpandMoreIcon />} aria-label={t("watchlist.openCategoryPicker", { name: activeName })} sx={{ minHeight: 44, minWidth: 0, flex: 1, justifyContent: "flex-start", color: "inherit", px: 1 }}>
          <Box textAlign="left" minWidth={0}><Typography noWrap fontWeight={800}>{activeName}</Typography><Typography variant="caption" color="text.secondary">{t("watchlist.summary", { count: stockCount })}</Typography></Box>
        </Button>
        <Button variant="contained" startIcon={<AddIcon />} sx={{ minHeight: 44, whiteSpace: "nowrap", px: { xs: 1.25, sm: 2 } }} onClick={onOpenAdd}>{t("watchlist.addStock")}</Button>
        <Tooltip title={t("watchlist.more")}><IconButton aria-label={t("watchlist.more")} aria-haspopup="menu" aria-expanded={menuOpen ? "true" : "false"} aria-controls={menuOpen ? WATCHLIST_MENU_ID : undefined} sx={{ minWidth: 44, minHeight: 44, color: semanticTokens.analysis.text }} onClick={(event) => onOpenMenu(event.currentTarget)}><MoreVertIcon /></IconButton></Tooltip>
      </Stack>
      <TextField value={query} onChange={(event) => onQueryChange(event.target.value)} fullWidth placeholder={t("watchlist.filterStocks")} slotProps={{ htmlInput: { "aria-label": t("watchlist.filterStocks") }, input: { startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>, endAdornment: query ? <InputAdornment position="end"><IconButton aria-label={t("watchlist.clearStockFilter")} onClick={onClearQuery} sx={{ minWidth: 44, minHeight: 44 }}><ClearIcon /></IconButton></InputAdornment> : undefined } }} sx={{ mt: 1, "& .MuiOutlinedInput-root": { minHeight: 44, color: "inherit" } }} />
    </Box>
  );
}
