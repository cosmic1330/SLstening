import { Box, Button, Grid, Box as MuiBox, styled, Typography } from "@mui/material";
import { open } from "@tauri-apps/plugin-shell";
import { useMemo } from "react";
import useDeals from "../../hooks/useDeals";
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

const GlassCard = styled(MuiBox)(({ theme }) => ({
  background: "rgba(30, 30, 40, 0.6)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  borderRadius: "16px",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  boxShadow: "0 4px 20px 0 rgba(0, 0, 0, 0.2)",
  padding: theme.spacing(2),
  color: "#fff",
  transition: "all 0.2s ease-in-out",
  marginTop: theme.spacing(2),
  position: "relative",
  overflow: "hidden",
  
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: "0 8px 30px 0 rgba(0, 0, 0, 0.3)",
    background: "rgba(35, 35, 50, 0.7)",
    border: "1px solid rgba(255, 255, 255, 0.12)",
  },
}));

const StockButton = styled(Button)(() => ({
  borderRadius: "8px",
  background: "rgba(255, 255, 255, 0.1)",
  backdropFilter: "blur(4px)",
  color: "white",
  textTransform: "none",
  fontWeight: 600,
  minWidth: "auto",
  padding: "4px 12px",
  border: "1px solid rgba(255, 255, 255, 0.05)",
  "&:hover": {
    background: "rgba(255, 255, 255, 0.2)",
  },
}));

export default function StockBox({
  stock,
  canDelete,
  canAdd,
}: {
  stock: StockStoreType;
  canDelete?: boolean;
  canAdd?: boolean;
}) {
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
    <GlassCard>
      <Grid container alignItems="center" justifyContent="space-between">
        <Grid size={5}>
          <StockButton
            size="small"
            onClick={async (e) => {
              e.stopPropagation();
              await open(url);
            }}
            startIcon={
                <Typography variant="caption" sx={{ opacity: 0.7 }}>{stock.id}</Typography>
            }
          >
           {name}
          </StockButton>
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
      
      <Grid container alignItems="flex-start" spacing={1} mb={1}>
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
            variant="caption"
            component="div"
            color="rgba(255,255,255,0.6)"
            textAlign="center"
            noWrap
            sx={{ mb: 0.5 }}
          >
            昨日低
          </Typography>
          <Typography
            variant="body2"
            color={
              deals.length > 0 && lastPrice < deals[deals.length - 2].l
                ? "#ff6b6b"
                : "#fff"
            }
            fontWeight="600"
            textAlign="center"
          >
            {deals.length > 0 && deals[deals.length - 2].l}
          </Typography>
        </Grid>
         <Grid size={3}>
           <AvgPrice {...{ lastPrice, tickDeals }} />
         </Grid>
         
         {/* Second Row of Data */}
         
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
      
      {tickDeals && (
        <Box sx={{ mt: 1, borderRadius: "8px", overflow: "hidden" }}>
            <TickChart {...{ tickDeals }} />
        </Box>
      )}
    </GlassCard>
  );
}
