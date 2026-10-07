# 帳號隔離與本機 Agent MVP：實作契約

## Objective / scope

User authorized implementation of account-isolated cloud state and local Codex MCP access. Deliver account isolation, online multi-device sync, legacy import, shared analysis access, and read/write MCP tools. The user explicitly requires MCP writes to execute directly without a confirmation or permission UI. The App must be open and authenticated. Remote MCP and trading are future work. Preserve existing tracking behavior and desktop UX. Do not commit, publish releases, or change Supabase schema/policies.

## Current → expected behavior

Global `settings.json` tracking and global indicator localStorage → Google Apps Script backed, Supabase-authenticated account state containing versioned tracking plus indicator settings. Device stock catalog and display preferences remain shared. React state is a projection. Switching accounts/logout immediately clears personal projection and cancels stale work. Existing global data is offered for explicit single-account import with retained backup; never auto-assigned.

No Agent API → local MCP stdio bridge uses a native loopback API and shares the app's account, MarketManager, technical-analysis, and chip-analysis services. App must be open and have a valid session. Tools read context/watchlists/quotes/history/technical indicators/chip analysis and directly add/remove stocks, create/rename/delete categories, change memberships/order, and update/reset indicator settings. Document Codex MCP setup and verify a real handshake. There is no authorization settings UI in this version by explicit user choice.

## Files / implementation approach

- `src-tauri`: new account/session/cloud repository and agent gateway modules, commands, lib initialization, dependency manifests/lockfile, native tests. The canonical cloud endpoint is `https://script.google.com/macros/s/AKfycbwoj0pC8VR26NGWEU4L8gyXCmuLQqRmzV1n4C89egzLTwpzY6qMQ32xM6fR5Q6DcEl4/exec`. Store it as build/runtime configuration in one source location. Never expose raw database/Tauri access through gateway.
- `src`: typed account API, session integration in UserContext/AuthenticatedRuntime, stock projection and account-scoped indicator state, migration/import UI, sync/loading/conflict/error states, zh-TW/en locales and tests. Preserve existing public tracking methods and invariants.
- `scripts/slstening-agent-bridge.mjs` executable Node stdio bridge (Node >=18 documented). No dependency on screen scraping or frontend having visited a particular stock. Use an absolute path in generated client configuration; desktop package must include bridge as a Tauri resource and expose actual installed resource location (dev resolution also works).
- Update concise relevant wiki architecture/concepts/ADR and add agent setup docs. Original proposal remains proposed; mark completed stages and actual deviations clearly.

## Session/security constraints

- The deployed Apps Script validates each cloud request's Supabase access token against the fixed project and derives `user.id`; no caller-selected identity. Native also establishes its Agent session only from the trusted main webview's active Supabase session and checks token expiry/account changes. No refresh/access token is returned through MCP. Gateway allowlists only declared tools.
- Begin session transition immediately invalidates native old context. Use monotonically increasing frontend transition generation plus native session epoch so late auth validation, read, queued write and response cannot resurrect old account. Same-user token refresh can update expiry without unnecessary reload, but must not defeat transition ordering. On failed verification fail closed and expose retry. On logout clear native session synchronously where possible before cleanup; backend checks expiry even if frontend stops running.
- Repository access is scoped from native context; expected epoch and revision required for frontend reads/writes. Native verifies/normalizes entire typed payload, default category first, membership IDs, pin/recent references, bounds/finite indicator settings and stock objects; cannot silently treat corrupt data as empty. Mutations serialize and validate captured account+epoch at invocation, execution and publish points. Revision conflicts surfaced/reloaded, not overwritten.
- A native private loopback HTTP API (axum or equivalent tested library) is acceptable: bind 127.0.0.1 port 0, validate Host, deny foreign Origin, and require a cryptographically random per-App-run bearer token stored in an owner-only discovery file. No gateway survives App shutdown; logout/switch clears its account session immediately. Global bounds: body <=1 MiB, symbols <=20, bars <=500, query <=30s, bounded concurrency/rate. Recheck session epoch after awaited work and before returning. Logging excludes secrets/full personal payloads.
- No permission UI. The bundled stdio bridge reads the owner-only discovery file. This is acceptable only under the explicit same-OS-user threat model. Document that any process running as that OS user can invoke enabled MCP tools while the App is open and logged in.

## Migration / durability

- Preserve original settings.json and legacy localStorage. Read legacy tracking + indicator keys and migration flags, produce validated normalized snapshot. Explicit import into an empty cloud account only; existing cloud data gets a visible refusal and no overwrite. Because the deployed Apps Script schema currently stores only account rows, record the legacy claim locally in settings with owner user ID and import operation ID after cloud success; never auto-import or delete backup. Other local accounts must not be offered data once claimed. Retry uses the same operation ID.
- clear/factory-reset must operate only current account, not shared settings or other accounts. All Supabase helper results must be epoch-guarded; no undeclared cloud sync.
- indicator hook reads/writes shared account projection instead of global localStorage. Preserve defaults including actual ma20=30 and legacy migration semantics. No unverified indicator tool.
- Retain rollback backup; do not advise downgrade to old global-data version.

## Agent data contract

- Versioned structured output/JSON schema. Account display only non-sensitive identifier. No caller-selected account. Market identity is qualified by TW/US (with explicit mapping supported symbols), validate ambiguity and periods using existing provider capabilities.
- Envelope includes schema_version, snapshot_id, generated_at, configuration_revision, warnings. Quote/history entries include source, observed_at (null when unavailable), fetched_at (actual fetch time, not call time for reused cache), freshness/state, currency, units, timezone, period and unfinished-bar/adjustment uncertainty. Trace refreshed_ts semantics. Never invent exchange volume units or market time; unknown values explicit. Partial failures reported with stable error/retry fields; missing numerics null rather than zero. Snapshot captures one tracking revision but warns about mixed quote timestamps.
- Share native MarketManager caches/gating/cooldown/coalescing; refactor one-shot fetching into shared service if needed. No new permanent subscriptions. get_history supports bounded time range/bars/cursor; no raw dumps. Snapshot bounded to 20 stocks and selected-history option so one call cannot overwhelm provider.
- stdio MCP bridge supports initialize/version negotiation (tested supported version), initialized notification, ping, tools/list and tools/call, cancellation/EOF and request failures. stdout protocol-only, stderr logs sanitized. Unsupported tool/invalid args errors. No generic invoke tunnel. Tool schema/structuredContent conforms to supported MCP spec. Serialize or bound pending calls; recognize closed App as APP_UNAVAILABLE.

## Acceptance / validation

- Existing category/stock membership behavior retained; adapted tests use native account API mocks instead of global persistence assumptions.
- Tests: A edit→B empty→A restored; same-mount switch; logout; delayed A hydration/mutation/token verification cannot contaminate B; native expired/wrong-session/cross-account gateway access; revision conflict; corrupt cloud snapshot; failed write; legacy claim retry/other-account refusal; indicator isolation; UI error/retry/import and both locale labels.
- Native gateway tests with fixture MarketManager/cache and injectable auth verification: real loopback requests, Host/Origin/token/bounds/rate checks and post-await revocation. Bridge subprocess tests initialize/list/call errors and cancellation, deterministic fixture server, resource path/config generation.
- `npm run test:all`, `npm run build`, bridge tests, native fmt/check relevant files. Mock Apps Script/Supabase for automated tests; no live cloud writes. A live authenticated smoke test may be documented for the user. Report exact commands/counts/failures. Do not weaken unrelated tests to make them pass.
- Visually verify settings/import/loading/error states at 375x675, 768px and wide desktop, keyboard focus, reduced motion and both locales with test fixture preview or native App. Preview fixtures must be strictly dev/test and cannot bypass production authorization.
- Independent read-only Sol review of actual diff and results after implementation; require all P0/P1 fixes and P2 dispositions, maximum two normal rounds then orchestrator escalation.

## Risks / rollback

Session races and legacy ownership are correctness/security boundaries; fail closed. Native account DB migration is additive and backups remain untouched. Gateway can be disabled independently without undoing account isolation. Do not remerge accounts or silently downgrade persistence. Full packaging/live two-account/provider verification may require user environment; report unavailable checks explicitly and complete all locally possible checks.

## Reviewer dispositions (Phase 4)

- P1-1/P1-2 session and queue races: fixed. The frontend mutation queue captures account ID, native epoch, and transition generation at enqueue and rejects stale work; native transitions invalidate before replacement, retain a fail-closed projection on failure, and expose a visible retry that establishes a fresh native session. The Rust session readers compare the atomic epoch while holding the session read lock.
- P1-3/P1-4 shared catalog, legacy detection, and empty accounts: fixed. Native hydration loads the shared menu before the account snapshot, indicator hooks use defaults while a native account is unresolved, non-default legacy indicator settings count as importable personal data, and Agent revision `0` with `data: null` is treated as a new empty account that can be mutated with expected revision `0`.
- P1-5 indicator parity: fixed for the complete public Agent indicator surface. Static TypeScript fixtures are generated through the real App `calculateIndicators` implementation and cover multi-point warm-up/seed/rounding values; the Rust gateway asserts the same fixture for MA, EMA, Bollinger, KD, RSI, MFI, OBV, CMF/CMF EMA, MACD, ATR/Supertrend, Donchian, and CCI.
- P1-6/P1-7/P1-8/P1-9/P1-10 market and mutation bounds: fixed. Every polling and Agent path uses the shared TW/US classifier and splits mixed provider batches; quotes and analysis are bounded by one request deadline with partial timeout warnings; category membership mutations prune orphan stocks; each Agent snapshot reads cloud state once; cache entries carry actual wall-clock fetch time and `live`/`cached`/`unknown` freshness plus complete null/unknown metadata.
- P2-1 bridge transport errors: fixed; discovery, fetch, malformed responses, and closed-App failures are normalized to `APP_UNAVAILABLE`.
- P2-2 operation/category IDs: fixed; native Agent and frontend mutation IDs use cryptographically random UUID/bytes rather than wall-clock-only values.
- P2-3 expiry: fixed; native session identity and expiry are checked after awaited cloud work and before gateway responses.
- P2-4 automated verification: fixed for the local boundary. Loopback Host/Origin/token/body/rate checks, bridge initialize/list/call/cancellation/error normalization, provider mapping, epoch/expiry, bounds, queue races, empty-account mutation helpers, category-name trimming, and bars bounds are covered by tests. Packaged desktop handshake with a real logged-in Supabase account, live Apps Script writes, dual-device sync, and 375/768/wide viewport plus keyboard/reduced-motion inspection remain manual because this validation environment has no user session, packaged app, or authorization for live cloud writes.
