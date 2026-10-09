const TAIPEI_TIME_ZONE = "Asia/Taipei";

const taipeiDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TAIPEI_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export interface TaipeiDateTimeParts {
  year: number;
  month: number;
  day: number;
  weekday: string;
  hour: number;
  minute: number;
}

/**
 * Extract a Taiwan wall-clock date and time without consulting the host time zone.
 */
export function getTaipeiDateTimeParts(
  value: Date | number | string,
): TaipeiDateTimeParts | null {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const values = Object.fromEntries(
    taipeiDateTimeFormatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    weekday: values.weekday,
    hour: Number(values.hour),
    minute: Number(values.minute),
  };
}

export function compareTaipeiCalendarDate(
  left: TaipeiDateTimeParts,
  right: TaipeiDateTimeParts,
) {
  const leftDate = left.year * 10_000 + left.month * 100 + left.day;
  const rightDate = right.year * 10_000 + right.month * 100 + right.day;
  return leftDate - rightDate;
}

export const taipeiMinutesSinceMidnight = (parts: TaipeiDateTimeParts) =>
  parts.hour * 60 + parts.minute;

