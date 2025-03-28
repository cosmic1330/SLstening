import { Box } from "@mui/material";
import useSchoiceStore, { ChartType } from "../../store/Schoice.store";
import DailyKdLineChart from "./Charts/DailyKdLineChart";
import DailyObvLineChart from "./Charts/DailyObvLineChart";
import DailyRsiLineChart from "./Charts/DailyRsiLineChart";
import WeeklyKdLineChart from "./Charts/WeeklyKdLineChart";
import WeeklyObvLineChart from "./Charts/WeeklyObvLineChart";
import WeeklyRsiLineChart from "./Charts/WeeklyRsiLineChart";

export default function RowChart({ row }: { row: any }) {
  const { chartType } = useSchoiceStore();
  return (
    <Box>
      {chartType === ChartType.DAILY_KD && (
        <DailyKdLineChart stock_id={row.stock_id} t={row.t} />
      )}
      {chartType === ChartType.DAILY_OBV && (
        <DailyObvLineChart stock_id={row.stock_id} t={row.t} />
      )}
      {chartType === ChartType.DAILY_RSI && (
        <DailyRsiLineChart stock_id={row.stock_id} t={row.t} />
      )}

      {chartType === ChartType.WEEKLY_KD && (
        <WeeklyKdLineChart stock_id={row.stock_id} t={row.t} />
      )}
      {chartType === ChartType.WEEKLY_OBV && (
        <WeeklyObvLineChart stock_id={row.stock_id} t={row.t} />
      )}
      {chartType === ChartType.WEEKLY_RSI && (
        <WeeklyRsiLineChart stock_id={row.stock_id} t={row.t} />
      )}
    </Box>
  );
}
