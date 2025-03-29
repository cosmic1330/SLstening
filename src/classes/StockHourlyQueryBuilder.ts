import { QueryBuilderMappingItem, StorePrompt } from "../types";


export class StockHourlyQueryBuilder {
  private mapping: Record<string, QueryBuilderMappingItem> = {
    收盤價: { key: "c", group: "_hour_ago" },
    開盤價: { key: "o", group: "_hour_ago" },
    成交量: { key: "v", group: "_hour_ago" },
    最低價: { key: "l", group: "_hour_ago" },
    最高價: { key: "h", group: "_hour_ago" },
    ma5: { key: "ma5", group: "_hour_ago_sk" },
    ma5扣抵: { key: "ma5_ded", group: "_hour_ago_sk" },
    ma10: { key: "ma10", group: "_hour_ago_sk" },
    ma10扣抵: { key: "ma10_ded", group: "_hour_ago_sk" },
    ma20: { key: "ma20", group: "_hour_ago_sk" },
    ma20扣抵: { key: "ma20_ded", group: "_hour_ago_sk" },
    ma60: { key: "ma60", group: "_hour_ago_sk" },
    ma60扣抵: { key: "ma60_ded", group: "_hour_ago_sk" },
    ma120: { key: "ma120", group: "_hour_ago_sk" },
    ma120扣抵: { key: "ma120_ded", group: "_hour_ago_sk" },
    macd: { key: "macd", group: "_hour_ago_sk" },
    dif: { key: "dif", group: "_hour_ago_sk" },
    osc: { key: "osc", group: "_hour_ago_sk" },
    k: { key: "k", group: "_hour_ago_sk" },
    d: { key: "d", group: "_hour_ago_sk" },
    rsi5: { key: "rsi5", group: "_hour_ago_sk" },
    rsi10: { key: "rsi10", group: "_hour_ago_sk" },
    布林上軌: { key: "bollUb", group: "_hour_ago_sk" },
    布林中軌: { key: "bollMa", group: "_hour_ago_sk" },
    布林下軌: { key: "bollLb", group: "_hour_ago_sk" },
    obv: { key: "obv", group: "_hour_ago_sk" },
    obv5: { key: "obv5", group: "_hour_ago_sk" },
  };

  // 新增靜態選項
  static readonly options = {
    hours: ["現在", "1小時前", "2小時前", "3小時前", "4小時前", "5小時前", "自定義數值"],
    indicators: [
      "收盤價",
      "開盤價",
      "成交量",
      "最低價",
      "最高價",
      "ma5",
      "ma5扣抵",
      "ma10",
      "ma10扣抵",
      "ma20",
      "ma20扣抵",
      "ma60",
      "ma60扣抵",
      "ma120",
      "ma120扣抵",
      "macd",
      "dif",
      "osc",
      "k",
      "d",
      "rsi5",
      "rsi10",
      "布林上軌",
      "布林中軌",
      "布林下軌",
      "obv",
      "obv5",
    ],
    operators: ["小於", "大於", "等於", "大於等於", "小於等於"],
  } as const;

  private converthourToNumber(hour: string): number {
    const hourMapping: Record<string, number> = {
      現在: 0,
      "1小時前": 1,
      "2小時前": 2,
      "3小時前": 3,
      "4小時前": 4,
      "5小時前": 5,
    };
    return hourMapping[hour] || 0;
  }

  private convertOperator(operator: string): string {
    const operatorMapping: Record<string, string> = {
      小於: "<",
      大於: ">",
      等於: "=",
      大於等於: ">=",
      小於等於: "<=",
    };
    return operatorMapping[operator] || "=";
  }

  public generateExpression(prompt: StorePrompt): string[] {
    const { day1, indicator1, operator, day2, indicator2 } = prompt;
    const operatorKey = this.convertOperator(operator);

    const day1Mapping = this.mapping[indicator1];
    const day1Key = `'${this.converthourToNumber(day1)}${day1Mapping.group}'.${
      day1Mapping.key
    }`;

    if (day2 === "自定義數值") {
      return [day1Key, operatorKey, indicator2];
    }

    const day2Mapping = this.mapping[indicator2];
    const day2Key = `'${this.converthourToNumber(day2)}${day2Mapping.group}'.${
      day2Mapping.key
    }`;

    return [day1Key, operatorKey, day2Key];
  }

  public generateSqlQuery({
    tohourDate,
    conditions,
    dates,
    hoursRange = 4,
    stockIds,
  }: {
    tohourDate: number;
    conditions: string[];
    dates: string[];
    hoursRange?: number;
    stockIds?: string[];
  }): string {
    const hourJoins = Array.from({ length: hoursRange }, (_, i) => i + 1)
      .map(
        (number) => `
          JOIN hourly_deal "${number}_hour_ago" ON "0_hour_ago".stock_id = "${number}_hour_ago".stock_id AND "${number}_hour_ago".t = "${dates[number + tohourDate]}"
          JOIN hourly_skills "${number}_hour_ago_sk" ON "0_hour_ago".stock_id = "${number}_hour_ago_sk".stock_id AND "${number}_hour_ago_sk".t = "${dates[number + tohourDate]}"
        `
      )
      .join("");


    const stockIdCondition = stockIds 
      ? ` AND "0_hour_ago".stock_id IN ('${stockIds.join("','")}')`
      : '';

    const query = `
      SELECT "0_hour_ago".stock_id as stock_id
      FROM hourly_deal "0_hour_ago"
      JOIN stock ON "0_hour_ago".stock_id = stock.id
      JOIN hourly_skills "0_hour_ago_sk" ON "0_hour_ago".stock_id = "0_hour_ago_sk".stock_id AND "0_hour_ago".t = "0_hour_ago_sk".t
      ${hourJoins}
      WHERE "0_hour_ago".t = "${dates[tohourDate]}" ${stockIdCondition} AND ${conditions.join(" AND ")}
    `;

    return query.trim();
  }
}

export const stockhourlyQueryBuilder = new StockHourlyQueryBuilder(); 