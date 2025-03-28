import { Box } from "@mui/material";
import useSchoiceStore, { ChartType } from "../../store/Schoice.store";
import WeekylKdLineChart from "./Charts/WeekylKdLineChart";
import WeekylObvLineChart from "./Charts/WeekylObvLineChart";
import DailyKdLineChart from "./Charts/DailyKdLineChart";

export default function RowChart({ row }: { row: any }) {
  const { chartType } = useSchoiceStore();
  return (
    <Box>
      {chartType === ChartType.WEEKLY_KD && (
        <WeekylKdLineChart stock_id={row.stock_id} t={row.t} />
      )}
      {chartType === ChartType.WEEKLY_OBV && (
        <WeekylObvLineChart stock_id={row.stock_id} t={row.t} />
      )}
      {chartType === ChartType.DAILY_KD && (
        <DailyKdLineChart stock_id={row.stock_id} t={row.t} />
      )}
    </Box>
  );
}
