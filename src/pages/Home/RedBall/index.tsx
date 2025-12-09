import { Box, CircularProgress, Container, Tab, Tabs, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import getDbInstance from "../../../database/postgres";
import VirtualizedStockList from "../../../components/VirtualizedStockList";
import { useDebugMode } from "../../../hooks/useDebugMode";
import { StockStoreType } from "../../../types";
import { fetchRedBallStocks, RedListRow } from "../../../api/stockRepository";

export default function RedBall() {
  const [stocks, setStocks] = useState<(StockStoreType & { list: string })[]>(
    []
  );
  const [selectedList, setSelectedList] = useState<string>("");
  const [availableLists, setAvailableLists] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 使用 hook 來響應調試模式變化
  const isDebugMode = useDebugMode();

  useEffect(() => {
    let isMounted = true; // 標記元件是否掛載中

    const fetchData = async () => {
      if (isMounted) {
        setIsLoading(true);
        setError(null);
      }
      try {
        const fetchPromise = (async () => {
            const db = await getDbInstance();
            return await fetchRedBallStocks(db);
        })();

        const timeoutPromise = new Promise<RedListRow[]>((_, reject) => {
            setTimeout(() => {
                reject(new Error("Connection timeout"));
            }, 10000);
        });

        const rows = await Promise.race([fetchPromise, timeoutPromise]);

        if (!isMounted) return; // 如果元件已卸載，則不更新狀態

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
      } catch (error: any) {
        if (isMounted) {
            console.error("Failed to fetch red list from database:", error);
            setError(error.message || "連線失敗，請稍後再試");
        }
      } finally {
        if (isMounted) {
            setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
        isMounted = false; // 清理函式：標記元件已卸載
    };
  }, []);

  // 處理股票過濾邏輯
  const filteredStocks = useMemo(() => {
    if (selectedList) {
      return stocks.filter((stock) => stock.list === selectedList);
    }
    return [];
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
        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
            <Typography
            variant="h6"
            color="error"
            align="center"
            sx={{ mt: 10 }}
          >
            {error === "Connection timeout" ? "連線逾時，請檢查網路連線" : "連線失敗，請稍後再試"}
          </Typography>
        ) : filteredStocks.length > 0 ? (
          <VirtualizedStockList
            stocks={filteredStocks}
            height={viewportHeight}
            itemHeight={250} // 根據實際 StockBox 高度調整
            showDebug={isDebugMode} // 從設定中讀取調試模式
          />
        ) : (
          <Typography
            variant="h6"
            color="text.secondary"
            align="center"
            sx={{ mt: 10, color: "#aaa" }}
          >
            目前沒有資料
          </Typography>
        )}
      </Box>
    </Container>
  );
}
