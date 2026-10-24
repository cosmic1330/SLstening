import RefreshIcon from "@mui/icons-material/Refresh";
import { Box, Button, Skeleton, Stack, Typography } from "@mui/material";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import useSWR from "swr";
import { useTranslation } from "react-i18next";
import { getCnnFearAndGreedHistory, type MarketSentimentRow } from "../../../api/marketSentimentApi";
import { normalizeLanguage } from "../../../i18n";
import { primitiveTokens, semanticTokens } from "../../../theme";

const SENTIMENT_KEY = "market-sentiment/cnn-fear-and-greed";

export const CNN_SENTIMENT_THRESHOLDS = [20, 80] as const;
export const CNN_SENTIMENT_Y_TICKS = [0, 20, 50, 80, 100];
export const CNN_SENTIMENT_Y_AXIS_INTERVAL = 0;

export const sentimentFillMotionSx = {
  transition: "width 200ms ease",
  "@media (prefers-reduced-motion: reduce)": {
    transition: "none",
  },
} as const;

export type CnnSentimentRating = "extremeFear" | "fear" | "neutral" | "greed" | "extremeGreed" | "unknown";

export interface CnnTrendPoint {
  timestamp: number;
  dateLabel: string;
  score: number;
}

export function clampSentimentScore(value: unknown): number | null {
  const score = typeof value === "number" || typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isFinite(score)) return null;
  return Math.min(100, Math.max(0, score));
}

export function classifySentimentScore(value: unknown): CnnSentimentRating {
  const score = clampSentimentScore(value);
  if (score === null) return "unknown";
  if (score <= 20) return "extremeFear";
  if (score <= 40) return "fear";
  if (score <= 60) return "neutral";
  if (score <= 80) return "greed";
  return "extremeGreed";
}

function parseObservationDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = dateOnly ? new Date(`${value}T00:00:00Z`) : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (dateOnly && (
    date.getUTCFullYear() !== Number(dateOnly[1])
    || date.getUTCMonth() + 1 !== Number(dateOnly[2])
    || date.getUTCDate() !== Number(dateOnly[3])
  )) return null;
  return date;
}

function observationDate(row: MarketSentimentRow): Date | null {
  return parseObservationDate(row.data_date) ?? parseObservationDate(row.observed_at);
}

function formatObservationDate(value: string | null | undefined, language: string): string | null {
  const date = parseObservationDate(value);
  if (!date) return null;
  return new Intl.DateTimeFormat(language, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(date);
}

function formatDateValue(date: Date, language: string): string {
  return new Intl.DateTimeFormat(language, { month: "short", day: "numeric", timeZone: "UTC" }).format(date);
}

function sortRowsNewestFirst(rows: MarketSentimentRow[]): MarketSentimentRow[] {
  return [...rows].sort((left, right) => (observationDate(right)?.getTime() ?? Number.NEGATIVE_INFINITY) - (observationDate(left)?.getTime() ?? Number.NEGATIVE_INFINITY));
}

export function buildCnnTrendData(rows: MarketSentimentRow[], language: string): CnnTrendPoint[] {
  return rows
    .flatMap((row) => {
      const score = clampSentimentScore(row.score);
      const date = observationDate(row);
      if (score === null || !date) return [];
      return [{ timestamp: date.getTime(), dateLabel: formatDateValue(date, language), score }];
    })
    .sort((left, right) => left.timestamp - right.timestamp);
}

function scoreColor(rating: CnnSentimentRating): string {
  switch (rating) {
    case "extremeFear": return "#FF8A80";
    case "fear": return "#FFB74D";
    case "greed": return "#81C784";
    case "extremeGreed": return "#69F0AE";
    default: return semanticTokens.analysis.focus;
  }
}

function CardShell({ children, ariaLabel }: { children: React.ReactNode; ariaLabel?: string }) {
  return (
    <Box
      component="section"
      aria-label={ariaLabel}
      sx={{
        width: "100%",
        minHeight: 148,
        boxSizing: "border-box",
        p: 1.5,
        borderRadius: `${primitiveTokens.radius.md}px`,
        border: `1px solid ${semanticTokens.analysis.borderSubtle}`,
        background: semanticTokens.analysis.surfaceGlass,
        backdropFilter: "blur(14px)",
      }}
    >
      {children}
    </Box>
  );
}

function CardHeading({ title, source }: { title: string; source: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={1}>
      <Typography component="h2" variant="caption" fontWeight={900} sx={{ color: semanticTokens.analysis.text }}>
        {title}
      </Typography>
      <Typography variant="caption" sx={{ color: semanticTokens.analysis.textMuted, fontSize: 10 }}>
        {source}
      </Typography>
    </Stack>
  );
}

function LoadingCard({ title, source, loadingText }: { title: string; source: string; loadingText: string }) {
  return (
    <CardShell ariaLabel={title}>
      <CardHeading title={title} source={source} />
      <Stack role="status" aria-live="polite" spacing={1} sx={{ mt: 1.5 }}>
        <Skeleton variant="rounded" width="38%" height={30} sx={{ bgcolor: "rgba(255,255,255,0.12)" }} />
        <Typography variant="caption" sx={{ color: semanticTokens.analysis.textMuted }}>{loadingText}</Typography>
      </Stack>
    </CardShell>
  );
}

export default function CnnFearGreedBox() {
  const { t, i18n } = useTranslation();
  const { data, error, isLoading, mutate } = useSWR<MarketSentimentRow[]>(SENTIMENT_KEY, getCnnFearAndGreedHistory, {
    refreshInterval: 15 * 60 * 1000,
    dedupingInterval: 60 * 1000,
    revalidateOnFocus: false,
  });
  const title = t("home.cnnSentiment.title");
  const source = t("home.cnnSentiment.source");

  if (isLoading && data === undefined) {
    return <LoadingCard title={title} source={source} loadingText={t("home.cnnSentiment.loading")} />;
  }

  if (error && data === undefined) {
    return (
      <CardShell ariaLabel={title}>
        <CardHeading title={title} source={source} />
        <Stack role="alert" spacing={1} sx={{ mt: 1.5 }}>
          <Typography variant="caption" sx={{ color: semanticTokens.analysis.textMuted }}>{t("home.cnnSentiment.error")}</Typography>
          <Button
            type="button"
            size="small"
            startIcon={<RefreshIcon aria-hidden="true" />}
            onClick={() => void mutate()}
            sx={{ alignSelf: "flex-start", color: semanticTokens.analysis.focus, minHeight: 36, "&:focus-visible": { outline: `3px solid ${semanticTokens.analysis.focus}`, outlineOffset: 2 } }}
          >
            {t("home.cnnSentiment.retry")}
          </Button>
        </Stack>
      </CardShell>
    );
  }

  if (!data || data.length === 0) {
    return (
      <CardShell ariaLabel={title}>
        <CardHeading title={title} source={source} />
        <Typography role="status" variant="caption" sx={{ display: "block", mt: 2, color: semanticTokens.analysis.textMuted }}>
          {t("home.cnnSentiment.empty")}
        </Typography>
      </CardShell>
    );
  }

  const locale = normalizeLanguage(i18n.resolvedLanguage);
  const orderedRows = sortRowsNewestFirst(data);
  const latestRow = orderedRows[0] ?? null;
  const score = clampSentimentScore(latestRow?.score);
  const rating = classifySentimentScore(score);
  const ratingText = t(`home.cnnSentiment.ratings.${rating}`);
  const observedDate = latestRow
    ? formatObservationDate(latestRow.data_date, locale) ?? formatObservationDate(latestRow.observed_at, locale)
    : null;
  const scoreText = score === null ? "—" : score.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1, useGrouping: false });
  const accent = scoreColor(rating);
  const trendData = buildCnnTrendData(data, locale);
  const trendStart = trendData[0] ?? null;
  const trendEnd = trendData[trendData.length - 1] ?? null;

  return (
    <CardShell ariaLabel={title}>
      <CardHeading title={title} source={source} />
      <Box
        data-testid="cnn-sentiment-columns"
        sx={{
          display: "grid",
          gridTemplateColumns: "minmax(112px, 0.38fr) minmax(0, 0.62fr)",
          gap: 1.25,
          mt: 1.2,
          minWidth: 0,
          alignItems: "start",
        }}
      >
        <Box data-testid="cnn-sentiment-current" sx={{ minWidth: 0 }}>
          <Stack spacing={0.75} alignItems="flex-start">
            <Typography sx={{ color: accent, fontFamily: primitiveTokens.font.numeric, fontSize: 30, fontWeight: 900, lineHeight: 1, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
              {scoreText}
              <Typography component="span" sx={{ color: semanticTokens.analysis.textMuted, fontFamily: primitiveTokens.font.ui, fontSize: 11, fontWeight: 700, ml: 0.5 }}>
                / 100
              </Typography>
            </Typography>
            <Typography sx={{ color: accent, fontWeight: 900, fontSize: 13, overflowWrap: "anywhere" }}>
              {ratingText}
            </Typography>
          </Stack>
          <Box
            role="progressbar"
            aria-label={t("home.cnnSentiment.scaleLabel")}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={score ?? undefined}
            sx={{ height: 6, mt: 1.25, borderRadius: 999, overflow: "hidden", backgroundColor: semanticTokens.analysis.inset, width: "100%" }}
          >
            {score !== null ? <Box sx={{ width: `${score}%`, height: "100%", borderRadius: 999, backgroundColor: accent, ...sentimentFillMotionSx }} /> : null}
          </Box>
          <Stack spacing={0.25} sx={{ mt: 0.75 }}>
            <Typography variant="caption" sx={{ color: semanticTokens.analysis.textMuted, fontSize: 10, overflowWrap: "anywhere" }}>{t("home.cnnSentiment.scaleMin")}</Typography>
            <Typography variant="caption" sx={{ color: semanticTokens.analysis.textMuted, fontSize: 10, overflowWrap: "anywhere" }}>{t("home.cnnSentiment.scaleMax")}</Typography>
          </Stack>
          <Typography variant="caption" sx={{ display: "block", mt: 0.8, color: semanticTokens.analysis.textMuted, fontSize: 10, overflowWrap: "anywhere" }}>
            {observedDate ? t("home.cnnSentiment.asOf", { date: observedDate }) : t("home.cnnSentiment.dateUnavailable")}
          </Typography>
        </Box>
        <Box data-testid="cnn-sentiment-trend" component="section" aria-labelledby="cnn-sentiment-trend-title" sx={{ minWidth: 0 }}>
          <Typography id="cnn-sentiment-trend-title" variant="caption" fontWeight={800} sx={{ color: semanticTokens.analysis.text }}>
            {t("home.cnnSentiment.trendTitle")}
          </Typography>
        {trendData.length >= 2 && trendStart && trendEnd ? (
          <>
            <Box
              role="img"
              aria-label={t("home.cnnSentiment.trendAria", {
                count: trendData.length,
                start: trendStart.dateLabel,
                end: trendEnd.dateLabel,
              })}
              sx={{ width: "100%", height: 88, mt: 0.5 }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 4, right: 2, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke={semanticTokens.analysis.dividerSubtle} strokeDasharray="2 3" vertical={false} />
                  {CNN_SENTIMENT_THRESHOLDS.map((threshold) => (
                    <ReferenceLine
                      key={threshold}
                      y={threshold}
                      stroke={semanticTokens.analysis.textMuted}
                      strokeDasharray="4 4"
                      strokeOpacity={0.5}
                    />
                  ))}
                  <XAxis
                    dataKey="dateLabel"
                    ticks={[trendStart.dateLabel, trendEnd.dateLabel]}
                    tick={{ fill: semanticTokens.analysis.textMuted, fontSize: 9 }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={8}
                  />
                  <YAxis
                    domain={[0, 100]}
                    ticks={CNN_SENTIMENT_Y_TICKS}
                    interval={CNN_SENTIMENT_Y_AXIS_INTERVAL}
                    tick={{ fill: semanticTokens.analysis.textMuted, fontSize: 9 }}
                    tickLine={false}
                    axisLine={false}
                    width={24}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke={accent}
                    strokeWidth={2}
                    dot={{ r: 2, fill: accent, strokeWidth: 0 }}
                    activeDot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
            <Typography role="status" variant="caption" sx={{ display: "block", color: semanticTokens.analysis.textMuted, fontSize: 10, lineHeight: 1.35 }}>
              {t("home.cnnSentiment.trendSummary", {
                count: trendData.length,
                start: trendStart.dateLabel,
                startScore: trendStart.score.toFixed(1),
                end: trendEnd.dateLabel,
                endScore: trendEnd.score.toFixed(1),
              })}
            </Typography>
          </>
        ) : (
          <Typography role="status" variant="caption" sx={{ display: "block", mt: 0.75, color: semanticTokens.analysis.textMuted, fontSize: 10 }}>
            {trendData.length === 1 ? t("home.cnnSentiment.trendInsufficient") : t("home.cnnSentiment.trendUnavailable")}
          </Typography>
        )}
      </Box>
      </Box>
      {error ? (
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ mt: 0.5 }}>
          <Typography role="status" variant="caption" sx={{ color: semanticTokens.analysis.textMuted, fontSize: 10 }}>
            {t("home.cnnSentiment.refreshingError")}
          </Typography>
          <Button
            type="button"
            size="small"
            onClick={() => void mutate()}
            sx={{ minWidth: 0, minHeight: 28, px: 0.75, color: semanticTokens.analysis.focus, fontSize: 10, "&:focus-visible": { outline: `3px solid ${semanticTokens.analysis.focus}`, outlineOffset: 2 } }}
          >
            {t("home.cnnSentiment.retry")}
          </Button>
        </Stack>
      ) : null}
    </CardShell>
  );
}
