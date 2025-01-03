import { StockListType } from "@ch20026103/anysis/dist/esm/stockSkills/types";
import { useMemo, useRef } from "react";
import ma from "../cls_tools/ma";
import { MaResType } from "@ch20026103/anysis/dist/esm/stockSkills/ma";

export default function useMa5Deduction(deals: StockListType) {
  const maRef = useRef<MaResType>();
  const ma_data = useMemo(() => {
    if (deals.length === 0) return undefined;
    if (maRef.current) {
      return ma.next(deals[deals.length - 1], maRef.current, 5);
    } else {
      let ma_data = ma.init(deals[0], 5);
      for (let i = 1; i < deals.length-1; i++) {
        const deal = deals[i];
        ma_data = ma.next(deal, ma_data, 5);
      }
      maRef.current = ma_data;
      return ma.next(deals[deals.length - 1], ma_data, 5);
    }
  }, [deals]);

  const ma5 = useMemo(() => {
    if (!ma_data) return 0;
    return ma_data.ma;
  }, [ma_data]);

  const { time, value } = useMemo(() => {
    if (!maRef.current) return { time: null, value: 0 };
    return {
      time: maRef.current.dataset[0].t,
      value: maRef.current.dataset[0].c,
    };
  }, [maRef.current]);

  return { ma5_deduction_time: time, ma5_deduction_value: value, ma5 };
}
