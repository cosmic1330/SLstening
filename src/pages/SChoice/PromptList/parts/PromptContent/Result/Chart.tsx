import { useContext, useEffect, useState } from "react";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import { DatabaseContext } from "../../../../../../context/DatabaseContext";
import { Box, Tooltip } from "@mui/material";
import { IndicatorColorType } from "./types";
import ChartTooltip from "./ChartTooltip";

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

const UltraTinyLineChart = ({ stock_id }: { stock_id: string }) => {
  const { db } = useContext(DatabaseContext);
  const [data, setData] = useState<any[]>([]);
  useEffect(() => {
    if (!stock_id) return;
    const sqlQuery = `SELECT ${IndicatorColor.map((item) => item.key).join(
      ","
    )} FROM skills WHERE ${stock_id} = stock_id ORDER BY t DESC LIMIT 25`;
    if (!db) return;

    db?.select(sqlQuery).then((res: any) => {
      const formatData = res.reverse();
      console.log(formatData);
      setData(formatData);
    });
  }, [stock_id]);
  return (
    <Tooltip title={<ChartTooltip value={IndicatorColor} />} arrow>
      <Box>
        <ResponsiveContainer width={80} height={40}>
          <LineChart data={data}>
            <YAxis domain={["dataMin", "dataMax"]} hide />
            {IndicatorColor.map((item) => (
              <Line
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
};

export default UltraTinyLineChart;
