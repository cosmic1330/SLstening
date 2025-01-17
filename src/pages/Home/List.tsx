import { Box, Button, Container } from "@mui/material";
import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import StockBox from "../../components/StockBox";
import useStocksStore from "../../store/Stock.store";
import SpeedDial from "../../components/SpeedDial";
import useOpenWebviewWindow from "../../hooks/useOpenWebviewWindow";

function List() {
  const { stocks, reload } = useStocksStore();
  const { openAddWindow } = useOpenWebviewWindow();

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
