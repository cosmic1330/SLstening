import { Box } from "@mui/material";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  ReferenceLine,
  ResponsiveContainer,
  YAxis,
} from "recharts";
import { TickDealsType } from "../../types";
import getTimeProgressPercent from "../../utils/getTimeProgressPercent";

export default function StockTickChart({
  tickDeals,
}: {
  tickDeals: TickDealsType;
}) {
  const data = useMemo(() => {
    const res = [];
    const baseCount = 270; // Fixed 270 minutes for Taiwan stock market (09:00-13:30)
    const totalCount = Math.max(baseCount, tickDeals.closes.length);

    for (let i = 0; i < totalCount; i++) {
      if (i < tickDeals.closes.length) {
        const close = tickDeals.closes[i];
        const avgPrice = tickDeals.avgPrices[i];
        res.push({ close, avgPrice });
      } else {
        res.push({ close: null, avgPrice: null });
      }
    }
    return res;
  }, [tickDeals.closes, tickDeals.avgPrices]);

  const isUp = useMemo(() => {
    if (tickDeals.closes.length < 1) return true;
    return tickDeals.price >= tickDeals.previousClose;
  }, [tickDeals]);

  const mainColor = isUp ? "#ff5252" : "#69f0ae";

  return (
    <Box height={64} sx={{ width: "100%", opacity: 0.8 }}>
      <ResponsiveContainer>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={mainColor} stopOpacity={0.15} />
              <stop offset="95%" stopColor={mainColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis
            domain={([dataMin, dataMax]) => {
              if (!Number.isFinite(tickDeals.previousClose))
                return [dataMin, dataMax];
              return [
                Math.min(dataMin, tickDeals.previousClose),
                Math.max(dataMax, tickDeals.previousClose),
              ];
            }}
            hide
          />
          {Number.isFinite(tickDeals.previousClose) && (
            <ReferenceLine
              y={tickDeals.previousClose}
              stroke="rgba(255,255,255,0.5)"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
          )}
          <Area
            type="monotone"
            dataKey="close"
            stroke={mainColor}
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#areaGradient)"
            dot={false}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="avgPrice"
            stroke="#ffffff"
            strokeWidth={1}
            fill="transparent"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
}
