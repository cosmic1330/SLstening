import AddCircleRoundedIcon from "@mui/icons-material/AddCircleRounded";
import BuildIcon from "@mui/icons-material/Build";
import ContentPasteGoRoundedIcon from "@mui/icons-material/ContentPasteGoRounded";
import DownloadIcon from "@mui/icons-material/Download";
import HexagonRoundedIcon from "@mui/icons-material/HexagonRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import RestorePageIcon from "@mui/icons-material/RestorePage";
import { SpeedDial as MuiSpeedDial } from "@mui/material";
import SpeedDialAction from "@mui/material/SpeedDialAction";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { useNavigate } from "react-router";
import useStocksStore from "../store/Stock.store";
import useDownloadStocks from "../hooks/useDownloadStocks";
import useOpenWebviewWindow from "../hooks/useOpenWebviewWindow";

export default function SpeedDial() {
  const { clear, stocks } = useStocksStore();
  const handleDownloadMenu = useDownloadStocks();
  const navigate = useNavigate();
  const { openAddWindow } = useOpenWebviewWindow();

  const handleCopy = async () => {
    try {
      const stocksText = stocks
        .map(({ id, name }) => `${id} ${name}`)
        .join("\n");
      await writeText(stocksText);
      let permissionGranted = await isPermissionGranted();
      if (!permissionGranted) {
        const permission = await requestPermission();
        permissionGranted = permission === "granted";
      }
      if (permissionGranted) {
        sendNotification({ title: "ClipBoard", body: "Copy Success!" });
      }
    } catch (err) {
      console.error("複製失敗:", err);
    }
  };

  return (
    <MuiSpeedDial
      ariaLabel="SpeedDial"
      sx={{ position: "fixed", bottom: 8, left: 8 }}
      icon={<BuildIcon />}
      FabProps={{ sx: { width: 42, height: 42 } }}
    >
      <SpeedDialAction
        key={"Add StockId"}
        icon={<AddCircleRoundedIcon />}
        tooltipTitle={"加入股票"}
        onClick={openAddWindow}
      />

      <SpeedDialAction
        key={"Add Clipboard"}
        icon={<ContentPasteGoRoundedIcon />}
        tooltipTitle={"複製追蹤清單"}
        onClick={handleCopy}
      />

      <SpeedDialAction
        key={"Clear Store"}
        icon={<RestorePageIcon />}
        tooltipTitle={"清除所有追蹤"}
        onClick={clear}
      />

      <SpeedDialAction
        key={"Update Stock Menu"}
        icon={<DownloadIcon />}
        tooltipTitle={"更新選股清單"}
        onClick={handleDownloadMenu}
      />

      <SpeedDialAction
        key={"Go Other Page"}
        icon={<HexagonRoundedIcon />}
        tooltipTitle={"設定"}
        onClick={() => {
          navigate("/dashboard/other");
        }}
      />

      <SpeedDialAction
        key={"Logout"}
        icon={<LogoutRoundedIcon />}
        tooltipTitle={"登出"}
        onClick={() => {
          navigate("/");
        }}
      />
    </MuiSpeedDial>
  );
}
