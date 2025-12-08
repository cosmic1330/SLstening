import {
  Box,
  Container,
  Divider,
  Tooltip as MuiTooltip,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import { useContext, useMemo, useState } from "react";
import {
  Area,
  ComposedChart,
  Customized,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ichimoku from "./ichimoku";
import { DealsContext } from "../../../context/DealsContext";
import Fundamental from "../Fundamental";
import BaseCandlestickRectangle from "../../../components/RechartCustoms/BaseCandlestickRectangle";
import { dateFormat } from "@ch20026103/anysis";
import { Mode } from "@ch20026103/anysis/dist/esm/stockSkills/utils/dateFormat";
import { UrlTaPerdOptions } from "../../../types";

// Define the structure for the chart data, including Ichimoku values
interface IchimokuChartData
  extends Partial<{
    t: number | string;
    o: number | null;
    h: number | null;
    l: number | null;
    c: number | null;
    v: number | null;
  }> {
  tenkan: number | null;
  kijun: number | null;
  senkouA: number | null;
  senkouB: number | null;
  chikou: number | null;
  kumo_bull: [number, number] | null;
  kumo_bear: [number, number] | null;
}

export default function Ichimoku({
  id,
  perd,
}: {
  id: string | undefined;
  perd: UrlTaPerdOptions;
}) {
  const deals = useContext(DealsContext);
  const [showConversionBase, setShowConversionBase] = useState(true);
  const [showKumo, setShowKumo] = useState(true);
  const [showDelay, setShowDelay] = useState(true);

  const chartData = useMemo((): IchimokuChartData[] => {
    if (!deals || deals.length < 52) return []; // Need enough data for Ichimoku

    // 1. Calculate raw Ichimoku values for each day
    const baseData = ichimoku.calculate(deals);

    // 2. Create the final chart data with shifted values for existing data points
    let finalData: Omit<IchimokuChartData, "kumo_bull" | "kumo_bear">[] =
      baseData.map((d, i) => {
        const sourceForFutureSpans = i >= 26 ? baseData[i - 26] : null;
        const sourceForPastChikou =
          i + 26 < baseData.length ? baseData[i + 26] : null;

        return {
          ...d,
          senkouA: sourceForFutureSpans ? sourceForFutureSpans.senkouA : null,
          senkouB: sourceForFutureSpans ? sourceForFutureSpans.senkouB : null,
          chikou: sourceForPastChikou ? sourceForPastChikou.c : null,
        };
      });

    // 3. Add future data points for the cloud to extend beyond the last price
    const lastDataPoint = baseData[baseData.length - 1];
    if (lastDataPoint) {
      for (let i = 1; i <= 26; i++) {
        const futureDate = new Date(
          dateFormat(lastDataPoint.t, Mode.NumberToTimeStamp)
        );
        if (perd === UrlTaPerdOptions.Hour) {
          futureDate.setHours(futureDate.getHours() + i);
        } else if (perd === UrlTaPerdOptions.Day) {
          futureDate.setDate(futureDate.getDate() + i);
        }

        const sourceIndex = baseData.length - 27 + i; // Corrected index
        const sourceForFutureSpans =
          sourceIndex >= 0 && sourceIndex < baseData.length
            ? baseData[sourceIndex]
            : null;

        finalData.push({
          t: dateFormat(futureDate.getTime(), Mode.TimeStampToNumber),
          o: null,
          h: null,
          l: null,
          c: null,
          tenkan: null,
          kijun: null,
          chikou: null,
          senkouA: sourceForFutureSpans ? sourceForFutureSpans.senkouA : null,
          senkouB: sourceForFutureSpans ? sourceForFutureSpans.senkouB : null,
        });
      }
    }

    // 4. Process data for conditional cloud coloring
    return finalData.map((d) => {
      const { senkouA, senkouB } = d;
      let kumo_bull: [number, number] | null = null;
      let kumo_bear: [number, number] | null = null;

      if (senkouA !== null && senkouB !== null) {
        ``;
        if (senkouA > senkouB) {
          kumo_bull = [senkouB, senkouA];
          kumo_bear = [senkouA, senkouA]; // Zero-height area
        } else {
          kumo_bear = [senkouA, senkouB];
          kumo_bull = [senkouB, senkouB]; // Zero-height area
        }
      }
      return { ...d, kumo_bull, kumo_bear };
    });
  }, [deals]);

  return (
    <Container component="main">
      <Stack spacing={1} direction="row" alignItems="center">
        <MuiTooltip title={<Fundamental id={id} />} arrow>
          <Typography variant="h5" gutterBottom>
            Ichimoku 一目雲
          </Typography>
        </MuiTooltip>
        <Divider orientation="vertical" flexItem />
      </Stack>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="caption" color="textSecondary">
          顯示雲
        </Typography>
        <Switch
          size="small"
          checked={showKumo}
          onChange={(e) => setShowKumo(e.target.checked)}
          color="primary"
        />
        <Typography variant="caption" color="textSecondary">
          顯示轉換線與基準線
        </Typography>
        <Switch
          size="small"
          checked={showConversionBase}
          onChange={(e) => setShowConversionBase(e.target.checked)}
          color="secondary"
        />
        <Typography variant="caption" color="textSecondary">
          顯示延遲線
        </Typography>
        <Switch
          size="small"
          checked={showDelay}
          onChange={(e) => setShowDelay(e.target.checked)}
          color="primary"
        />
      </Stack>
      <Box height="calc(100vh - 64px)" width="100%">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData}>
            <XAxis dataKey="t" />
            <YAxis domain={["dataMin", "dataMax"]} />
            <Tooltip offset={50} />
            {/* Candlestick drawn first */}
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
            {/* Kumo (Cloud) drawn on top of candlesticks */}
            {showKumo && (
              <>
                <Area
                  type="monotone"
                  dataKey="kumo_bull"
                  fill="rgba(244, 67, 54, 0.3)"
                  stroke="none"
                  name="Bullish Cloud"
                />
                <Area
                  type="monotone"
                  dataKey="kumo_bear"
                  fill="rgba(76, 175, 80, 0.3)"
                  stroke="none"
                  name="Bearish Cloud"
                />
                {/* Ichimoku Lines drawn on top of everything */}
                <Line
                  type="monotone"
                  dataKey="senkouA"
                  stroke="rgba(244, 67, 54, 0.8)"
                  strokeWidth={1}
                  dot={false}
                  name="Senkou A"
                />
                <Line
                  type="monotone"
                  dataKey="senkouB"
                  stroke="rgba(76, 175, 80, 0.8)"
                  strokeWidth={1}
                  dot={false}
                  name="Senkou B"
                />{" "}
              </>
            )}
            {showDelay && (
              <>
                <Line
                  type="monotone"
                  dataKey="chikou"
                  stroke="#666666"
                  dot={false}
                  name="Chikou Span"
                />
              </>
            )}
            {showConversionBase && (
              <>
                <Line
                  type="monotone"
                  dataKey="tenkan"
                  stroke="#2196f3"
                  dot={false}
                  name="Tenkan-sen"
                />
                <Line
                  type="monotone"
                  dataKey="kijun"
                  stroke="#ff9800"
                  dot={false}
                  name="Kijun-sen"
                />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </Box>
    </Container>
  );
}
