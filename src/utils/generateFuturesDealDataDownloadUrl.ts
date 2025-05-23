import { UrlTaPerdOptions, UrlType } from "../types";

export enum FutureIds {
  WTX = "WTX%26", // 台指期近一

}

export default function generateFuturesDealDataDownloadUrl({
  type,
  id,
  perd,
}: {
  type: UrlType;
  id: string;
  perd?: UrlTaPerdOptions;
}) {
  if (type === UrlType.Tick) {
    // 均價線資料
    return `https://tw.stock.yahoo.com/_td-stock/api/resource/FinanceChartService.ApacLibraCharts;symbols=%5B%22${id}.TW%22%5D;type=tick?bkt=TW-Stock-Desktop-NewTechCharts-Rampup&device=desktop&ecma=modern&feature=enableGAMAds%2CenableGAMEdgeToEdge%2CenableEvPlayer%2CenableHighChart&intl=tw&lang=zh-Hant-TW&partner=none&prid=2k1gakljuc07h&region=TW&site=finance&tz=Asia%2FTaipei&ver=1.4.511`;
  } else if (type === UrlType.Ta && perd) {
    // Ta資料
    return `https://tw.screener.finance.yahoo.net/future/q?type=ta&perd=${perd}&mkt=01&sym=${id}&callback=&guccounter=1`;
  } else if (type === UrlType.Indicators && perd) {
    // 新版資料
    return `https://tw.stock.yahoo.com/_td-stock/api/resource/FinanceChartService.ApacLibraCharts;period=${perd};symbols=%5B%22${id}.TW%22%5D?bkt=%5B%22TW-Stock-mWeb-NewTechCharts-Rampup%22%2C%22c00-stock-lumos-prod%22%5D&device=smartphone&ecma=modern&feature=enableGAMAds%2CenableGAMEdgeToEdge%2CenableEvPlayer%2CenableHighChart&intl=tw&lang=zh-Hant-TW&partner=none&prid=6arkdk1judfgt&region=TW&site=finance&tz=Asia%2FTaipei&ver=1.4.511`;
  } else {
    throw new Error("Invalid URL type or parameters");
  }
}
