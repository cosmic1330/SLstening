import { Button } from "@mui/material";
import { useNavigate } from "react-router";
import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import StockBox from "../../components/StockBox";
import useStocksStore from "../../store/Stock.store";

function List() {
  const { stocks, reload, increase } = useStocksStore();
  let navigate = useNavigate();

  useEffect(() => {
    // 监听股票添加事件
    const unlisten = listen("stock-added", (event: any) => {
      const { stockNumber } = event.payload;
      console.log(`stock add ${stockNumber}`)
      reload();
    });

    return () => {
      unlisten.then(fn => fn()); // 清理监听器
    };
  }, [increase]);

  return (
    <div>
      <Button
        variant="contained"
        size="small"
        onClick={async () => {
          navigate("/dashboard/other");
        }}
      >
        Go Other
      </Button>
      <Button variant="contained" size="small" onClick={reload}>
        Reload
      </Button>
      {stocks.map((id) => (
        <StockBox key={id} id={id} />
      ))}
    </div>
  );
}

export default List;
