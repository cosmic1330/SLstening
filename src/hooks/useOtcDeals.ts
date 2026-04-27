import useYahooMarketIndex from "./useYahooMarketIndex";

export default function useOtcDeals(isVisible: boolean = true) {
  return useYahooMarketIndex(
    "^TWOII",
    "otc",
    isVisible,
  );
}
