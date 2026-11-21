import RefreshIcon from "@mui/icons-material/Refresh";
import { Box, Button, Skeleton, Stack, Typography } from "@mui/material";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTranslation } from "react-i18next";
import useSWR from "swr";
import {
  getUsdTwdExchangeRateHistory,
  type StockMarketImpact,
  type TwdTrend,
} from "../../../api/marketSentimentApi";
import { normalizeLanguage } from "../../../i18n";
import { primitiveTokens, semanticTokens } from "../../../theme";

export const EXCHANGE_RATE_REFRESH_INTERVAL_MS = 60 * 60 * 1000;

const impactColor = (impact: StockMarketImpact) => impact === "bullish"
  ? semanticTokens.market.gain
  : impact === "bearish"
    ? semanticTokens.market.loss
    : semanticTokens.analysis.textMuted;

export default function TwdExchangeRateBox() {
  const { t, i18n } = useTranslation();
  const { data, error, isLoading, mutate } = useSWR("market-sentiment/usd-twd-exchange-rate", getUsdTwdExchangeRateHistory, {
    refreshInterval: EXCHANGE_RATE_REFRESH_INTERVAL_MS,
    dedupingInterval: 60 * 1000,
    revalidateOnFocus: false,
  });
  const locale = normalizeLanguage(i18n.resolvedLanguage);
  const title = t("home.exchangeRate.title");
  const number = new Intl.NumberFormat(locale, { minimumFractionDigits: 3, maximumFractionDigits: 4, useGrouping: false });
  const percent = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false });
  const latest = data?.[data.length - 1] ?? null;
  const oldest = data?.[0] ?? null;
  const change = latest && oldest && latest !== oldest ? latest.rate - oldest.rate : null;
  const hasStoredFourteenDayAnalysis = data?.length === 14 && latest?.trendWindowDays === 14;
  const changePercent = hasStoredFourteenDayAnalysis && latest.fourteenDayChangePercent !== null
    ? latest.fourteenDayChangePercent : change !== null && oldest ? (change / oldest.rate) * 100 : null;
  const trend: TwdTrend | null = hasStoredFourteenDayAnalysis && latest.trend
    ? latest.trend : change === null ? null : change > 0 ? "twd_depreciating" : change < 0 ? "twd_appreciating" : "twd_flat";
  const marketImpact: StockMarketImpact | null = hasStoredFourteenDayAnalysis && latest.stockMarketImpact
    ? latest.stockMarketImpact : change === null ? null : change > 0 ? "bearish" : change < 0 ? "bullish" : "neutral";
  const retry = (
    <Button
      type="button"
      size="small"
      startIcon={<RefreshIcon aria-hidden="true" />}
      onClick={() => void mutate()}
      sx={{ alignSelf: "flex-start", minHeight: 36, color: semanticTokens.analysis.focus, "&:focus-visible": { outline: `3px solid ${semanticTokens.analysis.focus}`, outlineOffset: 2 } }}
    >
      {t("home.cnnSentiment.retry")}
    </Button>
  );

  return (
    <Box component="section" aria-label={title} sx={{
      width: "100%", minHeight: 148, boxSizing: "border-box", p: 1.5,
      borderRadius: `${primitiveTokens.radius.md}px`, border: `1px solid ${semanticTokens.analysis.borderSubtle}`,
      background: semanticTokens.analysis.surfaceGlass, backdropFilter: "blur(14px)",
    }}>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={1}>
        <Typography component="h2" variant="caption" fontWeight={900} sx={{ color: semanticTokens.analysis.text }}>{title}</Typography>
        <Typography variant="caption" sx={{ color: semanticTokens.analysis.textMuted, fontSize: 10 }}>{t("home.exchangeRate.source")}</Typography>
      </Stack>
      {isLoading && !data ? (
        <Stack role="status" aria-live="polite" spacing={1} sx={{ mt: 1.5 }}>
          <Skeleton variant="rounded" width="38%" height={30} sx={{ bgcolor: "rgba(255,255,255,0.12)" }} />
          <Typography variant="caption" sx={{ color: semanticTokens.analysis.textMuted }}>{t("home.exchangeRate.loading")}</Typography>
        </Stack>
      ) : error && !data ? (
        <Stack role="alert" spacing={1} sx={{ mt: 1.5 }}>
          <Typography variant="caption" sx={{ color: semanticTokens.analysis.textMuted }}>{t("home.exchangeRate.error")}</Typography>
          {retry}
        </Stack>
      ) : !data || !latest ? (
        <Typography role="status" variant="caption" sx={{ display: "block", mt: 2, color: semanticTokens.analysis.textMuted }}>{t("home.exchangeRate.empty")}</Typography>
      ) : (
        <Box data-testid="exchange-rate-columns" sx={{ display: "grid", gridTemplateColumns: "minmax(112px, 0.35fr) minmax(0, 0.65fr)", gap: 1.25, mt: 1.2, minWidth: 0, alignItems: "start" }}>
          <Box data-testid="exchange-rate-current" sx={{ minWidth: 0 }}>
            <Typography sx={{ color: semanticTokens.analysis.focus, fontFamily: primitiveTokens.font.numeric, fontSize: 28, fontWeight: 900, lineHeight: 1.15, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
              {number.format(latest.rate)}
              <Typography component="span" sx={{ color: semanticTokens.analysis.textMuted, fontSize: 11, fontWeight: 700, ml: 0.5 }}>TWD</Typography>
            </Typography>
            <Typography variant="caption" sx={{ display: "block", mt: 0.5, color: semanticTokens.analysis.textMuted, fontSize: 10 }}>{t("home.exchangeRate.rateLabel")}</Typography>
            <Stack direction="row" alignItems="baseline" flexWrap="wrap" gap={0.75} sx={{ mt: 0.8 }}>
              <Typography variant="caption" sx={{ color: semanticTokens.analysis.textMuted, fontSize: 10 }}>{t("home.exchangeRate.periodChangeLabel")}</Typography>
              <Typography data-testid="exchange-rate-change" variant="caption" sx={{ color: marketImpact ? impactColor(marketImpact) : semanticTokens.analysis.textMuted, fontWeight: 900, fontSize: 13, fontVariantNumeric: "tabular-nums" }}>
                {changePercent === null ? "—" : `${changePercent > 0 ? "+" : ""}${percent.format(changePercent)}%`}
              </Typography>
              <Typography variant="caption" sx={{ color: marketImpact ? impactColor(marketImpact) : semanticTokens.analysis.textMuted, fontWeight: 800 }}>
                {trend ? t(`home.exchangeRate.trends.${trend}`) : t("home.exchangeRate.changeUnavailable")}
              </Typography>
            </Stack>
            {marketImpact && <>
              <Typography variant="caption" sx={{ display: "block", mt: 0.8, color: impactColor(marketImpact), fontWeight: 900 }}>
                {t(`home.exchangeRate.impacts.${marketImpact}`)}
              </Typography>
            </>}
            <Typography variant="caption" sx={{ display: "block", mt: 0.8, color: semanticTokens.analysis.textMuted, fontSize: 10 }}>
              {t("home.exchangeRate.asOf", { date: latest.date })}
            </Typography>
          </Box>
          <Box data-testid="exchange-rate-trend" sx={{ minWidth: 0 }}>
            <Typography variant="caption" fontWeight={800}>{t("home.exchangeRate.trendTitle")}</Typography>
            {data.length >= 2 ? <>
            <Box role="img" aria-label={t("home.exchangeRate.trendAria", { count: data.length, start: oldest?.date, end: latest.date })} sx={{ height: 130, width: "100%", mt: 0.5 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <XAxis dataKey="date" interval="preserveStartEnd" minTickGap={8} tickFormatter={(date: string) => date.slice(5).replace("-", "/")} height={24} tickMargin={6} padding={{ left: 3, right: 3 }} tick={{ fill: semanticTokens.analysis.textMuted, fontSize: 9 }} tickLine={false} axisLine={false} />
                  <YAxis domain={["dataMin - 0.05", "dataMax + 0.05"]} tickFormatter={(value: number) => value.toFixed(2)} tick={{ fill: semanticTokens.analysis.textMuted, fontSize: 9 }} tickLine={false} axisLine={false} width={35} />
                  <Tooltip formatter={(value: number) => [number.format(value), t("home.exchangeRate.valueLabel")]} labelFormatter={(date) => String(date)} contentStyle={{ background: semanticTokens.analysis.canvas, borderColor: semanticTokens.analysis.borderSubtle, borderRadius: 8, fontSize: 11 }} />
                  <Line type="monotone" dataKey="rate" stroke={semanticTokens.analysis.focus} strokeWidth={2} dot={{ r: 2, fill: semanticTokens.analysis.focus, strokeWidth: 0 }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </Box>
            <Typography variant="caption" sx={{ display: "block", fontSize: 10, color: semanticTokens.analysis.textMuted }}>
              {t("home.exchangeRate.summary", { count: data.length, start: number.format(oldest!.rate), end: number.format(latest.rate) })}
            </Typography>
            </> : <Typography role="status" variant="caption" sx={{ display: "block", mt: 1, fontSize: 10, color: semanticTokens.analysis.textMuted }}>{t("home.cnnSentiment.trendInsufficient")}</Typography>}
          </Box>
        </Box>
      )}
      {error && data && <Stack sx={{ mt: 1 }}><Typography role="status" variant="caption" sx={{ color: semanticTokens.analysis.textMuted }}>{t("home.exchangeRate.refreshingError")}</Typography>{retry}</Stack>}
    </Box>
  );
}
