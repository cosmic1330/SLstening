use tauri_plugin_sql::{MigrationKind,Migration};

pub fn value() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: "
                CREATE TABLE daily_deal (
                    stock_id INTEGER, -- 股票代號
                    t Date,  -- 日期
                    c REAL, -- 收盤價
                    o REAL, -- 開盤價
                    h REAL, -- 最高價
                    l REAL, -- 最低價
                    v INTEGER, -- 成交量
                    PRIMARY KEY (stock_id, t)
                );
                CREATE TABLE skills (
                    stock_id INTEGER, -- 股票代號
                    t Date,  -- 日期
                    ma5 REAL, -- 5日均線
                    ma5_ded REAL, -- 5日扣抵
                    ma10 REAL, -- 10日均線
                    ma10_ded REAL, -- 10日扣抵
                    ma20 REAL, -- 20日均線
                    ma20_ded REAL, -- 20日扣抵
                    ma60 REAL, -- 60日均線
                    ma60_ded REAL, -- 60日扣抵
                    ma120 REAL, -- 120日均線
                    ma120_ded REAL, -- 120日扣抵
                    macd REAL, -- MACD
                    dif REAL, -- DIF
                    osc REAL, -- OSC
                    k REAL, -- K
                    d REAL, -- D
                    rsi5 REAL, -- RSI5
                    rsi10 REAL, -- RSI10
                    bollUb REAL, -- Bollinger Upper Band
                    bollMa REAL, -- Bollinger Middle Band
                    bollLb REAL, -- Bollinger Lower Band
                    obv REAL, -- OBV
                    obv5 REAL, -- OBV5
                    PRIMARY KEY (stock_id, t)
                );
                ",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "insert_initial_data",
            sql: " 
                    INSERT INTO daily_deal (stock_id, t, c, o, h, l, v) VALUES (2330, '2021-01-01', 500, 500, 500, 500, 500);
                ",
            kind: MigrationKind::Up,
        }
    ]
}