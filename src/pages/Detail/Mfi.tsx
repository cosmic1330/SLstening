import {
  Box,
  Container,
  Stack,
  Tooltip as MuiTooltip,
  Typography,
} from "@mui/material";
import { useContext, useMemo } from "react";
import {
  Brush,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import mfi from "../../cls_tools/mfi";
import rsi from "../../cls_tools/rsi";
import { DealsContext } from "../../context/DealsContext";

interface ChartDataItem {
  t: number;
  c: number;
  mfi: number | null;
  rsi5: number | null;
  rsi14: number | null;
}

interface Signal {
  t: number;
  mfi: number;
}

export default function Mfi() {
  const deals = useContext(DealsContext);

  // 計算 MFI / RSI
  const chartData: ChartDataItem[] = useMemo(() => {
    if (!deals || deals.length === 0) return [];

    const response: ChartDataItem[] = [];
    let mfiData = mfi.init(deals[0], 14);
    let rsi5Data = rsi.init(deals[0], 5);
    let rsi14Data = rsi.init(deals[0], 14);

    response.push({
      t: deals[0].t,
      c: deals[0].c,
      mfi: mfiData.mfi,
      rsi5: rsi5Data.rsi,
      rsi14: rsi14Data.rsi,
    });

    for (let i = 1; i < deals.length; i++) {
      const deal = deals[i];
      mfiData = mfi.next(deal, mfiData, 14);
      rsi5Data = rsi.next(deal, rsi5Data, 5);
      rsi14Data = rsi.next(deal, rsi14Data, 14);

      response.push({
        t: deal.t,
        c: deal.c,
        mfi: mfiData.mfi,
        rsi5: rsi5Data.rsi,
        rsi14: rsi14Data.rsi,
      });
    }
    return response;
  }, [deals]);

  // 找 MFI 峰值 / 谷值信號
  const signals: Signal[] = useMemo(() => {
    const result: Signal[] = [];
    for (let i = 1; i < chartData.length; i++) {
      const prev = chartData[i - 1];
      const cur = chartData[i];

      // 確認 mfi / rsi5 / rsi14 都不是 null
      if (
        prev.mfi !== null &&
        cur.mfi !== null &&
        cur.rsi5 !== null &&
        cur.rsi14 !== null
      ) {
        // 谷值信號
        if (prev.mfi < 20 && cur.mfi >= 20 && cur.rsi5 > cur.rsi14) {
          result.push({
            t: cur.t,
            mfi: cur.mfi,
          });
        }
      }
    }
    return result;
  }, [chartData]);

  return (
    <Container component="main">
      <Stack spacing={1} direction="row" alignItems="center">
        <MuiTooltip
          title={
            <Typography variant="body2" color="text.secondary">
              谷值: 股價下降但 MFI 趨勢線上升，可能反轉向上
              <br />
              峰值: 股價上升但 MFI 趨勢線下降，可能反轉向下
            </Typography>
          }
        >
          <Typography variant="h5" gutterBottom>
            MFI 流線圖
          </Typography>
        </MuiTooltip>
      </Stack>

      <Box height="calc(100vh - 32px)" width="100%">
        {/* 價格線 */}
        <ResponsiveContainer width="100%" height="50%">
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

        {/* MFI 指標線 */}
        <ResponsiveContainer width="100%" height="50%">
          <ComposedChart data={chartData} syncId="anySyncId">
            <XAxis dataKey="t" />
            <YAxis domain={["dataMin", "dataMax"]} />
            <Tooltip offset={50} />
            <ReferenceLine y={80} stroke="#ff0000" strokeDasharray="5 5" />
            <ReferenceLine y={20} stroke="#ff0000" strokeDasharray="5 5" />
            <Line
              dataKey="mfi"
              stroke="#589bf3"
              dot={false}
              activeDot={false}
              legendType="none"
            />
            {signals.map(signal => (
              <ReferenceDot
                key={signal.t}
                x={signal.t}
                y={signal.mfi!} // 確保不是 null
                r={3}
                stroke="none"
                fill="red"
              />
            ))}
            <Brush dataKey="t" height={20} stroke="#8884d8" />
          </ComposedChart>
        </ResponsiveContainer>
      </Box>
    </Container>
  );
}
