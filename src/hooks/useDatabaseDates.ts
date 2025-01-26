import Database from "@tauri-apps/plugin-sql";
import { useEffect, useState } from "react";

export default function useDatabaseDates(db: Database| null) {
  const [dates, setDates] = useState<string[]>([]);

  useEffect(() => {
    const fetchDates = async () => {
      let res = (await db?.select(
        "SELECT DISTINCT t FROM daily_deal ORDER BY t DESC;"
      )) as { t: string }[];
      setDates(res?.map((item) => item.t) || []);
    };

    fetchDates();
  }, [db]);

  return dates;
}
