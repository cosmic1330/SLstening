import useIndicatorSettings from "../../../hooks/useIndicatorSettings";
import { Box, Button, styled, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

const indicatorPalette = {
  ink: "#171717",
  muted: "#6D625D",
  outline: "#191919",
  blue: "#6BB7E8",
  yellow: "#F3D36D",
  white: "#FFFFFF",
} as const;

const SettingGridItem = styled(Box)({
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  gap: 6,
  minWidth: 0,
  minHeight: 74,
  padding: "10px 11px",
  border: "2px solid rgba(25, 25, 25, 0.16)",
  borderRadius: 16,
  backgroundColor: "rgba(107, 183, 232, 0.12)",
  transition: "background-color 200ms ease, transform 200ms ease",
  "&:hover": {
    backgroundColor: "rgba(107, 183, 232, 0.22)",
    transform: "translateY(-1px)",
  },
  "&:focus-within": {
    borderColor: indicatorPalette.outline,
    outline: `3px solid ${indicatorPalette.blue}`,
    outlineOffset: 2,
    backgroundColor: "rgba(107, 183, 232, 0.26)",
  },
  "@media (prefers-reduced-motion: reduce)": {
    transition: "none",
  },
});

const StyledInput = styled("input")({
  boxSizing: "border-box",
  minWidth: 0,
  width: "100%",
  minHeight: 44,
  padding: "2px 0",
  background: "transparent",
  border: "none",
  color: indicatorPalette.ink,
  fontFamily: '"Roboto Mono", "SFMono-Regular", Consolas, monospace',
  fontSize: "1.08rem",
  fontVariantNumeric: "tabular-nums",
  fontWeight: 900,
  lineHeight: 1.2,
  outline: "none",
  "&::-webkit-inner-spin-button, &::-webkit-outer-spin-button": {
    appearance: "none",
    margin: 0,
  },
  "&:focus-visible": {
    outline: `2px solid ${indicatorPalette.outline}`,
    outlineOffset: 3,
    borderRadius: 4,
  },
});

const ResetButton = styled(Button)({
  minHeight: 44,
  padding: "7px 12px",
  border: `2px solid ${indicatorPalette.outline}`,
  borderRadius: 13,
  backgroundColor: indicatorPalette.yellow,
  boxShadow: "3px 3px 0 rgba(25, 25, 25, 0.92)",
  color: indicatorPalette.ink,
  fontSize: "0.76rem",
  fontWeight: 900,
  lineHeight: 1.15,
  textTransform: "none",
  transition: "transform 150ms ease, box-shadow 150ms ease, background-color 150ms ease",
  "&:hover": {
    backgroundColor: "#EBC85A",
    boxShadow: "2px 2px 0 rgba(25, 25, 25, 0.92)",
    transform: "translate(1px, 1px)",
  },
  "&:focus-visible": {
    outline: `3px solid ${indicatorPalette.blue}`,
    outlineOffset: 3,
  },
  "@media (prefers-reduced-motion: reduce)": {
    transition: "none",
  },
});

export default function IndicatorSettingsSection() {
  const { t } = useTranslation();
  const { settings, updateSetting, resetSettings } = useIndicatorSettings();

  const settingItems = [
    "ma5",
    "ma10",
    "ma20",
    "ma60",
    "ma240",
    "emaShort",
    "emaLong",
    "boll",
    "donchian",
    "kd",
    "rsi",
    "mfi",
    "cmf",
    "cmfEma",
    "cci",
  ] as const;

  return (
    <Box component="section" aria-labelledby="indicator-settings-heading">
      <Box sx={{ display: "flex", alignItems: { xs: "flex-start", sm: "center" }, justifyContent: "space-between", gap: 1.5, mb: 1.25, flexWrap: "wrap" }}>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography id="indicator-settings-heading" component="h3" sx={{ color: indicatorPalette.ink, fontSize: "0.92rem", fontWeight: 950, lineHeight: 1.2 }}>
            {t("settings.indicatorControls")}
          </Typography>
          <Typography id="indicator-settings-help" component="p" sx={{ mt: 0.4, color: indicatorPalette.muted, fontSize: "0.75rem", fontWeight: 600, lineHeight: 1.4 }}>
            {t("settings.indicatorHelp")}
          </Typography>
        </Box>
        <ResetButton type="button" onClick={resetSettings} aria-describedby="indicator-settings-help">
          {t("settings.resetIndicators")}
        </ResetButton>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, minmax(0, 1fr))",
            sm: "repeat(3, minmax(0, 1fr))",
            md: "repeat(4, minmax(0, 1fr))",
            lg: "repeat(5, minmax(0, 1fr))",
          },
          gap: { xs: 0.9, sm: 1.1 },
        }}
      >
        {settingItems.map((item) => (
          <SettingGridItem key={item}>
            <Typography
              component="label"
              htmlFor={`indicator-${item}`}
              sx={{
                minWidth: 0,
                color: indicatorPalette.muted,
                fontSize: { xs: "0.64rem", sm: "0.68rem" },
                fontWeight: 900,
                letterSpacing: "0.02em",
                lineHeight: 1.25,
                overflowWrap: "anywhere",
              }}
            >
              {t(`settings.indicator.${item}`)}
            </Typography>
            <StyledInput
              id={`indicator-${item}`}
              type="number"
              value={settings[item]}
              onChange={(event) => updateSetting(item, parseInt(event.target.value, 10) || 0)}
              onWheel={(event) => (event.target as HTMLInputElement).blur()}
              aria-label={t(`settings.indicator.${item}`)}
              aria-describedby="indicator-settings-help"
              inputMode="numeric"
            />
          </SettingGridItem>
        ))}
      </Box>
    </Box>
  );
}
