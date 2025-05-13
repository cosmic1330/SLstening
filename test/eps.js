const axios = require('axios');
const cheerio = require('cheerio');

// 模擬資料庫操作（請根據你的 DB 來修改）
async function insertEps({ season, stockId, stockName, epsData }) {
    try {
        // 模擬資料庫寫入與檢查
        console.log(`[Success] create ${stockId} ${season} eps.`);
    } catch (err) {
        console.error(`[Skip] stockid:${stockId} season:${season}, error:${err}`);
    }
}

async function fetchEps(stockId, stockName) {
    try {
        const url = `https://tw.stock.yahoo.com/quote/${stockId}.TW/eps`;
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);

        const ul = $('ul.List\\(n\\)').first();
        if (!ul.length) {
            console.warn(`No EPS data found for ${stockId}`);
            return;
        }

        ul.children('li').each(async (i, li) => {
            const divs = $(li).find('div > div');

            if (divs.length >= 3) {
                const season = $(divs[0]).text().replace(/\s/g, '');
                const epsText = $(divs[2]).text().trim();

                try {
                    const epsData = parseFloat(epsText);
                    if (isNaN(epsData)) throw new Error("Invalid EPS");

                    await insertEps({
                        season: season,
                        stockId: stockId,
                        stockName: stockName,
                        epsData: epsData
                    });
                } catch (err) {
                    console.error(`[Skip] stockid:${stockId} season:${season}, error:${err}`);
                    return false; // 中止 .each 迴圈
                }
            }
        });

    } catch (error) {
        console.error(`Error fetching EPS for ${stockId}:`, error.message);
    }
}

// 測試呼叫
fetchEps('2330', '台積電');
