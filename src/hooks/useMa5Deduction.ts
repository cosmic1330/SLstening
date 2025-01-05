import { MaResType } from "@ch20026103/anysis/dist/esm/stockSkills/ma";
import { StockListType } from "@ch20026103/anysis/dist/esm/stockSkills/types";
import { useEffect, useMemo, useRef } from "react";
import ma from "../cls_tools/ma";

export default function useMa5Deduction(deals: StockListType) {
  const maRef = useRef<MaResType>();
  const ma5 = useRef<number>(0);
  useEffect(() => {
    if (deals.length !== 0) {
      let temp = ma.init(deals[0], 5);
      for (let i = 1; i < deals.length - 1; i++) {
        const deal = deals[i];
        temp = ma.next(deal, temp, 5);
      }
      maRef.current = JSON.parse(JSON.stringify(temp));
      temp = ma.next(deals[deals.length - 1], temp, 5);
      ma5.current = temp.ma;
    }
  }, [deals]);

  const { time, value } = useMemo(() => {
    console.log(maRef.current);
    if (!maRef.current) return { time: null, value: 0 };
    return {
      time: maRef.current.dataset[0].t,
      value: maRef.current.dataset[0].c,
    };
  }, [maRef.current]);

  return {
    ma5_deduction_time: time,
    ma5_deduction_value: value,
    ma5: ma5.current,
  };
}
