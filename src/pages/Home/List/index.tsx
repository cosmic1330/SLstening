import { Box, Container, Grid } from "@mui/material";
import { listen } from "@tauri-apps/api/event";
import { info } from "@tauri-apps/plugin-log";
import { useEffect } from "react";
import { STOCK_BOX_HEIGHT } from "../../../components/StockBox";
import VirtualizedStockList from "../../../components/VirtualizedStockList";
import useStocksStore from "../../../store/Stock.store";
import CnnBox from "./cnn";
import MmBox from "./mm";
import NasdaqBox from "./nasdaq";
import OtcBox from "./otc";
import TwseBox from "./twse";
import WtxBox from "./wtx";

import { useShowMarketInfo } from "../../../hooks/useShowMarketInfo";

function List() {
  const { stocks, reload } = useStocksStore();
  const marketVisibility = useShowMarketInfo();

  useEffect(() => {
    // 监听股票添加事件
    const unlistenadd = listen("stock-added", async (event: any) => {
      const { stockNumber } = event.payload;
      await reload();
      info(`stock add ${stockNumber}`);
    });
    const unlistenremoved = listen("stock-removed", async (event: any) => {
      const { stockNumber } = event.payload;
      await reload();
      info(`stock removed ${stockNumber}`);
    });

    return () => {
      // 清理监听器
      unlistenadd.then((fn) => fn());
      unlistenremoved.then((fn) => fn());
    };
  }, []);

  return (
    <Container component="main">
      <Box mt={2} mb={"80px"}>
        <Grid container spacing={2}>
          {marketVisibility.cnn && (
            <Grid size={12}>
              <CnnBox />
            </Grid>
          )}
          {marketVisibility.mm && (
            <Grid size={12}>
              <MmBox />
            </Grid>
          )}
          {marketVisibility.nasdaq && (
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <NasdaqBox />
            </Grid>
          )}
          {marketVisibility.wtx && (
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <WtxBox />
            </Grid>
          )}
          {marketVisibility.twse && (
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TwseBox />
            </Grid>
          )}
          {marketVisibility.otc && (
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <OtcBox />
            </Grid>
          )}
        </Grid>

        <Box mt={2}>
          {stocks.length > 0 && (
            <VirtualizedStockList
              stocks={stocks}
              height={window.innerHeight}
              itemHeight={STOCK_BOX_HEIGHT}
            />
          )}
        </Box>
      </Box>
    </Container>
  );
}

export default List;
