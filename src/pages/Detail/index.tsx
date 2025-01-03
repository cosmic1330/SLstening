import { Outlet, useParams } from "react-router";
import { tauriFetcher } from "../../api/http";
import useSWR from "swr";
import { useMemo } from "react";
import { StockListType } from "@ch20026103/anysis/dist/esm/stockSkills/types";
import { DealsContext } from "../../context/DealsContext";

function Detail() {
  const { id } = useParams();

  const { data } = useSWR(
    `https://tw.quote.finance.yahoo.net/quote/q?type=ta&perd=d&mkt=10&sym=${id}&v=1&callback=`,
    tauriFetcher
  );

  const deals = useMemo(() => {
    if (!data) return [];
    const ta_index = data.indexOf('"ta":');
    const json_ta = "{" + data.slice(ta_index).replace(");", "");
    const parse = JSON.parse(json_ta);
    const response = parse.ta as StockListType;
    return response;
  }, [data]);
  

  return (
    <main>
      <DealsContext.Provider value={deals}>
        <Outlet />
      </DealsContext.Provider>
    </main>
  );
}
export default Detail;
