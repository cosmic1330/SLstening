import { Box, Grid, styled, Typography } from "@mui/material";
import useIndicatorSettings from "../../../hooks/useIndicatorSettings";
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
    border: "2px solid #3D5A45",
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
  background: "#3D5A45",
  border: "2px solid #2D4A35",
  color: "#F1E5AC",
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
  const { settings, updateSetting, resetSettings } = useIndicatorSettings();

  const settingItems = [
    { key: "ma5", label: "MA 短 (5)" },
    { key: "ma10", label: "MA 中 (10)" },
    { key: "ma20", label: "MA 長 (30)" },
    { key: "ma60", label: "MA 季 (60)" },
    { key: "ma240", label: "MA 年 (240)" },
    { key: "emaShort", label: "EMA 短" },
    { key: "emaLong", label: "EMA 長" },
    { key: "boll", label: "布林 (30)" },
    { key: "kd", label: "KD (9)" },
    { key: "rsi", label: "RSI (5)" },
    { key: "mfi", label: "MFI (14)" },
    { key: "cmf", label: "CMF (21)" },
    { key: "cmfEma", label: "CMF EMA (5)" },
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
                    color: "#8B7355",
                    fontWeight: 800,
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
