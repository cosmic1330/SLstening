import { alpha } from "@mui/material";
import { useReducedMotion } from "framer-motion";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import useConditionalDeals from "../../hooks/useConditionalDeals";
import useDetailWebviewWindow from "../../hooks/useDetailWebviewWindow";
import useMaDeduction from "../../hooks/useMaDeduction";
import useMarketSubscriber from "../../hooks/useMarketSubscriber";
import useStocksStore from "../../store/Stock.store";
import useUIStore from "../../store/UI.store";
import { StockStoreType } from "../../types";
import estimateVolume from "../../utils/estimateVolume";
import StockActionsMenu from "./StockActionsMenu";
import StockCard from "./StockCard";
import StockCardHeader from "./StockCardHeader";
import StockChartPanel from "./StockChartPanel";
import { stockBoxTokens } from "./constants";
import StockMetricsGrid from "./StockMetricsGrid";

export { STOCK_BOX_HEIGHT } from "./constants";

export interface StockBoxProps {
  stock: StockStoreType;
  canDelete?: boolean;
  canAdd?: boolean;
  enabled?: boolean;
  onRemove?: () => void;
  isVisible?: boolean;
}

export default function StockBox({ stock, enabled = true, canDelete = true, onRemove, isVisible }: StockBoxProps) {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const chartType = useUIStore((state) => state.stockBoxChartType);
  const isComponentVisible = isVisible ?? true;
  const fetchTick = chartType === "tick";
  const fetchHistory = chartType === "mak";

  useMarketSubscriber(stock.id, enabled && fetchTick, isComponentVisible);
  const { deals, name, tickDeals: storedTickDeals, tickState, historyState, retryTick, retryHistory } = useConditionalDeals(
    stock.id,
    enabled,
    isComponentVisible,
    { fetchTick, fetchHistory },
  );
  const tickDeals = fetchTick ? storedTickDeals || null : null;
  const activeState = chartType === "tick" ? tickState : historyState;
  const retry = chartType === "tick" ? retryTick : retryHistory;
  const maData = useMaDeduction(deals);
  const { openDetailWindow } = useDetailWebviewWindow({ id: stock.id, name: name || stock.name, group: stock.group });
  const removeStock = useStocksStore((state) => state.remove);

  const priceInfo = useMemo(() => {
    const lastPrice = tickDeals?.price ?? (deals.length > 0 ? deals[deals.length - 1].c : null);
    const percent = tickDeals?.changePercent ?? (deals.length >= 2
      ? Math.round(((lastPrice! - deals[deals.length - 2].c) / deals[deals.length - 2].c) * 10000) / 100
      : null);
    const isUp = (percent ?? 0) > 0;
    const isDown = (percent ?? 0) < 0;
    return { lastPrice, percent, isUp, isDown, mainColor: isUp ? stockBoxTokens.up : isDown ? stockBoxTokens.down : stockBoxTokens.neutral };
  }, [deals, tickDeals]);

  const volumeInfo = useMemo(() => {
    if (deals.length < 11) return { avgDaysVolume: 0, estimatedVolume: 0 };
    const pastDeals = deals.slice(-11, -1);
    const avgDaysVolume = Math.round((pastDeals.reduce((total, deal) => total + deal.v, 0) / pastDeals.length) * 100) / 100;
    const { estimatedVolume } = estimateVolume({
      currentVolume: deals[deals.length - 1].v,
      currentTime: new Date(),
      previousDayVolume: deals[deals.length - 2]?.v,
      avg5DaysVolume: avgDaysVolume,
    });
    return { avgDaysVolume, estimatedVolume };
  }, [deals]);

  const displayName = name || stock.name;
  const isReady = activeState.phase === "ready";
  const cardGlow = useMemo(
    () => `radial-gradient(circle at 100% 0%, ${alpha(priceInfo.mainColor, 0.1)} 0%, transparent 50%)`,
    [priceInfo.mainColor],
  );

  return (
    <StockCard
      ariaLabel={t("a11y.openStock", { name: displayName, id: stock.id })}
      cardGlow={cardGlow}
      isReady={isReady}
      onOpen={openDetailWindow}
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      whileHover={reduceMotion ? undefined : { y: -4 }}
      footer={<StockChartPanel chartType={chartType} deals={deals} tickDeals={tickDeals} state={activeState} retry={retry} />}
    >
      <StockCardHeader
        id={stock.id}
        type={stock.type}
        name={displayName}
        lastPrice={priceInfo.lastPrice}
        percent={priceInfo.percent}
        priceColor={priceInfo.mainColor}
        priceUnit={t("stock.priceUnit")}
        actions={<StockActionsMenu stock={stock} name={displayName} canDelete={canDelete} onRemove={onRemove} onDelete={() => removeStock(stock.id)} />}
      />
      <StockMetricsGrid chartType={chartType} deals={deals} tickDeals={tickDeals} lastPrice={priceInfo.lastPrice ?? 0} maData={maData} volumeInfo={volumeInfo} />
    </StockCard>
  );
}
