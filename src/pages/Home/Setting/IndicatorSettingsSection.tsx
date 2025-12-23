import { Box, Typography, Grid, styled } from "@mui/material";
import useIndicatorSettings from "../../../hooks/useIndicatorSettings";
import StyledListSubheader from "./StyledListSubheader";

const SettingGridItem = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(0.5),
  background: "rgba(255, 255, 255, 0.03)",
  padding: theme.spacing(1.5),
  borderRadius: "16px",
  border: "1px solid rgba(255, 255, 255, 0.05)",
  transition: "all 0.2s ease-in-out",
  "&:hover": {
    background: "rgba(255, 255, 255, 0.06)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    transform: "translateY(-2px)",
  },
  "&:focus-within": {
    background: "rgba(255, 255, 255, 0.08)",
    border: "1px solid rgba(144, 202, 249, 0.3)",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)",
  },
}));

const StyledInput = styled("input")({
  background: "transparent",
  border: "none",
  color: "white",
  fontSize: "1.1rem",
  fontWeight: "800",
  width: "100%",
  outline: "none",
  fontFamily: "inherit",
  "&::-webkit-inner-spin-button, &::-webkit-outer-spin-button": {
    appearance: "none",
    margin: 0,
  },
});

const ResetButton = styled("button")({
  background: "rgba(255, 255, 255, 0.05)",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  color: "rgba(255, 255, 255, 0.6)",
  borderRadius: "8px",
  padding: "4px 10px",
  fontSize: "0.75rem",
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 0.2s",
  "&:hover": {
    background: "rgba(255, 255, 255, 0.15)",
    color: "white",
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  "&:active": {
    transform: "scale(0.95)",
  },
});

export default function IndicatorSettingsSection() {
  const { settings, updateSetting, resetSettings } = useIndicatorSettings();

  const settingItems = [
    { key: "ma5", label: "MA 短 (5)" },
    { key: "ma10", label: "MA 中 (10)" },
    { key: "ma20", label: "MA 長 (20)" },
    { key: "ma60", label: "MA 季 (60)" },
    { key: "boll", label: "布林 (20)" },
    { key: "kd", label: "KD (9)" },
    { key: "mfi", label: "MFI (14)" },
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
        技術指標設定
        <ResetButton onClick={resetSettings}>回復初始值</ResetButton>
      </StyledListSubheader>

      <Box sx={{ p: 2, pt: 1 }}>
        <Grid container spacing={2}>
          {settingItems.map((item) => (
            <Grid size={4} key={item.key}>
              <SettingGridItem>
                <Typography
                  variant="caption"
                  sx={{
                    color: "rgba(255, 255, 255, 0.4)",
                    fontWeight: 700,
                    fontSize: "0.65rem",
                    letterSpacing: "0.05rem",
                    textTransform: "uppercase",
                  }}
                >
                  {item.label}
                </Typography>
                <StyledInput
                  type="number"
                  value={settings[item.key]}
                  onChange={(e) =>
                    updateSetting(item.key, parseInt(e.target.value) || 0)
                  }
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                />
              </SettingGridItem>
            </Grid>
          ))}
        </Grid>
      </Box>
    </>
  );
}
