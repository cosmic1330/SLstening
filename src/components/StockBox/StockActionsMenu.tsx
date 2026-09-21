import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { Box, IconButton, ListItemIcon, Menu, MenuItem, Tooltip } from "@mui/material";
import { open as openExternal } from "@tauri-apps/plugin-shell";
import { MouseEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { semanticTokens } from "../../theme";
import { StockStoreType } from "../../types";

interface StockActionsMenuProps {
  stock: StockStoreType;
  name: string;
  canDelete: boolean;
  onRemove?: () => void;
  onDelete: () => void;
}

export default function StockActionsMenu({ stock, name, canDelete, onRemove, onDelete }: StockActionsMenuProps) {
  const { t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = stock.type === "上市"
    ? `https://tw.tradingview.com/chart?symbol=TWSE%3A${stock.id}`
    : `https://tw.tradingview.com/chart?symbol=TPEX%3A${stock.id}`;
  const close = () => setAnchorEl(null);
  const launchTradingView = async () => {
    close();
    await openExternal(open);
  };
  const stop = (event: MouseEvent) => event.stopPropagation();

  return (
    <Box component="span">
      <Tooltip title={t("watchlist.more")}>
        <IconButton
        aria-label={t("watchlist.more")}
        aria-haspopup="menu"
        aria-expanded={anchorEl ? "true" : undefined}
        onClick={(event) => { stop(event); setAnchorEl(event.currentTarget); }}
        sx={{
          minWidth: 44,
          minHeight: 44,
          color: semanticTokens.analysis.text,
          "&:focus-visible": { outline: `2px solid ${semanticTokens.analysis.focus}`, outlineOffset: 2 },
        }}
      >
        <MoreVertIcon />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={close}
        MenuListProps={{ "aria-label": t("watchlist.more") }}
      >
        <MenuItem onClick={(event) => { stop(event); void launchTradingView(); }} sx={{ minHeight: 44 }}>
          <ListItemIcon><OpenInNewIcon fontSize="small" /></ListItemIcon>
          {t("a11y.tradingView", { name })}
        </MenuItem>
        {onRemove ? (
          <MenuItem onClick={(event) => { stop(event); close(); onRemove(); }} sx={{ minHeight: 44 }}>
            <ListItemIcon><CloseIcon fontSize="small" /></ListItemIcon>
            {t("a11y.removeStock", { name })}
          </MenuItem>
        ) : null}
        {canDelete ? (
          <MenuItem onClick={(event) => { stop(event); close(); onDelete(); }} sx={{ minHeight: 44 }}>
            <ListItemIcon><DeleteIcon fontSize="small" /></ListItemIcon>
            {t("a11y.deleteStock", { name })}
          </MenuItem>
        ) : null}
      </Menu>
    </Box>
  );
}
