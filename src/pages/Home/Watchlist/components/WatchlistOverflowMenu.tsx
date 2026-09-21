import { Menu, MenuItem } from "@mui/material";
import { useTranslation } from "react-i18next";

interface WatchlistOverflowMenuProps {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onManage: () => void;
}

export default function WatchlistOverflowMenu({ anchorEl, onClose, onManage }: WatchlistOverflowMenuProps) {
  const { t } = useTranslation();
  return (
    <Menu id="watchlist-overflow-menu" open={Boolean(anchorEl)} anchorEl={anchorEl} onClose={onClose}>
      <MenuItem onClick={() => { onClose(); onManage(); }} sx={{ minHeight: 44 }}>{t("watchlist.manage")}</MenuItem>
    </Menu>
  );
}
