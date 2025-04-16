import { Box, Container, Stack, Typography } from "@mui/material";
import { useContext, useMemo } from "react";
import {
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Tooltip as MuiTooltip } from "@mui/material";
import kd from "../../cls_tools/kd";
import ArrowDown from "../../components/ArrowDown";
import ArrowUp from "../../components/ArrowUp";
import { DealsContext } from "../../context/DealsContext";

export default function Kd() {
  const deals = useContext(DealsContext);

  const chartData = useMemo(() => {
    if (deals?.length === 0) return [];
    const response = [];
    let pre = kd.init(deals[0], 9);
    response.push({
      t: deals[0].t,
      k: pre.k,
      d: pre.d,
      c: deals[0].c,
      l: deals[0].l,
      h: deals[0].h,
    });
    for (let i = 1; i < deals.length; i++) {
      const deal = deals[i];
      pre = kd.next(deal, pre, 9);
      response.push({
        t: deal.t,
        k: pre.k,
        d: pre.d,
        c: deal.c,
        l: deal.l,
        h: deal.h,
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
              對照股價過高，KD是否同步過高
              <br />
              股價過高，KD沒有過高，趨勢轉弱
              <br />
              股價破低，KD沒有破低，趨勢轉強
            </Typography>
          }
          arrow
        >
          <Typography variant="h5" gutterBottom>
            KD 流線圖
          </Typography>
        </MuiTooltip>
        {chartData.length > 1 &&
        chartData[chartData.length - 1].k >
          chartData[chartData.length - 1].d ? (
          <ArrowUp color="#e26d6d" />
        ) : (
          <ArrowDown color="#79e26d" />
        )}
      </Stack>
      <Box height="calc(100vh - 32px)" width="100%">
        <ResponsiveContainer>
          <ComposedChart data={chartData}>
            <XAxis dataKey="t" />
            <YAxis yAxisId="left" domain={["dataMin", "dataMax"]} />
            {/* 右側 Y 軸 */}
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={["dataMin", "dataMax"]}
            />
            <Tooltip />
            <Line
              dataKey="k"
              stroke="#589bf3"
              dot={false}
              activeDot={false}
              legendType="none"
              yAxisId="left"
            />
            <Line
              dataKey="d"
              stroke="#ff7300"
              dot={false}
              activeDot={false}
              legendType="none"
              yAxisId="left"
            />
            <Line
              dataKey="c"
              stroke="#000"
              dot={false}
              activeDot={false}
              legendType="none"
              yAxisId="right"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </Box>
    </Container>
  );
}
