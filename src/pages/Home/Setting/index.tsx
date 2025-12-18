import {
  ArrowBackIosNew as ArrowBackIcon,
  BugReport as BugReportIcon,
  CloudDownload as DownloadIcon,
  DeleteForever as ResetIcon,
  Layers as TopIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Divider,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemSecondaryAction,
  ListItemText,
  Paper,
  Stack,
  Switch,
  Typography,
  styled,
} from "@mui/material";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { sendNotification } from "@tauri-apps/plugin-notification";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router";
import useDownloadStocks from "../../../hooks/useDownloadStocks";
import useStocksStore from "../../../store/Stock.store";
// Important: Make sure this path is correct or hardcode the version
import pkg from "../../../../package.json";

const VERSION = pkg.version || "0.1.0";

// --- Styled Components ---

const PageContainer = styled(Box)`
  width: 100%;
  height: 100vh;
  overflow: auto;
  position: relative;
  background-color: #0f1214;
  background-image: radial-gradient(
      at 0% 0%,
      hsla(253, 16%, 7%, 1) 0,
      transparent 50%
    ),
    radial-gradient(at 50% 0%, hsla(225, 39%, 25%, 1) 0, transparent 50%),
    radial-gradient(at 100% 0%, hsla(339, 49%, 25%, 1) 0, transparent 50%),
    url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23noiseFilter)' opacity='0.04'/%3E%3C/svg%3E");
  background-size: 100% 100%, 100% 100%, 100% 100%, 200px 200px;
  background-repeat: no-repeat, no-repeat, no-repeat, repeat;
  color: white;
  padding-bottom: 80px; /* Space for BottomBar if any */
`;

const GlassCard = styled(Paper)(({ theme }) => ({
  background: "rgba(30, 30, 40, 0.6)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  borderRadius: "24px",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.3)",
  overflow: "hidden",
  marginTop: theme.spacing(2),
}));

const StyledListSubheader = styled(Typography)(({ theme }) => ({
  padding: theme.spacing(3, 3, 1, 3),
  color: "#90caf9",
  fontWeight: 700,
  fontSize: "0.75rem",
  letterSpacing: "0.1rem",
  textTransform: "uppercase",
}));

function Setting() {
  const { factory_reset } = useStocksStore();
  const { handleDownloadMenu, disable } = useDownloadStocks();
  const navigate = useNavigate();

  const [alwaysOnTop, setAlwaysOnTop] = useState(
    localStorage.getItem("slitenting-alwaysOnTop") === "true"
  );
  const [debugMode, setDebugMode] = useState(
    localStorage.getItem("slitenting-debugMode") === "true"
  );
  const [marketVisibility, setMarketVisibility] = useState(() => {
    const saved = localStorage.getItem("slitenting-market-info-visibility");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        /* ignore */
      }
    }
    return {
      cnn: true,
      mm: true,
      nasdaq: true,
      twse: true,
      otc: true,
      wtx: true,
    };
  });

  const handleAlwaysOnTopChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const checked = event.target.checked;
      setAlwaysOnTop(checked);
      localStorage.setItem("slitenting-alwaysOnTop", checked.toString());
      getCurrentWindow().setAlwaysOnTop(checked);
    },
    []
  );

  const handleDebugModeChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const checked = event.target.checked;
      setDebugMode(checked);
      localStorage.setItem("slitenting-debugMode", checked.toString());
    },
    []
  );

  const handleMarketVisibilityChange = useCallback(
    (key: string, checked: boolean) => {
      setMarketVisibility((prev: any) => {
        const next = { ...prev, [key]: checked };
        localStorage.setItem(
          "slitenting-market-info-visibility",
          JSON.stringify(next)
        );
        return next;
      });
    },
    []
  );

  const handleFactoryReset = useCallback(async () => {
    if (
      window.confirm("確定要清除所有資料並還原回原廠設定嗎？此動作無法復原。")
    ) {
      await factory_reset();
      sendNotification({ title: "原廠設定", body: "清除成功！" });
      window.location.reload();
    }
  }, [factory_reset]);

  return (
    <PageContainer>
      <Container maxWidth="sm" sx={{ pt: 4 }}>
        <Stack direction="row" alignItems="center" spacing={1} mb={2}>
          <IconButton
            onClick={() => navigate("/dashboard")}
            sx={{
              color: "rgba(255,255,255,0.7)",
              background: "rgba(255,255,255,0.05)",
              borderRadius: "12px",
            }}
          >
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <Typography variant="h5" fontWeight="800">
            偏好設定
          </Typography>
        </Stack>

        <GlassCard elevation={0}>
          <List disablePadding>
            <StyledListSubheader>資料管理</StyledListSubheader>

            <ListItem>
              <ListItemIcon sx={{ minWidth: 44 }}>
                <DownloadIcon sx={{ color: "#60a5fa" }} />
              </ListItemIcon>
              <ListItemText
                primary="更新股票列表"
                secondary="手動觸發台股資料庫更新"
                primaryTypographyProps={{ fontWeight: 600, color: "white" }}
                secondaryTypographyProps={{
                  color: "rgba(255,255,255,0.5)",
                  fontSize: "0.75rem",
                }}
              />
              <ListItemSecondaryAction>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleDownloadMenu}
                  disabled={disable}
                  sx={{
                    borderRadius: "10px",
                    borderColor: "rgba(96, 165, 250, 0.4)",
                    color: "#60a5fa",
                    "&:hover": {
                      borderColor: "#60a5fa",
                      background: "rgba(96, 165, 250, 0.1)",
                    },
                  }}
                >
                  {disable ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    "更新"
                  )}
                </Button>
              </ListItemSecondaryAction>
            </ListItem>

            <Divider sx={{ mx: 2, borderColor: "rgba(255,255,255,0.05)" }} />

            <ListItem>
              <ListItemIcon sx={{ minWidth: 44 }}>
                <ResetIcon sx={{ color: "#f87171" }} />
              </ListItemIcon>
              <ListItemText
                primary="回到原廠設定"
                secondary="清除快取並重設資料庫"
                primaryTypographyProps={{ fontWeight: 600, color: "#f87171" }}
                secondaryTypographyProps={{
                  color: "rgba(255,255,255,0.5)",
                  fontSize: "0.75rem",
                }}
              />
              <ListItemSecondaryAction>
                <Button
                  variant="text"
                  size="small"
                  color="error"
                  onClick={handleFactoryReset}
                  sx={{ borderRadius: "10px" }}
                >
                  執行
                </Button>
              </ListItemSecondaryAction>
            </ListItem>

            <StyledListSubheader>應用程式</StyledListSubheader>

            <ListItem>
              <ListItemIcon sx={{ minWidth: 44 }}>
                <TopIcon sx={{ color: "#c084fc" }} />
              </ListItemIcon>
              <ListItemText
                primary="視窗置頂"
                secondary="保持視窗顯示在最前方"
                primaryTypographyProps={{ fontWeight: 600, color: "white" }}
                secondaryTypographyProps={{
                  color: "rgba(255,255,255,0.5)",
                  fontSize: "0.75rem",
                }}
              />
              <ListItemSecondaryAction>
                <Switch
                  checked={alwaysOnTop}
                  onChange={handleAlwaysOnTopChange}
                  sx={{
                    "& .MuiSwitch-switchBase.Mui-checked": { color: "#c084fc" },
                    "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                      backgroundColor: "#c084fc",
                    },
                  }}
                />
              </ListItemSecondaryAction>
            </ListItem>

            <Divider sx={{ mx: 2, borderColor: "rgba(255,255,255,0.05)" }} />

            <ListItem>
              <ListItemIcon sx={{ minWidth: 44 }}>
                <SettingsIcon sx={{ color: "#10b981" }} />
              </ListItemIcon>
              <ListItemText
                primary="顯示大盤資訊"
                secondary="首頁顯示指數與市場概況"
                primaryTypographyProps={{ fontWeight: 600, color: "white" }}
                secondaryTypographyProps={{
                  color: "rgba(255,255,255,0.5)",
                  fontSize: "0.75rem",
                }}
              />
            </ListItem>

            {/* Granular market settings */}
            <Box sx={{ pl: 4, pr: 2, pb: 2 }}>
              <Grid container spacing={1}>
                {[
                  { key: "cnn", label: "CNN 恐懼貪婪" },
                  { key: "mm", label: "財經 M 平方" },
                  { key: "nasdaq", label: "NASDAQ 指數" },
                  { key: "twse", label: "台股加權指數" },
                  { key: "otc", label: "櫃買指數" },
                  { key: "wtx", label: "台指期貨" },
                ].map((item) => (
                  <Grid size={6} key={item.key}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        background: "rgba(255,255,255,0.03)",
                        p: "4px 8px",
                        borderRadius: "8px",
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{ color: "rgba(255,255,255,0.7)", fontWeight: 500 }}
                      >
                        {item.label}
                      </Typography>
                      <Switch
                        size="small"
                        checked={(marketVisibility as any)[item.key]}
                        onChange={(e) =>
                          handleMarketVisibilityChange(
                            item.key,
                            e.target.checked
                          )
                        }
                        sx={{
                          "& .MuiSwitch-switchBase.Mui-checked": {
                            color: "#10b981",
                          },
                          "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track":
                            {
                              backgroundColor: "#10b981",
                            },
                        }}
                      />
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>

            <Divider sx={{ mx: 2, borderColor: "rgba(255,255,255,0.05)" }} />

            <ListItem>
              <ListItemIcon sx={{ minWidth: 44 }}>
                <BugReportIcon sx={{ color: "#fbbf24" }} />
              </ListItemIcon>
              <ListItemText
                primary="開發者模式"
                secondary="顯示內部除錯資訊"
                primaryTypographyProps={{ fontWeight: 600, color: "white" }}
                secondaryTypographyProps={{
                  color: "rgba(255,255,255,0.5)",
                  fontSize: "0.75rem",
                }}
              />
              <ListItemSecondaryAction>
                <Switch
                  checked={debugMode}
                  onChange={handleDebugModeChange}
                  sx={{
                    "& .MuiSwitch-switchBase.Mui-checked": { color: "#fbbf24" },
                    "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                      backgroundColor: "#fbbf24",
                    },
                  }}
                />
              </ListItemSecondaryAction>
            </ListItem>
          </List>
        </GlassCard>

        <Stack
          alignItems="center"
          spacing={1}
          sx={{ mt: 6, mb: 4, opacity: 0.6 }}
        >
          <SettingsIcon sx={{ fontSize: 32, color: "rgba(255,255,255,0.4)" }} />
          <Typography
            variant="body2"
            sx={{ letterSpacing: "1px", color: "rgba(255,255,255,0.4)" }}
          >
            SLSTEN PROJECT
          </Typography>
          <Box
            sx={{
              px: 1.5,
              py: 0.5,
              borderRadius: "8px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              v{VERSION}
            </Typography>
          </Box>
        </Stack>
      </Container>
    </PageContainer>
  );
}

export default Setting;
