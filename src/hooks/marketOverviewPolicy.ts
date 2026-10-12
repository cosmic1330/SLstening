/** Daily market-overview bars are stable enough to refresh at most every 15m. */
export const MARKET_OVERVIEW_HISTORY_REFRESH_INTERVAL_MS = 15 * 60_000;

/** Overview requests must stop after a provider/API error until an explicit retry. */
export const MARKET_OVERVIEW_SWR_POLICY = {
  revalidateOnFocus: false,
  refreshWhenHidden: false,
  refreshWhenOffline: false,
  shouldRetryOnError: false,
} as const;
