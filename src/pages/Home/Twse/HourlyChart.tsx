import { Box, Tooltip } from "@mui/material";
import { useMemo } from "react";
import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";
import boll from "../../../cls_tools/boll";
import ma from "../../../cls_tools/ma";
import ChartTooltip from "../../../components/ResultTable/Charts/ChartTooltip";
import { IndicatorColorType } from "../../../components/ResultTable/types";
import { DealTableType } from "../../../types";

const IndicatorColor: IndicatorColorType[] = [
  {
    key: "bollUb",
    color: "#efe2a6",
  },
  {
    key: "bollMa",
    color: "#ff7300",
  },
  {
    key: "bollLb",
    color: "#efe2a6",
  },
  {
    key: "ma60",
    color: "#63c762",
  },
  {
    key: "ma10",
    color: "#9b58f3",
  },
  {
    key: "ma5",
    color: "#589bf3",
  },
  {
    key: "c",
    color: "#fff",
  },
];

export default function HourlyChart({
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
    return res.splice(-30);
  }, [deals.data]);
  return (
    <Tooltip title={<ChartTooltip value={IndicatorColor} />} arrow>
      <Box height={60}>
        <ResponsiveContainer>
          <LineChart data={data}>
            <YAxis domain={["dataMin", "dataMax"]} hide />
            {IndicatorColor.map((item, index) => (
              <Line
                key={index}
                type="monotone"
                dataKey={item.key}
                stroke={item.color}
                strokeWidth={1.5}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Tooltip>
  );
}
