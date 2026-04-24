import { Box } from "@mui/material";
import React, { useMemo } from "react";
import {
  Area,
  AreaChart,
  ReferenceLine,
  ResponsiveContainer,
  YAxis,
} from "recharts";
import { TickDealsType } from "../../types";

const StockTickChart = React.memo(function StockTickChart({
  tickDeals,
}: {
  tickDeals: TickDealsType;
}) {
  const data = useMemo(() => {
    const baseCount = 271; // 09:00 to 13:30 inclusive = 271 minutes
    const res: { close: number | null; avgPrice: number | null }[] = new Array(
      baseCount,
    );

    // 預先填充以提高效能
    for (let i = 0; i < baseCount; i++) {
      res[i] = { close: null, avgPrice: null };
    }

    if (!tickDeals.timestamps || tickDeals.timestamps.length === 0) return res;

    const lastTs = tickDeals.timestamps[tickDeals.timestamps.length - 1];
    const lastDate = new Date(lastTs * 1000);
    const startOfDayTs =
      Date.UTC(
        lastDate.getUTCFullYear(),
        lastDate.getUTCMonth(),
        lastDate.getUTCDate(),
        1, // 01:00 UTC = 09:00 Taipei
        0,
        0,
      ) / 1000;

    const { closes, avgPrices, timestamps } = tickDeals;

    for (let i = 0; i < closes.length; i++) {
      const ts = timestamps[i];
      if (!ts) continue;

      const minuteIndex = Math.floor((ts - startOfDayTs) / 60);
      if (minuteIndex >= 0 && minuteIndex < baseCount) {
        res[minuteIndex].close = closes[i];
        res[minuteIndex].avgPrice = avgPrices[i] || null;
      }
    }

    return res;
  }, [tickDeals.closes, tickDeals.avgPrices, tickDeals.timestamps]);

  const isUp = useMemo(() => {
    return tickDeals.price >= tickDeals.previousClose;
  }, [tickDeals.price, tickDeals.previousClose]);

  const mainColor = isUp ? "#ff5252" : "#69f0ae";
  const gradientId = `gradient-${tickDeals.id}`;

  return (
    <Box height={64} sx={{ width: "100%", opacity: 0.8 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={mainColor} stopOpacity={0.15} />
              <stop offset="95%" stopColor={mainColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis
            domain={([dataMin, dataMax]) => {
              if (!Number.isFinite(tickDeals.previousClose))
                return [dataMin, dataMax];
              const min = Math.min(dataMin, tickDeals.previousClose);
              const max = Math.max(dataMax, tickDeals.previousClose);
              const padding = (max - min) * 0.1 || 0.1;
              return [min - padding, max + padding];
            }}
            hide
          />
          {Number.isFinite(tickDeals.previousClose) && (
            <ReferenceLine
              y={tickDeals.previousClose}
              stroke="rgba(255,255,255,0.3)"
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
            fill={`url(#${gradientId})`}
            dot={false}
            isAnimationActive={false}
            connectNulls={true}
          />
          <Area
            type="monotone"
            dataKey="avgPrice"
            stroke="rgba(255,255,255,0.6)"
            strokeWidth={1}
            fill="transparent"
            dot={false}
            isAnimationActive={false}
            connectNulls={true}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
});

export default StockTickChart;
