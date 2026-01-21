import { TrendingUp as TrendingIcon } from "@mui/icons-material";
import {
  Box,
  CircularProgress,
  Container,
  Paper,
  Stack,
  styled,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { tauriFetcher, TauriFetcherType } from "../../../api/http_cache";
import VirtualizedStockList from "../../../components/VirtualizedStockList";
import { useDebugMode } from "../../../hooks/useDebugMode";
import RedBallCard from "./components/RedBallCard";

type CsvStockType = {
  id: string;
  name: string;
  list: string;
  type: string;
  group: string;
};

// --- Styled Components ---

const PageContainer = styled(Box)`
  width: 100%;
  height: 100vh;
  overflow: hidden;
  position: relative;
  background-color: #0f1214;
  background-image:
    radial-gradient(at 0% 0%, hsla(253, 16%, 7%, 1) 0, transparent 50%),
    radial-gradient(at 50% 0%, hsla(225, 39%, 25%, 1) 0, transparent 50%),
    radial-gradient(at 100% 0%, hsla(339, 49%, 25%, 1) 0, transparent 50%),
    url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23noiseFilter)' opacity='0.04'/%3E%3C/svg%3E");
  background-size:
    100% 100%,
    100% 100%,
    100% 100%,
    200px 200px;
  background-repeat: no-repeat, no-repeat, no-repeat, repeat;
  color: white;
  display: flex;
  flex-direction: column;
`;

const GlassHeader = styled(Paper)(({ theme }) => ({
  background: "rgba(30, 30, 40, 0.4)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  borderRadius: "0 0 24px 24px",
  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
  borderLeft: "1px solid rgba(255, 255, 255, 0.08)",
  borderRight: "1px solid rgba(255, 255, 255, 0.08)",
  boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.3)",
  padding: theme.spacing(2, 3, 0, 3),
  zIndex: 10,
  margin: theme.spacing(2),
}));

const StyledTab = styled(Tab)(({ theme }) => ({
  textTransform: "none",
  minWidth: 0,
  [theme.breakpoints.up("sm")]: {
    minWidth: 0,
  },
  fontWeight: 600,
  marginRight: theme.spacing(1),
  color: "rgba(255, 255, 255, 0.4)",
  "&.Mui-selected": {
    color: "#60a5fa",
  },
  "&.Mui-focusVisible": {
    backgroundColor: "rgba(100, 95, 228, 0.32)",
  },
}));

function csvToStockStore(csv: string): CsvStockType[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",");

  return lines
    .slice(1)
    .filter((line) => line.trim() && line.includes(","))
    .map((line) => {
      const values = line.split(",");
      const record: Record<string, string> = {};
      headers.forEach((h, i) => {
        record[headers[i] || h] = values[i];
      });

      return {
        id: (record["stock_id"] || "").trim(),
        name: (record["stock_name"] || "").trim(),
        list: (record["list"] || "").trim(),
        type: (record["type"] || "").trim(),
        group: (record["list"] || "").trim(),
      };
    })
    .filter((stock) => stock.id);
}

export default function RedBall() {
  const [loading, setLoading] = useState(true);
  const [stocks, setStocks] = useState<CsvStockType[]>([]);
  const [selectedList, setSelectedList] = useState<string>("");
  const [filteredStocks, setFilteredStocks] = useState<CsvStockType[]>([]);
  const [availableLists, setAvailableLists] = useState<string[]>([]);

  const isDebugMode = useDebugMode();

  useEffect(() => {
    const sheetId = "1v42zeXlZIUaqmDTyu3FjQrq7a4Pcudbf9S53AH8wyBA";
    const gid = "411196894";
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&id=${sheetId}&gid=${gid}`;

    setLoading(true);
    tauriFetcher(url, TauriFetcherType.Text)
      .then((text) => {
        const data = csvToStockStore(text as string);
        setStocks(data);

        const uniqueLists = Array.from(
          new Set(data.map((stock) => stock.list).filter(Boolean)),
        ) as string[];
        const sortedLists = uniqueLists.sort((a, b) => Number(a) - Number(b));
        setAvailableLists(sortedLists);

        if (sortedLists.length > 0) {
          setSelectedList(sortedLists[0]);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (selectedList) {
      const filtered = stocks.filter((stock) => stock.list === selectedList);
      setFilteredStocks(filtered);
    }
  }, [stocks, selectedList]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: string) => {
    setSelectedList(newValue);
  };

  return (
    <PageContainer>
      <GlassHeader>
        <Container maxWidth="lg">
          <Stack
            direction="row"
            alignItems="center"
            spacing={1.5}
            sx={{ mb: 2 }}
          >
            <Box
              sx={{
                p: 1,
                borderRadius: "12px",
                background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                boxShadow: "0 4px 12px rgba(220, 38, 38, 0.4)",
                display: "flex",
              }}
            >
              <TrendingIcon sx={{ color: "white" }} />
            </Box>
            <Typography
              variant="h5"
              fontWeight="800"
              sx={{ letterSpacing: "-0.5px" }}
              color="#fff"
            >
              系統推薦股
            </Typography>
          </Stack>

          {availableLists.length > 0 && (
            <Tabs
              value={selectedList}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                minHeight: 48,
                "& .MuiTabs-indicator": {
                  backgroundColor: "#60a5fa",
                  height: 3,
                  borderRadius: "3px 3px 0 0",
                  boxShadow: "0 -2px 10px rgba(96, 165, 250, 0.5)",
                },
              }}
            >
              {availableLists.map((list) => (
                <StyledTab key={list} label={`前 ${list} 日`} value={list} />
              ))}
            </Tabs>
          )}
        </Container>
      </GlassHeader>

      <Box sx={{ flex: 1, overflow: "hidden", position: "relative" }}>
        {loading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100%",
            }}
          >
            <Stack alignItems="center" spacing={2}>
              <CircularProgress size={40} sx={{ color: "#ef4444" }} />
              <Typography
                variant="body2"
                sx={{ color: "rgba(255,255,255,0.5)" }}
              >
                正在獲取數據...
              </Typography>
            </Stack>
          </Box>
        ) : (
          <Container maxWidth="lg" sx={{ height: "100%", pt: 1, pb: 10 }}>
            {filteredStocks.length > 0 && (
              <VirtualizedStockList
                stocks={filteredStocks as any}
                height={window.innerHeight - 170}
                itemHeight={340}
                showDebug={isDebugMode}
                renderItem={(stock, isVisible) => (
                  <RedBallCard stock={stock} isVisible={isVisible} />
                )}
              />
            )}
          </Container>
        )}
      </Box>
    </PageContainer>
  );
}
