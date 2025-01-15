import AddCircleRoundedIcon from "@mui/icons-material/AddCircleRounded";
import BuildIcon from "@mui/icons-material/Build";
import ContentPasteGoRoundedIcon from "@mui/icons-material/ContentPasteGoRounded";
import HexagonRoundedIcon from "@mui/icons-material/HexagonRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import DownloadIcon from "@mui/icons-material/Download";
import RestorePageIcon from "@mui/icons-material/RestorePage";
import { SpeedDial as MuiSpeedDial } from "@mui/material";
import SpeedDialAction from "@mui/material/SpeedDialAction";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { useNavigate } from "react-router";
import useStocksStore, { StockField } from "../store/Stock.store";
import { tauriFetcher, TauriFetcherType } from "../api/http_cache";
import { load } from "cheerio";

enum QueryStockType {
  TWSE = 2,
  OTC = 4,
}

export default function SpeedDial() {
  const { clear, stocks, update_menu } = useStocksStore();
  const navigate = useNavigate();

  const openAddWindow = async () => {
    let existingWindow = await WebviewWindow.getByLabel("add");
    console.log(existingWindow);
    if (existingWindow) {
      try {
        existingWindow.setFocus();
      } catch (error) {
        console.error("Error interacting with existing window:", error);
      }
      return;
    } else {
      const webview = new WebviewWindow("add", {
        title: "Add Stock Id",
        url: "/add",
        width: 300,
        height: 300,
      });
      webview.once("tauri://created", function () {});
      webview.once("tauri://error", function (e) {
        console.log(e);
      });
    }
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

  const queryStocks = async (type: QueryStockType) => {
    const data:StockField[] = [];
    try {
      const url = `https://isin.twse.com.tw/isin/C_public.jsp?strMode=${type}`;
      const arrayBuffer = (await tauriFetcher(
        url,
        TauriFetcherType.ArrayBuffer
      )) as ArrayBuffer;

      // 使用 TextDecoder轉換編碼big5->utf-8
      const decoder = new TextDecoder("big5");
      const decodedText = decoder.decode(arrayBuffer);
      const $ = load(decodedText);

      const rows = $("tbody tr").toArray();
      const thirdRowToEnd = rows.slice(2);

      for (let i = 0; i < thirdRowToEnd.length; i++) {
        const row = thirdRowToEnd[i];
        const firstTd = $(row).find("td").eq(0).text(); // 第一個<td>
        const [id, name] = firstTd.split("　");
        const type = $(row).find("td").eq(4).text(); // 第五個<td>
        if (id.length === 4) {
          data.push({ id, name, type });
        } else {
          console.log("Skip id:", id, name);
        }
      }
    } catch (error) {
      console.error("Error scraping website:", error);
    }
    return data;
  };

  const handleDownloadMenu = async () => {
    try {
      const TWSE_data = await queryStocks(QueryStockType.TWSE);
      const OTC_data = await queryStocks(QueryStockType.OTC);
      TWSE_data.push(...OTC_data);
      await update_menu(TWSE_data);
      sendNotification({ title: "Menu", body: "Update Success!" });
    } catch (error) {
      console.error("Error scraping website:", error);
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
        key={"Update Stock Menu"}
        icon={<DownloadIcon />}
        tooltipTitle={"Update Stock Menu"}
        onClick={handleDownloadMenu}
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
