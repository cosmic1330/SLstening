import {
  Box,
  Container,
  Tooltip as MuiTooltip,
  Stack,
  Typography,
} from "@mui/material";
import { useContext, useMemo } from "react";
import {
  Bar,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import kd from "../../cls_tools/kd";
import macd from "../../cls_tools/macd";
import { DealsContext } from "../../context/DealsContext";

export default function MJ() {
  const deals = useContext(DealsContext);

  const chartData = useMemo(() => {
    if (deals?.length === 0) return [];
    const response = [];
    let kd_data = kd.init(deals[0], 9);
    let macd_data = macd.init(deals[0]);
    response.push({
      t: deals[0].t,
      j: kd_data.j || null,
      osc: macd_data.osc || null,
      positiveOsc: macd_data.osc > 0 ? macd_data.osc : 0,
      negativeOsc: macd_data.osc < 0 ? macd_data.osc : 0,
    });
    for (let i = 1; i < deals.length; i++) {
      const deal = deals[i];
      kd_data = kd.next(deal, kd_data, 9);
      macd_data = macd.next(deal, macd_data);
      response.push({
        t: deal.t,
        j: kd_data.j || null,
        osc: macd_data.osc || null,
        positiveOsc: macd_data.osc > 0 ? macd_data.osc : 0,
        negativeOsc: macd_data.osc < 0 ? macd_data.osc : 0,
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
              J線往上穿過中線(50)且Osc從下往上穿過0線(紅柱)，代表買進點
              <br />
              J線往下穿過中線(50)且Osc從上往下穿過0線(綠柱)，代表賣出點
            </Typography>
          }
          arrow
        >
          <Typography variant="h5" gutterBottom>
            MJ 流線圖
          </Typography>
        </MuiTooltip>
      </Stack>
      <Box height="calc(100vh - 32px)" width="100%">
        <ResponsiveContainer>
          <ComposedChart data={chartData}>
            <XAxis dataKey="t" />
            <YAxis yAxisId="left" />
            {/* 右側 Y 軸 */}
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={["dataMin", "dataMax"]}
              ticks={[0, 25, 50, 75, 100]} 
            />

            <ReferenceLine
              y={0}
              stroke="#589bf3"
              strokeDasharray="3"
              yAxisId="left"
            />
            <Tooltip />
            {/* Red bars for positive values */}
            <Bar
              dataKey="positiveOsc"
              fill="#ff0000"
              yAxisId="left"
              barSize={6}
              name="Oscillator"
            />
            {/* Green bars for negative values */}
            <Bar
              dataKey="negativeOsc"
              fill="#00aa00"
              yAxisId="left"
              barSize={6}
              name="Oscillator"
            />
            <Line
              dataKey="j"
              stroke="#589bf3"
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
