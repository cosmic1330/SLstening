import { Box } from "@mui/material";
import { useMemo } from "react";
import {
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  YAxis,
} from "recharts";
import getTimeProgressPercent from "../../utils/getTimeProgressPercent";
import { TickDealsType } from "../../types";

export default function TickChart({ tickDeals }: { tickDeals: TickDealsType }) {
  const data = useMemo(() => {
    const res = [];
    try {
      const currentProgress = getTimeProgressPercent(tickDeals.ts);
      const totalCount = Math.ceil(
        tickDeals.closes.length / (currentProgress / 100)
      );
      for (let i = 0; i < totalCount; i++) {
        if (tickDeals.closes[i]) {
          const close = tickDeals.closes[i];
          const avgPrice = tickDeals.avgPrices[i];
          res.push({ close, avgPrice });
        } else {
          res.push({ close: null, avgPrice: null });
        }
      }
    } catch (error) {
      console.error("Error in data calculation:", error);
    }
    return res;
  }, [tickDeals]);

  return (
    <Box height={50}>
      <ResponsiveContainer>
        <LineChart data={data}>
          <YAxis domain={["dataMin", "dataMax"]} hide />
          <ReferenceLine
            y={tickDeals.previousClose}
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
