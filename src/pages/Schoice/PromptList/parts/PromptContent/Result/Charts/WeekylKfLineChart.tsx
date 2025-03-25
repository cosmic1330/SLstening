import { Box, Tooltip } from "@mui/material";
import { useContext, useEffect, useState } from "react";
import { Line, LineChart, YAxis } from "recharts";
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

const WeekylKfLineChart = ({ stock_id }: { stock_id: string }) => {
  const { db } = useContext(DatabaseContext);
  const [data, setData] = useState<any[]>([]);
  useEffect(() => {
    if (!stock_id) return;
    const sqlQuery = `SELECT ${IndicatorColor.map((item) => item.key).join(
      ","
    )} FROM weekly_skills JOIN weekly_deal ON weekly_skills.t = weekly_deal.t AND weekly_skills.stock_id = weekly_deal.stock_id WHERE weekly_skills.stock_id = ${stock_id} ORDER BY weekly_skills.t DESC LIMIT 17`;

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

export default WeekylKfLineChart;
