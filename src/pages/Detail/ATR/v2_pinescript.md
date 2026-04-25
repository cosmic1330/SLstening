// © KimYang_Sensitive_Logic_V7 (修正版 v2.2)
//@version=5
strategy("右側交易：靈敏平衡版 v2.2", overlay=true, initial_capital=100000, default_qty_type=strategy.percent_of_equity, default_qty_value=100)

// ─────────────────────────────────────────
//  參數設置
// ─────────────────────────────────────────
fastLookback   = input.int(10,    "進場參考：突破過去 N 天高點", minval=3)
trendFilter    = input.int(50,    "中期趨勢濾網 (EMA 50)",       minval=20)
atrMultiplier  = input.float(2.5, "止損容差 (ATR 倍數)",         step=0.1)
minStopPct     = input.float(3.0, "最小止損緩衝 (%)",           step=0.5)

// ─────────────────────────────────────────
//  台股配色
// ─────────────────────────────────────────
color_bull = #f23645
color_bear = #089981

// ─────────────────────────────────────────
//  指標計算
// ─────────────────────────────────────────
ema50      = ta.ema(close, trendFilter)
ema50Prev  = ema50[5]  
atr        = ta.atr(14)

// 取得昨日為止的 N 日最高點
recentHigh = ta.highest(high, fastLookback)[1]

// ─────────────────────────────────────────
//  靈敏進場邏輯
// ─────────────────────────────────────────
bool emaRising  = ema50 > ema50Prev  
bool aboveEma   = close > ema50
bool breakout   = ta.crossover(close, recentHigh)

bool buySignal  = breakout and aboveEma and emaRising

if buySignal
    strategy.entry("多單", strategy.long)

// ─────────────────────────────────────────
//  動態追蹤止損邏輯
// ─────────────────────────────────────────
var float trailStop = na

float atrStop  = close - (atr * atrMultiplier)
float pctStop  = close * (1 - minStopPct / 100)
float currentPotentialStop = math.max(atrStop, pctStop)

if strategy.position_size > 0
    // 持倉期間，止損線只升不降
    trailStop := math.max(currentPotentialStop, nz(trailStop, currentPotentialStop))
else if buySignal
    // 進場訊號觸發時立即初始化
    trailStop := currentPotentialStop
else
    trailStop := na

// ─────────────────────────────────────────
//  出場邏輯
// ─────────────────────────────────────────
if strategy.position_size > 0 and ta.crossunder(close, trailStop)
    strategy.close("多單", comment="止損/止盈出場")

bool justClosed = strategy.position_size[1] > 0 and strategy.position_size == 0

// ─────────────────────────────────────────
//  視覺化 (已修正參數名稱為 style)
// ─────────────────────────────────────────
plot(ema50,      color=color.new(color.gray, 50), linewidth=2, title="50日生命線")
plot(trailStop,  color=color_bear, style=plot.style_linebr, linewidth=2, title="動態防線")

plotshape(buySignal,
     title="買入", 
     style=shape.labelup,   // ✅ 已修正：從 shape= 改為 style=
     location=location.belowbar,
     color=color_bull, 
     text="買", 
     textcolor=color.white, 
     size=size.small)

plotshape(justClosed,
     title="賣出", 
     style=shape.labeldown, // ✅ 已修正：從 shape= 改為 style=
     location=location.abovebar,
     color=color_bear, 
     text="賣", 
     textcolor=color.white, 
     size=size.small)

bgcolor(strategy.position_size > 0 ? color.new(color_bull, 95) : na)