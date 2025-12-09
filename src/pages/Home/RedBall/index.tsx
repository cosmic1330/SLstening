import { Box, Container, Tab, Tabs, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import getDbInstance from "../../../database/postgres";
import VirtualizedStockList from "../../../components/VirtualizedStockList";
import { useDebugMode } from "../../../hooks/useDebugMode";
import { StockStoreType } from "../../../types";

type RedListRow = {
  stock_id: string;
  stock_name: string;
  industry_group: string;
  market_type: string;
  list: string;
};

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
    const fetchData = async () => {
      try {
        const db = await getDbInstance();
        const rows = await db.select<RedListRow[]>(`WITH ranked AS (
            SELECT
                tr.stock_id,
                tr.record_date,
                DENSE_RANK() OVER (ORDER BY tr.record_date DESC) AS list
            FROM public.turnover_rank tr
            WHERE tr.type = 'red_ball'
              AND tr.record_date IN (
                    SELECT DISTINCT record_date
                    FROM public.turnover_rank
                    WHERE type = 'red_ball'
                    ORDER BY record_date DESC
                    LIMIT 3
              )
        )
        SELECT
            s.stock_id,
            s.stock_name,
            s.industry_group,
            s.market_type,
            r.list
        FROM stock s
        JOIN ranked r
          ON r.stock_id = s.stock_id
        ORDER BY r.list, s.stock_id;`);
        console.log(rows);
        const data = rows.map((row) => ({
          id: row.stock_id,
          name: row.stock_name,
          group: row.industry_group,
          type: row.market_type,
          list: row.list,
        }));
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
      } catch (error) {
        console.error("Failed to fetch red list from database:", error);
      }
    };

    fetchData();
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

  // 計算可用的視窗高度（扣除標題、標籤和邊距）
  const viewportHeight =
    window.innerHeight - (availableLists.length > 0 ? 200 : 150);

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
            height={viewportHeight}
            itemHeight={250} // 根據實際 StockBox 高度調整
            showDebug={isDebugMode} // 從設定中讀取調試模式
          />
        )}
      </Box>
    </Container>
  );
}
