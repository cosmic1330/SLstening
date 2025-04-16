import {
  Box,
  Container,
  Tooltip as MuiTooltip,
  Stack,
  Typography,
} from "@mui/material";
import { useContext, useMemo } from "react";
import {
  Area,
  ComposedChart,
  Line,
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
    let pre = obv.init(deals[0], 10);
    response.push({
      t: deals[0].t,
      obv: pre.obv,
      obv5: pre.obvMa,
      c: deals[0].c,
    });
    for (let i = 1; i < deals.length; i++) {
      const deal = deals[i];
      pre = obv.next(deal, pre, 10);
      response.push({
        t: deal.t,
        obv: pre.obv,
        obv5: pre.obvMa,
        c: deal.c,
      });
    }
    return response;
  }, [deals]);

  return (
    <Container component="main">
      <Stack spacing={1} direction="row" alignItems="center">
        <MuiTooltip
          title={
            <Typography>
              對照股價上升，OBV是否同步上升
              <br />
              判斷價量先行和是否量增價漲
            </Typography>
          }
          arrow
        >
          <Typography variant="h5" gutterBottom>
            OBV 流線圖
          </Typography>
        </MuiTooltip>
        {chartData.length > 1 &&
        chartData[chartData.length - 1].obv >
          chartData[chartData.length - 1].obv5 &&
        chartData[chartData.length - 1].obv -
          chartData[chartData.length - 1].obv5 >
          chartData[chartData.length - 2].obv -
            chartData[chartData.length - 2].obv5 ? (
          <ArrowUp color="#e26d6d" />
        ) : (
          <ArrowDown color="#79e26d" />
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
            <Area
              type="monotone"
              dataKey="obv5"
              stroke="#ff7300"
              fill="#ff7300"
            />
            <Area
              type="monotone"
              dataKey="obv"
              stroke="#589bf3"
              fill="#589bf3"
            />{" "}
            <Line
              yAxisId="right"
              dataKey="c"
              stroke="#000"
              dot={false}
              activeDot={false}
              legendType="none"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </Box>
    </Container>
  );
}
