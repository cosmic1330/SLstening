export default function generateSqlQuery({
  todayDate,
  conditions,
  dates,
}: {
  todayDate: number;
  conditions: string[];
  dates: string[];
}) {
  const query =
    `SELECT "0_day_ago".stock_id, stock.market_type, stock.name, "0_day_ago".t, "0_day_ago".c, "0_day_ago_sk".k, "0_day_ago_sk".d, "1_day_ago_sk".k AS k1, "1_day_ago_sk".d AS d1 FROM daily_deal "0_day_ago" ` +
    `JOIN stock ON "0_day_ago".stock_id = stock.id ` +
    `JOIN skills "0_day_ago_sk" ON "0_day_ago".stock_id = "0_day_ago_sk".stock_id AND "0_day_ago".t = "0_day_ago_sk".t ` +
    [1, 2, 3, 4]
      .map(
        (number) =>
          `JOIN daily_deal "${number}_day_ago" ON "0_day_ago".stock_id = "${number}_day_ago".stock_id AND "${number}_day_ago".t = "${
            dates[number + todayDate]
          }" `
      )
      .join("") +
    [1, 2, 3, 4]
      .map(
        (number) =>
          `JOIN skills "${number}_day_ago_sk" ON "0_day_ago".stock_id = "${number}_day_ago_sk".stock_id AND "${number}_day_ago_sk".t = "${
            dates[number + todayDate]
          }" `
      )
      .join("") +
    `WHERE "0_day_ago".t = "${dates[todayDate]}" AND ${conditions.join(
      " AND "
    )}`;
  return query;
}
