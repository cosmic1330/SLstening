import { Box, Container, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { tauriFetcher, TauriFetcherType } from "../../../api/http_cache";
import StockBox from "../../../components/StockBox";
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

  useEffect(() => {
    const sheetId = "1v42zeXlZIUaqmDTyu3FjQrq7a4Pcudbf9S53AH8wyBA";
    const gid = "1357298096";
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&id=${sheetId}&gid=${gid}`;

    tauriFetcher(url, TauriFetcherType.Text).then((text) => {
      const data = csvToStockStore(text as string);
      setStocks(data);
    });
  }, []);

  return (
    <Container component="main">
      <Typography
        variant="h5"
        color="#fff"
        mt={2}
        mb={1}
        sx={{ textShadow: "0 0 3px #000" }}
      >
        SListenting 綠球股
      </Typography>
      <Box mt={2} mb={"80px"}>
        {stocks.map((stock, index) => (
          <StockBox key={index} stock={stock} canDelete={false} />
        ))}
      </Box>
    </Container>
  );
}
