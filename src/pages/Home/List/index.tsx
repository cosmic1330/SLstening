import { Box, Container } from "@mui/material";
import { listen } from "@tauri-apps/api/event";
import { info } from "@tauri-apps/plugin-log";
import { useEffect } from "react";
import VirtualizedStockList from "../../../components/VirtualizedStockList";
import useAddWebviewWindow from "../../../hooks/useAddWebviewWindow";
import useStocksStore from "../../../store/Stock.store";
import NasdaqBox from "./nasdaq";
import TwseBox from "./twse";
import WtxBox from "./wtx";

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

  // 計算可用的視窗高度（扣除標題、標籤和邊距）
  const viewportHeight =
    window.innerHeight - (stocks.length > 0 ? 200 : 150);

  return (
    <Container component="main">
      <Box mt={2} mb={"80px"}>
        <NasdaqBox />
        <WtxBox />
        <TwseBox />
        <Box mt={2} mb={"80px"}>
          {stocks.length > 0 && (
            <VirtualizedStockList
              stocks={stocks}
              height={viewportHeight}
              itemHeight={250} // 根據實際 StockBox 高度調整
            />
          )}
        </Box>
        {/* {stocks.length === 0 ? (
          <Button fullWidth variant="contained" onClick={openAddWindow}>
            新增第一筆追蹤
          </Button>
        ) : (
          stocks.map((stock, index) => <StockBox key={index} stock={stock} />)
        )} */}
      </Box>
    </Container>
  );
}

export default List;
