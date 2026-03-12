---
name: financial-visualization-design
description: "Structured guide for designing and optimizing high-performance financial charts, dashboards, and real-time monitoring interfaces."
---

# Financial Visualization Design

## 1️⃣ Purpose & Scope

Ensure all financial data visualizations (K-Line, Depth, Order Book, Screener) are **intuitive, high-performance, and provides professional-grade insights**.

- Prevents information overload
- Optimizes UI for real-time updates
- Ensures visual consistency for technical analysis

---

## 2️⃣ Pre-Requisites

You must have:

- Core dataset ready for visualization (OHLCV, Level 2 data, etc.)
- Target user profile (Day trader, Long-term investor, or Algorithmic trader)
- Choice of visualization engine (Recharts, D3, Canvas, or WebGL)

---

## 3️⃣ Layout & Hierarchy (Hard Gate)

Before implementation, you MUST define the information hierarchy:

- **Primary View**: Usually the main chart (K-Line).
- **Secondary Views**: Indicators (MACD, RSI), Volume, and Order flows.
- **Micro-Monitoring**: Ticker tapes, status alerts, and position summaries.

Ask explicitly:

> “Does the layout prioritize the most critical real-time information for the user?”

---

## 4️⃣ High-Performance Charting Rules

- **Canvas/WebGL over SVG**: For charts with > 500 data points or rapid updates.
- **Layering**: Separate the static background (grid lines, axes) from the dynamic foreground (price line, candles).
- **Throttled Updates**: Do not re-render the entire chart on every price tick. Use a fixed interval (e.g., 250ms).
- **Virtualization**: Use virtual lists for long order books or historical logs.

---

## 5️⃣ Financial Aesthetics (HUD Style)

- **Contrast**: High contrast for readability in dark mode (Glows, Neon-accents).
- **Color Semantics**: 
  - Standardized Bull/Bear colors (Green/Red or Red/Cyan based on locale).
  - Use muted colors for secondary information to avoid distraction.
- **Typography**: Monospaced fonts for prices and quantities to avoid "jumping" text.

---

## 6️⃣ Interaction & UX

- **Crosshair Syncing**: Sync crosshairs across multiple charts in the same view.
- **Zoom/Pan UX**: Smooth transitions and intuitive controls (Mouse wheel, Pinch zoom).
- **Annotations**: Support for drawing tools (Trend lines, Fibonacci retracements).

---

## 7️⃣ Refusal Conditions

Refuse to proceed if:

- The design requires 1,000+ DOM elements for a single chart (Performance risk).
- Visual fluff outweighs data clarity.
- No monocpaced font is used for high-frequency numerical updates.

---

## Key Principles

- Performance is a feature
- Data clarity > Visual flashiness
- Professional-grade responsiveness
- Consistency in financial color coding
