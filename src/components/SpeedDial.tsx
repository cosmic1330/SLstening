import { SpeedDial as MuiSpeedDial } from "@mui/material";
import SpeedDialAction from "@mui/material/SpeedDialAction";
import BuildIcon from "@mui/icons-material/Build";
import AddCircleRoundedIcon from "@mui/icons-material/AddCircleRounded";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import HexagonRoundedIcon from "@mui/icons-material/HexagonRounded";
import useStocksStore from "../store/Stock.store";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import { useNavigate } from "react-router";
import ContentPasteGoRoundedIcon from "@mui/icons-material/ContentPasteGoRounded";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import RestorePageIcon from "@mui/icons-material/RestorePage";

export default function SpeedDial() {
  const { clear, stocks } = useStocksStore();
  const navigate = useNavigate();

  const openAddWindow = async () => {
    const webview = new WebviewWindow("add", {
      title: "Add Stock Id",
      url: "/add",
      width: 300,
      height: 130,
    });
    webview.once("tauri://created", function () {});
    webview.once("tauri://error", function (e) {
      console.log(e);
    });
  };

  const handleCopy = async () => {
    try {
      const stocksText = stocks.join("\n");
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
      sx={{ position: "fixed", bottom: 8, right: 8 }}
      icon={<BuildIcon />}
      FabProps={{ sx: { width: 42, height: 42 } }}
    >
      <SpeedDialAction
        key={"Add StockId"}
        icon={<AddCircleRoundedIcon />}
        tooltipTitle={"Add StockId"}
        onClick={openAddWindow}
      />

      <SpeedDialAction
        key={"Add Clipboard"}
        icon={<ContentPasteGoRoundedIcon />}
        tooltipTitle={"Add Clipboard"}
        onClick={handleCopy}
      />

      <SpeedDialAction
        key={"Clear Store"}
        icon={<RestorePageIcon />}
        tooltipTitle={"Clear Store"}
        onClick={clear}
      />

      <SpeedDialAction
        key={"Go Other Page"}
        icon={<HexagonRoundedIcon />}
        tooltipTitle={"Go Other Page"}
        onClick={() => {
          navigate("/dashboard/other");
        }}
      />

      <SpeedDialAction
        key={"Logout"}
        icon={<LogoutRoundedIcon />}
        tooltipTitle={"Logout"}
        onClick={() => {
          navigate("/");
        }}
      />
    </MuiSpeedDial>
  );
}
