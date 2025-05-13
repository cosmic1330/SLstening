const axios = require("axios");
const cheerio = require("cheerio");
const { Decimal } = require("decimal.js");
const { MonthlyRevenue } = require("./models"); // Sequelize model
const log4js = require("log4js");

const logger = log4js.getLogger();
logger.level = "debug";

async function fetchMonthlyRevenue(stockId) {
  try {
    const response = await axios.get(
      `https://tw.stock.yahoo.com/quote/${stockId}.TW/revenue`
    );
    const $ = cheerio.load(response.data);
    const ul = $("ul.List\\(n\\)").first(); // 使用第一個符合的 ul
    const lis = ul.children("li");

    let temp = {};

    for (let i = 0; i < lis.length; i++) {
      const li = $(lis[i]);
      try {
        if (Object.keys(temp).length > 0) {
          await MonthlyRevenue.create({
            year: temp.year,
            month: temp.month,
            stock_id: stockId,
            current_month_revenue: temp.current_month_revenue,
            previous_month_revenue: parseInt(
              li.find("div li").eq(0).text().replace(/,/g, "")
            ),
            previous_year_same_month_revenue:
              temp.previous_year_same_month_revenue,
            month_over_month_revenue: new Decimal(
              temp.month_over_month_revenue
            ),
            year_over_year_revenue: new Decimal(temp.year_over_year_revenue),
            current_year_cumulative_revenue:
              temp.current_year_cumulative_revenue,
            previous_year_cumulative_revenue:
              temp.previous_year_cumulative_revenue,
            compare_cumulative_revenue: new Decimal(
              temp.compare_cumulative_revenue
            ),
          });
          console.log(
            `[Success] create ${stockId} ${temp.year}/${temp.month} monthly revenue data`
          );
        }

        const dateText = li.find("div > div").first().text().trim(); // ex: "2024/03"
        const [year, month] = dateText.split("/");

        const values = li
          .find("div li")
          .map((i, el) => $(el).text().replace(/,/g, ""))
          .get();

        temp = {
          year,
          month,
          current_month_revenue: parseInt(values[0]),
          month_over_month_revenue: parseFloat(values[1].replace("%", "")),
          previous_year_same_month_revenue: parseInt(values[2]),
          year_over_year_revenue: parseFloat(values[3].replace("%", "")),
          current_year_cumulative_revenue: parseInt(values[4]),
          previous_year_cumulative_revenue: parseInt(values[5]),
          compare_cumulative_revenue: parseFloat(values[6].replace("%", "")),
        };
      } catch (err) {
        logger.error(
          `[Skip] stockId:${stockId} monthly_data:${temp.year}/${temp.month}, error:${err}`
        );
        break;
      }
    }
  } catch (err) {
    logger.error(`[Fail] create ${stockId} monthly revenue data, error:${err}`);
  }
}

// 測試呼叫
fetchMonthlyRevenue("2330"); // 例如：台積電
