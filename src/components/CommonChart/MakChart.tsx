import { dateFormat } from "@ch20026103/anysis";
import { Mode } from "@ch20026103/anysis/dist/esm/stockSkills/utils/dateFormat";
import { Box, Typography } from "@mui/material";
import { useMemo } from "react";
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
import boll from "../../cls_tools/boll";
import ma from "../../cls_tools/ma";
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
  const data = useMemo(() => {
    let ma5 = ma.init(deals.data[0], 5);
    let ma10 = ma.init(deals.data[0], 10);
    let ma20 = ma.init(deals.data[0], 20);
    let ma60 = ma.init(deals.data[0], 60);
    let bollData = boll.init(deals.data[0]);

    let res: {
      ma5: number | null;
      ma10: number | null;
      ma20: number | null;
      ma60: number | null;
      bollMa: number | null;
      bollUb: number | null;
      bollLb: number | null;
      t: number;
      o: number;
      c: number;
      h: number;
      l: number;
      v: number;
    }[] = [
      {
        bollLb: null,
        bollMa: null,
        bollUb: null,
        ma5: null,
        ma10: null,
        ma20: null,
        ma60: null,
        ...deals.data[0],
      },
    ];

    for (let i = 1; i < deals.data.length; i++) {
      const item = deals.data[i];
      ma5 = ma.next(item, ma5, 5);
      ma10 = ma.next(item, ma10, 10);
      ma20 = ma.next(item, ma20, 20);
      ma60 = ma.next(item, ma60, 60);
      bollData = boll.next(item, bollData, 20);
      res.push({
        ma5: ma5.ma || null,
        ma10: ma10.ma || null,
        ma20: ma20.ma || null,
        ma60: ma60.ma || null,
        bollMa: bollData.bollMa || null,
        bollUb: bollData.bollUb || null,
        bollLb: bollData.bollLb || null,
        ...item,
      });
    }
    return res.splice(-80);
  }, [deals.data]);

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
