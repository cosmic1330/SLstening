import { load } from "cheerio";
import { tauriFetcher, TauriFetcherType } from "../api/http_cache";
import useStocksStore, { StockField } from "../store/Stock.store";
import { sendNotification } from "@tauri-apps/plugin-notification";
import { useCallback } from "react";

enum QueryStockType {
  TWSE = 2,
  OTC = 4,
}

export default function useDownloadStocks() {
  const { update_menu } = useStocksStore();

  const queryStocks = useCallback(async (type: QueryStockType) => {
    const data: StockField[] = [];
    try {
      const url = `https://isin.twse.com.tw/isin/C_public.jsp?strMode=${type}`;
      const arrayBuffer = (await tauriFetcher(
        url,
        TauriFetcherType.ArrayBuffer
      )) as ArrayBuffer;

      // 使用 TextDecoder轉換編碼big5->utf-8
      const decoder = new TextDecoder("big5");
      const decodedText = decoder.decode(arrayBuffer);
      const $ = load(decodedText);

      const rows = $("tbody tr").toArray();
      const thirdRowToEnd = rows.slice(2);

      for (let i = 0; i < thirdRowToEnd.length; i++) {
        const row = thirdRowToEnd[i];
        const firstTd = $(row).find("td").eq(0).text(); // 第一個<td>
        const [id, name] = firstTd.split("　");
        const type = $(row).find("td").eq(3).text(); // 第四個<td>
        const group = $(row).find("td").eq(4).text(); // 第五個<td>
        if (id.length === 4) {
          data.push({ id, name, type, group });
        } else {
          console.log("Skip id:", id, name);
        }
      }
    } catch (error) {
      console.error("Error scraping website:", error);
    }
    return data;
  }, []);

  const handleDownloadMenu = useCallback(async () => {
    try {
      const TWSE_data = await queryStocks(QueryStockType.TWSE);
      const OTC_data = await queryStocks(QueryStockType.OTC);
      TWSE_data.push(...OTC_data);
      await update_menu(TWSE_data);
      sendNotification({ title: "Menu", body: "Update Success!" });
    } catch (error) {
      console.error("Error scraping website:", error);
    }
  }, []);

  return handleDownloadMenu;
}
