import { Box, Tooltip } from "@mui/material";
import { useContext, useEffect, useState } from "react";
import { Line, LineChart, YAxis } from "recharts";
import { DatabaseContext } from "../../../context/DatabaseContext";
import ChartTooltip from "./ChartTooltip";
import { IndicatorColorType } from "../types";
import { daily_count } from "./config";

const IndicatorColor: IndicatorColorType[] = [
  {
    key: "bollUb",
    color: "#9b58f3",
  },
  {
    key: "bollMa",
    color: "#ff7300",
  },
  {
    key: "bollLb",
    color: "#9b58f3",
  },
  {
    key: "c",
    color: "#589bf3",
  },
  {
    key: "ma60",
    color: "#63c762",
  },
];

const DailyBollLineChart = ({
  stock_id,
  t,
}: {
  stock_id: string;
  t: string;
}) => {
  const { db } = useContext(DatabaseContext);
  const [data, setData] = useState<any[]>([]);
  useEffect(() => {
    if (!stock_id) return;
    const sqlQuery = `SELECT skills.t, ${IndicatorColor.map((item) => item.key).join(
      ","
    )} FROM skills JOIN daily_deal ON skills.t = daily_deal.t AND skills.stock_id = daily_deal.stock_id WHERE skills.stock_id = ${stock_id} AND skills.t <= '${t}' ORDER BY skills.t DESC LIMIT ${daily_count}`;
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
      </Box>
    </Tooltip>
  );
};

export default DailyBollLineChart;
