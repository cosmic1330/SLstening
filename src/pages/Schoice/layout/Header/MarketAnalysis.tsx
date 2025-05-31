import { dateFormat } from "@ch20026103/anysis";
import { Mode } from "@ch20026103/anysis/dist/esm/stockSkills/utils/dateFormat";
import { Box, Divider, Tooltip, Typography } from "@mui/material";
import { useMemo } from "react";
import useSWR from "swr";
import { tauriFetcher } from "../../../../api/http_cache";
import useMarketAnalysis from "../../../../hooks/useMarketAnalysis";
import { FutureIds, UrlTaPerdOptions, UrlType } from "../../../../types";
import analyzeIndicatorsData, {
  IndicatorsDateTimeType,
} from "../../../../utils/analyzeIndicatorsData";
import generateDealDataDownloadUrl from "../../../../utils/generateDealDataDownloadUrl";

export default function MarketAnalysis() {
  const { data } = useSWR(
    generateDealDataDownloadUrl({
      type: UrlType.Indicators,
      id: FutureIds.WTX,
      perd: UrlTaPerdOptions.Hour,
    }),
    tauriFetcher
  );

  const ta = useMemo(() => {
    if (!data || typeof data !== "string") return [];
    return analyzeIndicatorsData(data, IndicatorsDateTimeType.DateTime);
  }, [data]);

  const { trends, power, date, trendChangePoints } = useMarketAnalysis({
    ta,
    perd: UrlTaPerdOptions.Hour,
  });

  return (
    <>
      <Divider orientation="vertical" flexItem />
      <Tooltip
        title={
          <Box>
            {trendChangePoints.map((point) => (
              <Typography variant="body2" key={point.t}>
                {dateFormat(point.t, Mode.NumberToString)} {point.trend}
              </Typography>
            ))}
          </Box>
        }
      >
        <Box>
          <Typography variant="body2">
            {date} {trends[trends.length - 1]?.trend}
          </Typography>
          <Typography variant="body2">{power}</Typography>
        </Box>
      </Tooltip>
    </>
  );
}
