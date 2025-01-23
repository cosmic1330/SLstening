export default function generateSqlQuery({
  todayDate,
  conditions,
}: {
  todayDate: string;
  conditions: string[];
}) {
  const query = `
      SELECT 
          today.stock_id, 
          today.t, 
          today.c AS closing_price, 
          today_sk.ma5, 
          today_sk.ma20, 
          today_sk.k AS today_k, 
          today_sk.d AS today_d,
          yesterday_sk.k AS yesterday_k,
          yesterday_sk.d AS yesterday_d
      FROM 
          daily_deal today
      JOIN 
          daily_deal yesterday 
      ON 
          today.stock_id = yesterday.stock_id AND DATE(today.t, '-1 day') = yesterday.t
      JOIN 
          skills today_sk 
      ON 
          today.stock_id = today_sk.stock_id AND today.t = today_sk.t
      JOIN 
          skills yesterday_sk 
      ON 
          today.stock_id = yesterday_sk.stock_id
          AND DATE(today.t, '-1 day') = yesterday_sk.t
      WHERE 
          today.t = DATE('${todayDate}')
          AND ${conditions.join(" AND ")}
    `;
  return query;
}