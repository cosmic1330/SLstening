import Database from "@tauri-apps/plugin-sql";
import { useEffect, useState } from "react";

export default function useDatabase() {
  const [db, setDb] = useState<Database | null>(null);

  useEffect(() => {
    const initializeDb = async () => {
      try {
        // 載入 SQLite 資料庫
        const database = await Database.load("sqlite:schoice.db");
        setDb(database);
        console.log("資料庫初始化成功");
      } catch (error) {
        console.error("資料庫初始化失敗:", error);
      }
    };

    initializeDb();
  }, []);
  return db;
}
