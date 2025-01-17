import { Box, Button, Container } from "@mui/material";
import { listen } from "@tauri-apps/api/event";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { useEffect } from "react";
import StockBox from "../../components/StockBox";
import useStocksStore from "../../store/Stock.store";
import SpeedDial from "../../components/SpeedDial";

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
    <Container component="main">
      <Box mt={2} mb={7}>
        {stocks.length === 0 ? (
          <Button fullWidth variant="contained" onClick={openAddWindow}>
            新增第一筆追蹤
          </Button>
        ) : (
          stocks.map((stock, index) => <StockBox key={index} stock={stock} />)
        )}
        <SpeedDial />
      </Box>
    </Container>
  );
}

export default List;
