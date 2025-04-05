import { dateFormat } from "@ch20026103/anysis";
import { Mode } from "@ch20026103/anysis/dist/esm/stockSkills/utils/dateFormat";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import useSWR from "swr";
import { tauriFetcher } from "../../api/http_cache";
import { DealsContext } from "../../context/DealsContext";
import useScroll from "../../hooks/useScroll";
import { TaType } from "../../types";
import generateDealDataDownloadUrl, {
  UrlTaPerdOptions,
  UrlType,
} from "../../utils/generateDealDataDownloadUrl";
import Close from "./Close";
import EMAMA from "./EMAMA";
import Ma from "./Ma";
import Obv from "./Obv";

const components = [<Ma />, <Close />, <EMAMA />, <Obv />];
function Detail() {
  const navigate = useNavigate();

  useEffect(() => {
    // 监听股票添加事件
    const unlisten = listen("detail", (event: any) => {
      const { url } = event.payload;
      navigate(url);
    });

    return () => {
      unlisten.then((fn) => fn()); // 清理监听器
    };
  }, []);

  const { id } = useParams();
  const currentChart = useScroll(components.length);

  const { data } = useSWR(
    id === "twse"
      ? `https://tw.stock.yahoo.com/_td-stock/api/resource/FinanceChartService.ApacLibraCharts;period=d;symbols=%5B%22%5ETWII%22%5D?bkt=%5B%22TW-Stock-mWeb-NewTechCharts-Rampup%22%2C%22c00-stock-lumos-prod%22%5D&device=smartphone&ecma=modern&feature=enableGAMAds%2CenableGAMEdgeToEdge%2CenableEvPlayer%2CenableHighChart&intl=tw&lang=zh-Hant-TW&partner=none&prid=5l4ebc1jud6ac&region=TW&site=finance&tz=Asia%2FTaipei&ver=1.4.511`
      : generateDealDataDownloadUrl({
          type: UrlType.Ta,
          id: id || "",
          perd: UrlTaPerdOptions.Day,
        }),
    tauriFetcher
  );

  const deals = useMemo(() => {
    if (!data || !id) return [];
    if (id === "twse") {
      const json = JSON.parse(data as string);
      const opens = json[0].chart.indicators.quote[0].open;
      const closes = json[0].chart.indicators.quote[0].close;
      const highs = json[0].chart.indicators.quote[0].high;
      const lows = json[0].chart.indicators.quote[0].low;
      const volumes = json[0].chart.indicators.quote[0].volume;
      const ts = json[0].chart.timestamp;

      const response: TaType = [];
      for (let i = 0; i < opens.length; i++) {
        if (opens[i] !== null) {
          response.push({
            t: dateFormat(ts[i] * 1000, Mode.TimeStampToNumber),
            o: opens[i],
            c: closes[i],
            h: highs[i],
            l: lows[i],
            v: volumes[i],
          });
        }
      }
      return response;
    } else {
      const ta_index = (data as string).indexOf('"ta":');
      const json_ta = "{" + (data as string).slice(ta_index).replace(");", "");
      const parse = JSON.parse(json_ta);
      const response = parse.ta as TaType;
      return response;
    }
  }, [data, id]);

  return (
    <main style={{ height: `${100 * components.length}vh` }}>
      <DealsContext.Provider value={deals}>
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100vh",
          }}
        >
          {components.map((Component, index) => (
            <div
              key={index}
              style={{ display: index === currentChart ? "block" : "none" }}
            >
              {Component}
            </div>
          ))}
        </div>
      </DealsContext.Provider>
    </main>
  );
}
export default Detail;
