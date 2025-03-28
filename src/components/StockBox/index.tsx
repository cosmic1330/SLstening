import {
  Button,
  Grid2,
  Box as MuiBox,
  styled,
  Typography,
} from "@mui/material";
import { open } from "@tauri-apps/plugin-shell";
import useDeals from "../../hooks/useDeals";
import useMaDeduction from "../../hooks/useMaDeduction";
import { StockField } from "../../store/Stock.store";
import Title from "./Title";
import { useMemo } from "react";
import Ma5 from "./Ma5";
import Ma10 from "./Ma10";
import AvgPrice from "./AvgPrice";
import TodayChart from "./TodayChart";

const Box = styled(MuiBox)`
  background-color: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 1);
  padding: 1rem;
  border-radius: 0.8rem;
  color: #fff;
`;
export default function StockBox({ stock }: { stock: StockField }) {
  const { deals, name, todayDeals } = useDeals(stock.id);
  const {
    ma5,
    ma5_deduction_time,
    ma5_deduction_value,
    ma5_tomorrow_deduction_value,
    ma5_tomorrow_deduction_time,
    ma10,
    ma10_deduction_time,
    ma10_deduction_value,
    ma10_tomorrow_deduction_value,
    ma10_tomorrow_deduction_time,
  } = useMaDeduction(deals);

  const url =
    stock.type === "上市"
      ? `https://tw.tradingview.com/chart?symbol=TWSE%3A${stock.id}`
      : `https://tw.tradingview.com/chart?symbol=TPEX%3A${stock.id}`;

  const lastPrice = useMemo(() => {
    if (todayDeals?.price) return todayDeals.price;
    return deals.length > 0 ? deals[deals.length - 1].c : 0;
  }, [deals, todayDeals]);

  const percent = useMemo(() => {
    if (todayDeals?.changePercent) return todayDeals.changePercent;
    const prePirce = deals.length > 0 ? deals[deals.length - 2].c : 0;
    return Math.round(((lastPrice - prePirce) / prePirce) * 100 * 100) / 100;
  }, [deals, todayDeals, lastPrice]);

  return (
    <Box mt={2} sx={{ border: "1px solid #fff", color: "#fff" }}>
      <Grid2 container alignItems="center" mb={1}>
        <Grid2 size={4}>
          <Button
            variant="contained"
            size="small"
            color="info"
            onClick={async (e) => {
              e.stopPropagation();
              await open(url);
            }}
          >
            {stock.id} {name}
          </Button>
        </Grid2>
        <Grid2 size={8}>
          <Title stock={stock} lastPrice={lastPrice} percent={percent} />
        </Grid2>
      </Grid2>
      <Grid2 container alignItems="center" mb={1}>
        <Grid2 size={3}>
          <Ma5
            {...{
              ma5,
              lastPrice,
              ma5_deduction_time,
              ma5_deduction_value,
              ma5_tomorrow_deduction_time,
              ma5_tomorrow_deduction_value,
            }}
          />
        </Grid2>
        <Grid2 size={3}>
          <Ma10
            {...{
              ma10,
              lastPrice,
              ma10_deduction_time,
              ma10_deduction_value,
              ma10_tomorrow_deduction_time,
              ma10_tomorrow_deduction_value,
            }}
          />
        </Grid2>
        <Grid2 size={3}>
          <Typography
            variant="body2"
            gutterBottom
            component="div"
            color="#fff"
            textAlign="center"
            noWrap
          >
            昨日低
          </Typography>
          <Typography
            variant="body2"
            color={
              deals.length > 0 && lastPrice < deals[deals.length - 2].l
                ? "#e58282"
                : "#fff"
            }
            fontWeight="bold"
            textAlign="center"
          >
            {deals.length > 0 && deals[deals.length - 2].l}
          </Typography>
        </Grid2>
        <Grid2 size={3}>
          <AvgPrice {...{ lastPrice, todayDeals }} />
        </Grid2>
      </Grid2>
      {todayDeals && <TodayChart {...{ todayDeals }} />}
    </Box>
  );
}
