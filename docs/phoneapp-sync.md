# PhoneApp cloud sync

The desktop client now uses the PhoneApp-compatible `pull`/`sync` endpoint and
the five-field `WatchlistGroup[]` wire format. The deployable source is
[`scripts/phoneapp-sync.gs`](../scripts/phoneapp-sync.gs).

The repository does not deploy Apps Script automatically. To deploy manually:

1. Open the PhoneApp backup spreadsheet and its Apps Script project.
2. Replace the project source with `scripts/phoneapp-sync.gs`.
3. Set `SPREADSHEET_ID` in the source. Keep `SECURITY_TOKEN` empty while the
   desktop app shares this endpoint because the desktop client does not send
   PhoneApp's optional token.
4. Deploy as a Web app, executing as the owner and allowing anyone with the
   link. Authorize the spreadsheet permission when prompted.
5. Keep the resulting `/exec` URL in sync with `CLOUD_ENDPOINT` in
   `src-tauri/src/account.rs` if Google creates a new deployment URL.

The script keeps the existing `uuid`, `email`, `data` sheet columns and accepts
the existing PhoneApp request shape. `pull` requires only `uuid` (the legacy
PhoneApp caller may omit `email`); `sync` requires both `uuid` and a non-empty
`email`, while an email supplied to `pull` is used only for the existing
cross-check. It validates group and stock fields, limits the payload to 45,000
characters, 100 groups, and 300 unique stocks, and uses a script lock during
last-write-wins updates. A missing row returns an empty `data` array, so the
desktop app does not enter a legacy import flow. An existing row with a blank,
non-string, malformed, or legacy payload returns the stable
`CORRUPT_STORED_DATA` error instead of being treated as an empty account.

The local contract tests in [`scripts/phoneapp-sync.test.mjs`](../scripts/phoneapp-sync.test.mjs)
exercise the pure validation/request behavior and a mocked sheet read. After
deployment, manually verify this matrix against the Web App URL: pull with
uuid only, pull with uuid/email match, pull with mismatch, sync insert/update,
malformed groups/stocks, a payload over 45,000 characters, and concurrent sync
requests. No live deployment or cloud write is performed by repository tests.
