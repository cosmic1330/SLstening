import { Box, Tooltip } from "@mui/material";
import { useContext, useEffect, useState } from "react";
import { Line, LineChart, ReferenceLine, YAxis } from "recharts";
import { DatabaseContext } from "../../../../../../../context/DatabaseContext";
import ChartTooltip from "./ChartTooltip";
import { IndicatorColorType } from "../types";

const IndicatorColor: IndicatorColorType[] = [
  {
    key: "k",
    color: "#589bf3",
  },
  {
    key: "d",
    color: "#ff7300",
  },
];

const DailyKdLineChart = ({ stock_id, t }: { stock_id: string; t: string }) => {
  const { db } = useContext(DatabaseContext);
  const [data, setData] = useState<any[]>([]);
  useEffect(() => {
    if (!stock_id) return;
    const sqlQuery = `SELECT skills.t, ${IndicatorColor.map((item) => item.key).join(
      ","
    )} FROM skills JOIN daily_deal ON skills.t = daily_deal.t AND skills.stock_id = daily_deal.stock_id WHERE skills.stock_id = ${stock_id} AND skills.t <= '${t}' ORDER BY skills.t DESC LIMIT 25`;
    if (!db) return;

    db?.select(sqlQuery).then((res: any) => {
      const formatData = res.reverse();
      setData(formatData);
    });
  }, [stock_id]);
  return (
    <Tooltip title={<ChartTooltip value={IndicatorColor} />} arrow>
      <Box>
        <LineChart data={data} width={80} height={40}>
          <YAxis domain={[0, 100]} hide />
          <ReferenceLine y={80} stroke="#d89584" strokeDasharray="3 3" />
          <ReferenceLine y={20} stroke="#d89584" strokeDasharray="3 3" />
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
      </Box>
    </Tooltip>
  );
};

export default DailyKdLineChart;
