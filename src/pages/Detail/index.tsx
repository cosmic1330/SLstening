import { StockListType } from "@ch20026103/anysis/dist/esm/stockSkills/types";
import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import useSWR from "swr";
import { tauriFetcher } from "../../api/http_cache";
import { DealsContext } from "../../context/DealsContext";
import useScroll from "../../hooks/useScroll";
import Close from "./Close";
import Ma from "./Ma";
import Obv from "./Obv";
import EMAMA from "./EMAMA";
import { listen } from "@tauri-apps/api/event";

const components = [<Ma />, <Close />, <EMAMA />, <Obv />];
function Detail() {
  const navigate = useNavigate();

  useEffect(() => {
    // 监听股票添加事件
    const unlisten = listen("stock-added", (event: any) => {
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
    `https://tw.quote.finance.yahoo.net/quote/q?type=ta&perd=d&mkt=10&sym=${id}&v=1&callback=`,
    tauriFetcher
  );

  const deals = useMemo(() => {
    if (!data) return [];
    const ta_index = (data as string).indexOf('"ta":');
    const json_ta = "{" + (data as string).slice(ta_index).replace(");", "");
    const parse = JSON.parse(json_ta);
    const response = parse.ta as StockListType;
    return response;
  }, [data]);

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
