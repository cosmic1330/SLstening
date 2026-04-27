import useYahooMarketIndex from "./useYahooMarketIndex";

export default function useTwseDeals(isVisible: boolean = true) {
  return useYahooMarketIndex(
    "^TWII",
    "twse",
    isVisible,
  );
}
