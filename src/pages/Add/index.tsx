import { Box, Button, Container as MuiContainer, Stack, Typography, createTheme, ThemeProvider, styled, alpha } from "@mui/material";
import { emit } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useCallback } from "react";
import { useForm } from "react-hook-form";
import useDownloadStocks from "../../hooks/useDownloadStocks";
import useStocksStore from "../../store/Stock.store";
import Menu from "./Menu";
import type FormData from "./type";
import { info } from "@tauri-apps/plugin-log";
import { t } from "i18next";

// --- Styled Components (Shared style with Login) ---

const Container = styled(MuiContainer)`
  min-height: 100vh;
  width: 100%;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #0f1214;
  background-image: 
    radial-gradient(at 0% 0%, hsla(253,16%,7%,1) 0, transparent 50%), 
    radial-gradient(at 50% 0%, hsla(225,39%,25%,1) 0, transparent 50%), 
    radial-gradient(at 100% 0%, hsla(339,49%,25%,1) 0, transparent 50%),
    url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23noiseFilter)' opacity='0.04'/%3E%3C/svg%3E");
  background-size: 100% 100%, 100% 100%, 100% 100%, 200px 200px;
  background-repeat: no-repeat, no-repeat, no-repeat, repeat;
`;

const GlassCard = styled(Box)(({ theme }) => ({
  background: "rgba(30, 30, 40, 0.6)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  borderRadius: "20px",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.3)",
  padding: theme.spacing(3),
  width: "100%",
  maxWidth: "360px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: theme.spacing(1.5),
}));

// Custom Button
const GradientButton = styled(Button)(({ theme }) => ({
  borderRadius: "12px",
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  textTransform: "none",
  fontWeight: 600,
  color: "white",
  boxShadow: "0 4px 15px rgba(100, 100, 255, 0.3)",
  "&:hover": {
    background: "linear-gradient(135deg, #764ba2 0%, #667eea 100%)",
    boxShadow: "0 6px 20px rgba(100, 100, 255, 0.4)",
  },
}));

function Add() {
  const { increase, reload } = useStocksStore();
  const { handleDownloadMenu, disable } = useDownloadStocks();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>();

  const closeWindow = useCallback(async () => {
    const webview = getCurrentWindow();
    webview.close();
  }, []);

  const onSubmit = useCallback(async (data: FormData) => {
    if (data.stock) {
      await reload();
      increase(data.stock);
      await emit("stock-added", { stockNumber: data.stock.id });
      reset();
    } else {
      info(t("Pages.Add.noStock"));
    }
  }, []);

  const handleDownload = useCallback(async () => {
    await handleDownloadMenu();
    await reload();
  }, []);

  return (
    <ThemeProvider
      theme={createTheme({
        palette: {
          mode: "dark",
        },
      })}
    >
      <Container>
        <GlassCard>
            {/* Removed redundant header for conciseness */}
            
          <form onSubmit={handleSubmit(onSubmit)} style={{ width: "100%" }}>
            <Box mb={1.5} mt={0.5}>
              <Menu {...{ control, errors }} />
            </Box>
            <Stack direction="row" spacing={1.5} mt={2}>
              <Button 
                onClick={closeWindow} 
                fullWidth
                size="medium"
                sx={{ 
                    color: "rgba(255,255,255,0.7)", 
                    textTransform: "none",
                    borderRadius: "10px",
                    "&:hover": { backgroundColor: "rgba(255,255,255,0.05)" }
                }}
              >
                {t("Pages.Add.close")}
              </Button>
              <GradientButton type="submit" fullWidth size="medium">
                {t("Pages.Add.add")}
              </GradientButton>
            </Stack>
          </form>

          <Box mt={0.5} textAlign="center">
            {disable ? (
              <Typography variant="caption" color="rgba(255,255,255,0.5)">{t("Pages.Add.download")}</Typography>
            ) : (
              <Button
                onClick={handleDownload}
                sx={{ 
                    fontSize: "0.75rem",
                    color: "rgba(255,255,255,0.5)", 
                    textTransform: "none",
                    textDecoration: "underline",
                    "&:hover": { color: "white" }
                }}
              >
                {t("Pages.Add.notFoundOptions")}
              </Button>
            )}
          </Box>
        </GlassCard>
      </Container>
    </ThemeProvider>
  );
}

export default Add;
