import { Box, Container, Typography } from "@mui/material";
import { useContext, useMemo } from "react";
import {
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
  Line,
  LineChart,
  ComposedChart,
} from "recharts";
import ema from "../../cls_tools/ema";
import ma from "../../cls_tools/ma";
import { DealsContext } from "../../context/DealsContext";

export default function EMAMA() {
  const deals = useContext(DealsContext);

  const chartData = useMemo(() => {
    if (deals?.length === 0) return [];
    const response = [];
    let ema_data = ema.init(deals[0], 5);
    let ma_data = ma.init(deals[0], 10);
    response.push({
      x: deals[0].t,
      y: deals[0].c,
      ema: ema_data.ema,
      ma: ma_data.ma,
      c: deals[0].c,
    });
    for (let i = 1; i < deals.length; i++) {
      const deal = deals[i];
      ema_data = ema.next(deal, ema_data, 5);
      ma_data = ma.next(deal, ma_data, 10);
      response.push({
        x: deal.t,
        ema: ema_data.ema,
        ma: ma_data.ma,
        y: (deal.h + deal.l) / 2,
        c: deal.c,
      });
    }
    return response;
  }, [deals]);

  return (
    <Container component="main">
      <Typography variant="h5" gutterBottom>
        EMA & Ma (綠色連23出現Good, 收在上升Ma5上)
      </Typography>
      <Box height="calc(100vh - 32px)" width="100%">
        <ResponsiveContainer>
          <ComposedChart data={chartData}>
            <XAxis dataKey="x" />
            <YAxis dataKey="y" />
            <ZAxis type="number" range={[10]} />
            <Tooltip />
            <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
            <Scatter name="power" shape="cross">
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    entry.ema < entry.c &&
                    entry.ma < entry.c &&
                    entry.c > entry.y
                      ? "green"
                      : "red"
                  }
                />
              ))}
            </Scatter>
            <Line dataKey="c" stroke="blue" dot={false} activeDot={false} legendType="none" />
            <Line dataKey="ma" stroke="red" dot={false} activeDot={false} legendType="none" />
          </ComposedChart>
        </ResponsiveContainer>
      </Box>
    </Container>
  );
}
