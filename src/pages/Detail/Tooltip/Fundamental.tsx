import { Box, Grid, Skeleton, Typography } from "@mui/material";
import ArrowDownwardRounded from "@mui/icons-material/ArrowDownwardRounded";
import ArrowUpwardRounded from "@mui/icons-material/ArrowUpwardRounded";
import RemoveRounded from "@mui/icons-material/RemoveRounded";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizeLanguage } from "../../../i18n";
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
          console.error(
            "Error fetching financial metrics:",
            financialResult.error
          );
        } else {
          setFinancialMetrics(financialResult.data);
        }

        if (recentResult.error) {
          console.error(
            "Error fetching recent fundamental data:",
            recentResult.error
          );
        } else {
          setRecentFundamental(recentResult.data);
        }

        if (tdccResult.error) {
          console.error("Error fetching TDCC holder data:", tdccResult.error);
        } else {
          setTdccHolder(tdccResult.data as TdccHolderTableType | null);
        }
      } catch (error) {
        if (isCurrentRequest) {
          console.error("Error fetching data:", error);
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
        sx={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 1,
          mb: 0.45,
        }}
      >
        <Typography variant="caption" sx={{ fontSize: "0.7rem", color: "text.secondary" }}>
          {label}
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 0.5, minWidth: 0 }}>
          <Typography
            variant="caption"
            sx={{ fontSize: "0.7rem", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}
          >
            {current === null
              ? t("Pages.Detail.tooltip.unavailable")
              : t("Pages.Detail.tooltip.tdcc.currentHolders", {
                  value: formatInteger(current),
                })}
          </Typography>
          <Box sx={{ display: "inline-flex", alignItems: "center", color, whiteSpace: "nowrap" }}>
            <DirectionIcon aria-hidden="true" sx={{ fontSize: "0.9rem", mr: 0.2 }} />
            <Typography component="span" variant="caption" sx={{ fontSize: "0.7rem", color: "inherit", fontVariantNumeric: "tabular-nums" }}>
              {changeText}
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  };

  const MetricItem = ({
    label,
    value,
    suffix = "",
    decimals = 2,
    flex = true,
  }: {
    label: string;
    value: any;
    suffix?: string;
    decimals?: number;
    flex?: boolean;
  }) => (
    <Box
      sx={{
        display: flex ? "flex" : "block",
        justifyContent: flex ? "space-between" : "flex-start",
        mb: 0.3,
      }}
    >
      <Typography
        variant="caption"
        sx={{ fontSize: "0.7rem", color: "text.secondary" }}
      >
        {label}:
      </Typography>
      <Typography
        variant="caption"
        component="div"
        sx={{
          fontWeight: "medium",
          fontSize: "0.7rem",
          ...(flex ? {} : { display: "block", mt: 0.2 }),
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
      <Box sx={{ p: 3, minWidth: 300 }}>
        <Skeleton variant="text" width="80%" height={30} />
        <Skeleton variant="text" width="60%" height={20} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" width="80%" height={200} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 1 }}>
      <Grid container spacing={3}>
        {/* 估值指標 */}
        {financialMetrics && (
          <Grid size={6}>
            <Typography
              variant="subtitle2"
              sx={{
                mb: 1.5,
                fontWeight: "bold",
                color: "primary.main",
                borderBottom: 1,
                borderColor: "primary.light",
                pb: 0.5,
              }}
            >
              {t("Pages.Detail.tooltip.valuation")}
            </Typography>
            <Box>
              <MetricItem
                flex={false}
                label={t("Pages.Detail.tooltip.pe")}
                value={financialMetrics.pe}
                suffix={t("Pages.Detail.tooltip.times")}
              />
              <MetricItem
                flex={false}
                label={t("Pages.Detail.tooltip.pb")}
                value={financialMetrics.pb}
                suffix={t("Pages.Detail.tooltip.times")}
              />
              <MetricItem
                flex={false}
                label={t("Pages.Detail.tooltip.yield")}
                value={financialMetrics.dividend_yield}
                suffix="%"
              />
              <MetricItem
                flex={false}
                label={t("Pages.Detail.tooltip.bookValue")}
                value={financialMetrics.book_value_per_share}
                suffix={t("Pages.Detail.tooltip.currency")}
              />
            </Box>
          </Grid>
        )}

        {/* 近期EPS */}
        {recentFundamental && (
          <Grid size={6}>
            <Typography
              variant="subtitle2"
              sx={{
                mb: 1.5,
                fontWeight: "bold",
                color: "info.main",
                borderBottom: 1,
                borderColor: "info.light",
                pb: 0.5,
              }}
            >
              {t("Pages.Detail.tooltip.recentEps")}
            </Typography>
            <Box>
              <MetricItem
                label={recentFundamental.eps_recent_q1_name || t("Pages.Detail.tooltip.recentQuarter", { count: 1 })}
                value={recentFundamental.eps_recent_q1}
                suffix={t("Pages.Detail.tooltip.currency")}
              />
              <MetricItem
                label={recentFundamental.eps_recent_q2_name || t("Pages.Detail.tooltip.recentQuarter", { count: 2 })}
                value={recentFundamental.eps_recent_q2}
                suffix={t("Pages.Detail.tooltip.currency")}
              />
              <MetricItem
                label={recentFundamental.eps_recent_q3_name || t("Pages.Detail.tooltip.recentQuarter", { count: 3 })}
                value={recentFundamental.eps_recent_q3}
                suffix={t("Pages.Detail.tooltip.currency")}
              />
              <MetricItem
                label={recentFundamental.eps_recent_q4_name || t("Pages.Detail.tooltip.recentQuarter", { count: 4 })}
                value={recentFundamental.eps_recent_q4}
                suffix={t("Pages.Detail.tooltip.currency")}
              />
              <MetricItem
                label={recentFundamental.eps_recent_y1_name || t("Pages.Detail.tooltip.recentYear", { count: 1 })}
                value={recentFundamental.eps_recent_y1}
                suffix={t("Pages.Detail.tooltip.currency")}
              />
              <MetricItem
                label={recentFundamental.eps_recent_y2_name || t("Pages.Detail.tooltip.recentYear", { count: 2 })}
                value={recentFundamental.eps_recent_y2}
                suffix={t("Pages.Detail.tooltip.currency")}
              />
              <MetricItem
                label={recentFundamental.eps_recent_y3_name || t("Pages.Detail.tooltip.recentYear", { count: 3 })}
                value={recentFundamental.eps_recent_y3}
                suffix={t("Pages.Detail.tooltip.currency")}
              />

              <MetricItem
                label={recentFundamental.eps_recent_y4_name || t("Pages.Detail.tooltip.recentYear", { count: 4 })}
                value={recentFundamental.eps_recent_y4}
                suffix={t("Pages.Detail.tooltip.currency")}
              />
            </Box>
          </Grid>
        )}

        {/* 近期營收 */}
        {recentFundamental && (
          <Grid size={12}>
            <Typography
              variant="subtitle2"
              sx={{
                mb: 1.5,
                fontWeight: "bold",
                color: "warning.main",
                borderBottom: 1,
                borderColor: "warning.light",
                pb: 0.5,
              }}
            >
              {t("Pages.Detail.tooltip.revenue")}
            </Typography>
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
          </Grid>
        )}

        {tdccHolder && (
          <Grid size={12}>
            <Typography
              variant="subtitle2"
              sx={{
                mb: 0.75,
                fontWeight: "bold",
                color: "secondary.main",
                borderBottom: 1,
                borderColor: "secondary.light",
                pb: 0.5,
              }}
            >
              {t("Pages.Detail.tooltip.tdcc.title")}
            </Typography>
            <Typography variant="caption" sx={{ display: "block", mb: 0.75, fontSize: "0.68rem", color: "text.secondary" }}>
              {tdccHolder.previous_date
                ? t("Pages.Detail.tooltip.tdcc.dataPeriod", {
                    current: formatDate(tdccHolder.data_date),
                    previous: formatDate(tdccHolder.previous_date),
                  })
                : t("Pages.Detail.tooltip.tdcc.dataDate", {
                    date: formatDate(tdccHolder.data_date),
                  })}
            </Typography>
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
          </Grid>
        )}
      </Grid>

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
