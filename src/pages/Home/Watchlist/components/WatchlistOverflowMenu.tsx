import { Menu, MenuItem } from "@mui/material";
import { useTranslation } from "react-i18next";

interface WatchlistOverflowMenuProps {
  anchorEl: HTMLElement | null;
  hasMultipleStocks: boolean;
  onClose: () => void;
  onManage: () => void;
  onSort: () => void;
}

export default function WatchlistOverflowMenu({ anchorEl, hasMultipleStocks, onClose, onManage, onSort }: WatchlistOverflowMenuProps) {
  const { t } = useTranslation();
  return (
    <Menu id="watchlist-overflow-menu" open={Boolean(anchorEl)} anchorEl={anchorEl} onClose={onClose}>
      <MenuItem onClick={() => { onClose(); onManage(); }} sx={{ minHeight: 44 }}>{t("watchlist.manage")}</MenuItem>
      <MenuItem disabled={!hasMultipleStocks} onClick={() => { onClose(); onSort(); }} sx={{ minHeight: 44 }}>{t("watchlist.sortStocks")}</MenuItem>
    </Menu>
  );
}
