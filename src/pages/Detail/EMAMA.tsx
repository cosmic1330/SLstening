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
} from "recharts";
import ema from "../../cls_tools/ema";
import ma from "../../cls_tools/ma";
import { DealsContext } from "../../context/DealsContext";

export default function EMAMA() {
  const deals = useContext(DealsContext);

  const chartData = useMemo(() => {
    if (deals?.length === 0) return [];
    const response = [];
    let ma10_data = ema.init(deals[0], 10);
    let ma5_data = ma.init(deals[0], 5);
    response.push({
      x: deals[0].t,
      y: deals[0].c,
      ema: ma10_data.ema,
      ma: ma5_data.ma,
      up: false,
    });
    for (let i = 1; i < deals.length; i++) {
      const deal = deals[i];
      ma10_data = ema.next(deal, ma10_data, 10);
      const pre = ma5_data.ma;
      ma5_data = ma.next(deal, ma5_data, 5);
      response.push({
        x: deal.t,
        ema: ma10_data.ema,
        ma: ma5_data.ma,
        y: deal.c,
        up: ma5_data.ma > pre,
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
          <ScatterChart>
            <XAxis dataKey="x" />
            <YAxis dataKey="y" />
            <ZAxis type="number" range={[10]} />
            <Tooltip />
            <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
            <Scatter name="A school" data={chartData} shape="cross">
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    entry.ema < entry.y && entry.ma < entry.y && entry.up? "green" : "red"
                  }
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </Box>
    </Container>
  );
}
