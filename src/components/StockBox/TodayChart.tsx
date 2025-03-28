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
import getTimeProgressPercent from "../../utils/getTimeProgressPercent";

export default function TodayChart({
  todayDeals,
}: {
  todayDeals: TodayDealsType;
}) {
  const data = useMemo(() => {
    const currentProgress = getTimeProgressPercent();
    const totalCount = Math.ceil(
      todayDeals.closes.length / (currentProgress / 100)
    );
    const res = [];
    for (let i = 0; i < totalCount; i++) {
      if (todayDeals.closes[i]) {
        const close = todayDeals.closes[i];
        const avgPrice = todayDeals.avgPrices[i];
        res.push({ close, avgPrice });
      } else {
        res.push({ close: null, avgPrice: null });
      }
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
