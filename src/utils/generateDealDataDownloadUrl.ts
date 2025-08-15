import { UrlTaPerdOptions, UrlType } from "../types";

export default function generateDealDataDownloadUrl({
  type,
  id,
  perd,
}: {
  type: UrlType;
  id: string;
  perd?: UrlTaPerdOptions;
}) {
  if (!id) { // Add this check for all cases where id is essential
    throw new Error("Invalid URL type or parameters: ID is required.");
  }

  if (type === UrlType.Tick) {
    // 均價線資料
    return `https://tw.stock.yahoo.com/_td-stock/api/resource/FinanceChartService.ApacLibraCharts;symbols=["${id}"];type=tick`;
  } else if (type === UrlType.Ta && perd) {
    // Ta資料
    return `https://tw.quote.finance.yahoo.net/quote/q?type=ta&perd=${perd}&mkt=10&sym=${id}&v=1&callback=`;
  } else if (type === UrlType.Indicators && perd) { // `id` check is now at the top
    // 新版資料
    return `https://tw.stock.yahoo.com/_td-stock/api/resource/FinanceChartService.ApacLibraCharts;period=${perd};symbols=["${id}"]`;
  } else {
    throw new Error("Invalid URL type or parameters");
  }
}
