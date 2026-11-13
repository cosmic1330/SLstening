/** Refresh visible futures/index cards every 30 seconds while their markets are open. */
export const MARKET_OVERVIEW_HISTORY_REFRESH_INTERVAL_MS = 30_000;

/** Recover from transient provider failures; the backend cooldown gates blocked providers. */
export const MARKET_OVERVIEW_SWR_POLICY = {
  revalidateOnFocus: false,
  refreshWhenHidden: false,
  refreshWhenOffline: false,
  shouldRetryOnError: true,
  errorRetryInterval: 30_000,
} as const;
