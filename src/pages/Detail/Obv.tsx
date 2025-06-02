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
  Brush,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import obv from "../../cls_tools/obv";
import obvEma from "../../cls_tools/obvEma";
import { DealsContext } from "../../context/DealsContext";
import { UrlTaPerdOptions } from "../../types";
import analyzeOBVSignals from "../../utils/detectObvDivergence";

export default function Obv({ perd }: { perd: UrlTaPerdOptions }) {
  const deals = useContext(DealsContext);

  const chartData = useMemo(() => {
    if (deals?.length === 0) return [];
    const response = [];
    let obvData = obv.init(deals[0]);
    let obvEmaData = obvEma.init(obvData.obv, 10);

    response.push({
      t: deals[0].t,
      obv: obvData.obv,
      ema10: obvEmaData.ema,
      c: deals[0].c,
    });
    for (let i = 1; i < deals.length; i++) {
      const deal = deals[i];
      obvData = obv.next(deal, obvData);
      obvEmaData = obvEma.next(obvData.obv, obvEmaData, 10);
      response.push({
        t: deal.t,
        obv: obvData.obv,
        ema10: obvEmaData.ema,
        c: deal.c,
      });
    }
    return response;
  }, [deals]);

  const singals = useMemo(
    () => (perd === UrlTaPerdOptions.Day ? analyzeOBVSignals(chartData).splice(-5) : []),
    [chartData, perd]
  );

  return (
    <Container component="main">
      <Stack spacing={1} direction="row" alignItems="center">
        <MuiTooltip
          title={
            <Typography>
              [頂背離期間搭配日後死叉]
              <br />
              [底背離期間搭配日後黃叉]
              <br />
              頂背離期間＋出現死叉： 趨勢轉空
              <br />
              底背離期間＋出現黃叉： 趨勢轉多
            </Typography>
          }
          arrow
        >
          <Typography variant="h5" gutterBottom>
            OBV 流線圖
          </Typography>
        </MuiTooltip>
        <Typography variant="body2" gutterBottom>
          {chartData.length > 1 &&
          chartData[chartData.length - 1].obv >
            chartData[chartData.length - 1].ema10 &&
          chartData[chartData.length - 2].obv <=
            chartData[chartData.length - 2].ema10 &&
          chartData[chartData.length - 3].obv <=
            chartData[chartData.length - 3].ema10
            ? "黃叉"
            : chartData.length > 1 &&
              chartData[chartData.length - 1].obv <
                chartData[chartData.length - 1].ema10 &&
              chartData[chartData.length - 2].obv >=
                chartData[chartData.length - 2].ema10 &&
              chartData[chartData.length - 3].obv >=
                chartData[chartData.length - 3].ema10
            ? "死叉"
            : "趨勢延續"}
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
              {`背離:${singals[singals.length - 1].t} ${
                singals[singals.length - 1].type
              }`}
            </Typography>
          </MuiTooltip>
        )}
      </Stack>
      <Box height="calc(100vh - 32px)" width="100%">
        <ResponsiveContainer width="100%" height="50%">
          <ComposedChart data={chartData} syncId="anySyncId">
            <XAxis dataKey="t" />
            <YAxis domain={["dataMin", "dataMax"]} />
            <Tooltip offset={50} />
            <Line
              dataKey="c"
              stroke="#000"
              dot={false}
              activeDot={false}
              legendType="none"
            />
          </ComposedChart>
        </ResponsiveContainer>
        <ResponsiveContainer width="100%" height="50%">
          <ComposedChart data={chartData} syncId="anySyncId">
            <XAxis dataKey="t" />
            <YAxis domain={["dataMin", "dataMax"]} />
            <Tooltip offset={50} />
            <Area
              type="monotone"
              dataKey="ema10"
              stroke="#ff7300"
              fill="#ff7300"
            />
            <Area
              type="monotone"
              dataKey="obv"
              stroke="#589bf3"
              fill="#589bf3"
            />
            <Brush dataKey="name" height={20} stroke="#8884d8" />
          </ComposedChart>
        </ResponsiveContainer>
      </Box>
    </Container>
  );
}
