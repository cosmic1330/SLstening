import { Box, Button, Container } from "@mui/material";
import { listen } from "@tauri-apps/api/event";
import { info } from "@tauri-apps/plugin-log";
import { useEffect } from "react";
import SpeedDial from "../../components/SpeedDial";
import StockBox from "../../components/StockBox";
import useAddWebviewWindow from "../../hooks/useAddWebviewWindow";
import useStocksStore from "../../store/Stock.store";
import TwseBox from "./Twse";
import WtxBox from "./Wtx";

function List() {
  const { stocks, reload } = useStocksStore();
  const { openAddWindow } = useAddWebviewWindow();

  useEffect(() => {
    // 监听股票添加事件
    const unlistenadd = listen("stock-added", async (event: any) => {
      const { stockNumber } = event.payload;
      await reload();
      info(`stock add ${stockNumber}`);
    });
    const unlistenremoved = listen("stock-removed", async (event: any) => {
      const { stockNumber } = event.payload;
      await reload();
      info(`stock removed ${stockNumber}`);
    });

    return () => {
      // 清理监听器
      unlistenadd.then((fn) => fn());
      unlistenremoved.then((fn) => fn());
    };
  }, []);

  return (
    <Container component="main">
      <Box mt={2} mb={7}>
        <WtxBox />
        <TwseBox />
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
