import { FutureIds } from "../types";
import useYahooMarketIndex from "./useYahooMarketIndex";

export default function useOtcDeals(isVisible: boolean = true) {
  return useYahooMarketIndex(
    FutureIds.OTC,
    `https://tw.stock.yahoo.com/_td-stock/api/resource/FinanceChartService.ApacLibraCharts;autoRefresh=1743165248883;symbols=%5B%22%5ETWOII%22%5D;type=tick?bkt=%5B%22TW-Stock-mWeb-NewTechCharts-Rampup%22%2C%22c00-stock-lumos-prod%22%5D&device=smartphone&ecma=modern&feature=enableGAMAds%2CenableGAMEdgeToEdge%2CenableEvPlayer%2CenableHighChart&intl=tw&lang=zh-Hant-TW&partner=none&prid=4ls9nghjud5o5&region=TW&site=finance&tz=Asia%2FTaipei&ver=1.4.511`,
    `https://tw.stock.yahoo.com/_td-stock/api/resource/FinanceChartService.ApacLibraCharts;period=60m;symbols=%5B%22%5ETWOII%22%5D?bkt=%5B%22TW-Stock-mWeb-NewTechCharts-Rampup%22%2C%22c00-stock-lumos-prod%22%5D&device=smartphone&ecma=modern&feature=enableGAMAds%2CenableGAMEdgeToEdge%2CenableEvPlayer%2CenableHighChart&intl=tw&lang=zh-Hant-TW&partner=none&prid=5l4ebc1jud6ac&region=TW&site=finance&tz=Asia%2FTaipei&ver=1.4.511`,
    "otc",
    isVisible,
  );
}
