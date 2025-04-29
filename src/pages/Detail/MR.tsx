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
  Bar,
  Brush,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import rsi from "../../cls_tools/rsi";
import macd from "../../cls_tools/macd";
import { DealsContext } from "../../context/DealsContext";

export default function MR() {
  const deals = useContext(DealsContext);

  const chartData = useMemo(() => {
    if (deals?.length === 0) return [];
    const response = [];
    let rsi_data = rsi.init(deals[0], 5);
    let macd_data = macd.init(deals[0]);
    response.push({
      t: deals[0].t,
      c: deals[0].c,
      j: rsi_data.rsi || null,
      osc: macd_data.osc || null,
      long: null,
      short: null,
      positiveOsc: macd_data.osc > 0 ? macd_data.osc : 0,
      negativeOsc: macd_data.osc < 0 ? macd_data.osc : 0,
    });
    for (let i = 1; i < deals.length; i++) {
      const deal = deals[i];
      rsi_data = rsi.next(deal, rsi_data, 5);
      macd_data = macd.next(deal, macd_data);
      response.push({
        t: deal.t,
        c: deal.c,
        j: rsi_data.rsi || null,
        osc: macd_data.osc || null,
        long: rsi_data.rsi > 50 && macd_data.osc > 0 ? rsi_data.rsi : null,
        short: rsi_data.rsi < 50 && macd_data.osc < 0 ? rsi_data.rsi : null,
        positiveOsc: macd_data.osc > 0 ? macd_data.osc : 0,
        negativeOsc: macd_data.osc < 0 ? macd_data.osc : 0,
      });
    }
    console.log(response);
    return response;
  }, [deals]);

  return (
    <Container component="main">
      <Stack spacing={1} direction="row" alignItems="center">
        <MuiTooltip
          title={
            <Typography>
              RSI線往上穿過中線(50)且Osc從下往上穿過0線(紅柱)，代表買進點
              <br />
              RSI線往下穿過中線(50)且Osc從上往下穿過0線(綠柱)，代表賣出點
            </Typography>
          }
          arrow
        >
          <Typography variant="h5" gutterBottom>
            MR 流線圖
          </Typography>
        </MuiTooltip>
      </Stack>
      <Box height="calc(100vh - 32px)" width="100%">
        <ResponsiveContainer width="100%" height="30%">
          <ComposedChart data={chartData} syncId="anySyncId">
            <XAxis dataKey="t" />
            <YAxis domain={["dataMin", "dataMax"]} />
            <Tooltip offset={50} />
            <Line
              dataKey="c"
              stroke="#000"
              dot={false}
              activeDot={false}
              legendType="none"
            />
          </ComposedChart>
        </ResponsiveContainer>
        <ResponsiveContainer width="100%" height="40%">
          <ComposedChart data={chartData} syncId="anySyncId">
            <XAxis dataKey="t" />
            <YAxis
              domain={["dataMin", "dataMax"]}
              ticks={[0, 25, 50, 75, 100]}
            />
            <Tooltip offset={50} />
            <ReferenceLine y={80} stroke="#ff0000" strokeDasharray="5 5" />
            <ReferenceLine y={20} stroke="#ff0000" strokeDasharray="5 5" />
            <Line
              dataKey="j"
              stroke="#589bf3"
              dot={false}
              activeDot={false}
              legendType="none"
            />
            <Area
              type="monotone"
              dataKey="long"
              fill="#faa"
              stroke="#faa"
              baseValue={50}
            />
            <Area
              type="monotone"
              dataKey="short"
              fill="#afa"
              stroke="#afa"
              baseValue={50}
            />
          </ComposedChart>
        </ResponsiveContainer>
        <ResponsiveContainer width="100%" height="30%">
          <ComposedChart data={chartData} syncId="anySyncId">
            <XAxis dataKey="t" />
            <YAxis />
            <ReferenceLine y={0} stroke="#589bf3" strokeDasharray="3" />
            <Tooltip offset={50} />
            {/* Red bars for positive values */}
            <Bar
              dataKey="positiveOsc"
              fill="#ff0000"
              barSize={6}
              name="Oscillator"
            />
            {/* Green bars for negative values */}
            <Bar
              dataKey="negativeOsc"
              fill="#00aa00"
              barSize={6}
              name="Oscillator"
            />
            <Brush dataKey="name" height={20} stroke="#8884d8" />
          </ComposedChart>
        </ResponsiveContainer>
      </Box>
    </Container>
  );
}
