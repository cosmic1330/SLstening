import {
  ArrowDownwardRounded,
  ArrowUpwardRounded,
  CheckRounded,
  RemoveRounded,
  WarningAmberRounded,
} from "@mui/icons-material";
import { Box, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { ChipData } from "../../../api/marketApi";
import { primitiveTokens, semanticTokens } from "../../../theme";

export type LightStatus =
  | ChipData["lights"]["institutional"]
  | ChipData["lights"]["foreignHolding"]
  | ChipData["lights"]["lendingPressure"];

type Tone = "positive" | "negative" | "warning" | "neutral";

const toneColor: Record<Tone, string> = {
  positive: semanticTokens.market.gain,
  negative: semanticTokens.market.loss,
  warning: semanticTokens.market.warning,
  neutral: semanticTokens.market.neutral,
};

const toneForStatus = (status: LightStatus): Tone => {
  if (["buying", "increasing", "easing"].includes(status)) return "positive";
  if (["selling", "decreasing"].includes(status)) return "negative";
  if (status === "high") return "warning";
  return "neutral";
};

function StatusIcon({ tone }: { tone: Tone }) {
  const sx = { fontSize: 15 };
  if (tone === "positive") return <CheckRounded aria-hidden="true" sx={sx} />;
  if (tone === "negative")
    return <ArrowDownwardRounded aria-hidden="true" sx={sx} />;
  if (tone === "warning")
    return <WarningAmberRounded aria-hidden="true" sx={sx} />;
  return <RemoveRounded aria-hidden="true" sx={sx} />;
}

export const createNumberFormatter = (locale: string) =>
  new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });

export const signedLots = (
  value: number,
  formatter: Intl.NumberFormat,
) => (value > 0 ? "+" : "") + formatter.format(value / 1000);

export function SectionCard({
  id,
  title,
  meta,
  icon,
  children,
  fill = false,
}: {
  id: string;
  title: string;
  meta?: string;
  icon?: ReactNode;
  children: ReactNode;
  fill?: boolean;
}) {
  return (
    <Box
      component="section"
      aria-labelledby={id}
      sx={{
        overflow: "hidden",
        height: fill ? "100%" : "auto",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        borderRadius: primitiveTokens.radius.md + "px",
        bgcolor: semanticTokens.analysis.panel,
        border: "1px solid " + semanticTokens.analysis.divider,
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={1}
        sx={{
          minHeight: 36,
          flexShrink: 0,
          px: { xs: 1, sm: 1.25 },
          borderBottom: "1px solid " + semanticTokens.analysis.divider,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={0.75} minWidth={0}>
          {icon && (
            <Box
              aria-hidden="true"
              sx={{
                display: "grid",
                placeItems: "center",
                color: semanticTokens.analysis.textMuted,
                "& .MuiSvgIcon-root": { fontSize: 17 },
              }}
            >
              {icon}
            </Box>
          )}
          <Typography
            id={id}
            component="h2"
            variant="subtitle2"
            color={semanticTokens.analysis.text}
            fontWeight={750}
            sx={{ letterSpacing: "0.01em" }}
          >
            {title}
          </Typography>
        </Stack>
        {meta && (
          <Typography
            variant="caption"
            color={semanticTokens.analysis.textMuted}
            textAlign="right"
            sx={{ fontSize: 11 }}
          >
            {meta}
          </Typography>
        )}
      </Stack>
      <Box
        sx={{
          px: { xs: 1, sm: 1.25 },
          py: 0.8,
          flex: fill ? 1 : "none",
          minHeight: 0,
          display: fill ? "flex" : "block",
          flexDirection: fill ? "column" : undefined,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

export function StatusCard({
  label,
  status,
  detail,
}: {
  label: string;
  status: LightStatus;
  detail: string;
}) {
  const { t } = useTranslation();
  const tone = toneForStatus(status);
  const color = toneColor[tone];

  return (
    <Box
      sx={{
        minWidth: 0,
        minHeight: 72,
        px: 0.75,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 0.25,
        borderRight: "1px solid " + semanticTokens.analysis.dividerSubtle,
        "&:last-child": { borderRight: 0 },
      }}
    >
      <Typography
        variant="body2"
        color={semanticTokens.analysis.textMuted}
        noWrap
        sx={{ fontSize: 11 }}
      >
        {label}
      </Typography>
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.35}
        sx={{ color }}
      >
        <StatusIcon tone={tone} />
        <Typography variant="caption" color="inherit" fontWeight={700} noWrap>
          {t("Pages.Detail.Chip.light.status." + status)}
        </Typography>
      </Stack>
      <Typography
        variant="body2"
        color={semanticTokens.analysis.text}
        fontWeight={700}
        textAlign="center"
        noWrap
        sx={{
          fontFamily: primitiveTokens.font.numeric,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {detail}
      </Typography>
    </Box>
  );
}

export function MetricCard({
  label,
  value,
  direction,
  emphasized = false,
}: {
  label: string;
  value: string;
  direction?: number;
  emphasized?: boolean;
}) {
  const directional = direction !== undefined && direction !== 0;
  const color =
    direction === undefined || direction === 0
      ? semanticTokens.analysis.text
      : direction > 0
        ? semanticTokens.market.gain
        : semanticTokens.market.loss;

  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      alignItems={{ xs: "stretch", sm: "center" }}
      justifyContent="space-between"
      spacing={{ xs: 0.1, sm: 1 }}
      sx={{
        minHeight: { xs: 35, sm: 32 },
        py: { xs: 0.1, sm: 0.3 },
        borderBottom: "1px solid " + semanticTokens.analysis.dividerSubtle,
        "&:last-child": { borderBottom: 0 },
      }}
    >
      <Typography
        variant="body2"
        color={
          emphasized
            ? semanticTokens.analysis.text
            : semanticTokens.analysis.textMuted
        }
        fontWeight={emphasized ? 700 : 500}
        sx={{
          fontSize: { xs: 10.5, sm: 11.5 },
          lineHeight: 1.2,
          whiteSpace: { xs: "normal", sm: "nowrap" },
        }}
      >
        {label}
      </Typography>
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.35}
        sx={{ alignSelf: { xs: "flex-end", sm: "auto" } }}
      >
        {directional &&
          (direction > 0 ? (
            <ArrowUpwardRounded aria-hidden="true" sx={{ color, fontSize: 15 }} />
          ) : (
            <ArrowDownwardRounded aria-hidden="true" sx={{ color, fontSize: 15 }} />
          ))}
        {!directional && direction !== undefined && (
          <RemoveRounded
            aria-hidden="true"
            sx={{ color: semanticTokens.market.neutral, fontSize: 15 }}
          />
        )}
        <Typography
          variant="body2"
          color={color}
          fontWeight={emphasized ? 800 : 700}
          sx={{
            fontFamily: primitiveTokens.font.numeric,
            fontVariantNumeric: "tabular-nums",
            whiteSpace: { xs: "normal", sm: "nowrap" },
            textAlign: "right",
          }}
        >
          {value}
        </Typography>
      </Stack>
    </Stack>
  );
}
