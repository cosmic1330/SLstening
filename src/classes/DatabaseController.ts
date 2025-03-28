import Database from "@tauri-apps/plugin-sql";

export default class DatabaseController {
  public db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async clearTable() {
    try {
      await this.db.execute("DELETE FROM weekly_skills;");
      await this.db.execute("DELETE FROM weekly_deal;");
      await this.db.execute("DELETE FROM daily_skills;");
      await this.db.execute("DELETE FROM daily_deal;");
      await this.db.execute("DELETE FROM stock;");
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  async getLatestDailyDealCount() {
    try {
      const result: [{ latest_date: string; record_count: number }] =
        await this.db.select(
          "SELECT (SELECT MAX(t) FROM daily_deal) AS latest_date,COUNT(*) AS record_count FROM daily_deal WHERE t = (SELECT MAX(t) FROM daily_deal);"
        );
      return { date: result[0].latest_date, count: result[0].record_count };
    } catch (error) {
      console.error(error);
      return { date: "N/A", count: 0 };
    }
  }
}
