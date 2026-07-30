# SLstening UI reference

Use this file as project-specific evidence. Reinspect the repository when implementation has changed; source code wins over stale notes.

## Product and runtime

- Product: real-time Taiwan/US stock monitoring and technical analysis desktop application.
- Primary users: investors monitoring dense, time-sensitive price, volume, indicator, and strategy data.
- Shell: Tauri 2. The configured initial window is 375x675 with transparency enabled.
- Frontend: React 18, TypeScript, Vite, MUI 7 with Emotion, Zustand, React Router, SWR, Framer Motion, Recharts, react-window, and i18next.
- Languages: Traditional Chinese and English.
- Important surfaces: login/register, stock list and cards, categories, settings, add-stock flow, and fullscreen technical-analysis detail carousel.

## Existing visual language

- The analysis surface is dark, atmospheric, and glass-like, using near-black backgrounds, translucent panels, blur, fine light borders, and restrained gradients.
- Login and registration use a separate light, illustrated visual language with forest green and brick-red accents. Do not force the dark trading palette onto authentication without an explicit redesign request.
- Stock cards use dense data, dark translucent surfaces, approximately 16px radius, high-contrast text, and small metric tags.
- Typography currently mixes Outfit/Inter-style UI text with monospace for numeric or technical values. Preserve tabular alignment for rapidly changing numbers.
- Existing styles contain many local raw colors and page-local themes. Prefer semantic consolidation when touching a cluster, but avoid unrelated sweeping rewrites.

## Financial semantics

- In Taiwan market contexts, use red for gains and green for losses. For US-specific surfaces, follow the convention already established by that surface and label it clearly.
- Never encode direction, anomaly, or signal strength using color alone. Add `+`/`-`, arrows, labels, fill versus outline, dash patterns, or distinct markers.
- Keep neutral, stale, unavailable, and market-closed states visually distinct from gain/loss.
- State units and period explicitly: price currency, percentage, shares/lots, timestamp/timezone, and interval.

## Recommended working tokens

Treat these as roles, not a command to rewrite existing screens:

| Role | Starting value | Use |
| --- | --- | --- |
| Canvas | `#0F1214` | Detail and analysis background |
| Elevated surface | `rgba(30, 30, 40, 0.88)` | Menus, cards, overlays |
| Subtle surface | `rgba(255, 255, 255, 0.06)` | Tags and selected regions |
| Border | `rgba(255, 255, 255, 0.12)` | Separation on dark surfaces |
| Primary text | `#FFFFFF` | Important labels and values |
| Secondary text | `rgba(255, 255, 255, 0.76)` | Supporting information |
| Focus | `#90CAF9` | Visible keyboard focus |
| Gain (TW) | `#FF5252` | Rising values with non-color cue |
| Loss (TW) | `#69F0AE` | Falling values with non-color cue |
| Neutral | `#94A3B8` | Unchanged or secondary market data |

Check contrast in the actual composited surface; translucent backgrounds make isolated hex comparisons misleading.

## Layout and interaction

- Design at 375x675 first because it is the configured starting window, then verify 768px and wide desktop.
- Prioritize current value, direction, data freshness, and the user's next action. Secondary indicators may collapse or scroll, but critical state must remain visible.
- Prevent horizontal page scroll. Allow intentional chart pan/zoom only inside a clearly bounded chart region.
- Keep bottom navigation and floating glass controls clear of content and native window edges.
- Preserve keyboard operation for the detail carousel and add visible focus to its controls. Avoid global shortcuts while dialogs or text inputs own focus.
- Use 150-300ms feedback for controls. Long carousel locks or decorative transitions must not delay trading tasks.

## Chart quality floor

- Show a readable current-value summary outside hover-only tooltips.
- Keep no more detail visible than the viewport can support; aggregate or window historical data before making labels smaller than 12px.
- For candlesticks, distinguish rise/fall beyond hue and expose OHLC values textually.
- Provide loading, empty, delayed/stale, error, and market-closed states.
- If streaming updates are animated, offer pause/freeze behavior where practical and honor reduced motion.

## Verification commands

Run commands from the repository root:

```sh
npm run test:frontend
npm run build
```

Use `npm run test:all` when frontend work changes Tauri commands, shared contracts, persistence, or backend-visible behavior.
