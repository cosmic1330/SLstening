import { Box, Container, Tab, Tabs, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { tauriFetcher, TauriFetcherType } from "../../../api/http_cache";
import VirtualizedStockList from "../../../components/VirtualizedStockList";
import { useDebugMode } from "../../../hooks/useDebugMode";
import { StockStoreType } from "../../../types";

function csvToStockStore(csv: string): (StockStoreType & { list: string })[] {
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
      list: record["list"],
    };
  });
}

export default function RedBall() {
  const [stocks, setStocks] = useState<(StockStoreType & { list: string })[]>(
    []
  );
  const [selectedList, setSelectedList] = useState<string>("");
  const [filteredStocks, setFilteredStocks] = useState<
    (StockStoreType & { list: string })[]
  >([]);
  const [availableLists, setAvailableLists] = useState<string[]>([]);

  // 使用 hook 來響應調試模式變化
  const isDebugMode = useDebugMode();

  useEffect(() => {
    const sheetId = "1v42zeXlZIUaqmDTyu3FjQrq7a4Pcudbf9S53AH8wyBA";
    const gid = "411196894";
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&id=${sheetId}&gid=${gid}`;

    tauriFetcher(url, TauriFetcherType.Text).then((text) => {
      const data = csvToStockStore(text as string);
      setStocks(data);

      // 獲取所有可用的 list 值
      const uniqueLists = Array.from(
        new Set(data.map((stock) => stock.list).filter(Boolean))
      ) as string[];
      const sortedLists = uniqueLists.sort();
      setAvailableLists(sortedLists);

      // 自動選擇第一個可用的 list 值
      if (sortedLists.length > 0) {
        setSelectedList(sortedLists[0]);
      }
    });
  }, []);

  // 處理股票過濾邏輯
  useEffect(() => {
    if (selectedList) {
      const filtered = stocks.filter((stock) => stock.list === selectedList);
      setFilteredStocks(filtered);
    }
  }, [stocks, selectedList]);

  // 處理分頁切換
  const handleTabChange = (_: React.SyntheticEvent, newValue: string) => {
    setSelectedList(newValue);
  };
  return (
    <Container component="main">
      <Typography
        variant="h5"
        color="#fff"
        mt={2}
        mb={1}
        sx={{ textShadow: "0 0 3px #000" }}
      >
        週轉上漲股
      </Typography>

      {/* 分頁標籤 */}
      {availableLists.length > 0 && (
        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
          <Tabs
            value={selectedList}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              "& .MuiTab-root": {
                color: "#fff",
                "&.Mui-selected": {
                  color: "#1976d2",
                },
              },
              "& .MuiTabs-indicator": {
                backgroundColor: "#1976d2",
              },
            }}
          >
            {availableLists.map((list) => (
              <Tab key={list} label={`前${list}日`} value={list} />
            ))}
          </Tabs>
        </Box>
      )}

      <Box mt={2} mb={"80px"}>
        {filteredStocks.length > 0 && (
          <VirtualizedStockList
            stocks={filteredStocks}
            height={ window.innerHeight}
            itemHeight={380} // 根據實際 StockBox 高度調整
            showDebug={isDebugMode} // 從設定中讀取調試模式
          />
        )}
      </Box>
    </Container>
  );
}
