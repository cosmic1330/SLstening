import { StockType } from "@ch20026103/anysis/dist/esm/stockSkills/types";
import { Box, Container, Typography } from "@mui/material";
import { useContext, useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import obv from "../../cls_tools/obv";
import { DealsContext } from "../../context/DealsContext";

export default function Obv() {
  const deals = useContext(DealsContext);

  const chartData = useMemo(() => {
    if (deals?.length === 0) return [];
    const response = [];
    let pre = obv.init(
      deals[0] as Required<Pick<StockType, "v">> & StockType,
      5
    );
    response.push({ t: deals[0].t, obv: pre.obv });
    for (let i = 1; i < deals.length; i++) {
      const deal = deals[i] as Required<Pick<StockType, "v">> & StockType;
      pre = obv.next(deal, pre, 5);
      response.push({ t: deal.t, obv: pre.obv });
    }
    return response;
  }, [deals]);

  return (
    <Container component="main">
      <Typography variant="h5" gutterBottom>
        Obv
      </Typography>
      <Box height="calc(100vh - 32px)" width="100%">
        <ResponsiveContainer>
          <AreaChart data={chartData}>
            <XAxis dataKey="t" />
            <YAxis />
            <Tooltip />
            <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
            <Area type="monotone" dataKey="obv" stroke="#8884d8" />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </Container>
  );
}
