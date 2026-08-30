import { Box, Grid, Skeleton, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { normalizeLanguage } from "../../../i18n";
import { supabase } from "../../../supabase";
import {
  FinancialMetricTableType,
  RecentFundamentalTableType,
} from "../../../types";

export default function Fundamental({ id }: { id: string | undefined }) {
  const { t, i18n } = useTranslation();
  const [financialMetrics, setFinancialMetrics] =
    useState<FinancialMetricTableType | null>(null);
  const [recentFundamental, setRecentFundamental] =
    useState<RecentFundamentalTableType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      try {
        // 並行載入兩個表的資料
        const [financialResult, recentResult] = await Promise.all([
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
        ]);

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
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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
      </Grid>

      {/* 如果沒有資料的提示 */}
      {!financialMetrics && !recentFundamental && (
        <Box sx={{ textAlign: "center", py: 3 }}>
          <Typography variant="body2" color="text.secondary">
            {t("Pages.Detail.tooltip.noFinancialData")}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
