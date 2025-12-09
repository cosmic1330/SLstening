import Database from "@tauri-apps/plugin-sql";

export type RedListRow = {
  stock_id: string;
  stock_name: string;
  industry_group: string;
  market_type: string;
  list: string;
};

export const fetchRedBallStocks = async (db: Database): Promise<RedListRow[]> => {
  return await db.select<RedListRow[]>(`WITH ranked AS (
            SELECT
                tr.stock_id,
                tr.record_date,
                DENSE_RANK() OVER (ORDER BY tr.record_date DESC) AS list
            FROM public.turnover_rank tr
            WHERE tr.type = 'red_ball'
              AND tr.record_date IN (
                    SELECT DISTINCT record_date
                    FROM public.turnover_rank
                    WHERE type = 'red_ball'
                    ORDER BY record_date DESC
                    LIMIT 3
              )
        )
        SELECT
            s.stock_id,
            s.stock_name,
            s.industry_group,
            s.market_type,
            r.list
        FROM stock s
        JOIN ranked r
          ON r.stock_id = s.stock_id
        ORDER BY r.list, s.stock_id;`);
};
