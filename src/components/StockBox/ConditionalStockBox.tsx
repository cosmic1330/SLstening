import { Button, Grid, Box as MuiBox, styled, Typography } from "@mui/material";
import { open } from "@tauri-apps/plugin-shell";
import { useMemo } from "react";
import useConditionalDeals from "../../hooks/useConditionalDeals";
import useMaDeduction from "../../hooks/useMaDeduction";
import { StockStoreType } from "../../types";
import estimateVolume from "../../utils/estimateVolume";
import AvgPrice from "./Items/AvgPrice";
import Ma10 from "./Items/Ma10";
import Ma5 from "./Items/Ma5";
import PreVolume from "./Items/PreVolume";
import Volume from "./Items/Volume";
import VolumeEstimated from "./Items/VolumeEstimated";
import VolumeRatio from "./Items/VolumeRatio";
import TickChart from "./TickChart";
import Title from "./Title";

const Box = styled(MuiBox)`
  background-color: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 1);
  padding: 1rem;
  border-radius: 0.8rem;
  color: #fff;
`;

interface ConditionalStockBoxProps {
  stock: StockStoreType;
  canDelete?: boolean;
  canAdd?: boolean;
  enabled?: boolean;
}

export default function ConditionalStockBox({
  stock,
  canDelete,
  canAdd,
  enabled = true,
}: ConditionalStockBoxProps) {
  const { deals, name, tickDeals } = useConditionalDeals(stock.id, enabled);
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

  const avgDaysVolume = useMemo(() => {
    // 過去10日成交量平均不算今天
    const pastDeals = deals.slice(-11, -1);
    const totalVolume = pastDeals.reduce((acc, deal) => acc + deal.v, 0);
    return Math.round((totalVolume / pastDeals.length) * 100) / 100;
  }, [deals]);

  const { estimatedVolume } = useMemo(() => {
    if (deals.length > 0) {
      return estimateVolume({
        currentVolume: deals[deals.length - 1].v,
        currentTime: new Date(),
        previousDayVolume: deals[deals.length - 2].v,
        avg5DaysVolume: avgDaysVolume,
      });
    }
    return { estimatedVolume: 0 };
  }, [deals, avgDaysVolume]);

  return (
    <Box sx={{ border: "1px solid #fff", color: "#fff" }}>
      <Grid container alignItems="center" mb={1}>
        <Grid size={5}>
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
        </Grid>
        <Grid size={7}>
          <Title
            stock={stock}
            lastPrice={lastPrice}
            percent={percent}
            canDelete={canDelete}
            canAdd={canAdd}
          />
        </Grid>
      </Grid>
      <Grid container alignItems="center" mb={1}>
        <Grid size={3}>
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
        </Grid>
        <Grid size={3}>
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
        </Grid>
        <Grid size={3}>
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
        </Grid>
        <Grid size={3}>
          <AvgPrice {...{ lastPrice, tickDeals }} />
        </Grid>

        <Grid size={3}>
          <Volume {...{ deals }} />
        </Grid>
        <Grid size={3}>
          <PreVolume {...{ deals }} />
        </Grid>
        <Grid size={3}>
          <VolumeEstimated {...{ deals, estimatedVolume }} />
        </Grid>
        <Grid size={3}>
          <VolumeRatio {...{ estimatedVolume, avgDaysVolume }} />
        </Grid>
      </Grid>
      {tickDeals && <TickChart {...{ tickDeals }} />}
    </Box>
  );
}
