import { MaResType } from "@ch20026103/anysis/dist/esm/stockSkills/ma";
import { StockListType } from "@ch20026103/anysis/dist/esm/stockSkills/types";
import { useEffect, useMemo, useState } from "react";
import ma from "../cls_tools/ma";

export default function useMa5Deduction(deals: StockListType) {
  const [maRef, setMaRed] = useState<MaResType>();
  const [ma5, setMa5] = useState<number>(0);
  useEffect(() => {
    if (deals.length !== 0) {
      let temp = ma.init(deals[0], 5);
      for (let i = 1; i < deals.length - 1; i++) {
        const deal = deals[i];
        temp = ma.next(deal, temp, 5);
      }
      setMaRed(JSON.parse(JSON.stringify(temp)));
      temp = ma.next(deals[deals.length - 1], temp, 5);
      setMa5(temp.ma);
    }
  }, [deals]);

  const { time, value } = useMemo(() => {
    if (!maRef) return { time: "null", value: 0 };
    return {
      time: maRef.dataset[0].t,
      value: maRef.dataset[0].c,
    };
  }, [maRef]);

  const { tmr_time, tmr_value } = useMemo(() => {
    if (!maRef) return { tmr_time: "null", tmr_value: 0 };
    return {
      tmr_time: maRef.dataset[1].t,
      tmr_value: maRef.dataset[1].c,
    };
  }, [maRef]);

  return {
    ma5_deduction_time: time,
    ma5_deduction_value: value,
    ma5_tomorrow_deduction_value: tmr_value,
    ma5_tomorrow_deduction_time: tmr_time,
    ma5: ma5,
  };
}
