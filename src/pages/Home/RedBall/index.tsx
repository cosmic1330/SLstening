import { Box, Container, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { tauriFetcher, TauriFetcherType } from "../../../api/http_cache";
import VirtualizedStockList from "../../../components/VirtualizedStockList";
import { useDebugMode } from "../../../hooks/useDebugMode";
import { StockStoreType } from "../../../types";

function csvToStockStore(csv: string): StockStoreType[] {
  const lines = csv.trim().split(/\r?\n/);
  const headers = lines[0].split(",");

  return lines.slice(1).map((line) => {
    const values = line.split(",");
    const record: Record<string, string> = {};
    headers.forEach((h, i) => {
      record[h] = values[i];
    });

    return {
      id: record["stock_id"],
      name: record["stock_name"],
      group: record["industry_group"],
      type: record["market_type"],
    };
  });
}

export default function RedBall() {
  const [stocks, setStocks] = useState<StockStoreType[]>([]);

  // 使用 hook 來響應調試模式變化
  const isDebugMode = useDebugMode();

  useEffect(() => {
    const sheetId = "1v42zeXlZIUaqmDTyu3FjQrq7a4Pcudbf9S53AH8wyBA";
    const gid = "411196894";
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&id=${sheetId}&gid=${gid}`;

    tauriFetcher(url, TauriFetcherType.Text).then((text) => {
      const data = csvToStockStore(text as string);
      setStocks(data);
    });
  }, []);

  // 計算可用的視窗高度（扣除標題和邊距）
  const viewportHeight = window.innerHeight - 150; // 預留 200px 給標題和其他元素

  return (
    <Container component="main">
      <Typography
        variant="h5"
        color="#fff"
        mt={2}
        mb={1}
        sx={{ textShadow: "0 0 3px #000" }}
      >
        SListenting 紅球股
      </Typography>
      <Box mt={2} >
        {stocks.length > 0 && (
          <VirtualizedStockList
            stocks={stocks}
            height={viewportHeight}
            itemHeight={250} // 根據實際 StockBox 高度調整
            canDelete={false}
            showDebug={isDebugMode} // 從設定中讀取調試模式
          />
        )}
      </Box>
    </Container>
  );
}
