import { MaResType } from "@ch20026103/anysis/dist/esm/stockSkills/ma";
import { useEffect, useMemo, useState } from "react";
import ma from "../cls_tools/ma";
import { TaType } from "../types";

export default function useMaDeduction(deals: TaType) {
  const [ma5Ref, setMa5Red] = useState<MaResType>();
  const [ma20Ref, setMa20Red] = useState<MaResType>();
  const [ma5, setMa5] = useState<number>(0);
  const [ma20, setMa20] = useState<number>(0);
  useEffect(() => {
    if (deals.length !== 0) {
      let temp = ma.init(deals[0], 5);
      let temp2 = ma.init(deals[0], 20);
      for (let i = 1; i < deals.length - 1; i++) {
        const deal = deals[i];
        temp = ma.next(deal, temp, 5);
        temp2 = ma.next(deal, temp2, 20);
      }
      setMa5Red(JSON.parse(JSON.stringify(temp)));
      setMa20Red(JSON.parse(JSON.stringify(temp2)));
      temp = ma.next(deals[deals.length - 1], temp, 5);
      temp2 = ma.next(deals[deals.length - 1], temp2, 20);
      setMa5(temp.ma);
      setMa20(temp2.ma);
    }
  }, [deals]);

  const { ma5_time, ma5_value } = useMemo(() => {
    if (!ma5Ref) return { ma5_time: "null", ma5_value: 0 };
    return {
      ma5_time: ma5Ref.dataset[0].t.toString(),
      ma5_value: ma5Ref.dataset[0].c,
    };
  }, [ma5Ref]);

  const { ma20_time, ma20_value } = useMemo(() => {
    if (!ma20Ref) return { ma20_time: "null", ma20_value: 0 };
    return {
      ma20_time: ma20Ref.dataset[0].t.toString(),
      ma20_value: ma20Ref.dataset[0].c,
    };
  }, [ma20Ref]);

  const { tmr_ma5_time, tmr_ma5_value } = useMemo(() => {
    if (!ma5Ref) return { tmr_ma5_time: "null", tmr_ma5_value: 0 };
    return {
      tmr_ma5_time: ma5Ref.dataset[1].t.toString(),
      tmr_ma5_value: ma5Ref.dataset[1].c,
    };
  }, [ma5Ref]);

  const { tmr_ma20_time, tmr_ma20_value } = useMemo(() => {
    if (!ma20Ref) return { tmr_ma20_time: "null", tmr_ma20_value: 0 };
    return {
      tmr_ma20_time: ma20Ref.dataset[1].t.toString(),
      tmr_ma20_value: ma20Ref.dataset[1].c,
    };
  }, [ma20Ref]);

  return {
    ma5,
    ma5_deduction_time: ma5_time,
    ma5_deduction_value: ma5_value,
    ma5_tomorrow_deduction_value: tmr_ma5_value,
    ma5_tomorrow_deduction_time: tmr_ma5_time,
    ma20,
    ma20_deduction_time: ma20_time,
    ma20_deduction_value: ma20_value,
    ma20_tomorrow_deduction_value: tmr_ma20_value,
    ma20_tomorrow_deduction_time: tmr_ma20_time,
  };
}
