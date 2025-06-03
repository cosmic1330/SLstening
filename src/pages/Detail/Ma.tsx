import {
  Box,
  Container,
  Divider,
  Tooltip as MuiTooltip,
  Stack,
  Typography,
} from "@mui/material";
import { useContext, useMemo } from "react";
import {
  Area,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ma from "../../cls_tools/ma";
import { DealsContext } from "../../context/DealsContext";
import detectMaCrossDivergence from "../../utils/detectMaCrossDivergence";

enum ArrangementTypeMode {
  LongArrangement = "多頭排列",
  ShortArrangement = "空頭排列",
  FallingBelowMa20 = "Ma5跌破Ma20",
  CloseFallingBelowMa20 = "收盤價跌破Ma20",
  RisingAboveMa20 = "Ma5站上Ma20",
  FallingBelowMa60 = "Ma5跌破Ma60",
  RisingAboveMa60 = "Ma5站上Ma60",
  FallingBelowMa120 = "Ma5跌破Ma120",
  RisingAboveMa120 = "Ma5站上Ma120",
}

export default function Ma() {
  const deals = useContext(DealsContext);

  const chartData = useMemo(() => {
    if (deals?.length === 0) return [];
    const response = [];
    let ma5_data = ma.init(deals[0], 5);
    let ma10_data = ma.init(deals[0], 10);
    let ma20_data = ma.init(deals[0], 20);
    let ma60_data = ma.init(deals[0], 60);
    let ma120_data = ma.init(deals[0], 120);
    response.push({
      ma5: ma5_data.ma || null,
      ma10: ma10_data.ma || null,
      ma20: ma20_data.ma || null,
      ma60: ma60_data.ma || null,
      ma120: ma120_data.ma || null,
      ...deals[0],
    });
    for (let i = 1; i < deals.length; i++) {
      const deal = deals[i];
      ma5_data = ma.next(deal, ma5_data, 5);
      ma10_data = ma.next(deal, ma10_data, 10);
      ma20_data = ma.next(deal, ma20_data, 20);
      ma60_data = ma.next(deal, ma60_data, 60);
      ma120_data = ma.next(deal, ma120_data, 120);
      response.push({
        ma5: ma5_data.ma || null,
        ma10: ma10_data.ma || null,
        ma20: ma20_data.ma || null,
        ma60: ma60_data.ma || null,
        ma120: ma120_data.ma || null,
        ...deal
      });
    }
    return response;
  }, [deals]);

  const singals = useMemo(() => {
    if (chartData.length === 0) return [];
    return detectMaCrossDivergence(chartData).splice(-5);
  }, [chartData]);

  return (
    <Container component="main">
      <Stack spacing={1} direction="row" alignItems="center">
        <Typography variant="h5" gutterBottom>
          Ma 河流圖
        </Typography>
        <Typography variant="body2" gutterBottom>
          {chartData.length > 1 &&
          chartData[chartData.length - 1] != null &&
          chartData[chartData.length - 1].ma5 !== null &&
          chartData[chartData.length - 1].ma10 !== null &&
          chartData[chartData.length - 1].ma20 !== null &&
          chartData[chartData.length - 1].ma5! >
            chartData[chartData.length - 1].ma10! &&
          chartData[chartData.length - 1].ma10! >
            chartData[chartData.length - 1].ma20!
            ? ArrangementTypeMode.LongArrangement
            : chartData.length > 1 &&
              chartData[chartData.length - 1] != null &&
              chartData[chartData.length - 1].ma5 !== null &&
              chartData[chartData.length - 1].ma10 !== null &&
              chartData[chartData.length - 1].ma20 !== null &&
              chartData[chartData.length - 1].ma5! <
                chartData[chartData.length - 1].ma10! &&
              chartData[chartData.length - 1].ma10! <
                chartData[chartData.length - 1].ma20!
            ? ArrangementTypeMode.ShortArrangement
            : chartData.length > 1 &&
              chartData[chartData.length - 1] != null &&
              chartData[chartData.length - 1].ma20 !== null &&
              chartData[chartData.length - 1].ma5 !== null &&
              chartData[chartData.length - 1].ma5! <
                chartData[chartData.length - 1].ma20!
            ? ArrangementTypeMode.FallingBelowMa20
            : chartData.length > 1 &&
              chartData[chartData.length - 1] != null &&
              chartData[chartData.length - 1].ma20 !== null &&
              chartData[chartData.length - 1].c <
                chartData[chartData.length - 1].ma20!
            ? ArrangementTypeMode.CloseFallingBelowMa20 
            : chartData.length > 1 &&
              chartData[chartData.length - 1] != null &&
              chartData[chartData.length - 1].ma20 !== null &&
              chartData[chartData.length - 1].ma5 !== null &&
              chartData[chartData.length - 1].ma5! >
                chartData[chartData.length - 1].ma20!
            ? ArrangementTypeMode.RisingAboveMa20
            : chartData.length > 1 &&
              chartData[chartData.length - 1] != null &&
              chartData[chartData.length - 1].ma60 !== null &&
              chartData[chartData.length - 1].ma5 !== null &&
              chartData[chartData.length - 1].ma5! <
                chartData[chartData.length - 1].ma60!
            ? ArrangementTypeMode.FallingBelowMa60
            : chartData.length > 1 &&
              chartData[chartData.length - 1] != null &&
              chartData[chartData.length - 1].ma60 !== null &&
              chartData[chartData.length - 1].ma5 !== null &&
              chartData[chartData.length - 1].ma5! >
                chartData[chartData.length - 1].ma60!
            ? ArrangementTypeMode.RisingAboveMa60
            : chartData.length > 1 &&
              chartData[chartData.length - 1] != null &&
              chartData[chartData.length - 1].ma120 !== null &&
              chartData[chartData.length - 1].ma5 !== null &&
              chartData[chartData.length - 1].ma5! <
                chartData[chartData.length - 1].ma120!
            ? ArrangementTypeMode.FallingBelowMa120
            : chartData.length > 1 &&
              chartData[chartData.length - 1] != null &&
              chartData[chartData.length - 1].ma120 !== null &&
              chartData[chartData.length - 1].ma5 !== null &&
              chartData[chartData.length - 1].ma5! >
                chartData[chartData.length - 1].ma120!
            ? ArrangementTypeMode.RisingAboveMa120
            : ""}
        </Typography>
        <Divider orientation="vertical" flexItem />
        {singals.length > 0 && (
          <MuiTooltip
            title={singals?.map((signal) => (
              <Typography variant="body2" key={signal.t}>
                {signal.t} {signal.type}
              </Typography>
            ))}
          >
            <Typography variant="body2" color="textSecondary">
              {`${singals[singals.length - 1].t} ${
                singals[singals.length - 1].type
              }`}
            </Typography>
          </MuiTooltip>
        )}
      </Stack>
      <Box height="calc(100vh - 32px)" width="100%">
        <ResponsiveContainer>
          <ComposedChart data={chartData}>
            <XAxis dataKey="t" />
            <YAxis domain={["dataMin", "dataMax"]} />
            <Tooltip offset={50} />
            <Area
              type="monotone"
              dataKey="ma5"
              stroke="#e3cc35"
              fill="#f8d807"
            />
            <Area
              type="monotone"
              dataKey="ma10"
              stroke="#94ecdc"
              fill="#94ecdc"
            />
            <Area
              type="monotone"
              dataKey="ma20"
              stroke="#8884d8"
              fill="#8884d8"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </Box>
    </Container>
  );
}
