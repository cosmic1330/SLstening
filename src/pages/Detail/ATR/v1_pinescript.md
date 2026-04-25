// © KimYang_Adaptive_Trader
//@version=5
strategy("進階右側交易：HMA+動能過濾策略", overlay=true, initial_capital=100000)

// --- 參數設置 ---
hmaLength = input.int(20, "HMA 週期 (反應極快)", minval=1)
atrLen = input.int(10, "ATR 週期", minval=1)
atrMult = input.float(2.0, "ATR 乘數 (縮短距離以提高靈敏度)", step=0.1)
volSwitch = input.bool(true, "啟用成交量過濾")

// --- 計算指標 ---
// HMA 赫爾均線：比 EMA 更快反應價格轉向
hma = ta.hma(close, hmaLength)

// SuperTrend 邏輯 (用於右側趨勢跟蹤)
[supertrend, direction] = ta.supertrend(atrMult, atrLen)

// 成交量過濾：當前成交量大於過去 5 根的平均值
volFilter = volume > ta.sma(volume, 5)

// --- 交易邏輯 ---
// 進場：價格站上 HMA 且 SuperTrend 轉為看多
longCondition = ta.crossover(close, hma) and direction < 0
if (longCondition)
    strategy.entry("Long", strategy.long)

// 出場：這裡做雙重保險
// 1. 價格跌破 HMA (快速反應)
// 2. 且必須是「放量」下跌，或者 SuperTrend 正式轉向
exitCondition = (close < hma and (volSwitch ? volFilter : true)) or direction > 0

if (strategy.position_size > 0 and exitCondition)
    strategy.close("Long", comment="動能減弱出場")

// --- 繪圖 ---
plot(hma, color=close > hma ? color.green : color.red, linewidth=2, title="HMA 趨勢線")
plot(direction < 0 ? supertrend : na, color=color.new(color.blue, 50), style=plot.style_linebr, title="SuperTrend 支撐")

// 標註洗盤區域 (當 HMA 與價格反覆糾纏時)
var color bgCol = na
bgCol := direction < 0 ? color.new(color.green, 90) : color.new(color.red, 90)
bgcolor(bgCol)