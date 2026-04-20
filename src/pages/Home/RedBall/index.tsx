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
import RedBallCard, { RED_BALL_CARD_HEIGHT } from "./components/RedBallCard";

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
  background: #fdf8f2;
  backgroundimage:
    radial-gradient(at 0% 0%, rgba(61, 90, 69, 0.05) 0, transparent 50%),
    radial-gradient(at 100% 100%, rgba(210, 105, 30, 0.05) 0, transparent 50%);
  color: #5d4037;
  display: flex;
  flex-direction: column;
`;

const GhibliHeader = styled(Paper)(({ theme }) => ({
  background: "#FAF3E0",
  borderRadius: "0 0 20px 20px",
  borderBottom: "2px solid #D2B48C",
  borderLeft: "2px solid #D2B48C",
  borderRight: "2px solid #D2B48C",
  boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
  padding: theme.spacing(3, 4, 0, 4),
  zIndex: 10,
  margin: theme.spacing(0, 2, 2, 2),
}));

const StyledTab = styled(Tab)(({ theme }) => ({
  textTransform: "none",
  minWidth: 0,
  [theme.breakpoints.up("sm")]: {
    minWidth: 0,
  },
  fontWeight: 800,
  marginRight: theme.spacing(1),
  color: "#8B7355",
  opacity: 0.6,
  "&.Mui-selected": {
    color: "#3D5A45",
    opacity: 1,
  },
}));

function parseCsvLine(line: string): string[] {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function csvToStockStore(csv: string): CsvStockType[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]);

  return lines
    .slice(1)
    .filter((line) => line.trim() && line.includes(","))
    .map((line) => {
      const values = parseCsvLine(line);
      const record: Record<string, string> = {};
      headers.forEach((h, i) => {
        record[h] = values[i] || "";
      });

      return {
        id: (record["stock_id"] || "").trim(),
        name: (record["stock_name"] || "").trim(),
        list: (record["list"] || "").trim(),
        type: (record["type"] || "").trim(),
        group: (record["group"] || "").trim(),
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
      <GhibliHeader>
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
                borderRadius: "10px",
                background: "#3D5A45",
                boxShadow: "0 4px 0 #2D4A35",
                display: "flex",
              }}
            >
              <TrendingIcon sx={{ color: "#F1E5AC" }} />
            </Box>
            <Typography
              variant="h5"
              fontWeight="900"
              sx={{ letterSpacing: "-0.5px", color: "#5D4037" }}
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
                  backgroundColor: "#3D5A45",
                  height: 4,
                  borderRadius: "4px 4px 0 0",
                  boxShadow: "0 -2px 0 rgba(61, 90, 69, 0.2)",
                },
              }}
            >
              {availableLists.map((list) => (
                <StyledTab key={list} label={`前 ${list} 日`} value={list} />
              ))}
            </Tabs>
          )}
        </Container>
      </GhibliHeader>

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
              <CircularProgress size={40} sx={{ color: "#3D5A45" }} />
              <Typography
                variant="body2"
                sx={{ color: "#8B7355", fontWeight: 700 }}
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
                itemHeight={RED_BALL_CARD_HEIGHT}
                renderItem={(stock) => <RedBallCard stock={stock} />}
              />
            )}
          </Container>
        )}
      </Box>
    </PageContainer>
  );
}
