import { simpleRegressionModel } from "@ch20026103/anysis";
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
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ad from "../../cls_tools/ad";
import { DealsContext } from "../../context/DealsContext";

export default function Ad() {
  const deals = useContext(DealsContext);

  const chartData = useMemo(() => {
    if (deals?.length === 0) return [];
    const response = [];
    let AdData = ad.init(deals[0]);

    response.push({
      ...deals[0],
      ad: AdData.ad,
    });
    for (let i = 1; i < deals.length; i++) {
      const deal = deals[i];
      AdData = ad.next(deal, AdData);
      response.push({
        ...deal,
        ad: AdData.ad,
      });
    }
    return response; // 只取最近150筆資料
  }, [deals]);

  const l_liner_regression = useMemo(() => {
    if (chartData.length === 0) return null;
    const last60 = chartData.slice(-22);
    const l_values = last60.map((data) => data.l || 0);
    const result = simpleRegressionModel(
      Array.from({ length: l_values.length }, (_, i) => i), // x: index
      l_values // y: l 值
    );
    return { result, last60Len: l_values.length };
  }, [chartData]);

  const ad_liner_regression = useMemo(() => {
    if (chartData.length === 0) return null;
    const last60 = chartData.slice(-22);
    const ad_values = last60.map((data) => data.ad || 0);
    const result = simpleRegressionModel(
      Array.from({ length: ad_values.length }, (_, i) => i), // x: index
      ad_values // y: ad 值
    );
    return { result, last60Len: ad_values.length };
  }, [chartData]);

  return (
    <Container component="main">
      <Stack spacing={1} direction="row" alignItems="center">
        <MuiTooltip title={<Typography></Typography>} arrow>
          <Typography variant="h5" gutterBottom>
            Ad 流線圖
          </Typography>
        </MuiTooltip>
        <Divider orientation="vertical" flexItem />
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
            {l_liner_regression && (
              <Line
                data={chartData.map((d, i) => {
                  // 只顯示最近60天的回歸線
                  if (i < chartData.length - l_liner_regression.last60Len)
                    return { ...d };
                  const idx =
                    i - (chartData.length - l_liner_regression.last60Len);
                  return {
                    ...d,
                    l_liner_regression:
                      l_liner_regression.result.predictModel(idx),
                  };
                })}
                dataKey="l_liner_regression"
                stroke="#f35e5e"
                strokeWidth={2}
                dot={false}
                activeDot={false}
                legendType="none"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
        <ResponsiveContainer width="100%" height="50%">
          <ComposedChart data={chartData} syncId="anySyncId">
            <XAxis dataKey="t" />
            <YAxis domain={["dataMin", "dataMax"]} />
            <Tooltip offset={50} />
            <Line
              dataKey="ad"
              stroke="#589bf3"
              dot={false}
              activeDot={false}
              legendType="none"
            />
            {ad_liner_regression && (
              <Line
                data={chartData.map((d, i) => {
                  // 只顯示最近60天的回歸線
                  if (i < chartData.length - ad_liner_regression.last60Len)
                    return { ...d };
                  const idx =
                    i - (chartData.length - ad_liner_regression.last60Len);
                  return {
                    ...d,
                    ad_liner_regression:
                      ad_liner_regression.result.predictModel(idx),
                  };
                })}
                dataKey="ad_liner_regression"
                stroke="#f35e5e"
                strokeWidth={2}
                dot={false}
                activeDot={false}
                legendType="none"
              />
            )}
            <Brush dataKey="name" height={20} stroke="#8884d8" />
          </ComposedChart>
        </ResponsiveContainer>
      </Box>
    </Container>
  );
}
