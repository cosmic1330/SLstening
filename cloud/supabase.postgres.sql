-- Migration 1: Create initial tables
CREATE TABLE stock (
    id TEXT PRIMARY KEY, -- 股票代號
    name TEXT, -- 股票名稱
    industry_group TEXT, -- 產業別
    market_type TEXT -- 上市/上櫃
);

CREATE TABLE daily_deal (
    stock_id TEXT, -- 股票代號
    t TEXT, -- 日期
    c REAL, -- 收盤價
    o REAL, -- 開盤價
    h REAL, -- 最高價
    l REAL, -- 最低價
    v BIGINT, -- 成交量 (using BIGINT instead of INTEGER for larger numbers)
    PRIMARY KEY (stock_id, t),
    FOREIGN KEY (stock_id) REFERENCES stock(id)
);

CREATE TABLE skills (
    stock_id TEXT, -- 股票代號
    t TEXT, -- 日期
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
    PRIMARY KEY (stock_id, t),
    FOREIGN KEY (stock_id) REFERENCES stock(id)
);

-- Migration 2: Create weekly tables
CREATE TABLE weekly_deal (
    stock_id TEXT, -- 股票代號
    t TEXT, -- 日期
    c REAL, -- 收盤價
    o REAL, -- 開盤價
    h REAL, -- 最高價
    l REAL, -- 最低價
    v BIGINT, -- 成交量 (using BIGINT instead of INTEGER for larger numbers)
    PRIMARY KEY (stock_id, t),
    FOREIGN KEY (stock_id) REFERENCES stock(id)
);

CREATE TABLE weekly_skills (
    stock_id TEXT, -- 股票代號
    t TEXT, -- 日期
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
    PRIMARY KEY (stock_id, t),
    FOREIGN KEY (stock_id) REFERENCES stock(id)
);