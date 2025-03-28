import { Box } from "@mui/material";
import {
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  YAxis,
} from "recharts";
import { useMemo } from "react";
import { TodayDealsType } from "../../hooks/useDeals";

export default function TodayChart({
  todayDeals,
}: {
  todayDeals: TodayDealsType;
}) {
  const data = useMemo(() => {
    const res = [];
    for (let i = 0; i < todayDeals.closes.length; i++) {
      const close = todayDeals.closes[i];
      const avgPrice = todayDeals.avgPrices[i];
      res.push({ close, avgPrice });
    }
    return res;
  }, [todayDeals]);

  return (
    <Box height={50}>
      <ResponsiveContainer>
        <LineChart data={data}>
          <YAxis domain={["dataMin", "dataMax"]} hide />
          <ReferenceLine
            y={todayDeals.previousClose}
            stroke="#63c762"
            strokeWidth={1.5}
            ifOverflow="extendDomain"
          />
          <Line
            type="monotone"
            dataKey={"avgPrice"}
            stroke={"#ff7300"}
            strokeWidth={1.5}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey={"close"}
            stroke={"#fff"}
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
}
