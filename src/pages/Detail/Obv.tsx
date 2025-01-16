import { StockType } from "@ch20026103/anysis/dist/esm/stockSkills/types";
import { Box, Container, Stack, Typography } from "@mui/material";
import { useContext, useMemo } from "react";
import {
  Area,
  ComposedChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import obv from "../../cls_tools/obv";
import ArrowDown from "../../components/ArrowDown";
import ArrowUp from "../../components/ArrowUp";
import { DealsContext } from "../../context/DealsContext";

export default function Obv() {
  const deals = useContext(DealsContext);

  const chartData = useMemo(() => {
    if (deals?.length === 0) return [];
    const response = [];
    let pre = obv.init(
      deals[0] as Required<Pick<StockType, "v">> & StockType,
      10
    );
    response.push({
      t: deals[0].t,
      obv: pre.obv,
      obv10: pre.obvMa,
      c: deals[0].c,
    });
    for (let i = 1; i < deals.length; i++) {
      const deal = deals[i] as Required<Pick<StockType, "v">> & StockType;
      pre = obv.next(deal, pre, 10);
      response.push({
        t: deal.t,
        obv: pre.obv,
        obv10: pre.obvMa,
        c: deal.c,
      });
    }
    return response;
  }, [deals]);

  return (
    <Container component="main">
      <Stack spacing={1} direction="row" alignItems="center">
        <Typography variant="h5" gutterBottom>
          Obv (往上紫色區域凸出Good)
        </Typography>
        {chartData.length > 1 &&
        chartData[chartData.length - 1].obv >
          chartData[chartData.length - 1].obv10 &&
        chartData[chartData.length - 1].obv -
          chartData[chartData.length - 1].obv10 >
          chartData[chartData.length - 2].obv -
            chartData[chartData.length - 2].obv10 ? (
          <ArrowUp color="#8884d8" />
        ) : (
          <ArrowDown color="#8884d8" />
        )}
      </Stack>
      <Box height="calc(100vh - 32px)" width="100%">
        <ResponsiveContainer>
          <ComposedChart data={chartData}>
            <XAxis dataKey="t" />
            <YAxis />
            {/* 右側 Y 軸 */}
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
            <Area
              type="monotone"
              dataKey="obv10"
              stroke="#f57878"
              fill="#f57878"
            />
            <Area
              type="monotone"
              dataKey="obv"
              stroke="#8884d8"
              fill="#8884d8"
            />
            {/* <Line
              yAxisId="right"
              dataKey="c"
              stroke="green"
              dot={false}
              activeDot={false}
              legendType="none"
            /> */}
          </ComposedChart>
        </ResponsiveContainer>
      </Box>
    </Container>
  );
}
