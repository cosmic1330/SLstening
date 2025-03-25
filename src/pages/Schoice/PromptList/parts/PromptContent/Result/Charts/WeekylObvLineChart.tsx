import { Box, Tooltip } from "@mui/material";
import { useContext, useEffect, useState } from "react";
import { Line, LineChart, YAxis } from "recharts";
import { DatabaseContext } from "../../../../../../../context/DatabaseContext";
import ChartTooltip from "./ChartTooltip";
import { IndicatorColorType } from "../types";

const IndicatorColor: IndicatorColorType[] = [
  {
    key: "c",
    color: "#589bf3",
  },
  {
    key: "obv",
    color: "#ff7300",
  },
];

const WeekylObvLineChart = ({ stock_id, t }: { stock_id: string; t: string }) => {
  const { db } = useContext(DatabaseContext);
  const [data, setData] = useState<any[]>([]);
  useEffect(() => {
    if (!stock_id) return;
    const sqlQuery = `SELECT weekly_skills.t, ${IndicatorColor.map((item) => item.key).join(
      ","
    )} FROM weekly_skills JOIN weekly_deal ON weekly_skills.t = weekly_deal.t AND weekly_skills.stock_id = weekly_deal.stock_id WHERE weekly_skills.stock_id = ${stock_id} AND weekly_skills.t <= '${t}' ORDER BY weekly_skills.t DESC LIMIT 20`;

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
          <YAxis domain={["dataMin", "dataMax"]} yAxisId="left" hide />
          <YAxis domain={["dataMin", "dataMax"]} yAxisId="right" hide />
          {IndicatorColor.map((item, index) => (
            <Line
              key={index}
              type="monotone"
              dataKey={item.key}
              stroke={item.color}
              strokeWidth={1.5}
              dot={false}
              yAxisId={item.key === "c" ? "left" : "right"}
            />
          ))}
        </LineChart>
      </Box>
    </Tooltip>
  );
};

export default WeekylObvLineChart;
