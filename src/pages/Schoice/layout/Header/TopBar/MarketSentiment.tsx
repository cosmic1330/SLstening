import { dateFormat } from "@ch20026103/anysis";
import { Mode } from "@ch20026103/anysis/dist/esm/stockSkills/utils/dateFormat";
import { Box, Chip, Stack, Tooltip, Typography } from "@mui/material";
import { useMemo } from "react";
import useSWR from "swr";
import { tauriFetcher } from "../../../../../api/http_cache";
import useMarketAnalysis from "../../../../../hooks/useMarketAnalysis";
import { FutureIds, UrlTaPerdOptions, UrlType } from "../../../../../types";
import analyzeIndicatorsData, {
  IndicatorsDateTimeType,
} from "../../../../../utils/analyzeIndicatorsData";
import generateDealDataDownloadUrl from "../../../../../utils/generateDealDataDownloadUrl";

export default function MarketSentiment() {
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
    <Stack direction="row" alignItems="center" spacing={3} fontWeight={700}>
      <Typography variant="body2">
        市場情緒：
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
          <Chip
            label={`${date} ${trends[trends.length - 1]?.trend}`}
            size="small"
            color={
              trends[trends.length - 1]?.trend === "多頭" ? "error" : "success"
            }
            sx={{
              color: "#fff",
              ml: 1,
              height: 22,
              fontSize: 14,
            }}
          />
        </Tooltip>
        <Chip
          label={power}
          size="small"
          color={"default"}
          sx={{
            color: "#fff",
            ml: 1,
            height: 22,
            fontSize: 14,
          }}
        />
      </Typography>

      <Typography variant="body2">
        台指期(h):{" "}
        <Typography variant="body2" component={"span"} fontWeight={700}>
          {ta[ta.length - 1]?.c}
        </Typography>{" "}
        <Typography
          variant="body2"
          component={"span"}
          color={
            ta[ta.length - 1]?.c > ta[ta.length - 2]?.c
              ? "error.main"
              : "success.main"
          }
          fontWeight={700}
        >
          {ta[ta.length - 1]?.c - ta[ta.length - 2]?.c} (
          {(
            ((ta[ta.length - 1]?.c - ta[ta.length - 2]?.c) /
              ta[ta.length - 2]?.c) *
            100
          ).toFixed(2)}
          %)
        </Typography>
      </Typography>
    </Stack>
  );
}
