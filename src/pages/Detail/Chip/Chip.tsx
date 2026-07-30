import {
  AccountBalance,
  Circle,
  Groups,
  Insights,
  Refresh,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  LinearProgress,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import useSWR from "swr";
import { ChipData, marketApi } from "../../../api/marketApi";

const number = new Intl.NumberFormat("zh-TW", { maximumFractionDigits: 1 });

const signedLots = (value: number) =>
  `${value > 0 ? "+" : ""}${number.format(value / 1000)}`;

const LightCard = ({
  label,
  status,
  detail,
}: {
  label: string;
  status: string;
  detail: string;
}) => {
  const { t } = useTranslation();
  const positive = ["buying", "increasing", "easing"].includes(status);
  const negative = ["selling", "decreasing"].includes(status);
  const warning = status === "high";
  const color = positive
    ? "#ff8a80"
    : negative
      ? "#69f0ae"
      : warning
        ? "#ffcc80"
        : "#94a3b8";

  return (
    <Box
      sx={{
        minWidth: 0,
        p: 0.5,
        borderRadius: 1.75,
        bgcolor: "rgba(255,255,255,0.055)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center">
      <Typography variant="caption" color="rgba(255,255,255,0.64)" noWrap>
        {label}
      </Typography>
        <Circle aria-hidden="true" sx={{ color, fontSize: 9 }} />
        <Typography variant="caption" color="white" fontWeight={750} noWrap>
          {t(`Pages.Detail.Chip.light.status.${status}`)}
        </Typography>
      </Stack>
      <Typography
        variant="caption"
        color="rgba(255,255,255,0.62)"
        noWrap
        sx={{ display: "block", fontVariantNumeric: "tabular-nums" }}
      >
        {detail}
      </Typography>
    </Box>
  );
};

const TrendChart = ({ data }: { data: ChipData }) => {
  const { t } = useTranslation();
  const chartData = data.history.map((day) => ({
    ...day,
    label: day.date.slice(5),
    institutionalLots: day.institutionalTotal / 1000,
  }));
  type TrendDay = (typeof chartData)[number];

  const InstitutionalTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload?: TrendDay }>;
  }) => {
    const day = payload?.[0]?.payload;
    if (!active || !day) return null;

    const rows = [
      { label: t("Pages.Detail.Chip.foreign"), value: day.foreign },
      { label: t("Pages.Detail.Chip.trust"), value: day.trust },
      { label: t("Pages.Detail.Chip.dealer"), value: day.dealer },
      { label: t("Pages.Detail.Chip.total"), value: day.institutionalTotal },
    ];

    return (
      <Box
        sx={{
          minWidth: 142,
          p: 0.9,
          color: "white",
          bgcolor: "rgba(18,22,28,0.96)",
          border: "1px solid rgba(255,255,255,0.14)",
          borderRadius: 1.5,
          boxShadow: "0 8px 24px rgba(0,0,0,0.34)",
        }}
      >
        <Typography
          variant="caption"
          sx={{ display: "block", mb: 0.5, color: "rgba(255,255,255,0.68)" }}
        >
          {day.date}
        </Typography>
        <Stack spacing={0.25}>
          {rows.map((row) => {
            const lots = row.value / 1000;
            return (
              <Stack
                key={row.label}
                direction="row"
                justifyContent="space-between"
                spacing={1.5}
              >
                <Typography variant="caption" color="rgba(255,255,255,0.72)">
                  {row.label}
                </Typography>
                <Typography
                  variant="caption"
                  fontWeight={750}
                  sx={{
                    color:
                      lots > 0 ? "#ff8a80" : lots < 0 ? "#69f0ae" : "#fff",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {lots > 0 ? "+" : ""}
                  {number.format(lots)} {t("Pages.Detail.Chip.light.lots")}
                </Typography>
              </Stack>
            );
          })}
        </Stack>
      </Box>
    );
  };

  const first = chartData[0];
  const last = chartData[chartData.length - 1];
  const priceChange =
    first && last && first.close !== 0
      ? ((last.close - first.close) / first.close) * 100
      : 0;
  const trendMetrics = [
    {
      label: t("Pages.Detail.Chip.priceChange20d"),
      value: `${priceChange > 0 ? "+" : ""}${number.format(priceChange)}%`,
      direction: priceChange,
    },
    {
      label: t("Pages.Detail.Chip.institutional5d"),
      value: `${signedLots(data.institutional.total5d)} ${t("Pages.Detail.Chip.light.lots")}`,
      direction: data.institutional.total5d,
    },
    {
      label: t("Pages.Detail.Chip.institutional20d"),
      value: `${signedLots(data.institutional.total20d)} ${t("Pages.Detail.Chip.light.lots")}`,
      direction: data.institutional.total20d,
    },
  ];

  return (
    <Box
      component="section"
      aria-labelledby="chip-trend-title"
      sx={{
        p: 1,
        height: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        borderRadius: 2.5,
        bgcolor: "rgba(20,24,31,0.72)",
        border: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      <Typography id="chip-trend-title" variant="subtitle2" color="white" fontWeight={750}>
        {t("Pages.Detail.Chip.trend")}
      </Typography>

      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 0.5, mt: 0.5 }}>
        {trendMetrics.map((metric) => (
          <Box
            key={metric.label}
            sx={{
              minWidth: 0,
              px: 0.6,
              py: 0.45,
              borderRadius: 1.5,
              bgcolor: "rgba(255,255,255,0.055)",
            }}
          >
            <Typography variant="caption" color="rgba(255,255,255,0.62)" noWrap>
              {metric.label}
            </Typography>
            <Typography
              variant="caption"
              fontWeight={800}
              noWrap
              sx={{
                display: "block",
                color:
                  metric.direction > 0
                    ? "#ff8a80"
                    : metric.direction < 0
                      ? "#69f0ae"
                      : "#fff",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {metric.value}
            </Typography>
          </Box>
        ))}
      </Box>

      <Stack sx={{ flex: 1, minHeight: 0, mt: 0.55 }} spacing={0.25}>
        <Stack direction="row" justifyContent="space-between" alignItems="baseline">
          <Typography variant="caption" color="rgba(255,255,255,0.78)" fontWeight={700}>
            {t("Pages.Detail.Chip.dailyInstitutional")}
          </Typography>
          <Typography variant="caption" color="rgba(255,255,255,0.55)">
            {t("Pages.Detail.Chip.institutionalLegend")}
          </Typography>
        </Stack>
        <Box sx={{ flex: 1, minHeight: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 12, right: 8, bottom: 2, left: 5 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 9 }}
                interval="preserveStartEnd"
              />
              <YAxis
                yAxisId="flow"
                width={35}
                tick={{ fill: "rgba(255,255,255,0.65)", fontSize: 9 }}
                tickFormatter={(value) => number.format(value)}
              />
              <YAxis yAxisId="price" hide domain={["dataMin", "dataMax"]} />
              <Tooltip
                content={<InstitutionalTooltip />}
                cursor={{ fill: "rgba(255,255,255,0.06)" }}
                wrapperStyle={{ zIndex: 10, pointerEvents: "none" }}
              />
              <ReferenceLine yAxisId="flow" y={0} stroke="rgba(255,255,255,0.38)" />
              <Bar
                yAxisId="flow"
                dataKey="institutionalLots"
                name="institutionalLots"
                isAnimationActive={false}
              >
                {chartData.map((day) => (
                  <Cell
                    key={day.date}
                    fill={day.institutionalLots >= 0 ? "#ff8a80" : "#69f0ae"}
                    fillOpacity={0.72}
                  />
                ))}
              </Bar>
              <Line
                yAxisId="price"
                dataKey="close"
                stroke="rgba(255,255,255,0.86)"
                strokeWidth={1.75}
                dot={false}
                activeDot={false}
                tooltipType="none"
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </Box>
      </Stack>
    </Box>
  );
};

const Metric = ({
  label,
  value,
  direction,
}: {
  label: string;
  value: string;
  direction?: number;
}) => (
  <Box
    sx={{
      minWidth: 0,
      p: 1,
      borderRadius: 2,
      bgcolor: "rgba(255,255,255,0.055)",
      border: "1px solid rgba(255,255,255,0.08)",
    }}
  >
    <Typography variant="caption" color="rgba(255,255,255,0.72)" noWrap>
      {label}
    </Typography>
    <Typography
      variant="body1"
      fontWeight={750}
      noWrap
      sx={{
        mt: 0.25,
        fontVariantNumeric: "tabular-nums",
        color:
          direction === undefined || direction === 0
            ? "#fff"
            : direction > 0
              ? "#ff8a80"
              : "#69f0ae",
      }}
    >
      {value}
    </Typography>
  </Box>
);

const Summary = ({ data }: { data: ChipData }) => {
  const { t } = useTranslation();
  const verdict = t(`Pages.Detail.Chip.verdict.${data.verdict}`);
  const explanation = t(`Pages.Detail.Chip.explanation.${data.verdict}`);
  const accent =
    data.verdict === "stable_buying"
      ? "#90caf9"
      : data.verdict === "distribution" || data.verdict === "retail_crowded"
        ? "#ffb74d"
        : "#94a3b8";

  return (
    <Box
      component="section"
      aria-label={t("Pages.Detail.Chip.summary")}
      sx={{
        p: 1,
        borderRadius: 3,
        bgcolor: "rgba(20,24,31,0.82)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: `inset 3px 0 0 ${accent}`,
      }}
    >
      <Stack direction="row" justifyContent="space-between" spacing={1}>
        <Box minWidth={0}>
          <Typography variant="h6" fontWeight={800} color="white" noWrap>
            {verdict}
          </Typography>
          <Typography
            variant="caption"
            color="rgba(255,255,255,0.76)"
            sx={{
              display: "-webkit-box",
              overflow: "hidden",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 2,
            }}
          >
            {explanation}
          </Typography>
        </Box>
        <Box textAlign="right" flexShrink={0}>
          <Typography
            variant="h5"
            fontWeight={800}
            color={accent}
            sx={{ fontVariantNumeric: "tabular-nums" }}
          >
            {data.score}
          </Typography>
          <Typography variant="caption" color="rgba(255,255,255,0.64)">
            {t("Pages.Detail.Chip.score")}
          </Typography>
        </Box>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={data.score}
        aria-label={t("Pages.Detail.Chip.score")}
        sx={{
          mt: 1,
          height: 5,
          borderRadius: 8,
          bgcolor: "rgba(255,255,255,0.08)",
          "& .MuiLinearProgress-bar": { bgcolor: accent },
        }}
      />
    </Box>
  );
};

export default function Chip() {
  const { id } = useParams();
  const { t } = useTranslation();
  const [view, setView] = useState<"overview" | "trend" | "analysis">("overview");
  const { data, error, isLoading, mutate } = useSWR(
    id ? `chip/${id}` : null,
    () => marketApi.getChipData(id as string),
    { revalidateOnFocus: false, dedupingInterval: 30 * 60 * 1000 },
  );

  if (isLoading) {
    return (
      <Box height="100%" display="grid" sx={{ placeItems: "center" }}>
        <Stack alignItems="center" spacing={1}>
          <CircularProgress size={30} />
          <Typography color="rgba(255,255,255,0.72)" variant="body2">
            {t("Pages.Detail.Chip.loading")}
          </Typography>
        </Stack>
      </Box>
    );
  }

  if (error || !data) {
    const twOnly = String(error).includes("CHIP_DATA_TW_ONLY");
    return (
      <Box height="100%" display="grid" sx={{ placeItems: "center", p: 2 }}>
        <Alert
          severity={twOnly ? "info" : "warning"}
          action={
            !twOnly && (
              <Button color="inherit" startIcon={<Refresh />} onClick={() => mutate()}>
                {t("Pages.Detail.Chip.retry")}
              </Button>
            )
          }
        >
          {t(twOnly ? "Pages.Detail.Chip.twOnly" : "Pages.Detail.Chip.error")}
        </Alert>
      </Box>
    );
  }

  return (
    <Container
      component="main"
      maxWidth={false}
      sx={{
        height: "100%",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        px: { xs: 1.25, sm: 2 },
        pt: 1,
        pb: 1,
      }}
    >
      <Stack spacing={0.85} sx={{ height: "100%", minHeight: 0 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="baseline">
          <Box />
          <Typography variant="caption" color="rgba(255,255,255,0.64)">
            {data.asOf} · {data.source}
          </Typography>
        </Stack>

        <Summary data={data} />

        <ToggleButtonGroup
          exclusive
          fullWidth
          size="small"
          value={view}
          onChange={(_, next) => next && setView(next)}
          aria-label={t("Pages.Detail.Chip.tabs.label")}
          sx={{
            flexShrink: 0,
            "& .MuiToggleButton-root": {
              minHeight: 38,
              px: 0.5,
              color: "rgba(255,255,255,0.64)",
              borderColor: "rgba(255,255,255,0.12)",
              fontSize: 12,
              fontWeight: 700,
              textTransform: "none",
              "&.Mui-selected": {
                color: "#fff",
                bgcolor: "rgba(144,202,249,0.16)",
              },
            },
          }}
        >
          <ToggleButton value="overview">{t("Pages.Detail.Chip.tabs.overview")}</ToggleButton>
          <ToggleButton value="trend">{t("Pages.Detail.Chip.tabs.trend")}</ToggleButton>
          <ToggleButton value="analysis">{t("Pages.Detail.Chip.tabs.analysis")}</ToggleButton>
        </ToggleButtonGroup>

        <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
          {view === "overview" && (
            <Stack spacing={0.75}>
              <Box component="section" aria-labelledby="chip-lights-title">
                <Typography
                  id="chip-lights-title"
                  variant="subtitle2"
                  color="white"
                  fontWeight={750}
                  sx={{ mb: 0.45 }}
                >
                  {t("Pages.Detail.Chip.light.title")}
                <Typography
                  variant="caption"
                  color="rgba(255,255,255,0.72)"
                  sx={{
                    ml: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                 {t(`Pages.Detail.Chip.light.summary.${data.lights.summary}`)}
                </Typography>
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: 0.55,
                  }}
                >
                  <LightCard
                    label={t("Pages.Detail.Chip.light.institutional")}
                    status={data.lights.institutional}
                    detail={`${signedLots(data.institutional.total5d)} ${t("Pages.Detail.Chip.light.lots")}`}
                  />
                  <LightCard
                    label={t("Pages.Detail.Chip.light.foreignHolding")}
                    status={data.lights.foreignHolding}
                    detail={
                      data.lights.foreignRatio === null
                        ? "—"
                        : `${number.format(data.lights.foreignRatio)}%`
                    }
                  />
                  <LightCard
                    label={t("Pages.Detail.Chip.light.lendingPressure")}
                    status={data.lights.lendingPressure}
                    detail={
                      data.lights.lendingChangePercent === null
                        ? "—"
                        : `${data.lights.lendingChangePercent > 0 ? "+" : ""}${number.format(data.lights.lendingChangePercent)}%`
                    }
                  />
                </Box>
              </Box>

              <Box component="section" aria-labelledby="institution-title">
                <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.6 }}>
                  <AccountBalance sx={{ color: "#90caf9", fontSize: 18 }} />
                  <Typography id="institution-title" variant="subtitle2" color="white" fontWeight={750}>
                    {t("Pages.Detail.Chip.institutional")}
                  </Typography>
                  <Typography variant="caption" color="rgba(255,255,255,0.56)">
                    {t("Pages.Detail.Chip.fiveDaysLots")}
                  </Typography>
                </Stack>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                    gap: 0.55,
                    "& > *": { px: 0.65 },
                  }}
                >
                  <Metric label={t("Pages.Detail.Chip.foreign")} value={signedLots(data.institutional.foreign5d)} direction={data.institutional.foreign5d} />
                  <Metric label={t("Pages.Detail.Chip.trust")} value={signedLots(data.institutional.trust5d)} direction={data.institutional.trust5d} />
                  <Metric label={t("Pages.Detail.Chip.dealer")} value={signedLots(data.institutional.dealer5d)} direction={data.institutional.dealer5d} />
                  <Metric label={t("Pages.Detail.Chip.total")} value={signedLots(data.institutional.total5d)} direction={data.institutional.total5d} />
                </Box>
              </Box>

              <Box component="section" aria-labelledby="margin-title">
                <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.6 }}>
                  <Groups sx={{ color: "#ffcc80", fontSize: 18 }} />
                  <Typography id="margin-title" variant="subtitle2" color="white" fontWeight={750}>
                    {t("Pages.Detail.Chip.margin")}
                  </Typography>
                </Stack>
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 0.65 }}>
                  <Metric label={t("Pages.Detail.Chip.marginBalance")} value={number.format(data.margin.marginBalance)} />
                  <Metric label={t("Pages.Detail.Chip.marginChange")} value={`${data.margin.marginChange5d > 0 ? "+" : ""}${number.format(data.margin.marginChangePercent5d)}%`} direction={data.margin.marginChange5d} />
                  <Metric label={t("Pages.Detail.Chip.shortRatio")} value={`${number.format(data.margin.shortMarginRatio)}%`} />
                </Box>
              </Box>
            </Stack>
          )}

          {view === "trend" && <TrendChart data={data} />}

          {view === "analysis" && (
            <Stack spacing={0.9}>
              <Box component="section" aria-labelledby="signal-title">
                <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.5 }}>
                  <Insights sx={{ color: "#ffcc80", fontSize: 18 }} />
                  <Typography id="signal-title" variant="subtitle2" color="white" fontWeight={750}>
                    {t("Pages.Detail.Chip.signals")}
                  </Typography>
                </Stack>
                {data.signals.length > 0 ? (
                  <Stack spacing={0.4}>
                    {data.signals.map((signal) => (
                      <Box
                        key={signal}
                        sx={{
                          px: 0.8,
                          py: 0.45,
                          borderRadius: 1.5,
                          bgcolor: "rgba(255,204,128,0.08)",
                          border: "1px solid rgba(255,204,128,0.18)",
                        }}
                      >
                        <Typography variant="caption" color="rgba(255,255,255,0.84)">
                          {t(`Pages.Detail.Chip.signal.${signal}`)}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="rgba(255,255,255,0.64)">
                    {t("Pages.Detail.Chip.noSignals")}
                  </Typography>
                )}
              </Box>

              <Box
                component="section"
                aria-labelledby="score-breakdown"
                sx={{
                  p: 0.9,
                  color: "white",
                  bgcolor: "rgba(255,255,255,0.045)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 2,
                }}
              >
                <Typography id="score-breakdown" variant="subtitle2" fontWeight={750} sx={{ mb: 0.4 }}>
                  {t("Pages.Detail.Chip.scoreBreakdown")}
                </Typography>
                <Stack spacing={0.25}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="rgba(255,255,255,0.7)">
                      {t("Pages.Detail.Chip.baseScore")}
                    </Typography>
                    <Typography variant="caption" sx={{ fontVariantNumeric: "tabular-nums" }}>
                      50
                    </Typography>
                  </Stack>
                  {data.scoreBreakdown.map((item) => (
                    <Stack key={item.factor} direction="row" justifyContent="space-between">
                      <Typography variant="caption" color="rgba(255,255,255,0.7)">
                        {t(`Pages.Detail.Chip.factor.${item.factor}`)}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: item.points > 0 ? "#ff8a80" : "#69f0ae",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {item.points > 0 ? "+" : ""}
                        {item.points}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            </Stack>
          )}
        </Box>

      </Stack>
    </Container>
  );
}
