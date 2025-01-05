import { Box, Container, Typography } from "@mui/material";
import { useContext, useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ma from "../../cls_tools/ma";
import { DealsContext } from "../../context/DealsContext";

export default function Ma() {
  const deals = useContext(DealsContext);

  const chartData = useMemo(() => {
    if (deals?.length === 0) return [];
    const response = [];
    let ma5_data = ma.init(deals[0], 5);
    let ma10_data = ma.init(deals[0], 10);
    let ma20_data = ma.init(deals[0], 20);
    response.push({ t: deals[0].t, obv: ma5_data.ma });
    for (let i = 1; i < deals.length; i++) {
      const deal = deals[i];
      ma5_data = ma.next(deal, ma5_data, 5);
      ma10_data = ma.next(deal, ma10_data, 10);
      ma20_data = ma.next(deal, ma20_data, 20);
      response.push({
        t: deal.t,
        ma5: ma5_data.ma,
        ma10: ma10_data.ma,
        ma20: ma20_data.ma,
      });
    }
    return response;
  }, [deals]);

  return (
    <Container component="main">
      <Typography variant="h5" gutterBottom>
        Ma
      </Typography>
      <Box height="calc(100vh - 32px)" width="100%">
        <ResponsiveContainer>
          <ComposedChart data={chartData}>
            <XAxis dataKey="t" />
            <YAxis />
            <Tooltip />
            <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
            <Area
              type="monotone"
              dataKey="ma5"
              stroke="#fbf582"
              fill="#fbf582"
            />
            <Area
              type="monotone"
              dataKey="ma10"
              stroke="#94ecdc"
              fill="#94ecdc"
            />
            <Area
              type="monotone"
              dataKey="ma20"
              stroke="#8884d8"
              fill="#8884d8"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </Box>
    </Container>
  );
}
