---
name: slstening-frontend-design
description: Design, implement, or review the SLstening stock-monitoring interface in its React, TypeScript, MUI, Framer Motion, Recharts, and Tauri codebase. Use for SLstening pages, components, charts, navigation, design-system changes, responsive behavior, accessibility, motion, visual QA, or UI refactors. Preserve the app's financial semantics, Traditional Chinese and English localization, compact 375x675 desktop-window target, and real-time rendering performance.
---

# SLstening Frontend Design

Build a compact trading workstation whose hierarchy remains clear while prices and charts update. Treat visual polish, financial correctness, accessibility, and rendering performance as one design problem.

## Establish context

1. Find the repository root from `package.json` and `src-tauri/tauri.conf.json`.
2. Read `references/slstening-ui.md` before choosing colors, typography, layout, chart encodings, or motion.
3. Inspect the affected page, its closest reusable components, current MUI theme, Zustand selectors, and both locale files. Preserve existing architectural patterns unless the task explicitly requests a migration.
4. If `$ui-ux-pro-max` is available, use it for broad UI/UX, React, accessibility, and chart recommendations. Reconcile its output with the project reference; SLstening's documented domain conventions win.

## Make a brief design decision

Before coding a new page or substantial redesign, write a compact internal plan containing:

- the user's job and the information that must be visible first;
- density and responsive behavior at 375x675, 768px, and a wide desktop window;
- a small token set for surfaces, text, borders, focus, gain, loss, warning, and neutral states;
- one restrained signature element grounded in market monitoring or technical analysis;
- chart fallbacks and keyboard behavior.

Reject decorative choices that compete with live values. Do not introduce a new visual style merely because it appears in a recommendation database.

## Implement with repository-native patterns

- Use React 18, TypeScript, MUI `styled`/`sx`, Framer Motion, Recharts, Zustand, and i18next already present in the repository.
- Prefer theme or shared semantic tokens over repeating raw hex values. Do not perform a large token migration for a small scoped change.
- Keep components focused. Separate data transforms from presentation when a chart or indicator becomes difficult to test.
- Preserve stable keys, virtualize long stock lists, and avoid subscriptions or selectors that rerender unrelated cards.
- Add all user-visible strings to `src/locales/zh-tw.json` and `src/locales/en.json`; do not ship untranslated inline copy.
- Preserve Taiwan market convention: rising values are red and falling values are green unless the surrounding feature explicitly documents another market convention. Always pair color with a sign, label, icon shape, fill pattern, or position.
- Use MUI icons rather than emoji for interface controls. Give icon-only controls an accessible name and tooltip when the action is not obvious.
- Keep primary targets at least 44x44 CSS pixels where space allows; never make a critical action hover-only.
- Respect `prefers-reduced-motion`. Animate opacity and transforms, not layout dimensions, and keep live-market motion subtle.

## Design charts as instruments

- Keep axes, units, period, timezone, data freshness, legend, tooltip, and empty/loading/error states unambiguous.
- Do not rely on color alone for bullish/bearish, forecast/actual, signal strength, or anomalies.
- For candlesticks, provide a visible numeric summary and a table or equivalent accessible route to OHLC values when scope permits.
- Limit visible density before shrinking labels into illegibility. Downsample, aggregate, window, or let users change the period.
- Pause or simplify rapid animation under reduced motion. Ensure real-time changes do not continuously steal screen-reader focus.

## Verify before delivery

1. Run the narrowest relevant tests, then `npm run build` for material frontend changes.
2. Exercise the exact route and state changed: loading, empty, error, populated, keyboard, and both locales when applicable.
3. Capture screenshots at 375x675, 768px wide, and a representative wide desktop size. If the Tauri shell is impractical, verify the Vite route in a browser and state that limitation.
4. Inspect screenshots for clipping, horizontal scroll, occluded chart labels, low contrast, inconsistent spacing, focus visibility, and overlays near native window edges.
5. Recheck with reduced motion and at least one keyboard-only path. Iterate after visual inspection rather than treating the first render as final.

Report what was verified and any state that could not be exercised.
