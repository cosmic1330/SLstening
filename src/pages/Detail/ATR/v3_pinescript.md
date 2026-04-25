// © KimYang_Sensitive_Logic_V7 (修正版 v3.2)
//@version=5
strategy("右側交易：出場強化版 v3.2", overlay=true, initial_capital=100000, 
         default_qty_type=strategy.percent_of_equity, default_qty_value=100)

// ─────────────────────────────────────────
//  參數設置
// ─────────────────────────────────────────
fastLookback   = input.int(10,    "突破參考：過去 N 天高點",  minval=3)
trendFilter    = input.int(50,    "中期趨勢濾網 (EMA 50)",     minval=20)
atrMultiplier  = input.float(2.5, "止損容差 (ATR 倍數)",       step=0.1)
minStopPct     = input.float(3.0, "最小止損緩衝 (%)",          step=0.5)
// ✅ 已修正：將 help 改為 tooltip
firstTgtR      = input.float(1.5, "第一批止盈 (R 倍數)",       step=0.1, tooltip="當利潤達到 (ATR*Multiplier) 的幾倍時減碼")
firstTgtQty    = input.float(50,  "第一批出場比例 (%)",        step=10)
timeStopBars   = input.int(20,    "最長持倉天數（時間止損）",  minval=5)
maxWickRatio   = input.float(1.5, "上影線/實體 最大比例",      step=0.1)

// ─────────────────────────────────────────
//  配色與指標計算
// ─────────────────────────────────────────
color_bull = #f23645
color_bear = #089981
color_time = #ff9800 

ema50      = ta.ema(close, trendFilter)
ema50Prev  = ema50[5]
atr        = ta.atr(14)
recentHigh = ta.highest(high, fastLookback)[1]

// ─────────────────────────────────────────
//  進場邏輯 (層一)
// ─────────────────────────────────────────
bool emaRising  = ema50 > ema50Prev
bool aboveEma   = close > ema50
bool breakout   = ta.crossover(close, recentHigh)

float bodySize  = math.abs(close - open)
float upperWick = high - math.max(close, open)
bool cleanBreak = upperWick <= math.max(bodySize, atr * 0.1) * maxWickRatio

buySignal = breakout and aboveEma and emaRising and cleanBreak

// ─────────────────────────────────────────
//  狀態管理與進場執行
// ─────────────────────────────────────────
var float entryPrice  = na
var float firstTarget = na
var int   entryBar    = na
var float trailStop   = na

if buySignal
    strategy.entry("多單", strategy.long)
    entryPrice  := close
    entryBar    := bar_index
    firstTarget := close + (atr * atrMultiplier * firstTgtR)
    float initStop = math.max(close - (atr * atrMultiplier), close * (1 - minStopPct / 100))
    trailStop   := initStop

// ─────────────────────────────────────────
//  出場邏輯 (層二、層三與追蹤止損)
// ─────────────────────────────────────────
// 分段止盈：使用 limit 參數實現限價單
if strategy.position_size > 0
    strategy.exit("止盈1", "多單", qty_percent=firstTgtQty, limit=firstTarget, comment_loss="止損", comment_profit="部分止盈")

// 偵測是否剛完成部分止盈
bool reachFirstTarget = strategy.position_size[1] > 0 and strategy.position_size < strategy.position_size[1] and strategy.position_size > 0

// 時間止損
bool isTimeStop = strategy.position_size > 0 
               and not na(entryBar) 
               and (bar_index - entryBar) >= timeStopBars 
               and close < entryPrice

if isTimeStop
    strategy.close("多單", comment="時間止損")

// 動態追蹤止損
if strategy.position_size > 0
    float curStop = math.max(close - (atr * atrMultiplier), close * (1 - minStopPct / 100))
    trailStop := math.max(curStop, nz(trailStop, curStop))

if strategy.position_size > 0 and ta.crossunder(close, trailStop)
    strategy.close("多單", comment="追蹤止損")

// 持倉重置
if strategy.position_size == 0
    entryPrice  := na
    firstTarget := na
    entryBar    := na
    trailStop   := na

// ─────────────────────────────────────────
//  視覺化
// ─────────────────────────────────────────
plot(ema50,      color=color.new(color.gray, 50), linewidth=2, title="50日生命線")
plot(trailStop,  color=color_bear, style=plot.style_linebr, linewidth=2, title="動態防線")
plot(firstTarget, color=color.new(color_bull, 40), style=plot.style_linebr, linewidth=1, title="第一批止盈目標")

plotshape(buySignal, 
     title="買入", style=shape.labelup, location=location.belowbar,
     color=color_bull, text="買", textcolor=color.white, size=size.small)

plotshape(reachFirstTarget,
     title="減碼", style=shape.labeldown, location=location.abovebar,
     color=color.new(color_bull, 30), text="減", textcolor=color.white, size=size.small)

plotshape(isTimeStop,
     title="時間止損", style=shape.xcross, location=location.abovebar,
     color=color_time, size=size.small)

bool normalExit = strategy.position_size[1] > 0 and strategy.position_size == 0 and not isTimeStop
plotshape(normalExit,
     title="賣出", style=shape.labeldown, location=location.abovebar,
     color=color_bear, text="賣", textcolor=color.white, size=size.small)

bgcolor(strategy.position_size > 0 ? color.new(color_bull, 95) : na)