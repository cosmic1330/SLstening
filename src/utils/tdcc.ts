import { normalizeLanguage } from "../i18n";
import type { TdccHolderTableType } from "../types";

export type TdccHolderCount = number | null | undefined;

export type TdccHolderDirection =
  | "increase"
  | "decrease"
  | "unchanged"
  | "unavailable";

export type TdccHolderChange = {
  delta: number | null;
  direction: TdccHolderDirection;
};

type TdccCurrentField =
  | "holders_100"
  | "holders_400"
  | "holders_1000";

type TdccPreviousField =
  | "previous_holders_100"
  | "previous_holders_400"
  | "previous_holders_1000";

export type TdccBandDescriptor = {
  id: "under100" | "over400" | "over1000";
  currentKey: TdccCurrentField;
  previousKey: TdccPreviousField;
  chipLabelKey: string;
  tooltipLabelKey: string;
};

export const TDCC_HOLDER_BANDS = [
  {
    id: "under100",
    currentKey: "holders_100",
    previousKey: "previous_holders_100",
    chipLabelKey: "Pages.Detail.Chip.holders.under100",
    tooltipLabelKey: "Pages.Detail.tooltip.tdcc.holders100",
  },
  {
    id: "over400",
    currentKey: "holders_400",
    previousKey: "previous_holders_400",
    chipLabelKey: "Pages.Detail.Chip.holders.over400",
    tooltipLabelKey: "Pages.Detail.tooltip.tdcc.holders400",
  },
  {
    id: "over1000",
    currentKey: "holders_1000",
    previousKey: "previous_holders_1000",
    chipLabelKey: "Pages.Detail.Chip.holders.over1000",
    tooltipLabelKey: "Pages.Detail.tooltip.tdcc.holders1000",
  },
] as const satisfies readonly TdccBandDescriptor[];

export const getTdccStockId = (
  symbol: string | number | null | undefined,
): number | null => {
  if (typeof symbol === "number") {
    return Number.isSafeInteger(symbol) && symbol >= 0 ? symbol : null;
  }

  const match = symbol?.match(/^(\d+)(?:\.TW)?$/i);
  if (!match) return null;

  const stockId = Number(match[1]);
  return Number.isSafeInteger(stockId) && stockId >= 0 ? stockId : null;
};

export const isValidTdccCount = (
  value: TdccHolderCount,
): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

export const getTdccHolderChange = (
  current: TdccHolderCount,
  previous: TdccHolderCount,
): TdccHolderChange => {
  if (!isValidTdccCount(current) || !isValidTdccCount(previous)) {
    return { delta: null, direction: "unavailable" };
  }

  const delta = current - previous;
  if (delta > 0) return { delta, direction: "increase" };
  if (delta < 0) return { delta, direction: "decrease" };
  return { delta: 0, direction: "unchanged" };
};

export const formatTdccDate = (
  value: string | null | undefined,
  locale: string | undefined,
  fallback: string,
): string => {
  if (!value) return fallback;

  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  const input = dateOnly
    ? `${value}T00:00:00+08:00`
    : hasTimezone
      ? value
      : `${value}+08:00`;
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return fallback;

  try {
    return new Intl.DateTimeFormat(normalizeLanguage(locale), {
      timeZone: "Asia/Taipei",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return fallback;
  }
};

export type TdccHolderBandValue = Pick<
  TdccHolderTableType,
  TdccCurrentField | TdccPreviousField
>;
