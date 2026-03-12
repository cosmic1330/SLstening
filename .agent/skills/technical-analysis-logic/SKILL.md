---
name: technical-analysis-logic
description: "Structured guide for implementing and verifying financial technical indicators and trading signals with accuracy and performance."
---

# Technical Analysis Logic Implementation

## 1️⃣ Purpose & Scope

Ensure all technical analysis indicators (MA, EMA, RSI, KD, etc.) and trading signals are **mathematically accurate, performant, and consistent** with industrial standards.

- Prevents calculation errors
- Ensures consistent signal generation across different timeframes
- Optimizes calculation performance for large datasets

---

## 2️⃣ Pre-Requisites

You must have:

- Clear mathematical definition of the indicator (e.g., EMA period, RSI window)
- Raw data source (OHLCV: Open, High, Low, Close, Volume)
- Target display timeframe
- Existing calculation library (if any, e.g., talib-like implementations)

---

## 3️⃣ Logic Verification (Hard Gate)

Before integrating into the UI, you MUST:

- **Mathematical Validation**: Run the logic against a known sample dataset (e.g., a specific stock's historic data) and compare with a trusted source (TradingView, Yahoo Finance).
- **Edge Case Check**: 
  - How does it handle missing data points?
  - What happens during the initial "warm-up" period (e.g., the first 20 days of a 20-MA)?
  - How does it handle zero volume or zero price movement?

Ask explicitly:

> “Have we verified the calculation logic against a trusted baseline for this indicator?”

---

## 4️⃣ Performance Optimization

For data-intensive calculations:

- **Incremental Calculation**: Calculate only the latest data point instead of re-calculating the entire history when a new tick arrives.
- **Offloading**: Move heavy computations to Rust/Backend if the dataset exceeds 1,000 points.
- **Memoization**: Ensure calculated values are cached in React (useMemo) or a dedicated state store.

---

## 5️⃣ Trading Signal Definition

When defining signals (Buy/Sell/Hold):

- **Combine Multiple Indicators**: Avoid single-indicator signals. Use volume confirmation or trend filtering.
- **Signal States**:
  - `Triggered`: The exact moment the condition is met.
  - `In-Progress`: The condition is still true after being triggered.
  - `Cooling`: Prevention of rapid re-triggering (debounce).

---

## 6️⃣ Implementation Workflow

### Step 1: Core Function
Implement the pure mathematical function.
```typescript
function calculateSMA(data: number[], period: number): number[] { ... }
```

### Step 2: Verification
Test with dummy data.

### Step 3: UI Integration
Bind to the chart or signal list.

### Step 4: Verification Gate
Check precision (floating point issues) and UI lag.

---

## 7️⃣ Refusal Conditions

Refuse to proceed if:

- Data source is unreliable or lacks OHLCV.
- Indicator parameters are not defined (e.g., "just add a trend line").
- Calculation logic is "proprietary" without a mathematical explanation.

---

## Key Principles

- Accuracy > Visuals
- Handle floating point precision carefully
- Document the "warm-up" requirements
- Prefer vectorized operations for speed
