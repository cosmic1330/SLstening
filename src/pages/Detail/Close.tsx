import { Box, Container, Typography } from "@mui/material";
import { useContext } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DealsContext } from "../../context/DealsContext";

export default function Close() {
  const deals = useContext(DealsContext);

  return (
    <Container component="main">
      <Typography variant="h5" gutterBottom>Close & Low</Typography>
      <Box height="calc(100vh - 32px)" width="100%">
        <ResponsiveContainer>
          <AreaChart data={deals}>
            <XAxis dataKey="t" />
            <YAxis />
            <Tooltip />
            <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
            <Area type="monotone" dataKey="c" stroke="#e26d6d" fill="#e26d6d" />
            <Area type="monotone" dataKey="l" stroke="#black" fill="#fff" />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </Container>
  );
}
