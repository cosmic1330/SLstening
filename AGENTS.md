# SLstening agent guidance

## Product

SLstening is a Tauri 2 desktop application for real-time Taiwan/US stock monitoring and technical analysis. The frontend uses React 18, TypeScript, Vite, MUI/Emotion, Zustand, Framer Motion, Recharts, react-window, SWR, React Router, and i18next. The Tauri backend is Rust.

## Frontend conventions

- Preserve the compact 375x675 initial window experience; also verify 768px and a wide desktop viewport.
- Follow the visual language of the affected surface. Analysis pages are dark and glass-like; authentication pages intentionally use a separate light illustrated theme.
- Use MUI and Emotion patterns already present. Prefer semantic theme tokens for new work without expanding a scoped change into a full redesign.
- Preserve Taiwan market semantics: red means rising and green means falling. Pair color with text, sign, shape, or icon so meaning never depends on hue alone.
- Keep numeric market data legible and stable. Use tabular or monospace figures where columns or live values would otherwise jump.
- Add user-visible copy to both `src/locales/zh-tw.json` and `src/locales/en.json`.
- Give icon-only controls accessible names. Maintain keyboard focus visibility and honor `prefers-reduced-motion`.
- Protect live-data performance: keep Zustand selectors narrow, preserve stable list keys, virtualize long lists, and measure before adding memoization.
- For charts, label units, interval, freshness, and states; provide visible values outside hover-only tooltips and non-color cues for trends/signals.

## Verification

- Run `npm run test:frontend` for frontend behavior changes.
- Run `npm run build` for material frontend or TypeScript changes.
- Run `npm run test:all` when a change affects Tauri commands, persistence, shared contracts, or backend-visible behavior.
- Visually inspect affected routes at 375x675, 768px wide, and a representative wide desktop size. Check populated, loading, empty, and error states when applicable.
- Verify keyboard-only operation, visible focus, reduced motion, and both supported locales for changed copy.

When the personal `slstening-frontend-design` and `ui-ux-pro-max` Skills are available, use the former for project-specific workflow and the latter for general UI/UX or chart research. Repository code and this file override generic recommendations.
