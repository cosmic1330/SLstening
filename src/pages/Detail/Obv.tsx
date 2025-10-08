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
  Brush,
  ComposedChart,
  Line,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import obv from "../../cls_tools/obv";
import { DealsContext } from "../../context/DealsContext";
import { DivergenceSignalType, UrlTaPerdOptions } from "../../types";
import detectObvDivergence from "../../utils/detectObvDivergence";
import detectObvBreakout from "../../utils/detectObvBreakout";

export default function Obv({ perd }: { perd: UrlTaPerdOptions }) {
  const deals = useContext(DealsContext);

  const chartData = useMemo(() => {
    if (deals?.length === 0) return [];
    const response = [];
    let obvData = obv.init(deals[0]);

    response.push({
      ...deals[0],
      obv: obvData.obv,
    });
    for (let i = 1; i < deals.length; i++) {
      const deal = deals[i];
      obvData = obv.next(deal, obvData);
      response.push({
        ...deal,
        obv: obvData.obv,
      });
    }
    return response;
  }, [deals]);

  const singals = useMemo(() => {
    const data = chartData;
    return detectObvDivergence(data);
  }, [chartData, perd]);

  const trends = useMemo(() => {
    const data = chartData;
    return detectObvBreakout(data);
  }, [chartData, perd]);

  return (
    <Container component="main">
      <Stack spacing={1} direction="row" alignItems="center">
        <MuiTooltip
          title={
            <Typography>
              [健康的上升趨勢]價格持續創下新高，同時 OBV
              線也跟著持續創下新高，買盤力道強勁，趨勢有望延續。
              <br />
              [健康的下降趨勢]價格持續創下新低，同時 OBV
              線也跟著持續創下新低，賣壓沉重，趨勢短期難以扭轉。
              <br />
              頂背離: 股價持續上漲，創下近期新高，但 OBV
              線卻沒有跟著創下新高，反而開始走平或下滑。
              <br />
              底背離: 股價持續下跌，創下近期新低，但 OBV
              線卻沒有跟著創下新低，反而開始走平或小幅上揚。
              <br />
              可以像分析股價一樣，在 OBV
              線上畫出支撐線、壓力線或趨勢線。由於「量在價先」，OBV
              線的突破通常會早於價格線的突破。
            </Typography>
          }
          arrow
        >
          <Typography variant="h5" gutterBottom>
            OBV 流線圖
          </Typography>
        </MuiTooltip>
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
            {singals.map((signal) => (
              <ReferenceDot
                key={signal.t}
                x={signal.t}
                y={signal.price}
                r={3}
                stroke={"none"}
                fill={
                  signal.type === DivergenceSignalType.BEARISH_DIVERGENCE
                    ? "green"
                    : "red"
                }
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
        <ResponsiveContainer width="100%" height="50%">
          <ComposedChart data={trends} syncId="anySyncId">
            <XAxis dataKey="t" />
            <YAxis domain={["dataMin", "dataMax"]} />
            <Tooltip offset={50} />
            <Line
              dataKey="obv"
              stroke="#589bf3"
              dot={false}
              activeDot={false}
              legendType="none"
            />
            <Brush dataKey="name" height={20} stroke="#8884d8" />
          </ComposedChart>
        </ResponsiveContainer>
      </Box>
    </Container>
  );
}
