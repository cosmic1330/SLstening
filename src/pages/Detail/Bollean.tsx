import { Box, Container, Stack, Typography } from "@mui/material";
import { useContext, useMemo } from "react";
import {
  ComposedChart,
  Customized,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import boll from "../../cls_tools/boll";
import { DealsContext } from "../../context/DealsContext";
import BaseCandlestickRectangle from "../../components/RechartCustoms/BaseCandlestickRectangle";

export default function Bollean() {
  const deals = useContext(DealsContext);

  const chartData = useMemo(() => {
    if (deals?.length === 0) return [];
    const response = [];
    let boll_data = boll.init(deals[0]);

    response.push({
      ...deals[0],
      bollUb: boll_data.bollUb || null,
      bollMa: boll_data.bollMa || null,
      bollLb: boll_data.bollLb || null,
    });
    for (let i = 1; i < deals.length; i++) {
      const deal = deals[i];
      boll_data = boll.next(deal, boll_data, 20);
      response.push({
        ...deal,
        bollUb: boll_data.bollUb || null,
        bollMa: boll_data.bollMa || null,
        bollLb: boll_data.bollLb || null,
      });
    }
    return response.slice(-180);
  }, [deals]);

  return (
    <Container component="main">
      <Stack spacing={1} direction="row" alignItems="center">
        <Typography variant="h5" gutterBottom>
          Bollean圖
        </Typography>
      </Stack>
      <Box height="calc(100vh - 32px)" width="100%">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} syncId="anySyncId">
            <XAxis dataKey="t" />
            <YAxis domain={["dataMin", "dataMax"]} />
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
            <Customized component={BaseCandlestickRectangle} />
            <Line
              dataKey="bollMa"
              stroke="#589bf3"
              dot={false}
              activeDot={false}
              legendType="none"
            />
            <Line
              dataKey="bollUb"
              stroke="#ff7300"
              dot={false}
              activeDot={false}
              legendType="none"
            />
            <Line
              dataKey="bollLb"
              stroke="#ff7300"
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
