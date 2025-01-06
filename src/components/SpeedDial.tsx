import { SpeedDial as MuiSpeedDial } from "@mui/material";
import SpeedDialAction from "@mui/material/SpeedDialAction";
import BuildIcon from "@mui/icons-material/Build";
import AddCircleRoundedIcon from "@mui/icons-material/AddCircleRounded";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import CachedRoundedIcon from "@mui/icons-material/CachedRounded";
import HexagonRoundedIcon from "@mui/icons-material/HexagonRounded";
import useStocksStore from "../store/Stock.store";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import { useNavigate } from "react-router";

export default function SpeedDial() {
  const { reload } = useStocksStore();
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
        key={"Reload Store"}
        icon={<CachedRoundedIcon />}
        tooltipTitle={"Reload Store"}
        onClick={reload}
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
