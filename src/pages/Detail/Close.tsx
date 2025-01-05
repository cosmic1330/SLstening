import { Box, Container, Stack, Typography } from "@mui/material";
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
import ArrowDown from "../../components/ArrowDown";
import ArrowUp from "../../components/ArrowUp";
import { DealsContext } from "../../context/DealsContext";

export default function Close() {
  const deals = useContext(DealsContext);

  return (
    <Container component="main">
      <Stack spacing={1} direction="row" alignItems="center">
        <Typography variant="h5" gutterBottom>
          Close & Low (往上紅色區域變多Good)
        </Typography>
        {deals.length > 0 &&
        deals[deals.length - 1].c > deals[deals.length - 2].c &&
        deals[deals.length - 1].c - deals[deals.length - 1].l >
          deals[deals.length - 2].c - deals[deals.length - 2].l ? (
          <ArrowUp color="#e26d6d" />
        ) : (
          <ArrowDown color="#e26d6d" />
        )}
      </Stack>
      <Box height="calc(100vh - 32px)" width="100%">
        <ResponsiveContainer>
          <AreaChart data={deals}>
            <XAxis dataKey="t" />
            <YAxis />
            <Tooltip />
            <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
            <Area type="monotone" dataKey="c" stroke="#e26d6d" fill="#e26d6d" />
            <Area type="monotone" dataKey="l" stroke="#ccc" fill="#fff" />
          </AreaChart>
        </ResponsiveContainer>
      </Box>
    </Container>
  );
}
