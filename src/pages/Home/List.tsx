import { Box, Button } from "@mui/material";
import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import StockBox from "../../components/StockBox";
import useStocksStore from "../../store/Stock.store";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

function List() {
  const { stocks, reload } = useStocksStore();

  useEffect(() => {
    // 监听股票添加事件
    const unlisten = listen("stock-added", (event: any) => {
      const { stockNumber } = event.payload;
      console.log(`stock add ${stockNumber}`);
      reload();
    });

    return () => {
      unlisten.then((fn) => fn()); // 清理监听器
    };
  }, []);

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

  return (
    <Box mt={2} mb={7}>
      {stocks.length === 0 ? (
        <Button fullWidth variant="contained" onClick={openAddWindow}>
          Add First Stock
        </Button>
      ) : (
        stocks.map(({ id }, index) => <StockBox key={index} id={id} />)
      )}
    </Box>
  );
}

export default List;
