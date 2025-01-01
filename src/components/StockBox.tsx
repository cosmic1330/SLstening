import { useMemo } from "react";
import useSWR from "swr";
import { tauriFetcher } from "../api/http";
// 排行: https://tw.stock.yahoo.com/_td-stock/api/resource/StockServices.rank;exchange=TWO;limit=100;offset=0;period=1D;sortBy=-price?bkt=&device=desktop&ecma=modern&feature=ecmaModern,useVersionSwitch,useNewQuoteTabColor&intl=tw&lang=zh-Hant-TW&partner=none&prid=604aak5gpc44b&region=TW&site=finance&tz=Asia/Taipei&ver=1.2.1189&returnMeta=true
// 即時行情: https://tw.stock.yahoo.com/_td-stock/api/resource/StockServices.priceByTimes;allDay=true;offset=0;symbol=2603.TW;
export default function StockBox({ id }: { id: string }) {
  const { data, error, isLoading } = useSWR(
    `https://tw.quote.finance.yahoo.net/quote/q?type=ta&perd=d&mkt=10&sym=${id}&v=1&callback=`,
    tauriFetcher
  );
  const deals = useMemo(() => {
    if (!data) return [];
    const ta_index = data.indexOf('"ta":');
    const json_ta = "{" + data.slice(ta_index).replace(");", "");
    const parse = JSON.parse(json_ta);
    return parse.ta;
  }, [data]);
  return <div>{JSON.stringify(deals[0])}</div>;
}
