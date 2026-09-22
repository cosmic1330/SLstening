import AddIcon from "@mui/icons-material/Add";
import ClearIcon from "@mui/icons-material/Clear";
import SearchIcon from "@mui/icons-material/Search";
import SettingsIcon from "@mui/icons-material/Settings";
import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { semanticTokens } from "../../../../theme";

interface WatchlistToolbarProps {
  activeName: string;
  stockCount: number;
  query: string;
  onOpenPicker: () => void;
  onOpenAdd: () => void;
  onOpenManage: () => void;
  onQueryChange: (query: string) => void;
  onClearQuery: () => void;
}

export default function WatchlistToolbar({
  activeName,
  stockCount,
  query,
  onOpenPicker,
  onOpenAdd,
  onOpenManage,
  onQueryChange,
  onClearQuery,
}: WatchlistToolbarProps) {
  const { t } = useTranslation();
  return (
    <Box
      sx={{
        p: 1.5,
        bgcolor: semanticTokens.analysis.canvas,
        color: semanticTokens.analysis.text,
      }}
    >
      <Stack
        direction="row"
        spacing={0.5}
        alignItems="center"
        justifyContent="space-between"
      >
        <Button
          onClick={onOpenPicker}
          aria-label={t("watchlist.openCategoryPicker", { name: activeName })}
        >
          <Box textAlign="left" minWidth={0}>
            <Typography noWrap fontWeight={800} color="white">
              {activeName}✨
            </Typography>
            <Typography variant="caption" noWrap color="text.secondary">
              {t("watchlist.summary", { count: stockCount })}
            </Typography>
          </Box>
        </Button>
        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onOpenAdd}
            size="small"
          >
            {t("watchlist.addStock")}
          </Button>

          <Button
            variant="contained"
            startIcon={<SettingsIcon />}
            onClick={onOpenManage}
            size="small"
          >
            {t("watchlist.manage")}
          </Button>
        </Stack>
      </Stack>

      <TextField
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        fullWidth
        size="small"
        placeholder={t("watchlist.filterStocks")}
        slotProps={{
          htmlInput: { "aria-label": t("watchlist.filterStocks") },
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: query ? (
              <InputAdornment position="end">
                <IconButton
                  aria-label={t("watchlist.clearStockFilter")}
                  onClick={onClearQuery}
                  sx={{ minWidth: 44, minHeight: 44 }}
                >
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ) : undefined,
          },
        }}
        sx={{
          mt: 2,
          "& .MuiOutlinedInput-root": { minHeight: 44, color: "inherit" },
        }}
      />
    </Box>
  );
}
