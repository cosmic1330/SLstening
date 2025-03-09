import { Prompt } from "../store/Schoice.store";

const convertDayToNumber = (day: string) => {
  switch (day) {
    case "今天":
      return 0;
    case "昨天":
      return 1;
    case "前天":
      return 2;
    case "3天前":
      return 3;
    case "4天前":
      return 4;
    case "5天前":
      return 5;
    default:
      return 0;
  }
};

type MappingItem = {
  key: string;
  group: string;
};
const mapping: Record<string, MappingItem> = {
  收盤價: { key: "c", group: "_day_ago" },
  開盤價: { key: "o", group: "_day_ago" },
  成交量: { key: "v", group: "_day_ago" },
  最低價: { key: "l", group: "_day_ago" },
  最高價: { key: "h", group: "_day_ago" },
  ma5: { key: "ma5", group: "_day_ago_sk" },
  ma5扣抵: { key: "ma5_ded", group: "_day_ago_sk" },
  ma10: { key: "ma10", group: "_day_ago_sk" },
  ma10扣抵: { key: "ma10_ded", group: "_day_ago_sk" },
  ma20: { key: "ma20", group: "_day_ago_sk" },
  ma20扣抵: { key: "ma20_ded", group: "_day_ago_sk" },
  ma60: { key: "ma60", group: "_day_ago_sk" },
  ma60扣抵: { key: "ma60_ded", group: "_day_ago_sk" },
  ma120: { key: "ma120", group: "_day_ago_sk" },
  ma120扣抵: { key: "ma120_ded", group: "_day_ago_sk" },
  macd: { key: "macd", group: "_day_ago_sk" },
  dif: { key: "dif", group: "_day_ago_sk" },
  osc: { key: "osc", group: "_day_ago_sk" },
  k: { key: "k", group: "_day_ago_sk" },
  d: { key: "d", group: "_day_ago_sk" },
  rsi5: { key: "rsi5", group: "_day_ago_sk" },
  rsi10: { key: "rsi10", group: "_day_ago_sk" },
  布林上軌: { key: "bollUb", group: "_day_ago_sk" },
  布林中軌: { key: "bollMa", group: "_day_ago_sk" },
  布林下軌: { key: "bollLb", group: "_day_ago_sk" },
  obv: { key: "obv", group: "_day_ago_sk" },
  obv5: { key: "obv5", group: "_day_ago_sk" },
};

export default function generateExpression(selects: Prompt) {
  const { day1, indicator1, operator, day2, indicator2 } = selects;

  const operatorKey =
    operator === "小於"
      ? "<"
      : operator === "大於"
      ? ">"
      : operator === "大於等於"
      ? ">="
      : operator === "小於等於"
      ? "<="
      : "=";

  const day1Mapping = mapping[indicator1];
  const day1Key = `'${convertDayToNumber(day1)}${day1Mapping.group}'.${
    day1Mapping.key
  }`;
  if(day2==="自定義數值"){
    return [day1Key, operatorKey, indicator2];
  }
  const day2Mapping = mapping[indicator2];
  const day2Key = `'${convertDayToNumber(day2)}${day2Mapping.group}'.${
    day2Mapping.key
  }`;

  return [day1Key, operatorKey, day2Key];
}
