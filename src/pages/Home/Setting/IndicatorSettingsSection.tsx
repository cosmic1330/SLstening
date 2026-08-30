import { semanticTokens } from "../../../theme";
import { Box, Grid, styled, Typography } from "@mui/material";
import useIndicatorSettings from "../../../hooks/useIndicatorSettings";
import { useTranslation } from "react-i18next";
import StyledListSubheader from "./StyledListSubheader";

const SettingGridItem = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(0.5),
  background: "rgba(93, 64, 55, 0.05)",
  padding: theme.spacing(1.5),
  borderRadius: "12px",
  border: "1.5px solid rgba(93, 64, 55, 0.1)",
  transition: "all 0.2s ease-in-out",
  "&:hover": {
    background: "rgba(93, 64, 55, 0.08)",
    border: "1.5px solid rgba(93, 64, 55, 0.2)",
    transform: "translateY(-1px)",
  },
  "&:focus-within": {
    background: "rgba(93, 64, 55, 0.1)",
    border: `2px solid ${semanticTokens.app.primary}`,
  },
}));

const StyledInput = styled("input")({
  background: "transparent",
  border: "none",
  color: "#5D4037",
  fontSize: "1.1rem",
  fontWeight: "900",
  width: "100%",
  outline: "none",
  fontFamily: "inherit",
  "&::-webkit-inner-spin-button, &::-webkit-outer-spin-button": {
    appearance: "none",
    margin: 0,
  },
});

const ResetButton = styled("button")({
  background: semanticTokens.app.primary,
  border: "2px solid #2D4A35",
  color: semanticTokens.app.onPrimary,
  borderRadius: "8px",
  padding: "4px 12px",
  fontSize: "0.75rem",
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "0 2px 0 #2D4A35",
  transition: "all 0.2s",
  "&:hover": {
    transform: "translateY(1px)",
    boxShadow: "0 1px 0 #2D4A35",
  },
  "&:active": {
    transform: "scale(0.95)",
  },
});

export default function IndicatorSettingsSection() {
  const { t } = useTranslation();
  const { settings, updateSetting, resetSettings } = useIndicatorSettings();

  const settingItems = [
    "ma5", "ma10", "ma20", "ma60", "ma240", "emaShort", "emaLong", "boll", "donchian", "kd", "rsi", "mfi", "cmf", "cmfEma", "cci",
  ] as const;

  return (
    <>
      <StyledListSubheader
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pr: 2,
        }}
      >
        {t("settings.indicators")}
        <ResetButton onClick={resetSettings} aria-describedby="indicator-settings-help">{t("settings.resetIndicators")}</ResetButton>
      </StyledListSubheader>

      <Box sx={{ p: 2, pt: 1 }}>
        <Typography id="indicator-settings-help" variant="caption" sx={{ display: "block", mb: 1, color: "#8B7355" }}>
          {t("settings.indicatorHelp")}
        </Typography>
        <Grid container spacing={2}>
          {settingItems.map((item) => (
            <Grid size={4} key={item}>
              <SettingGridItem>
                <Typography
                  variant="caption"
                  sx={{
                    color: "#8B7355",
                    fontWeight: 800,
                    fontSize: "0.65rem",
                    letterSpacing: "0.05rem",
                    textTransform: "uppercase",
                  }}
                  id={`indicator-${item}-label`}
                >
                  {t(`settings.indicator.${item}`)}
                </Typography>
                <StyledInput
                  type="number"
                  value={settings[item]}
                  onChange={(e) =>
                    updateSetting(item, parseInt(e.target.value) || 0)
                  }
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  aria-labelledby={`indicator-${item}-label`}
                  aria-describedby="indicator-settings-help"
                />
              </SettingGridItem>
            </Grid>
          ))}
        </Grid>
      </Box>
    </>
  );
}
