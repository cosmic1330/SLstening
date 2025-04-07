import {
  Button,
  Grid2,
  Box as MuiBox,
  styled,
  Tooltip,
  Typography,
} from "@mui/material";
import { open } from "@tauri-apps/plugin-shell";
import { useMemo } from "react";
import useDeals from "../../hooks/useDeals";
import useMaDeduction from "../../hooks/useMaDeduction";
import { StockStoreType } from "../../types";
import estimateVolume from "../../utils/estimateVolume";
import AvgPrice from "./Items/AvgPrice";
import Ma10 from "./Items/Ma10";
import Ma5 from "./Items/Ma5";
import TickChart from "./TickChart";
import Title from "./Title";

const Box = styled(MuiBox)`
  background-color: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 1);
  padding: 1rem;
  border-radius: 0.8rem;
  color: #fff;
`;
export default function StockBox({ stock }: { stock: StockStoreType }) {
  const { deals, name, tickDeals } = useDeals(stock.id);
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
    if (tickDeals?.price) return tickDeals.price;
    return deals.length > 0 ? deals[deals.length - 1].c : 0;
  }, [deals, tickDeals]);

  const percent = useMemo(() => {
    if (tickDeals?.changePercent) return tickDeals.changePercent;
    const prePirce = deals.length > 0 ? deals[deals.length - 2].c : 0;
    return Math.round(((lastPrice - prePirce) / prePirce) * 100 * 100) / 100;
  }, [deals, tickDeals, lastPrice]);

  const { estimatedVolume } = useMemo(() => {
    if (deals.length > 0) {
      return estimateVolume({
        currentVolume: deals[deals.length - 1].v,
        currentTime: new Date(),
        previousDayVolume: deals[deals.length - 2].v,
        avg5DaysVolume:
          deals.slice(-6, -1).reduce((acc, deal) => acc + deal.v, 0) / 5,
      });
    }
    return { estimatedVolume: 0 };
  }, [deals]);

  const pastAvgVolume = useMemo(() => {
    // 過去五日成交量平均不算今天
    const pastDeals = deals.slice(-6, -1);
    const totalVolume = pastDeals.reduce((acc, deal) => acc + deal.v, 0);
    return Math.round((totalVolume / pastDeals.length) * 100) / 100;
  }, [deals]);

  return (
    <Box mt={2} sx={{ border: "1px solid #fff", color: "#fff" }}>
      <Grid2 container alignItems="center" mb={1}>
        <Grid2 size={5}>
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
        <Grid2 size={7}>
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
          <AvgPrice {...{ lastPrice, tickDeals }} />
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
            成交量
          </Typography>
          <Typography
            variant="body2"
            color={
              deals.length > 0 &&
              deals[deals.length - 1].v < deals[deals.length - 2].v
                ? "#e58282"
                : "#fff"
            }
            fontWeight="bold"
            textAlign="center"
          >
            {deals.length > 0 && deals[deals.length - 1].v}
          </Typography>
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
            估量
          </Typography>
          <Typography
            variant="body2"
            color={
              deals.length > 0 && estimatedVolume < deals[deals.length - 2].v
                ? "#e58282"
                : "#fff"
            }
            fontWeight="bold"
            textAlign="center"
          >
            {deals.length > 0 && estimatedVolume}
          </Typography>
        </Grid2>

        <Grid2 size={6}>
          <Typography
            variant="body2"
            gutterBottom
            component="div"
            color="#fff"
            textAlign="center"
            noWrap
          >
            量能
          </Typography>
          <Tooltip title={`異常放量比 ${estimatedVolume / pastAvgVolume}`}>
            <Typography
              variant="body2"
              color={
                deals.length > 0 && estimatedVolume < deals[deals.length - 2].v
                  ? "#e58282"
                  : "#fff"
              }
              fontWeight="bold"
              textAlign="center"
            >
              {deals.length > 0 && estimatedVolume < deals[deals.length - 2].v
                ? "⭣"
                : "⭡"}
              {deals.length > 0 &&
              (estimatedVolume / pastAvgVolume > 1.5 ||
                estimatedVolume / pastAvgVolume < 0.5)
                ? "異常放量"
                : "正常"}
            </Typography>
          </Tooltip>
        </Grid2>
      </Grid2>
      {tickDeals && <TickChart {...{ tickDeals }} />}
    </Box>
  );
}
