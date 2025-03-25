import { Box, Tooltip } from "@mui/material";
import { useContext, useEffect, useState } from "react";
import { Line, LineChart, YAxis } from "recharts";
import { DatabaseContext } from "../../../../../../../context/DatabaseContext";
import ChartTooltip from "./ChartTooltip";
import { IndicatorColorType } from "../types";
import { daily_count } from "./config";

const IndicatorColor: IndicatorColorType[] = [
  {
    key: "ma5",
    color: "#589bf3",
  },
  {
    key: "ma10",
    color: "#9b58f3",
  },
  {
    key: "ma20",
    color: "#ff7300",
  },
  {
    key: "ma60",
    color: "#63c762",
  },
];

const DailyUltraTinyLineChart = ({ stock_id, t }: { stock_id: string; t: string }) => {
  const { db } = useContext(DatabaseContext);
  const [data, setData] = useState<any[]>([]);
  useEffect(() => {
    if (!stock_id) return;
    const sqlQuery = `SELECT t, ${IndicatorColor.map((item) => item.key).join(
      ","
    )} FROM skills WHERE ${stock_id} = stock_id AND t <= '${t}' ORDER BY t DESC LIMIT ${daily_count}`;

    if (!db) return;

    db?.select(sqlQuery).then((res: any) => {
      const formatData = res.reverse();
      setData(formatData);
    });
  }, [stock_id]);
  return (
    <Tooltip title={<ChartTooltip value={IndicatorColor} />} arrow>
      <Box>
        {/* <ResponsiveContainer > */}
        <LineChart data={data} width={80} height={40}>
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
        {/* </ResponsiveContainer> */}
      </Box>
    </Tooltip>
  );
};

export default DailyUltraTinyLineChart;
