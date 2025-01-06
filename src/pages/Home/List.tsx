import { Box } from "@mui/material";
import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import StockBox from "../../components/StockBox";
import useStocksStore from "../../store/Stock.store";

function List() {
  const { stocks, reload, increase } = useStocksStore();

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
  }, [increase]);

  return (
    <Box>
      {stocks.map((id) => (
        <StockBox key={id} id={id} />
      ))}
    </Box>
  );
}

export default List;
