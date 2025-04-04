import { Boll, Kd, Ma, Macd, Obv, Rsi, Week } from "@ch20026103/anysis";
import dateFormat, {
  Mode,
} from "@ch20026103/anysis/dist/esm/stockSkills/utils/dateFormat";
import Database from "@tauri-apps/plugin-sql";
import {
  DealTableOptions,
  DealTableType,
  SkillsTableOptions,
  SkillsTableType,
  StockStoreType,
  TaType,
  TimeSharingDealTableOptions,
  TimeSharingDealTableType,
  TimeSharingSkillsTableOptions,
  TimeSharingSkillsTableType,
} from "../types";

export default class SqliteDataManager {
  public db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async clearTable() {
    try {
      await this.db.execute("DELETE FROM hourly_skills;");
      await this.db.execute("DELETE FROM hourly_deal;");
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

  async timeSharingProcessor(
    ta: TaType,
    stock: StockStoreType,
    options: {
      dealType: TimeSharingDealTableOptions;
      skillsType: TimeSharingSkillsTableOptions;
    }
  ) {
    try {
      if (!ta || ta.length === 0) {
        throw new Error("ta is empty");
      }

      const boll = new Boll();
      const ma = new Ma();
      const macd = new Macd();
      const kd = new Kd();
      const rsi = new Rsi();
      const obv = new Obv();

      const init = ta[0];
      let dailyDealSaveStatus = await this.saveTimeSharingDealTable(
        {
          stock_id: stock.id,
          ts: init.t,
          c: init.c,
          o: init.o,
          h: init.h,
          l: init.l,
          v: init.v,
        },
        options.dealType,
        stock
      );

      if (!dailyDealSaveStatus) {
        throw new Error("init dailyDealSaveStatus failed");
      }

      let ma5_data = ma.init(init, 5);
      let ma10_data = ma.init(init, 10);
      let ma20_data = ma.init(init, 20);
      let ma60_data = ma.init(init, 60);
      let ma120_data = ma.init(init, 120);
      let boll_data = boll.init(init);
      let macd_data = macd.init(init);
      let kd_data = kd.init(init, 9);
      let rsi5_data = rsi.init(init, 5);
      let rsi10_data = rsi.init(init, 10);
      let obv_data = obv.init(init, 5);

      let skillsSaveStatus = await this.saveTimeSharingSkillsTable(
        {
          stock_id: stock.id,
          ts: init.t,
          ma5: ma5_data.ma,
          ma5_ded: ma5_data.exclusionValue["d-1"],
          ma10: ma10_data.ma,
          ma10_ded: ma10_data.exclusionValue["d-1"],
          ma20: ma20_data.ma,
          ma20_ded: ma20_data.exclusionValue["d-1"],
          ma60: ma60_data.ma,
          ma60_ded: ma60_data.exclusionValue["d-1"],
          ma120: ma120_data.ma,
          ma120_ded: ma120_data.exclusionValue["d-1"],
          macd: macd_data.macd,
          dif: macd_data.dif[macd_data.dif.length - 1] || 0,
          osc: macd_data.osc,
          k: kd_data.k,
          d: kd_data.d,
          rsi5: rsi5_data.rsi,
          rsi10: rsi10_data.rsi,
          bollUb: boll_data.bollUb,
          bollMa: boll_data.bollMa,
          bollLb: boll_data.bollLb,
          obv: obv_data.obv,
          obv5: obv_data.obvMa,
        },
        options.skillsType,
        stock
      );

      if (!skillsSaveStatus) {
        throw new Error("init skillsSaveStatus failed");
      }

      for (let i = 1; i < ta.length; i++) {
        const value = ta[i];
        dailyDealSaveStatus = await this.saveTimeSharingDealTable(
          {
            stock_id: stock.id,
            ts: value.t,
            c: value.c,
            o: value.o,
            h: value.h,
            l: value.l,
            v: value.v,
          },
          options.dealType,
          stock
        );

        if (!dailyDealSaveStatus) {
          throw new Error("dailyDealSaveStatus failed");
        }

        ma5_data = ma.next(value, ma5_data, 5);
        ma10_data = ma.next(value, ma10_data, 10);
        ma20_data = ma.next(value, ma20_data, 20);
        ma60_data = ma.next(value, ma60_data, 60);
        ma120_data = ma.next(value, ma120_data, 120);
        boll_data = boll.next(value, boll_data, 20);
        macd_data = macd.next(value, macd_data);
        kd_data = kd.next(value, kd_data, 9);
        rsi5_data = rsi.next(value, rsi5_data, 5);
        rsi10_data = rsi.next(value, rsi10_data, 10);
        obv_data = obv.next(value, obv_data, 5);

        skillsSaveStatus = await this.saveTimeSharingSkillsTable(
          {
            stock_id: stock.id,
            ts: value.t,
            ma5: ma5_data.ma,
            ma5_ded: ma5_data.exclusionValue["d-1"],
            ma10: ma10_data.ma,
            ma10_ded: ma10_data.exclusionValue["d-1"],
            ma20: ma20_data.ma,
            ma20_ded: ma20_data.exclusionValue["d-1"],
            ma60: ma60_data.ma,
            ma60_ded: ma60_data.exclusionValue["d-1"],
            ma120: ma120_data.ma,
            ma120_ded: ma120_data.exclusionValue["d-1"],
            macd: macd_data.macd,
            dif: macd_data.dif[macd_data.dif.length - 1] || 0,
            osc: macd_data.osc,
            k: kd_data.k,
            d: kd_data.d,
            rsi5: rsi5_data.rsi,
            rsi10: rsi10_data.rsi,
            bollUb: boll_data.bollUb,
            bollMa: boll_data.bollMa,
            bollLb: boll_data.bollLb,
            obv: obv_data.obv,
            obv5: obv_data.obvMa,
          },
          options.skillsType,
          stock
        );

        if (!skillsSaveStatus) {
          throw new Error("dailySkillsSaveStatus failed");
        }
      }
      return true;
    } catch (e) {
      console.error(stock, e);
    }
    return false;
  }

  async processor(
    ta: TaType,
    stock: StockStoreType,
    options: {
      dealType: DealTableOptions;
      skillsType: SkillsTableOptions;
    }
  ) {
    try {
      if (!ta || ta.length === 0) {
        throw new Error("ta is empty");
      }

      const boll = new Boll();
      const ma = new Ma();
      const macd = new Macd();
      const kd = new Kd();
      const rsi = new Rsi();
      const obv = new Obv();

      const init = ta[0];
      let t = dateFormat(init.t, Mode.NumberToString);
      let dailyDealSaveStatus = await this.saveDealTable(
        {
          stock_id: stock.id,
          t,
          c: init.c,
          o: init.o,
          h: init.h,
          l: init.l,
          v: init.v,
        },
        options.dealType,
        stock
      );

      if (!dailyDealSaveStatus) {
        throw new Error("init dailyDealSaveStatus failed");
      }

      let ma5_data = ma.init(init, 5);
      let ma10_data = ma.init(init, 10);
      let ma20_data = ma.init(init, 20);
      let ma60_data = ma.init(init, 60);
      let ma120_data = ma.init(init, 120);
      let boll_data = boll.init(init);
      let macd_data = macd.init(init);
      let kd_data = kd.init(init, 9);
      let rsi5_data = rsi.init(init, 5);
      let rsi10_data = rsi.init(init, 10);
      let obv_data = obv.init(init, 5);

      let skillsSaveStatus = await this.saveSkillsTable(
        {
          stock_id: stock.id,
          t,
          ma5: ma5_data.ma,
          ma5_ded: ma5_data.exclusionValue["d-1"],
          ma10: ma10_data.ma,
          ma10_ded: ma10_data.exclusionValue["d-1"],
          ma20: ma20_data.ma,
          ma20_ded: ma20_data.exclusionValue["d-1"],
          ma60: ma60_data.ma,
          ma60_ded: ma60_data.exclusionValue["d-1"],
          ma120: ma120_data.ma,
          ma120_ded: ma120_data.exclusionValue["d-1"],
          macd: macd_data.macd,
          dif: macd_data.dif[macd_data.dif.length - 1] || 0,
          osc: macd_data.osc,
          k: kd_data.k,
          d: kd_data.d,
          rsi5: rsi5_data.rsi,
          rsi10: rsi10_data.rsi,
          bollUb: boll_data.bollUb,
          bollMa: boll_data.bollMa,
          bollLb: boll_data.bollLb,
          obv: obv_data.obv,
          obv5: obv_data.obvMa,
        },
        options.skillsType,
        stock
      );

      if (!skillsSaveStatus) {
        throw new Error("init skillsSaveStatus failed");
      }

      for (let i = 1; i < ta.length; i++) {
        const value = ta[i];
        t = dateFormat(value.t, Mode.NumberToString);

        dailyDealSaveStatus = await this.saveDealTable(
          {
            stock_id: stock.id,
            t,
            c: value.c,
            o: value.o,
            h: value.h,
            l: value.l,
            v: value.v,
          },
          options.dealType,
          stock
        );

        if (!dailyDealSaveStatus) {
          throw new Error("dailyDealSaveStatus failed");
        }

        ma5_data = ma.next(value, ma5_data, 5);
        ma10_data = ma.next(value, ma10_data, 10);
        ma20_data = ma.next(value, ma20_data, 20);
        ma60_data = ma.next(value, ma60_data, 60);
        ma120_data = ma.next(value, ma120_data, 120);
        boll_data = boll.next(value, boll_data, 20);
        macd_data = macd.next(value, macd_data);
        kd_data = kd.next(value, kd_data, 9);
        rsi5_data = rsi.next(value, rsi5_data, 5);
        rsi10_data = rsi.next(value, rsi10_data, 10);
        obv_data = obv.next(value, obv_data, 5);

        skillsSaveStatus = await this.saveSkillsTable(
          {
            stock_id: stock.id,
            t,
            ma5: ma5_data.ma,
            ma5_ded: ma5_data.exclusionValue["d-1"],
            ma10: ma10_data.ma,
            ma10_ded: ma10_data.exclusionValue["d-1"],
            ma20: ma20_data.ma,
            ma20_ded: ma20_data.exclusionValue["d-1"],
            ma60: ma60_data.ma,
            ma60_ded: ma60_data.exclusionValue["d-1"],
            ma120: ma120_data.ma,
            ma120_ded: ma120_data.exclusionValue["d-1"],
            macd: macd_data.macd,
            dif: macd_data.dif[macd_data.dif.length - 1] || 0,
            osc: macd_data.osc,
            k: kd_data.k,
            d: kd_data.d,
            rsi5: rsi5_data.rsi,
            rsi10: rsi10_data.rsi,
            bollUb: boll_data.bollUb,
            bollMa: boll_data.bollMa,
            bollLb: boll_data.bollLb,
            obv: obv_data.obv,
            obv5: obv_data.obvMa,
          },
          options.skillsType,
          stock
        );

        if (!skillsSaveStatus) {
          throw new Error("dailySkillsSaveStatus failed");
        }
      }
      return true;
    } catch (e) {
      console.error(stock, e);
    }
    return false;
  }

  weeklyProcessorByDailyData(ta: TaType, stock: StockStoreType) {
    try {
      if (!ta || ta.length === 0) {
        throw new Error("ta is empty");
      }
      const boll = new Boll();
      const ma = new Ma();
      const macd = new Macd();
      const kd = new Kd();
      const rsi = new Rsi();
      const obv = new Obv();

      const week = new Week();
      let week_data = week.init(ta[0]);
      for (let i = 1; i < ta.length; i++) {
        week_data = week.next(ta[i], week_data);
      }

      const init = week_data.week[0];
      let t = dateFormat(init.t, Mode.NumberToString);
      let weeklyDealSaveStatus = this.saveDealTable(
        {
          stock_id: stock.id,
          t,
          c: init.c,
          o: init.o,
          h: init.h,
          l: init.l,
          v: init.v,
        },
        DealTableOptions.WeeklyDeal,
        stock
      );

      if (!weeklyDealSaveStatus) {
        throw new Error("weeklyDealSaveStatus failed");
      }

      let ma5_data = ma.init(init, 5);
      let ma10_data = ma.init(init, 10);
      let ma20_data = ma.init(init, 20);
      let ma60_data = ma.init(init, 60);
      let ma120_data = ma.init(init, 120);
      let boll_data = boll.init(init);
      let macd_data = macd.init(init);
      let kd_data = kd.init(init, 9);
      let rsi5_data = rsi.init(init, 5);
      let rsi10_data = rsi.init(init, 10);
      let obv_data = obv.init(init, 5);

      let weeklySkillsSaveStatus = this.saveSkillsTable(
        {
          stock_id: stock.id,
          t,
          ma5: ma5_data.ma,
          ma5_ded: ma5_data.exclusionValue["d-1"],
          ma10: ma10_data.ma,
          ma10_ded: ma10_data.exclusionValue["d-1"],
          ma20: ma20_data.ma,
          ma20_ded: ma20_data.exclusionValue["d-1"],
          ma60: ma60_data.ma,
          ma60_ded: ma60_data.exclusionValue["d-1"],
          ma120: ma120_data.ma,
          ma120_ded: ma120_data.exclusionValue["d-1"],
          macd: macd_data.macd,
          dif: macd_data.dif[macd_data.dif.length - 1] || 0,
          osc: macd_data.osc,
          k: kd_data.k,
          d: kd_data.d,
          rsi5: rsi5_data.rsi,
          rsi10: rsi10_data.rsi,
          bollUb: boll_data.bollUb,
          bollMa: boll_data.bollMa,
          bollLb: boll_data.bollLb,
          obv: obv_data.obv,
          obv5: obv_data.obvMa,
        },
        SkillsTableOptions.WeeklySkills,
        stock
      );

      if (!weeklySkillsSaveStatus) {
        throw new Error("weeklySkillsSaveStatus failed");
      }

      for (let i = 1; i < week_data.week.length; i++) {
        t = dateFormat(week_data.week[i].t, Mode.NumberToString);

        weeklyDealSaveStatus = this.saveDealTable(
          {
            stock_id: stock.id,
            t,
            c: week_data.week[i].c,
            o: week_data.week[i].o,
            h: week_data.week[i].h,
            l: week_data.week[i].l,
            v: week_data.week[i].v,
          },
          DealTableOptions.WeeklyDeal,
          stock
        );

        if (!weeklyDealSaveStatus) {
          throw new Error("weeklyDealSaveStatus failed");
        }

        ma5_data = ma.next(week_data.week[i], ma5_data, 5);
        ma10_data = ma.next(week_data.week[i], ma10_data, 10);
        ma20_data = ma.next(week_data.week[i], ma20_data, 20);
        ma60_data = ma.next(week_data.week[i], ma60_data, 60);
        ma120_data = ma.next(week_data.week[i], ma120_data, 120);
        boll_data = boll.next(week_data.week[i], boll_data, 20);
        macd_data = macd.next(week_data.week[i], macd_data);
        kd_data = kd.next(week_data.week[i], kd_data, 9);
        rsi5_data = rsi.next(week_data.week[i], rsi5_data, 5);
        rsi10_data = rsi.next(week_data.week[i], rsi10_data, 10);
        obv_data = obv.next(week_data.week[i], obv_data, 5);

        weeklySkillsSaveStatus = this.saveSkillsTable(
          {
            stock_id: stock.id,
            t,
            ma5: ma5_data.ma,
            ma5_ded: ma5_data.exclusionValue["d-1"],
            ma10: ma10_data.ma,
            ma10_ded: ma10_data.exclusionValue["d-1"],
            ma20: ma20_data.ma,
            ma20_ded: ma20_data.exclusionValue["d-1"],
            ma60: ma60_data.ma,
            ma60_ded: ma60_data.exclusionValue["d-1"],
            ma120: ma120_data.ma,
            ma120_ded: ma120_data.exclusionValue["d-1"],
            macd: macd_data.macd,
            dif: macd_data.dif[macd_data.dif.length - 1] || 0,
            osc: macd_data.osc,
            k: kd_data.k,
            d: kd_data.d,
            rsi5: rsi5_data.rsi,
            rsi10: rsi10_data.rsi,
            bollUb: boll_data.bollUb,
            bollMa: boll_data.bollMa,
            bollLb: boll_data.bollLb,
            obv: obv_data.obv,
            obv5: obv_data.obvMa,
          },
          SkillsTableOptions.WeeklySkills,
          stock
        );

        if (!weeklySkillsSaveStatus) {
          throw new Error("weeklySkillsSaveStatus failed");
        }
      }
      return true;
    } catch (e) {
      console.error(stock, e);
    }
    return false;
  }

  // Base
  async saveStockTable(stock: StockStoreType) {
    try {
      await this.db.execute(
        "INSERT INTO stock (id, name, industry_group, market_type) VALUES ($1, $2, $3, $4)",
        [stock.id, stock.name, stock.group, stock.type]
      );
      return true;
    } catch (e) {
      console.error(stock, e);
      return false;
    }
  }

  async saveDealTable(
    deal: DealTableType,
    type: DealTableOptions,
    stock: StockStoreType
  ) {
    try {
      await this.db.execute(
        `INSERT INTO ${type} (stock_id, t, c, o, h, l, v) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [deal.stock_id, deal.t, deal.c, deal.o, deal.h, deal.l, deal.v]
      );
      return true;
    } catch (e) {
      console.error(stock, e);
      return false;
    }
  }

  async saveSkillsTable(
    skills: SkillsTableType,
    type: SkillsTableOptions,
    stock: StockStoreType
  ) {
    try {
      await this.db.execute(
        `INSERT INTO ${type} (stock_id,
          t,
          ma5,
          ma5_ded,
          ma10,
          ma10_ded,
          ma20,
          ma20_ded,
          ma60,
          ma60_ded,
          ma120,
          ma120_ded,
          macd,
          dif,
          osc,
          k,
          d,
          rsi5,
          rsi10,
          bollUb,
          bollMa,
          bollLb,
          obv,
          obv5) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)`,
        [
          skills.stock_id,
          skills.t,
          skills.ma5,
          skills.ma5_ded,
          skills.ma10,
          skills.ma10_ded,
          skills.ma20,
          skills.ma20_ded,
          skills.ma60,
          skills.ma60_ded,
          skills.ma120,
          skills.ma120_ded,
          skills.macd,
          skills.dif,
          skills.osc,
          skills.k,
          skills.d,
          skills.rsi5,
          skills.rsi10,
          skills.bollUb,
          skills.bollMa,
          skills.bollLb,
          skills.obv,
          skills.obv5,
        ]
      );
      return true;
    } catch (e) {
      console.error(stock, e);
      return false;
    }
  }

  // TimeSharing
  async saveTimeSharingDealTable(
    deal: TimeSharingDealTableType,
    type: TimeSharingDealTableOptions,
    stock: StockStoreType
  ) {
    try {
      await this.db.execute(
        `INSERT INTO ${type} (stock_id, ts, c, o, h, l, v) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [deal.stock_id, deal.ts, deal.c, deal.o, deal.h, deal.l, deal.v]
      );
      return true;
    } catch (e) {
      console.error(stock, e);
      return false;
    }
  }

  async saveTimeSharingSkillsTable(
    skills: TimeSharingSkillsTableType,
    type: TimeSharingSkillsTableOptions,
    stock: StockStoreType
  ) {
    try {
      await this.db.execute(
        `INSERT INTO ${type} (stock_id,
          ts,
          ma5,
          ma5_ded,
          ma10,
          ma10_ded,
          ma20,
          ma20_ded,
          ma60,
          ma60_ded,
          ma120,
          ma120_ded,
          macd,
          dif,
          osc,
          k,
          d,
          rsi5,
          rsi10,
          bollUb,
          bollMa,
          bollLb,
          obv,
          obv5) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)`,
        [
          skills.stock_id,
          skills.ts,
          skills.ma5,
          skills.ma5_ded,
          skills.ma10,
          skills.ma10_ded,
          skills.ma20,
          skills.ma20_ded,
          skills.ma60,
          skills.ma60_ded,
          skills.ma120,
          skills.ma120_ded,
          skills.macd,
          skills.dif,
          skills.osc,
          skills.k,
          skills.d,
          skills.rsi5,
          skills.rsi10,
          skills.bollUb,
          skills.bollMa,
          skills.bollLb,
          skills.obv,
          skills.obv5,
        ]
      );
      return true;
    } catch (e) {
      console.error(stock, e);
      return false;
    }
  }
}
