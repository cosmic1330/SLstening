import { Box, Container, Stack, Typography } from "@mui/material";
import { useContext, useMemo } from "react";
import {
  ComposedChart,
  Customized,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import ma from "../../cls_tools/ma";
import ArrowDown from "../../components/ArrowDown";
import ArrowUp from "../../components/ArrowUp";
import { DealsContext } from "../../context/DealsContext";
import AvgCandlestickRectangle from "./AvgCandlestickRectangle";
import { Tooltip as MuiTooltip } from "@mui/material";

export default function AvgMaKbar() {
  const deals = useContext(DealsContext);

  const chartData = useMemo(() => {
    if (deals?.length === 0) return [];
    const response = [];
    let ma5_data = ma.init(deals[0], 5);
    let ma10_data = ma.init(deals[0], 10);
    let ma20_data = ma.init(deals[0], 20);
    response.push({
      x: deals[0].t,
      y: deals[0].l,
      ma20: ma20_data.ma || null,
      ma5: ma5_data.ma || null,
      ma10: ma10_data.ma || null,
      c: deals[0].c,
      l: deals[0].l,
      h: deals[0].h,
      o: deals[0].o,
    });
    for (let i = 1; i < deals.length; i++) {
      const deal = deals[i];
      ma5_data = ma.next(deal, ma5_data, 5);
      ma10_data = ma.next(deal, ma10_data, 10);
      ma20_data = ma.next(deal, ma20_data, 20);
      response.push({
        x: deal.t,
        ma5: ma5_data.ma || null,
        ma10: ma10_data.ma || null,
        ma20: ma20_data.ma || null,
        y: deal.l,
        c: deal.c,
        l: deal.l,
        h: deal.h,
        o: deal.o,
      });
    }
    return response;
  }, [deals]);

  return (
    <Container component="main">
      <Stack spacing={1} direction="row" alignItems="center">
        <MuiTooltip
          title={
            <Typography>
              判斷上漲動能是否延續
              <br />
              紅色：多方動能
              <br />
              綠色：空方動能
              <br />
              柱體：越長越強
            </Typography>
          }
          arrow
        >
          <Typography variant="h5" gutterBottom>
            均K指標
          </Typography>
        </MuiTooltip>
        {chartData.length > 0 &&
        chartData[chartData.length - 1].ma5 !== null &&
        chartData[chartData.length - 1].l > chartData[chartData.length - 2].l &&
        chartData[chartData.length - 1].y >
          (chartData[chartData.length - 1].ma5 as number) ? (
          <ArrowUp color="#e26d6d" />
        ) : (
          <ArrowDown color="#79e26d" />
        )}
      </Stack>
      <Box height="calc(100vh - 32px)" width="100%">
        <ResponsiveContainer>
          <ComposedChart data={chartData.slice(-160)}>
            <XAxis dataKey="x" />
            <YAxis domain={["dataMin", "dataMax"]} dataKey="y" />
            <ZAxis type="number" range={[10]} />
            <Tooltip />
            <Line
              dataKey="h"
              stroke="#000"
              opacity={0} // 設置透明度為 0，隱藏線條
              dot={false}
              activeDot={false}
              legendType="none"
            />
            <Line
              dataKey="c"
              stroke="#000"
              opacity={0} // 設置透明度為 0，隱藏線條
              dot={false}
              activeDot={false}
              legendType="none"
            />
            <Line
              dataKey="l"
              stroke="#000"
              opacity={0} // 設置透明度為 0，隱藏線條
              dot={false}
              activeDot={false}
              legendType="none"
            />
            <Line
              dataKey="o"
              stroke="#000"
              opacity={0} // 設置透明度為 0，隱藏線條
              dot={false}
              activeDot={false}
              legendType="none"
            />
            <Customized component={AvgCandlestickRectangle} />

            <Line
              dataKey="ma5"
              stroke="#589bf3"
              dot={false}
              activeDot={false}
              legendType="none"
            />
            <Line
              dataKey="ma10"
              stroke="#ff7300"
              dot={false}
              activeDot={false}
              legendType="none"
            />
            <Line
              dataKey="ma20"
              stroke="#63c762"
              dot={false}
              activeDot={false}
              legendType="none"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </Box>
    </Container>
  );
}
