import { Alert, Box, CircularProgress, Stack, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import useSWR from "swr";
import { marketApi, type PeRiverData } from "../../../api/marketApi";
import { reportHandledError } from "../../../diagnostics";
import { normalizeLanguage } from "../../../i18n";
import { semanticTokens } from "../../../theme";

export default function PeRiver() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const isTaiwanStock = Boolean(id && /^\d+$/.test(id));
  const { data, error, isLoading } = useSWR<PeRiverData>(isTaiwanStock ? ["pe-river", id] : null, () => marketApi.getPeRiverData(id!), {
    dedupingInterval: 3_600_000,
    refreshInterval: 3_600_000,
    onError: (reason) => reportHandledError("pe_river_fetch", reason, "PE_RIVER_FETCH_FAILED"),
  });
  const number = new Intl.NumberFormat(normalizeLanguage(i18n.resolvedLanguage), { maximumFractionDigits: 1 });

  if (!isTaiwanStock) {
    return <Box sx={{ width: "100%", p: 2 }}><Alert severity="info">{t("Pages.Detail.peRiver.twOnly")}</Alert></Box>;
  }
  if (isLoading) {
    return <Box role="status" aria-label={t("Pages.Detail.peRiver.loading")} sx={{ width: "100%", height: "100%", display: "grid", placeItems: "center" }}><CircularProgress size={28} /></Box>;
  }
  if (error || !data?.points.length) {
    return <Box sx={{ width: "100%", p: 2 }}><Alert severity="warning">{t("Pages.Detail.peRiver.unavailable")}</Alert></Box>;
  }

  const points = data.points.map((point) => ({
    ...point,
    floor: point.p10,
    low: point.p30 - point.p10,
    middle: point.p50 - point.p30,
    high: point.p70 - point.p50,
    top: point.p90 - point.p70,
  }));
  const latest = data.points[data.points.length - 1];
  const minPrice = Math.min(...points.map((point) => Math.min(point.p10, point.close)));
  const maxPrice = Math.max(...points.map((point) => Math.max(point.p90, point.close)));
  const position = data.percentile < 20 ? "low" : data.percentile > 80 ? "high" : "middle";
  const positionColor = position === "low" ? semanticTokens.market.loss : position === "high" ? semanticTokens.market.gain : semanticTokens.analysis.focus;

  return <Box component="section" aria-label={t("Pages.Detail.peRiver.title")} sx={{ width: "100%", height: "100%", minHeight: 0, px: { xs: 1, sm: 2 }, py: 1.25, display: "flex", flexDirection: "column", color: semanticTokens.analysis.text }}>
    <Stack direction="row" alignItems="baseline" justifyContent="space-between" spacing={1} sx={{ mb: 0.4 }}>
      <Typography component="h1" sx={{ fontWeight: 800, fontSize: { xs: 17, sm: 20 } }}>{data.symbol} · {t("Pages.Detail.peRiver.title")}</Typography>
      <Typography sx={{ color: semanticTokens.analysis.textMuted, fontSize: 11 }}>{data.asOf} · FinMind</Typography>
    </Stack>
    <Stack direction="row" spacing={1.5} sx={{ mb: 0.6, flexWrap: "wrap" }}>
      <Typography sx={{ fontSize: 12 }}>{t("Pages.Detail.peRiver.price")}: <strong>{number.format(latest.close)}</strong></Typography>
      <Typography sx={{ fontSize: 12 }}>{t("Pages.Detail.peRiver.currentPer")}: <strong>{number.format(data.currentPer)}×</strong></Typography>
      <Typography sx={{ fontSize: 12 }}>{t("Pages.Detail.peRiver.medianPer")}: <strong>{number.format(data.medianPer)}×</strong></Typography>
      <Typography sx={{ fontSize: 12, color: positionColor, fontWeight: 750 }}>{t(`Pages.Detail.peRiver.position.${position}`)} · {t("Pages.Detail.peRiver.percentile", { value: number.format(data.percentile) })}</Typography>
    </Stack>
    <Box sx={{ flex: 1, minHeight: 0, borderRadius: 1.5, bgcolor: semanticTokens.analysis.panel, border: `1px solid ${semanticTokens.analysis.border}`, pt: 1, pr: 1 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={points} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
          <CartesianGrid stroke={semanticTokens.analysis.dividerSubtle} vertical={false} />
          <XAxis dataKey="date" tickFormatter={(value: string) => value.slice(2, 7)} minTickGap={40} tick={{ fill: semanticTokens.analysis.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis domain={[Math.floor(minPrice * 0.95), Math.ceil(maxPrice * 1.05)]} width={58} tick={{ fill: semanticTokens.analysis.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(value: number) => number.format(value)} />
          <Tooltip content={({ active, payload }) => {
            const point = active && payload?.[0]?.payload as (typeof points)[number] | undefined;
            if (!point) return null;
            return <Box sx={{ p: 1, bgcolor: semanticTokens.analysis.panel, border: `1px solid ${semanticTokens.analysis.border}`, borderRadius: 1, color: semanticTokens.analysis.text, fontSize: 12 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{point.date}</Typography>
              <div>{t("Pages.Detail.peRiver.price")}: {number.format(point.close)}</div>
              <div>{t("Pages.Detail.peRiver.currentPer")}: {number.format(point.per)}×</div>
              <div>{t("Pages.Detail.peRiver.medianBand")}: {number.format(point.p50)}</div>
            </Box>;
          }} />
          <Area dataKey="floor" stackId="river" stroke="none" fill="transparent" isAnimationActive={false} legendType="none" tooltipType="none" />
          <Area dataKey="low" stackId="river" stroke="none" fill={semanticTokens.market.loss} fillOpacity={0.22} isAnimationActive={false} legendType="none" tooltipType="none" />
          <Area dataKey="middle" stackId="river" stroke="none" fill={semanticTokens.analysis.focus} fillOpacity={0.2} isAnimationActive={false} legendType="none" tooltipType="none" />
          <Area dataKey="high" stackId="river" stroke="none" fill={semanticTokens.market.warning} fillOpacity={0.2} isAnimationActive={false} legendType="none" tooltipType="none" />
          <Area dataKey="top" stackId="river" stroke="none" fill={semanticTokens.market.gain} fillOpacity={0.2} isAnimationActive={false} legendType="none" tooltipType="none" />
          <Line dataKey="close" type="monotone" stroke="#fff" strokeWidth={2} dot={false} isAnimationActive={false} name={t("Pages.Detail.peRiver.price")} />
        </ComposedChart>
      </ResponsiveContainer>
    </Box>
    <Typography sx={{ mt: 0.55, color: semanticTokens.analysis.textMuted, fontSize: 10.5 }}>{t("Pages.Detail.peRiver.note")}</Typography>
  </Box>;
}
