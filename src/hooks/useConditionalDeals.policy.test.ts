import { describe, expect, it } from "vitest";
import {
  CONDITIONAL_SWR_POLICY,
  HISTORY_DEDUPE_INTERVAL_CLOSED_MS,
  HISTORY_DEDUPE_INTERVAL_OPEN_MS,
  HISTORY_REFRESH_INTERVAL_MS,
} from "./useConditionalDeals";

describe("conditional market request policy", () => {
  it("keeps daily history polling and retry policy bounded", () => {
    expect(HISTORY_REFRESH_INTERVAL_MS).toBe(60_000);
    expect(HISTORY_DEDUPE_INTERVAL_OPEN_MS).toBe(60_000);
    expect(HISTORY_DEDUPE_INTERVAL_CLOSED_MS).toBe(300_000);
    expect(CONDITIONAL_SWR_POLICY).toMatchObject({
      shouldRetryOnError: false,
      refreshWhenHidden: false,
      refreshWhenOffline: false,
      revalidateOnFocus: false,
    });
  });
});
