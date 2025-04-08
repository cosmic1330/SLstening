import { Box, Container, Stack, Typography } from "@mui/material";
import { useContext, useMemo } from "react";
import {
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import ema from "../../cls_tools/ema";
import ma from "../../cls_tools/ma";
import ArrowDown from "../../components/ArrowDown";
import ArrowUp from "../../components/ArrowUp";
import { DealsContext } from "../../context/DealsContext";

export default function EMAMA() {
  const deals = useContext(DealsContext);

  const chartData = useMemo(() => {
    if (deals?.length === 0) return [];
    const response = [];
    let ema_data = ema.init(deals[0], 5);
    let ma5_data = ma.init(deals[0], 5);
    let ma10_data = ma.init(deals[0], 10);
    response.push({
      x: deals[0].t,
      y: deals[0].c,
      ema: ema_data.ema,
      ma5: ma5_data.ma,
      ma10: ma10_data.ma,
      c: deals[0].c,
    });
    for (let i = 1; i < deals.length; i++) {
      const deal = deals[i];
      ema_data = ema.next(deal, ema_data, 5);
      ma5_data = ma.next(deal, ma5_data, 5);
      ma10_data = ma.next(deal, ma10_data, 10);
      response.push({
        x: deal.t,
        ema: ema_data.ema,
        ma5: ma5_data.ma,
        ma10: ma10_data.ma,
        y: (deal.h + deal.l) / 2,
        c: deal.c,
      });
    }
    return response;
  }, [deals]);

  return (
    <Container component="main">
      <Stack spacing={1} direction="row" alignItems="center">
        <Typography variant="h5" gutterBottom>
          星點指標
        </Typography>
        {chartData.length > 0 &&
        chartData[chartData.length - 1].y > chartData[chartData.length - 2].y &&
        chartData[chartData.length - 1].y > chartData[chartData.length - 3].y &&
        chartData[chartData.length - 1].y >
          chartData[chartData.length - 1].ema &&
        chartData[chartData.length - 1].y >
          chartData[chartData.length - 1].ma10 &&
        chartData[chartData.length - 1].ema >
          chartData[chartData.length - 1].ma10 ? (
          <ArrowUp color="#e26d6d" />
        ) : (
          <ArrowDown color="#79e26d" />
        )}
      </Stack>
      <Box height="calc(100vh - 32px)" width="100%">
        <ResponsiveContainer>
          <ComposedChart data={chartData}>
            <XAxis dataKey="x" />
            <YAxis dataKey="y" />
            <ZAxis type="number" range={[10]} />
            <Tooltip />
            <Scatter name="power" shape="cross">
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    entry.ema < entry.c && entry.ma10 < entry.c
                      ? "#e58282"
                      : "#63c762"
                  }
                />
              ))}
            </Scatter>
            <Line
              dataKey="c"
              stroke="#589bf3"
              dot={false}
              activeDot={false}
              legendType="none"
            />
            <Line
              dataKey="ma5"
              stroke="#ff7300"
              dot={false}
              activeDot={false}
              legendType="none"
            />
            <Line
              dataKey="ma10"
              stroke="#63c762"
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
