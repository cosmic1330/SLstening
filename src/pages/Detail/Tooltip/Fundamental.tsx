import { Box, Skeleton, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import ArrowDownwardRounded from "@mui/icons-material/ArrowDownwardRounded";
import ArrowUpwardRounded from "@mui/icons-material/ArrowUpwardRounded";
import RemoveRounded from "@mui/icons-material/RemoveRounded";
import { type ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import useSWR from "swr";
import { marketApi } from "../../../api/marketApi";
import { normalizeLanguage } from "../../../i18n";
import { reportHandledError } from "../../../diagnostics";
import { supabase } from "../../../supabase";
import { semanticTokens } from "../../../theme";
import {
  FinancialMetricTableType,
  RecentFundamentalTableType,
  TdccHolderTableType,
} from "../../../types";

export type TdccHolderChange = {
  delta: number | null;
  direction: "increase" | "decrease" | "unchanged" | "unavailable";
};

export const isTdccStockId = (id: string | undefined): id is string =>
  Boolean(id && /^\d+$/.test(id) && Number.isSafeInteger(Number(id)));

export const getTdccHolderChange = (
  current: number | null,
  previous: number | null
): TdccHolderChange => {
  if (current === null || previous === null) {
    return { delta: null, direction: "unavailable" };
  }

  const delta = current - previous;
  if (delta > 0) return { delta, direction: "increase" };
  if (delta < 0) return { delta, direction: "decrease" };
  return { delta: 0, direction: "unchanged" };
};

export default function Fundamental({ id }: { id: string | undefined }) {
  const { t, i18n } = useTranslation();
  const isTaiwanStock = isTdccStockId(id);
  const { data: peRiver, isLoading: medianLoading } = useSWR(
    isTaiwanStock ? ["pe-river", id] : null,
    () => marketApi.getPeRiverData(id!),
    {
      dedupingInterval: 3_600_000,
      refreshInterval: 3_600_000,
      onError: (error) => reportHandledError("fundamental_pe_river_fetch", error, "FUNDAMENTAL_PE_RIVER_FETCH_FAILED"),
    },
  );
  const [financialMetrics, setFinancialMetrics] =
    useState<FinancialMetricTableType | null>(null);
  const [recentFundamental, setRecentFundamental] =
    useState<RecentFundamentalTableType | null>(null);
  const [tdccHolder, setTdccHolder] = useState<TdccHolderTableType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCurrentRequest = true;

    const fetchData = async () => {
      setLoading(true);
      setFinancialMetrics(null);
      setRecentFundamental(null);
      setTdccHolder(null);

      try {
        // 並行載入資料；TDCC 只適用於安全的純數字台股代碼。
        const tdccResultPromise = isTdccStockId(id)
          ? supabase
              .from("tdcc_holder")
              .select("*")
              .eq("stock_id", Number(id))
              .maybeSingle()
          : Promise.resolve({ data: null, error: null });
        const [financialResult, recentResult, tdccResult] = await Promise.all([
          supabase
            .from("financial_metric")
            .select("*")
            .eq("stock_id", id)
            .single(),
          supabase
            .from("recent_fundamental")
            .select("*")
            .eq("stock_id", id)
            .single(),
          tdccResultPromise,
        ]);

        if (!isCurrentRequest) return;

        if (financialResult.error) {
          reportHandledError("fundamental_financial_fetch", financialResult.error, "FUNDAMENTAL_FINANCIAL_FETCH_FAILED");
        } else {
          setFinancialMetrics(financialResult.data);
        }

        if (recentResult.error) {
          reportHandledError("fundamental_recent_fetch", recentResult.error, "FUNDAMENTAL_RECENT_FETCH_FAILED");
        } else {
          setRecentFundamental(recentResult.data);
        }

        if (tdccResult.error) {
          reportHandledError("fundamental_tdcc_fetch", tdccResult.error, "FUNDAMENTAL_TDCC_FETCH_FAILED");
        } else {
          setTdccHolder(tdccResult.data as TdccHolderTableType | null);
        }
      } catch (error) {
        if (isCurrentRequest) {
          reportHandledError("fundamental_fetch", error, "FUNDAMENTAL_FETCH_FAILED");
        }
      } finally {
        if (isCurrentRequest) {
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      isCurrentRequest = false;
    };
  }, [id]);

  const formatSingleValue = (
    val: any,
    suffix: string = "",
    decimals: number = 2
  ) => {
    if (val === null || val === undefined || val === "" || isNaN(val)) {
      return t("Pages.Detail.tooltip.unavailable");
    }
    return `${new Intl.NumberFormat(normalizeLanguage(i18n.resolvedLanguage), { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(Number(val))}${suffix}`;
  };

  const getNumberColor = (val: any) => {
    if (val === null || val === undefined || val === "" || isNaN(val)) {
      return "inherit";
    }
    const num = Number(val);
    if (num > 0) return "#fff"; 
    if (num < 0) return "#52c41a"; // 空頭/負數顯綠色
    return "inherit";
  };

  const formatInteger = (value: number) =>
    new Intl.NumberFormat(normalizeLanguage(i18n.resolvedLanguage), {
      maximumFractionDigits: 0,
    }).format(value);

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(normalizeLanguage(i18n.resolvedLanguage), {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(value));

  const HolderChangeItem = ({
    label,
    current,
    previous,
  }: {
    label: string;
    current: number | null;
    previous: number | null;
  }) => {
    const { delta, direction } = getTdccHolderChange(current, previous);
    const color =
      direction === "increase"
        ? semanticTokens.market.gain
        : direction === "decrease"
          ? semanticTokens.market.loss
          : semanticTokens.market.neutral;
    const DirectionIcon =
      direction === "increase"
        ? ArrowUpwardRounded
        : direction === "decrease"
          ? ArrowDownwardRounded
          : RemoveRounded;
    const changeText =
      direction === "unavailable" || delta === null
        ? t("Pages.Detail.tooltip.tdcc.comparisonUnavailable")
        : direction === "unchanged"
          ? t("Pages.Detail.tooltip.tdcc.unchanged")
          : t(`Pages.Detail.tooltip.tdcc.${direction}`, {
              value: formatInteger(Math.abs(delta)),
            });

    return (
      <Box
        data-testid="tdcc-holder-card"
        sx={{
          minWidth: 0,
          p: 0.75,
          border: `1px solid ${semanticTokens.analysis.borderSubtle}`,
          borderRadius: "8px",
          bgcolor: semanticTokens.analysis.inset,
        }}
      >
        <Typography variant="caption" sx={{ display: "block", fontSize: 12, lineHeight: 1.35, color: "text.secondary", overflowWrap: "anywhere" }}>
          {label}
        </Typography>
        <Typography
          variant="caption"
          sx={{ display: "block", mt: 0.25, fontSize: 12, lineHeight: 1.35, fontWeight: 700, fontVariantNumeric: "tabular-nums", overflowWrap: "anywhere" }}
        >
          {current === null
            ? t("Pages.Detail.tooltip.unavailable")
            : t("Pages.Detail.tooltip.tdcc.currentHolders", {
                value: formatInteger(current),
              })}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.35, minWidth: 0, mt: 0.4, color }}>
          <DirectionIcon aria-hidden="true" sx={{ flexShrink: 0, fontSize: "0.95rem", mt: "1px" }} />
          <Typography component="span" variant="caption" sx={{ minWidth: 0, fontSize: 12, lineHeight: 1.35, color: "inherit", fontVariantNumeric: "tabular-nums", overflowWrap: "anywhere" }}>
            {changeText}
          </Typography>
        </Box>
      </Box>
    );
  };

  const MetricItem = ({
    label,
    value,
    suffix = "",
    decimals = 2,
  }: {
    label: string;
    value: any;
    suffix?: string;
    decimals?: number;
  }) => (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        gap: 0.75,
        mb: 0.3,
      }}
    >
      <Typography
        variant="caption"
        sx={{ minWidth: 0, fontSize: 12, lineHeight: 1.35, color: "text.secondary", overflowWrap: "anywhere" }}
      >
        {label}:
      </Typography>
      <Typography
        variant="caption"
        component="div"
        sx={{
          fontWeight: "medium",
          minWidth: 0,
          flexShrink: 0,
          fontSize: 12,
          lineHeight: 1.35,
          fontVariantNumeric: "tabular-nums",
          textAlign: "right",
        }}
      >
        {Array.isArray(value) ? (
          <Box component="span" sx={{ display: "inline-flex", gap: 0.5 }}>
            <Box component="span" sx={{ color: getNumberColor(value[0]) }}>
              {formatSingleValue(value[0], suffix, decimals)}
            </Box>
            <Box component="span" sx={{ color: "text.disabled" }}>
              /
            </Box>
            <Box component="span" sx={{ color: getNumberColor(value[1]) }}>
              {formatSingleValue(value[1], suffix, decimals)}
            </Box>
          </Box>
        ) : (
          <Box component="span" sx={{ color: getNumberColor(value) }}>
            {formatSingleValue(value, suffix, decimals)}
          </Box>
        )}
      </Typography>
    </Box>
  );

  if (loading || !id) {
    return (
      <Box data-testid="fundamental-loading" sx={{ width: "100%", minWidth: 0, p: 1 }}>
        <Skeleton variant="text" width="70%" height={22} />
        <Skeleton variant="text" width="100%" height={18} sx={{ mb: 0.75 }} />
        <Skeleton variant="rectangular" width="100%" height={140} />
      </Box>
    );
  }

  const Section = ({
    title,
    color,
    children,
    fullWidth = false,
    testId,
  }: {
    title: string;
    color: string;
    children: ReactNode;
    fullWidth?: boolean;
    testId: string;
  }) => (
    <Box
      data-testid={testId}
      sx={{
        minWidth: 0,
        ...(fullWidth ? { gridColumn: "1 / -1" } : {}),
        p: 0.9,
        border: `1px solid ${semanticTokens.analysis.borderSubtle}`,
        borderRadius: "8px",
        bgcolor: semanticTokens.analysis.surfaceSubtle,
      }}
    >
      <Typography
        variant="subtitle2"
        sx={{ mb: 0.6, fontWeight: 700, fontSize: 12, lineHeight: 1.35, color, borderBottom: `1px solid ${semanticTokens.analysis.dividerSubtle}`, pb: 0.45 }}
      >
        {title}
      </Typography>
      {children}
    </Box>
  );

  const quarterlyEps = recentFundamental && [
    recentFundamental.eps_recent_q1,
    recentFundamental.eps_recent_q2,
    recentFundamental.eps_recent_q3,
    recentFundamental.eps_recent_q4,
  ];
  const trailingEps = quarterlyEps && quarterlyEps.every((value) => value !== null && Number.isFinite(value))
    ? quarterlyEps.reduce<number>((sum, value) => sum + (value ?? 0), 0)
    : null;
  const latestAnnualEps = recentFundamental?.eps_recent_y1;
  const referenceEps = trailingEps !== null && trailingEps > 0
    ? trailingEps
    : latestAnnualEps !== null && latestAnnualEps !== undefined && Number.isFinite(latestAnnualEps) && latestAnnualEps > 0
      ? latestAnnualEps
      : null;
  const referencePe = isTaiwanStock
    ? peRiver?.medianPer ?? null
    : financialMetrics?.pe !== null && financialMetrics?.pe !== undefined && Number.isFinite(financialMetrics.pe) && financialMetrics.pe > 0
      ? financialMetrics.pe
      : null;
  const valuationScenarios = [
    { key: "pessimistic", epsFactor: 13 / 18, color: semanticTokens.market.loss },
    { key: "conservative", epsFactor: 15 / 18, color: semanticTokens.market.warning },
    { key: "neutral", epsFactor: 1, color: semanticTokens.analysis.focus },
    { key: "optimistic", epsFactor: 21 / 18, color: semanticTokens.market.gain },
  ] as const;

  return (
    <Box sx={{ p: 1, minWidth: 0 }}>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 0.65, minWidth: 0 }}>
        {(financialMetrics || recentFundamental) && (
          <Section testId="fundamental-section-fair-value" title={t("Pages.Detail.tooltip.fairValue.title")} color="primary.main">
            {referenceEps !== null && referencePe !== null ? (
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 0.5 }}>
                {valuationScenarios.map(({ key, epsFactor, color }) => {
                  const estimatedEps = referenceEps * epsFactor;
                  return <Box key={key} data-testid={`fair-value-${key}`} sx={{ minWidth: 0, p: 0.65, borderRadius: "6px", bgcolor: alpha(color, 0.16), border: `1px solid ${alpha(color, 0.36)}` }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color }}>{t(`Pages.Detail.tooltip.fairValue.${key}`)}</Typography>
                    <Typography sx={{ fontSize: 15, lineHeight: 1.3, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
                      {formatSingleValue(estimatedEps * referencePe, t("Pages.Detail.tooltip.currency"), 0)}
                    </Typography>
                    <Typography sx={{ fontSize: 10.5, lineHeight: 1.3, color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
                      {t("Pages.Detail.tooltip.fairValue.epsLabel")} {formatSingleValue(estimatedEps)}
                    </Typography>
                    <Typography sx={{ fontSize: 10.5, lineHeight: 1.3, color: "text.secondary", fontVariantNumeric: "tabular-nums" }}>
                      {t(`Pages.Detail.tooltip.fairValue.${isTaiwanStock ? "medianPeLabel" : "peLabel"}`)} {formatSingleValue(referencePe, t("Pages.Detail.tooltip.times"))}
                    </Typography>
                  </Box>;
                })}
              </Box>
            ) : <Typography variant="caption" sx={{ color: "text.secondary" }}>{t(`Pages.Detail.tooltip.fairValue.${isTaiwanStock && medianLoading ? "loadingMedian" : "unavailable"}`)}</Typography>}
          </Section>
        )}

        {/* 近期EPS */}
        {recentFundamental && (
          <Section testId="fundamental-section-eps" title={t("Pages.Detail.tooltip.recentEps")} color="info.main">
            <Box>
              {[1, 2, 3, 4].map((quarter) => (
                <MetricItem
                  key={`quarter-${quarter}`}
                  label={recentFundamental[`eps_recent_q${quarter}_name` as keyof RecentFundamentalTableType] as string || t("Pages.Detail.tooltip.recentQuarter", { count: quarter })}
                  value={recentFundamental[`eps_recent_q${quarter}` as keyof RecentFundamentalTableType]}
                  suffix={t("Pages.Detail.tooltip.currency")}
                />
              ))}
              {[1, 2, 3, 4].map((year) => (
                <MetricItem
                  key={`year-${year}`}
                  label={recentFundamental[`eps_recent_y${year}_name` as keyof RecentFundamentalTableType] as string || t("Pages.Detail.tooltip.recentYear", { count: year })}
                  value={recentFundamental[`eps_recent_y${year}` as keyof RecentFundamentalTableType]}
                  suffix={t("Pages.Detail.tooltip.currency")}
                />
              ))}
            </Box>
          </Section>
        )}

        {/* 估值指標 */}
        {financialMetrics && (
          <Section testId="fundamental-section-valuation" title={t("Pages.Detail.tooltip.valuation")} color="primary.main">
            <Box>
              <MetricItem
                label={t("Pages.Detail.tooltip.pe")}
                value={financialMetrics.pe}
                suffix={t("Pages.Detail.tooltip.times")}
              />
              <MetricItem
                label={t("Pages.Detail.tooltip.pb")}
                value={financialMetrics.pb}
                suffix={t("Pages.Detail.tooltip.times")}
              />
              <MetricItem
                label={t("Pages.Detail.tooltip.yield")}
                value={financialMetrics.dividend_yield}
                suffix="%"
              />
              <MetricItem
                label={t("Pages.Detail.tooltip.bookValue")}
                value={financialMetrics.book_value_per_share}
                suffix={t("Pages.Detail.tooltip.currency")}
              />
            </Box>
          </Section>
        )}

        {/* 近期營收 */}
        {recentFundamental && (
          <Section testId="fundamental-section-revenue" title={t("Pages.Detail.tooltip.revenue")} color="warning.main">
            <Box>
              {[1, 2, 3, 4].map((month) => {
                const momKey =
                  `revenue_recent_m${month}_mom` as keyof RecentFundamentalTableType;
                const yoyKey =
                  `revenue_recent_m${month}_yoy` as keyof RecentFundamentalTableType;
                const nameKey =
                  `revenue_recent_m${month}_name` as keyof RecentFundamentalTableType;

                return (
                  <MetricItem
                    key={month}
                    label={String(recentFundamental[nameKey] ?? "") || t("Pages.Detail.tooltip.recentMonth", { count: month })}
                    value={[
                      recentFundamental[momKey],
                      recentFundamental[yoyKey],
                    ]}
                  />
                );
              })}
            </Box>
          </Section>
        )}

        {tdccHolder && (
          <Section fullWidth testId="fundamental-section-tdcc" title={t("Pages.Detail.tooltip.tdcc.title")} color="secondary.main">
            <Typography variant="caption" sx={{ display: "block", mb: 0.65, fontSize: 12, lineHeight: 1.35, color: "text.secondary", overflowWrap: "anywhere" }}>
              {tdccHolder.previous_date
                ? t("Pages.Detail.tooltip.tdcc.dataPeriod", {
                    current: formatDate(tdccHolder.data_date),
                    previous: formatDate(tdccHolder.previous_date),
                  })
                : t("Pages.Detail.tooltip.tdcc.dataDate", {
                    date: formatDate(tdccHolder.data_date),
                  })}
            </Typography>
            <Box data-testid="tdcc-holder-cards" sx={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 0.65, minWidth: 0, "@media (max-width: 340px)": { gridTemplateColumns: "minmax(0, 1fr)" } }}>
              <HolderChangeItem
                label={t("Pages.Detail.tooltip.tdcc.holders100")}
                current={tdccHolder.holders_100}
                previous={tdccHolder.previous_holders_100}
              />
              <HolderChangeItem
                label={t("Pages.Detail.tooltip.tdcc.holders400")}
                current={tdccHolder.holders_400}
                previous={tdccHolder.previous_holders_400}
              />
              <HolderChangeItem
                label={t("Pages.Detail.tooltip.tdcc.holders1000")}
                current={tdccHolder.holders_1000}
                previous={tdccHolder.previous_holders_1000}
              />
            </Box>
          </Section>
        )}
      </Box>

      {/* 如果沒有資料的提示 */}
      {!financialMetrics && !recentFundamental && !tdccHolder && (
        <Box sx={{ textAlign: "center", py: 3 }}>
          <Typography variant="body2" color="text.secondary">
            {t("Pages.Detail.tooltip.noFinancialData")}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
