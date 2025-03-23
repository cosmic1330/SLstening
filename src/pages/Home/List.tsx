import { Box, Button, Container } from "@mui/material";
import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import SpeedDial from "../../components/SpeedDial";
import StockBox from "../../components/StockBox";
import useAddWebviewWindow from "../../hooks/useAddWebviewWindow";
import useStocksStore from "../../store/Stock.store";

function List() {
  const { stocks, reload } = useStocksStore();
  const { openAddWindow } = useAddWebviewWindow();

  useEffect(() => {
    // 监听股票添加事件
    const unlisten = listen("stock-added", async (event: any) => {
      const { stockNumber } = event.payload;
      await reload();
      console.log(`stock add ${stockNumber}`);
    });

    return () => {
      unlisten.then((fn) => fn()); // 清理监听器
    };
  }, []);

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
