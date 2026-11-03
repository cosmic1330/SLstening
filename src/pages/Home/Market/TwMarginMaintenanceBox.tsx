import RefreshIcon from "@mui/icons-material/Refresh";
import { Box, Button, Link, Skeleton, Stack, Typography } from "@mui/material";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTranslation } from "react-i18next";
import useSWR from "swr";
import { getTwMarginMaintenanceHistory } from "../../../api/marketSentimentApi";
import { normalizeLanguage } from "../../../i18n";
import { primitiveTokens, semanticTokens } from "../../../theme";

export default function TwMarginMaintenanceBox() {
  const { t, i18n } = useTranslation();
  const { data, error, isLoading, mutate } = useSWR("market-sentiment/finlab-tw-margin-maintenance", getTwMarginMaintenanceHistory, {
    refreshInterval: 60 * 60 * 1000,
    dedupingInterval: 60 * 1000,
    revalidateOnFocus: false,
  });
  const locale = normalizeLanguage(i18n.resolvedLanguage);
  const number = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const latest = data?.[data.length - 1];
  const previous = data?.[data.length - 2];
  // Compare adjacent observations at the same precision as the displayed percentage.
  const change = latest?.percent != null && previous?.percent != null
    ? (Math.round(latest.percent * 100) - Math.round(previous.percent * 100)) / 100 : null;
  const direction = change === null ? "unavailable" : change > 0 ? "up" : change < 0 ? "down" : "unchanged";
  const changeColor = change === null || change === 0 ? semanticTokens.analysis.textMuted
    : change > 0 ? semanticTokens.market.gain : semanticTokens.market.loss;
  const validPoints = data?.filter((point) => point.percent !== null) ?? [];
  const trend = data ?? [];
  const title = t("home.marginMaintenance.title");
  const retry = (
    <Button type="button" size="small" startIcon={<RefreshIcon aria-hidden="true" />} onClick={() => void mutate()}
      sx={{ alignSelf: "flex-start", minHeight: 36, color: semanticTokens.analysis.focus, "&:focus-visible": { outline: `3px solid ${semanticTokens.analysis.focus}`, outlineOffset: 2 } }}>
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
        <Link href="https://finlab.finance/tools/margin-maintenance-ratio" target="_blank" rel="noopener noreferrer"
          sx={{ fontSize: 10, color: semanticTokens.analysis.textMuted, flexShrink: 0 }}>FinLab</Link>
      </Stack>
      {isLoading && !data ? (
        <Stack role="status" spacing={1} sx={{ mt: 1.5 }}>
          <Skeleton animation={false} variant="rounded" width="38%" height={30} />
          <Typography variant="caption">{t("home.marginMaintenance.loading")}</Typography>
        </Stack>
      ) : error && !data ? (
        <Stack role="alert" spacing={1} sx={{ mt: 1.5 }}>
          <Typography variant="caption">{t("home.marginMaintenance.error")}</Typography>
          {retry}
        </Stack>
      ) : !latest ? (
        <Typography role="status" variant="caption" sx={{ display: "block", mt: 2 }}>{t("home.marginMaintenance.empty")}</Typography>
      ) : (
        <Box data-testid="margin-maintenance-columns" sx={{ display: "grid", gridTemplateColumns: "minmax(112px, 0.38fr) minmax(0, 0.62fr)", gap: 1.25, mt: 1.2, minWidth: 0 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ color: semanticTokens.analysis.focus, fontFamily: primitiveTokens.font.numeric, fontSize: 28, fontWeight: 900, lineHeight: 1.15, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
              {latest.percent === null ? "—" : number.format(latest.percent)}
              <Typography component="span" sx={{ fontSize: 12, ml: 0.25 }}>%</Typography>
            </Typography>
            <Stack direction="row" alignItems="baseline" flexWrap="wrap" gap={0.5} sx={{ mt: 0.75 }}>
              <Typography data-testid="margin-maintenance-change" component="span" variant="caption"
                title={t(`home.marginMaintenance.change.${direction}`, { value: change === null ? "" : number.format(Math.abs(change)) })}
                sx={{ fontWeight: 800, fontSize: 12, color: changeColor, fontVariantNumeric: "tabular-nums" }}>
                {change === null ? "—" : `${change > 0 ? "+" : ""}${number.format(change)}`}
              </Typography>
            </Stack>
            <Typography variant="caption" sx={{ display: "block", mt: 0.8, color: semanticTokens.analysis.textMuted, fontSize: 10 }}>
              {t("home.cnnSentiment.asOf", { date: latest.date })}
            </Typography>
            {latest.percent === null && <Typography role="status" variant="caption">{t("home.marginMaintenance.invalid")}</Typography>}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" fontWeight={800}>{t("home.marginMaintenance.trendTitle")}</Typography>
            {validPoints.length >= 2 ? (
              <>
                <Box role="img" aria-label={t("home.marginMaintenance.trendAria", { count: validPoints.length, start: validPoints[0].date, end: validPoints[validPoints.length - 1].date })} sx={{ height: 130, width: "100%", mt: 0.5 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trend} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                      <CartesianGrid stroke={semanticTokens.analysis.dividerSubtle} strokeDasharray="2 3" vertical={false} />
                      <XAxis dataKey="date" interval={0} tickFormatter={(date: string) => date.slice(5).replace("-", "/")} angle={-90} textAnchor="end" height={42} tickMargin={6} padding={{ left: 3, right: 3 }} tick={{ fill: semanticTokens.analysis.textMuted, fontSize: 9 }} tickLine={false} axisLine={false} />
                      <YAxis domain={[(min: number) => Math.floor((min - 5) / 10) * 10, (max: number) => Math.ceil((max + 5) / 10) * 10]} tickCount={3} tick={{ fill: semanticTokens.analysis.textMuted, fontSize: 9 }} tickLine={false} axisLine={false} width={30} />
                      <Tooltip formatter={(value: number) => [`${number.format(value)}%`, t("home.marginMaintenance.valueLabel")]} contentStyle={{ background: semanticTokens.analysis.canvas, borderColor: semanticTokens.analysis.borderSubtle, borderRadius: 8, fontSize: 11 }} />
                      <Line type="monotone" dataKey="percent" stroke={semanticTokens.analysis.focus} strokeWidth={2} dot={{ r: 2, fill: semanticTokens.analysis.focus, strokeWidth: 0 }} isAnimationActive={false} connectNulls={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
                <Typography variant="caption" sx={{ display: "block", fontSize: 10, color: semanticTokens.analysis.textMuted }}>
                  {t("home.marginMaintenance.summary", { count: validPoints.length, start: number.format(validPoints[0].percent!), end: number.format(validPoints[validPoints.length - 1].percent!) })}
                </Typography>
              </>
            ) : <Typography role="status" variant="caption" sx={{ display: "block", mt: 1, fontSize: 10, color: semanticTokens.analysis.textMuted }}>{t("home.cnnSentiment.trendInsufficient")}</Typography>}
          </Box>
        </Box>
      )}
      {error && data && <Stack sx={{ mt: 1 }}><Typography role="status" variant="caption" sx={{ color: semanticTokens.analysis.textMuted }}>{t("home.cnnSentiment.refreshingError")}</Typography>{retry}</Stack>}
    </Box>
  );
}
