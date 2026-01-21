import { Box } from "@mui/material";
import { useMemo } from "react";
import {
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  YAxis,
} from "recharts";
import { TickDealsType } from "../../types";
import getTimeProgressPercent from "../../utils/getTimeProgressPercent";

export default function StockTickChart({ tickDeals }: { tickDeals: TickDealsType }) {
  const data = useMemo(() => {
    const res = [];
    try {
      const currentProgress = getTimeProgressPercent(tickDeals.ts);

      if (currentProgress <= 0 || tickDeals.closes.length === 0) {
        return tickDeals.closes.map((close, i) => ({
          close,
          avgPrice: tickDeals.avgPrices[i],
        }));
      }

      let totalCount = Math.ceil(
        tickDeals.closes.length / (currentProgress / 100)
      );

      // Limit totalCount to prevent crashes if currentProgress is very small
      if (!Number.isFinite(totalCount) || totalCount > 1000) {
        totalCount = Math.max(tickDeals.closes.length, 270);
      }

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
          {Number.isFinite(tickDeals.previousClose) && (
            <ReferenceLine
              y={tickDeals.previousClose}
              stroke="#63c762"
              strokeWidth={1.5}
              ifOverflow="extendDomain"
            />
          )}
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
