import { dateFormat } from "@ch20026103/anysis";
import { Mode } from "@ch20026103/anysis/dist/esm/stockSkills/utils/dateFormat";
import { Box, Typography } from "@mui/material";
import { useMemo } from "react";
import useIndicatorSettings from "../../hooks/useIndicatorSettings";
import { calculateIndicators } from "../../utils/indicatorUtils";
import {
  ComposedChart,
  Customized,
  Line,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import BaseCandlestickRectangle from "../../components/RechartCustoms/BaseCandlestickRectangle";
import { DealTableType } from "../../types";

// 自訂 Tooltip 元件，顯示 t 及所有 payload
function MakChartTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;
  // 取出 t
  const t = dateFormat(
    new Date(payload[0]?.payload?.t * 1000).getTime(),
    Mode.TimeStampToString
  );
  return (
    <Box sx={{ color: "#222", background: "#fff", p: 1, borderRadius: 1 }}>
      <Typography>t: {t}</Typography>
      {payload
        .filter((item) =>
          ["c", "ma5", "ma10", "ma20"].includes(item.dataKey as string)
        )
        .map((item) => (
          <Typography key={item.dataKey} style={{ color: item.color }}>
            {item.name || item.dataKey}: {item.value}
          </Typography>
        ))}
    </Box>
  );
}

export default function MakChart({
  deals,
}: {
  deals: {
    data: (Omit<DealTableType, "stock_id" | "t"> & { t: number })[];
    change: any;
    price: any;
  };
}) {
  const { settings } = useIndicatorSettings();
  const data = useMemo(() => {
    return calculateIndicators(deals.data, settings).splice(-80);
  }, [deals.data, settings]);

  return (
    <Box height={120}>
      <ResponsiveContainer>
        <ComposedChart data={data}>
          <XAxis hide />
          <YAxis domain={["dataMin", "dataMax"]} dataKey="c" hide />
          <ZAxis type="number" range={[10]} />
          <Tooltip offset={50} content={<MakChartTooltip />} />
          <Line
            dataKey="h"
            stroke="#000"
            opacity={0} // 設置透明度為 0，隱藏線條
            dot={false}
            activeDot={false}
            legendType="none"
          />
          <Line
            dataKey="c"
            stroke="#000"
            opacity={0} // 設置透明度為 0，隱藏線條
            dot={false}
            activeDot={false}
            legendType="none"
          />
          <Line
            dataKey="l"
            stroke="#000"
            opacity={0} // 設置透明度為 0，隱藏線條
            dot={false}
            activeDot={false}
            legendType="none"
          />
          <Line
            dataKey="o"
            stroke="#000"
            opacity={0} // 設置透明度為 0，隱藏線條
            dot={false}
            activeDot={false}
            legendType="none"
          />
          <Customized component={BaseCandlestickRectangle} />
          <Line
            dataKey="ma5"
            stroke="#589bf3"
            dot={false}
            activeDot={false}
            legendType="none"
          />

          <Line
            dataKey="ma10"
            stroke="#ff7300"
            dot={false}
            activeDot={false}
            legendType="none"
          />
          <Line
            dataKey="ma20"
            stroke="#63c762"
            dot={false}
            activeDot={false}
            legendType="none"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Box>
  );
}
