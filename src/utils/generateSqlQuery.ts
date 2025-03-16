export default function generateSqlQuery({
  todayDate,
  conditions,
  dates,
  daysRange = 4,
}: {
  todayDate: number;
  conditions: string[];
  dates: string[];
  daysRange?: number;
}) {
  const dayJoins = Array.from({ length: daysRange }, (_, i) => i + 1)
    .map(
      (number) => `
        JOIN daily_deal "${number}_day_ago" ON "0_day_ago".stock_id = "${number}_day_ago".stock_id AND "${number}_day_ago".t = "${dates[number + todayDate]}"
        JOIN skills "${number}_day_ago_sk" ON "0_day_ago".stock_id = "${number}_day_ago_sk".stock_id AND "${number}_day_ago_sk".t = "${dates[number + todayDate]}"
      `
    )
    .join("");

  const selectFields = Array.from({ length: daysRange }, (_, i) => i + 1)
    .map(
      (number) => `"${number}_day_ago_sk".k AS k${number}, "${number}_day_ago_sk".d AS d${number}`
    )
    .join(", ");

  const query = `
    SELECT "0_day_ago".stock_id, stock.market_type, stock.name, "0_day_ago".t, "0_day_ago".c, "0_day_ago_sk".k, "0_day_ago_sk".d, ${selectFields}
    FROM daily_deal "0_day_ago"
    JOIN stock ON "0_day_ago".stock_id = stock.id
    JOIN skills "0_day_ago_sk" ON "0_day_ago".stock_id = "0_day_ago_sk".stock_id AND "0_day_ago".t = "0_day_ago_sk".t
    ${dayJoins}
    WHERE "0_day_ago".t = "${dates[todayDate]}" AND ${conditions.join(" AND ")}
  `;
  
  return query.trim();
}
