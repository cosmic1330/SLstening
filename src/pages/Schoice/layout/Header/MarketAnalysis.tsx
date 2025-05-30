import { dateFormat } from "@ch20026103/anysis";
import { Mode } from "@ch20026103/anysis/dist/esm/stockSkills/utils/dateFormat";
import { Box, Divider, Tooltip, Typography } from "@mui/material";
import { useMemo } from "react";
import useSWR from "swr";
import { tauriFetcher } from "../../../../api/http_cache";
import kd from "../../../../cls_tools/kd";
import ma from "../../../../cls_tools/ma";
import macd from "../../../../cls_tools/macd";
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

  const deals = useMemo(() => {
    if (!data || typeof data !== "string") return [];
    const ta = analyzeIndicatorsData(data, IndicatorsDateTimeType.DateTime);
    const response = [];
    let kdData = kd.init(ta[0], 9);
    let macdData = macd.init(ta[0]);
    let ma5Data = ma.init(ta[0], 5);
    let ma10Data = ma.init(ta[0], 10);
    let ma20Data = ma.init(ta[0], 20);
    let ma60Data = ma.init(ta[0], 60);
    response.push({
      osc: macdData.osc,
      ma5: ma5Data.ma,
      ma10: ma10Data.ma,
      ma20: ma20Data.ma,
      ma60: ma60Data.ma,
      ...ta[0],
    });
    for (let i = 1; i < ta.length; i++) {
      const deal = ta[i];
      kdData = kd.next(deal, kdData, 9);
      macdData = macd.next(deal, macdData);
      ma5Data = ma.next(deal, ma5Data, 5);
      ma10Data = ma.next(deal, ma10Data, 10);
      ma20Data = ma.next(deal, ma20Data, 20);
      ma60Data = ma.next(deal, ma60Data, 60);
      response.push({
        osc: macdData.osc,
        ma5: ma5Data.ma,
        ma10: ma10Data.ma,
        ma20: ma20Data.ma,
        ma60: ma60Data.ma,
        ...deal,
      });
    }
    return response;
  }, [data]);

  const trand = useMemo(() => {
    if (deals.length === 0) return "N/A";
    const lastDeal = deals[deals.length - 1];
    if (
      lastDeal.ma5 > lastDeal.ma60 &&
      lastDeal.ma10 > lastDeal.ma60 &&
      lastDeal.ma20 > lastDeal.ma60
    ) {
      return "多頭";
    }
    if (
      lastDeal.ma5 < lastDeal.ma60 &&
      lastDeal.ma10 < lastDeal.ma60 &&
      lastDeal.ma20 < lastDeal.ma60
    ) {
      return "空頭";
    } else {
      return "震盪";
    }
  }, [deals]);

  const power = useMemo(() => {
    if (deals.length === 0) return "?";
    const lastDeal = deals[deals.length - 1];
    const seclastDeal = deals[deals.length - 2];
    const thrlastDeal = deals[deals.length - 3];
    if (
      (lastDeal.osc > seclastDeal.osc || lastDeal > thrlastDeal) &&
      lastDeal.osc > 0
    ) {
      return "多方力道漸強";
    } else if (
      (lastDeal.osc < seclastDeal.osc || lastDeal < thrlastDeal) &&
      lastDeal.osc < 0
    ) {
      return "空方力道漸強";
    } else if (
      (lastDeal.osc > seclastDeal.osc || lastDeal > thrlastDeal) &&
      lastDeal.osc < 0
    ) {
      return "多方力道漸弱";
    } else if (
      (lastDeal.osc < seclastDeal.osc || lastDeal < thrlastDeal) &&
      lastDeal.osc > 0
    ) {
      return "空方力道漸弱";
    }
    return "無明顯力道";
  }, [deals]);

  const date = useMemo(() => {
    if (deals.length === 0) return "";
    return dateFormat(deals[deals.length - 1].t, Mode.NumberToString);
  }, [deals]);

  const trendChangePoints = useMemo(() => {
    if (deals.length === 0) return [];
    const trends = deals.map((deal) => {
      if (
        deal.ma5 > deal.ma60 &&
        deal.ma10 > deal.ma60 &&
        deal.ma20 > deal.ma60 &&
        deal.c > deal.ma5
      ) {
        return { ...deal, trend: "多頭" };
      }
      if (
        deal.ma5 < deal.ma60 &&
        deal.ma10 < deal.ma60 &&
        deal.ma20 < deal.ma60 &&
        deal.c < deal.ma5
      ) {
        return { ...deal, trend: "空頭" };
      } else {
        return { ...deal, trend: "震盪" };
      }
    });
    // 找出多頭轉空投或空頭轉多頭的點
    const trendChanges = trends.reduce<typeof trends>(
      (acc: typeof trends, deal, index) => {
        if (index === 0) return acc; // Skip the first deal
        // acc 趨勢如果延續不紀錄
        if (acc.length > 0 && acc[acc.length - 1].trend === deal.trend) {
          return acc;
        }
        // 如果前一個趨勢是震盪，則紀錄
        const prevDeal = trends[index - 1];
        if (
          (prevDeal.trend === "震盪" && deal.trend === "多頭") ||
          (prevDeal.trend === "震盪" && deal.trend === "空頭")
        ) {
          acc.push(deal);
        }
        return acc;
      },
      []
    );
    return trendChanges;
  }, [deals]);

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
            {date} {trand}
          </Typography>
          <Typography variant="body2">{power}</Typography>
        </Box>
      </Tooltip>
    </>
  );
}
