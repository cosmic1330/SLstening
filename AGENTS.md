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

## Sol -> Terra -> Sol workflow

Apply this workflow to material changes to source code, configuration, tests,
database behavior, APIs, persistence, or deployment behavior. Skip it for
read-only questions, diagnostics that do not request a fix, and trivial copy or
comment edits.

### Phase 1 - Sol planning

The main thread acts as the orchestrator using Sol with high reasoning.

Before delegating implementation:

1. Read the applicable repository instructions and inspect the affected code.
2. Identify dependencies, ambiguities, compatibility constraints, and risks.
3. Create an implementation contract containing:
   - Objective
   - Current and expected behavior
   - Acceptance criteria
   - In-scope files or components
   - Explicit non-goals
   - Technical, API, persistence, and compatibility constraints
   - Implementation steps
   - Required tests and validation commands
   - Risks and rollback considerations

Do not delegate until the contract is precise enough to execute without
guessing.

### Phase 2 - Terra implementation

Delegate the complete implementation contract to `terra_implementer`. Use a
single implementation agent unless the contract contains independent,
non-overlapping workstreams. Wait for implementation and validation to finish.

### Phase 3 - Sol review

Delegate an independent review to `sol_reviewer`. Give it the original request,
implementation contract, actual diff, surrounding execution paths, and test
results. The reviewer remains read-only.

### Phase 4 - Correction loop

When the verdict is `CHANGES_REQUIRED`:

1. Return verified actionable findings to the same `terra_implementer`.
2. Require correction of all P0 and P1 findings.
3. Require an explicit disposition for every P2 finding.
4. Re-run affected validation.
5. Ask `sol_reviewer` to inspect the updated final diff.

Allow at most two normal correction rounds. Escalate implementation to the main
Sol thread when a P0 or P1 remains, the plan contains a wrong architectural
assumption, a major redesign is required, or security, authentication,
persistence migration, or irreversible data behavior remains uncertain.

### Phase 5 - Final response

Report the outcome, changed files, validation executed and results, reviewer
verdict, remaining risks, and any manual verification still required. Never
claim success for validation that was not executed.
