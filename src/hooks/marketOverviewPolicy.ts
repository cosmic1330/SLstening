/** Refresh visible futures/index cards every 30 seconds while their markets are open. */
export const MARKET_OVERVIEW_HISTORY_REFRESH_INTERVAL_MS = 30_000;

/** Overview requests must stop after a provider/API error until an explicit retry. */
export const MARKET_OVERVIEW_SWR_POLICY = {
  revalidateOnFocus: false,
  refreshWhenHidden: false,
  refreshWhenOffline: false,
  shouldRetryOnError: false,
} as const;
