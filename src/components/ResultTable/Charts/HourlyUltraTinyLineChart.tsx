import { dateFormat } from "@ch20026103/anysis";
import { Mode } from "@ch20026103/anysis/dist/esm/stockSkills/utils/dateFormat";
import { Box, Tooltip } from "@mui/material";
import { useContext, useEffect, useState } from "react";
import { Line, LineChart, YAxis } from "recharts";
import { DatabaseContext } from "../../../context/DatabaseContext";
import { IndicatorColorType } from "../types";
import ChartTooltip from "./ChartTooltip";
import { hourly_count } from "./config";

const IndicatorColor: IndicatorColorType[] = [
  {
    key: "c",
    color: "#589bf3",
  },
  {
    key: "ma5",
    color: "#f3586a",
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

const HourlyUltraTinyLineChart = ({
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
    const sqlQuery = `SELECT hourly_skills.ts, ${IndicatorColor.map(
      (item) => item.key
    ).join(
      ","
    )} FROM hourly_skills JOIN hourly_deal ON hourly_skills.ts = hourly_deal.ts AND hourly_skills.stock_id = hourly_deal.stock_id WHERE ${stock_id} = hourly_skills.stock_id AND hourly_skills.ts <= '${
      dateFormat(t, Mode.StringToNumber) * 10000 + 1400
    }' ORDER BY hourly_skills.ts DESC LIMIT ${hourly_count}`;

    if (!db) return;

    db?.select(sqlQuery).then((res: any) => {
      const formatData = res.reverse();
      setData(formatData);
    });
  }, [stock_id]);
  return (
    <Tooltip title={<ChartTooltip value={IndicatorColor} />} arrow>
      <Box>
        <LineChart data={data} width={80} height={60}>
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

export default HourlyUltraTinyLineChart;
