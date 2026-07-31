import { AccountBalanceRounded, GroupsRounded } from "@mui/icons-material";
import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import type { ChipData } from "../../../api/marketApi";
import { semanticTokens } from "../../../theme";
import {
  createNumberFormatter,
  MetricCard,
  SectionCard,
  signedLots,
  StatusCard,
} from "./chipUi";

export default function OverviewPanel({ data }: { data: ChipData }) {
  const { t, i18n } = useTranslation();
  const number = createNumberFormatter(i18n.language);
  const lots = t("Pages.Detail.Chip.light.lots");
  const unavailable = "--";

  return (
    <Box
      sx={{
        height: "100%",
        minHeight: 0,
        display: "grid",
        gridTemplateRows: "auto minmax(0, 1fr)",
        gap: 1,
      }}
    >
      <SectionCard
        id="chip-lights-title"
        title={t("Pages.Detail.Chip.light.title")}
      >
        <Typography
          variant="body2"
          color={semanticTokens.analysis.textMuted}
          sx={{ mb: 0.75, lineHeight: 1.5 }}
        >
          {t("Pages.Detail.Chip.light.summary." + data.lights.summary)}
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            borderTop: "1px solid " + semanticTokens.analysis.dividerSubtle,
          }}
        >
          <StatusCard
            label={t("Pages.Detail.Chip.light.institutional")}
          status={data.lights.institutional}
          detail={signedLots(data.institutional.total5d, number) + " " + lots}
        />
          <StatusCard
            label={t("Pages.Detail.Chip.light.foreignHolding")}
          status={data.lights.foreignHolding}
          detail={
            data.lights.foreignRatio === null
              ? unavailable
              : number.format(data.lights.foreignRatio) + "%"
          }
        />
          <StatusCard
            label={t("Pages.Detail.Chip.light.lendingPressure")}
          status={data.lights.lendingPressure}
          detail={
            data.lights.lendingChangePercent === null
              ? unavailable
              : (data.lights.lendingChangePercent > 0 ? "+" : "") +
                number.format(data.lights.lendingChangePercent) +
                "%"
            }
          />
        </Box>
      </SectionCard>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 1,
          alignItems: "stretch",
          minHeight: 0,
        }}
      >
        <SectionCard
          fill
          id="institution-title"
          title={t("Pages.Detail.Chip.institutional")}
          meta={t("Pages.Detail.Chip.fiveDaysLots")}
          icon={<AccountBalanceRounded />}
        >
          <MetricCard
            label={t("Pages.Detail.Chip.foreign")}
            value={signedLots(data.institutional.foreign5d, number) + " " + lots}
            direction={data.institutional.foreign5d}
          />
          <MetricCard
            label={t("Pages.Detail.Chip.trust")}
            value={signedLots(data.institutional.trust5d, number) + " " + lots}
            direction={data.institutional.trust5d}
          />
          <MetricCard
            label={t("Pages.Detail.Chip.dealer")}
            value={signedLots(data.institutional.dealer5d, number) + " " + lots}
            direction={data.institutional.dealer5d}
          />
          <MetricCard
            label={t("Pages.Detail.Chip.total")}
            value={signedLots(data.institutional.total5d, number) + " " + lots}
            direction={data.institutional.total5d}
            emphasized
          />
        </SectionCard>

        <SectionCard
          fill
          id="margin-title"
          title={t("Pages.Detail.Chip.margin")}
          icon={<GroupsRounded />}
        >
          <MetricCard
            label={t("Pages.Detail.Chip.marginBalance")}
            value={number.format(data.margin.marginBalance) + " " + lots}
          />
          <MetricCard
            label={t("Pages.Detail.Chip.marginChange")}
            value={
              (data.margin.marginChangePercent5d > 0 ? "+" : "") +
              number.format(data.margin.marginChangePercent5d) +
              "%"
            }
            direction={data.margin.marginChange5d}
          />
          <MetricCard
            label={t("Pages.Detail.Chip.shortRatio")}
            value={number.format(data.margin.shortMarginRatio) + "%"}
          />
        </SectionCard>
      </Box>
    </Box>
  );
}
