import { semanticTokens } from "../../../theme";
import {
  ArrowBackIosNew as ArrowBackIcon,
  BugReport as BugReportIcon,
  BarChart as ChartIcon,
  DeleteOutline as DeleteOutlineIcon,
  CloudDownload as DownloadIcon,
  DeleteForever as ResetIcon,
  Settings as SettingsIcon,
  Sync as SyncIcon,
  Layers as TopIcon,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemSecondaryAction,
  ListItemText,
  Paper,
  Stack,
  styled,
  Switch,
  Typography,
} from "@mui/material";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { sendNotification } from "@tauri-apps/plugin-notification";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import useDownloadStocks from "../../../hooks/useDownloadStocks";
import useDebugStore from "../../../store/debug.store";
import useStocksStore from "../../../store/Stock.store";
import useUIStore from "../../../store/UI.store";
import IndicatorSettingsSection from "./IndicatorSettingsSection";
import StyledListSubheader from "./StyledListSubheader";
// Important: Make sure this path is correct or hardcode the version
import pkg from "../../../../package.json";

const VERSION = pkg.version || "0.1.0";

// --- Styled Components ---

const PageContainer = styled(Box)`
  width: 100%;
  height: 100%;
  overflow: auto;
  position: relative;
  background: #fdf8f2;
  backgroundimage:
    radial-gradient(at 0% 0%, rgba(61, 90, 69, 0.05) 0, transparent 50%),
    radial-gradient(at 100% 100%, rgba(210, 105, 30, 0.05) 0, transparent 50%);
  color: #5d4037;
  padding-bottom: 80px;
`;

const GhibliNotebookPaper = styled(Paper)(({ theme }) => ({
  background: "#FAF3E0",
  borderRadius: "20px",
  border: "2px solid #5D4037",
  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
  overflow: "hidden",
  marginTop: theme.spacing(2),
}));

function Setting() {
  const { t } = useTranslation();
  const {
    factory_reset,
    fetchSupabaseWatchStock,
    addStocks,
    removeSupabaseWatchStock,
    stocks,
    removeStocks,
  } = useStocksStore();
  const { handleDownloadMenu, disable } = useDownloadStocks();
  const navigate = useNavigate();
  const { stockBoxChartType, setStockBoxChartType } = useUIStore();

  const [syncLoading, setSyncLoading] = useState(false);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [pendingStocks, setPendingStocks] = useState<any[]>([]);
  const [selectedStocks, setSelectedStocks] = useState<string[]>([]);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteSelectedStocks, setDeleteSelectedStocks] = useState<string[]>(
    [],
  );

  const [alwaysOnTop, setAlwaysOnTop] = useState(
    localStorage.getItem("slitenting-alwaysOnTop") === "true",
  );
  const { isVisible: debugMode, toggleVisibility } = useDebugStore();
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
      margin: true,
    };
  });

  const handleAlwaysOnTopChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const checked = event.target.checked;
      setAlwaysOnTop(checked);
      localStorage.setItem("slitenting-alwaysOnTop", checked.toString());
      getCurrentWindow().setAlwaysOnTop(checked);
    },
    [],
  );

  const handleDebugModeChange = useCallback(() => {
    toggleVisibility();
  }, [toggleVisibility]);

  const handleMarketVisibilityChange = useCallback(
    (key: string, checked: boolean) => {
      setMarketVisibility((prev: any) => {
        const next = { ...prev, [key]: checked };
        localStorage.setItem(
          "slitenting-market-info-visibility",
          JSON.stringify(next),
        );
        return next;
      });
    },
    [],
  );

  const handleFactoryReset = useCallback(async () => {
    if (
      window.confirm(t("settings.resetConfirm"))
    ) {
      await factory_reset();
      sendNotification({ title: t("settings.factoryReset"), body: t("settings.resetDone") });
      window.location.reload();
    }
  }, [factory_reset]);

  const handleFetchSupabase = useCallback(async () => {
    try {
      setSyncLoading(true);
      const newStocks = await fetchSupabaseWatchStock();
      if (newStocks.length === 0) {
        sendNotification({ title: t("settings.sync"), body: t("settings.syncNone") });
      } else {
        setPendingStocks(newStocks);
        setSelectedStocks(newStocks.map((s) => s.id));
        setSyncDialogOpen(true);
      }
    } catch (e) {
      console.error(e);
      sendNotification({ title: t("marketData.error"), body: t("settings.syncFailed") });
    } finally {
      setSyncLoading(false);
    }
  }, [fetchSupabaseWatchStock]);

  const handleConfirmSync = useCallback(async () => {
    const stocksToAdd = pendingStocks.filter((s) =>
      selectedStocks.includes(s.id),
    );
    if (stocksToAdd.length > 0) {
      await addStocks(stocksToAdd);
      sendNotification({
        title: t("settings.sync"),
        body: t("settings.syncSuccess", { count: stocksToAdd.length }),
      });
    }
    setSyncDialogOpen(false);
  }, [pendingStocks, selectedStocks, addStocks]);

  const handleToggleSelectAll = () => {
    if (selectedStocks.length === pendingStocks.length) {
      setSelectedStocks([]);
    } else {
      setSelectedStocks(pendingStocks.map((s) => s.id));
    }
  };

  const handleToggleStock = (id: string) => {
    setSelectedStocks((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleDeleteCloudStock = useCallback(
    async (id: string, name: string) => {
      if (window.confirm(t("settings.deleteCloudConfirm", { id, name }))) {
        try {
          await removeSupabaseWatchStock(id);
          setPendingStocks((prev) => prev.filter((s) => s.id !== id));
          setSelectedStocks((prev) => prev.filter((i) => i !== id));
          sendNotification({ title: t("settings.delete"), body: t("settings.deleteSuccess", { count: 1 }) });
        } catch (e) {
          console.error(e);
          sendNotification({ title: t("marketData.error"), body: t("settings.deleteFailed") });
        }
      }
    },
    [removeSupabaseWatchStock],
  );

  const handleOpenDeleteDialog = useCallback(() => {
    setDeleteSelectedStocks([]);
    setDeleteDialogOpen(true);
  }, []);

  const handleToggleDeleteSelectAll = useCallback(() => {
    if (deleteSelectedStocks.length === stocks.length) {
      setDeleteSelectedStocks([]);
    } else {
      setDeleteSelectedStocks(stocks.map((s) => s.id));
    }
  }, [deleteSelectedStocks, stocks]);

  const handleToggleDeleteStock = useCallback((id: string) => {
    setDeleteSelectedStocks((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (deleteSelectedStocks.length > 0) {
      if (
        window.confirm(
          t("settings.deleteLocalConfirm", { count: deleteSelectedStocks.length }),
        )
      ) {
        await removeStocks(deleteSelectedStocks);
        sendNotification({
          title: t("settings.delete"),
          body: t("settings.deleteSuccess", { count: deleteSelectedStocks.length }),
        });
        setDeleteDialogOpen(false);
      }
    }
  }, [deleteSelectedStocks, removeStocks]);

  const switchStyles = {
    "& .MuiSwitch-switchBase.Mui-checked": { color: semanticTokens.app.primary },
    "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
      backgroundColor: semanticTokens.app.primary,
    },
  };

  return (
    <PageContainer>
      <Container maxWidth="sm" sx={{ pt: 4 }}>
        <Stack direction="row" alignItems="center" spacing={1} mb={2}>
          <IconButton
            onClick={() => navigate("/dashboard")}
            aria-label={t("a11y.back")}
            sx={{
              color: "#5D4037",
              background: "rgba(93, 64, 55, 0.05)",
              borderRadius: "10px",
              border: "1.5px solid #D2B48C",
            }}
          >
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <Typography variant="h5" fontWeight="900" sx={{ color: "#5D4037" }}>
            {t("settings.title")}
          </Typography>
        </Stack>

        <GhibliNotebookPaper elevation={0}>
          <List disablePadding>
            <StyledListSubheader>{t("settings.data")}</StyledListSubheader>

            <ListItem>
              <ListItemIcon sx={{ minWidth: 44 }}>
                <DownloadIcon sx={{ color: "#8B7355" }} />
              </ListItemIcon>
              <ListItemText
                primary={t("settings.updateStocks")}
                secondary={t("settings.updateStocksHint")}
                primaryTypographyProps={{ fontWeight: 800, color: "#5D4037" }}
                secondaryTypographyProps={{
                  color: "#8B7355",
                  fontSize: "0.75rem",
                  fontWeight: 600,
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
                    borderColor: semanticTokens.app.primary,
                    color: semanticTokens.app.primary,
                    fontWeight: 800,
                    borderWidth: "2px",
                    "&:hover": {
                      borderWidth: "2px",
                      borderColor: semanticTokens.app.primary,
                      background: "rgba(61, 90, 69, 0.05)",
                    },
                  }}
                >
                  {disable ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    t("settings.update")
                  )}
                </Button>
              </ListItemSecondaryAction>
            </ListItem>

            <Divider sx={{ mx: 2, borderColor: "rgba(93, 64, 55, 0.1)" }} />

            <ListItem>
              <ListItemIcon sx={{ minWidth: 44 }}>
                <SyncIcon sx={{ color: semanticTokens.app.primary }} />
              </ListItemIcon>
              <ListItemText
                primary={t("settings.syncStocks")}
                secondary={t("settings.syncStocksHint")}
                primaryTypographyProps={{ fontWeight: 800, color: "#5D4037" }}
                secondaryTypographyProps={{
                  color: "#8B7355",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                }}
              />
              <ListItemSecondaryAction>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleFetchSupabase}
                  disabled={syncLoading}
                  sx={{
                    borderRadius: "10px",
                    borderColor: semanticTokens.app.primary,
                    color: semanticTokens.app.primary,
                    fontWeight: 800,
                    borderWidth: "2px",
                    "&:hover": {
                      borderWidth: "2px",
                      borderColor: semanticTokens.app.primary,
                      background: "rgba(61, 90, 69, 0.05)",
                    },
                  }}
                >
                  {syncLoading ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    t("settings.sync")
                  )}
                </Button>
              </ListItemSecondaryAction>
            </ListItem>

            <Divider sx={{ mx: 2, borderColor: "rgba(93, 64, 55, 0.1)" }} />

            <ListItem>
              <ListItemIcon sx={{ minWidth: 44 }}>
                <DeleteOutlineIcon sx={{ color: "#E53935" }} />
              </ListItemIcon>
              <ListItemText
                primary={t("settings.deleteStocks")}
                secondary={t("settings.deleteStocksHint")}
                primaryTypographyProps={{ fontWeight: 800, color: "#E53935" }}
                secondaryTypographyProps={{
                  color: "#8B7355",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                }}
              />
              <ListItemSecondaryAction>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleOpenDeleteDialog}
                  sx={{
                    borderRadius: "10px",
                    borderColor: "#E53935",
                    color: "#E53935",
                    fontWeight: 800,
                    borderWidth: "2px",
                    "&:hover": {
                      borderWidth: "2px",
                      borderColor: "#E53935",
                      background: "rgba(229, 57, 53, 0.05)",
                    },
                  }}
                >
                  {t("settings.choose")}
                </Button>
              </ListItemSecondaryAction>
            </ListItem>

            <Divider sx={{ mx: 2, borderColor: "rgba(93, 64, 55, 0.1)" }} />

            <ListItem>
              <ListItemIcon sx={{ minWidth: 44 }}>
                <ResetIcon sx={{ color: semanticTokens.app.accent }} />
              </ListItemIcon>
              <ListItemText
                primary={t("settings.factoryReset")}
                secondary={t("settings.factoryResetHint")}
                primaryTypographyProps={{ fontWeight: 800, color: semanticTokens.app.accent }}
                secondaryTypographyProps={{
                  color: "#8B7355",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                }}
              />
              <ListItemSecondaryAction>
                <Button
                  variant="text"
                  size="small"
                  color="error"
                  onClick={handleFactoryReset}
                  sx={{ borderRadius: "10px", fontWeight: 800 }}
                >
                  {t("settings.run")}
                </Button>
              </ListItemSecondaryAction>
            </ListItem>

            <StyledListSubheader>{t("settings.application")}</StyledListSubheader>

            <ListItem>
              <ListItemIcon sx={{ minWidth: 44 }}>
                <TopIcon sx={{ color: "#8B7355" }} />
              </ListItemIcon>
              <ListItemText
                primary={t("settings.alwaysOnTop")}
                secondary={t("settings.alwaysOnTopHint")}
                primaryTypographyProps={{ fontWeight: 800, color: "#5D4037" }}
                secondaryTypographyProps={{
                  color: "#8B7355",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                }}
              />
              <ListItemSecondaryAction>
                <Switch
                  checked={alwaysOnTop}
                  onChange={handleAlwaysOnTopChange}
                  inputProps={{ "aria-label": t("settings.alwaysOnTop") }}
                  sx={switchStyles}
                />
              </ListItemSecondaryAction>
            </ListItem>

            <Divider sx={{ mx: 2, borderColor: "rgba(93, 64, 55, 0.1)" }} />

            <ListItem>
              <ListItemIcon sx={{ minWidth: 44 }}>
                <ChartIcon sx={{ color: semanticTokens.app.primary }} />
              </ListItemIcon>
              <ListItemText
                primary={t("settings.cardChart")}
                secondary={t("settings.cardChartHint")}
                primaryTypographyProps={{ fontWeight: 800, color: "#5D4037" }}
                secondaryTypographyProps={{
                  color: "#8B7355",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                }}
              />
              <ListItemSecondaryAction>
                <Stack alignItems="center">
                  <Typography
                    variant="caption"
                    sx={{
                      color: semanticTokens.app.primary,
                      fontWeight: 700,
                    }}
                  >
                    {stockBoxChartType === "mak" ? t("settings.candle") : t("settings.live")}
                  </Typography>
                  <Switch
                    checked={stockBoxChartType === "mak"}
                    onChange={(e) =>
                      setStockBoxChartType(e.target.checked ? "mak" : "tick")
                    }
                    inputProps={{ "aria-label": t("settings.cardChart") }}
                    sx={switchStyles}
                  />
                </Stack>
              </ListItemSecondaryAction>
            </ListItem>

            <Divider sx={{ mx: 2, borderColor: "rgba(93, 64, 55, 0.1)" }} />

            <ListItem>
              <ListItemIcon sx={{ minWidth: 44 }}>
                <SettingsIcon sx={{ color: semanticTokens.app.primary }} />
              </ListItemIcon>
              <ListItemText
                primary={t("settings.marketInfo")}
                secondary={t("settings.marketInfoHint")}
                primaryTypographyProps={{ fontWeight: 800, color: "#5D4037" }}
                secondaryTypographyProps={{
                  color: "#8B7355",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                }}
              />
            </ListItem>

            <Divider sx={{ mx: 2, borderColor: "rgba(93, 64, 55, 0.1)" }} />

            <ListItem>
              <ListItemIcon sx={{ minWidth: 44 }}>
                <BugReportIcon sx={{ color: "#D2B48C" }} />
              </ListItemIcon>
              <ListItemText
                primary={t("settings.developer")}
                secondary={t("settings.developerHint")}
                primaryTypographyProps={{ fontWeight: 800, color: "#5D4037" }}
                secondaryTypographyProps={{
                  color: "#8B7355",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                }}
              />
              <ListItemSecondaryAction>
                <Switch
                  checked={debugMode}
                  onChange={handleDebugModeChange}
                  inputProps={{ "aria-label": t("settings.developer") }}
                  sx={{
                    "& .MuiSwitch-switchBase.Mui-checked": { color: "#D2B48C" },
                    "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                      backgroundColor: "#D2B48C",
                    },
                  }}
                />
              </ListItemSecondaryAction>
            </ListItem>

            <Divider
              sx={{ mx: 2, mb: 2, borderColor: "rgba(93, 64, 55, 0.1)" }}
            />

            {/* Granular market settings */}
            <Box sx={{ pl: 4, pr: 2, pb: 2 }}>
              <Grid container spacing={1}>
                {[
                  { key: "cnn", label: t("settings.marketLabels.cnn") },
                  { key: "mm", label: t("settings.marketLabels.mm") },
                  { key: "nasdaq", label: t("settings.marketLabels.nasdaq") },
                  { key: "twse", label: t("settings.marketLabels.twse") },
                  { key: "otc", label: t("settings.marketLabels.otc") },
                  { key: "wtx", label: t("settings.marketLabels.wtx") },
                  { key: "margin", label: t("settings.marketLabels.margin") },
                ].map((item) => (
                  <Grid size={6} key={item.key}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        background: "rgba(93, 64, 55, 0.05)",
                        p: "4px 8px",
                        borderRadius: "8px",
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{ color: "#8B7355", fontWeight: 800 }}
                      >
                        {item.label}
                      </Typography>
                      <Switch
                        size="small"
                        checked={(marketVisibility as any)[item.key]}
                        onChange={(e) =>
                          handleMarketVisibilityChange(
                            item.key,
                            e.target.checked,
                          )
                        }
                        inputProps={{ "aria-label": item.label }}
                        sx={switchStyles}
                      />
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>

            <IndicatorSettingsSection />
          </List>
        </GhibliNotebookPaper>

        <Stack
          alignItems="center"
          spacing={1}
          sx={{ mt: 6, mb: 4, opacity: 0.6 }}
        >
          <SettingsIcon sx={{ fontSize: 32, color: "#8B7355" }} />
          <Typography
            variant="body2"
            sx={{ letterSpacing: "1px", color: "#8B7355", fontWeight: 900 }}
          >
            SLSTEN PROJECT
          </Typography>
          <Box
            sx={{
              px: 1.5,
              py: 0.5,
              borderRadius: "8px",
              background: "rgba(93, 64, 55, 0.05)",
              border: "1px solid #D2B48C",
            }}
          >
            <Typography
              variant="caption"
              sx={{ fontWeight: 800, color: "#5D4037" }}
            >
              v{VERSION}
            </Typography>
          </Box>
        </Stack>
      </Container>

      <Dialog
        open={syncDialogOpen}
        onClose={() => setSyncDialogOpen(false)}
        PaperProps={{
          sx: {
            background: "#FAF3E0",
            borderRadius: "24px",
            border: "2px solid #5D4037",
            color: "#5D4037",
            minWidth: "320px",
            backgroundImage: "none",
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 900, color: "#5D4037" }}>
          {t("settings.syncTitle")}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={selectedStocks.length === pendingStocks.length}
                  indeterminate={
                    selectedStocks.length > 0 &&
                    selectedStocks.length < pendingStocks.length
                  }
                  onChange={handleToggleSelectAll}
                  sx={{
                    color: "#8B7355",
                    "&.Mui-checked": { color: semanticTokens.app.primary },
                  }}
                />
              }
              label={
                <Typography
                  variant="body2"
                  sx={{ color: "#5D4037", fontWeight: 700 }}
                >
                  {t("settings.selectAll")}
                </Typography>
              }
            />
          </Box>
          <List dense sx={{ maxHeight: "300px", overflow: "auto" }}>
            {pendingStocks.map((stock) => (
              <ListItem
                key={stock.id}
                disablePadding
                secondaryAction={
                  <IconButton
                    edge="end"
                    aria-label={t("category.delete", { name: `${stock.id} ${stock.name}` })}
                    size="small"
                    onClick={() => handleDeleteCloudStock(stock.id, stock.name)}
                    sx={{ color: semanticTokens.app.accent }}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                }
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={selectedStocks.includes(stock.id)}
                      onChange={() => handleToggleStock(stock.id)}
                      sx={{
                        color: "#8B7355",
                        "&.Mui-checked": { color: semanticTokens.app.primary },
                      }}
                    />
                  }
                  label={
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 700, color: "#5D4037" }}
                    >
                      {stock.id} - {stock.name}
                    </Typography>
                  }
                  sx={{ width: "100%", ml: 0, mr: 0 }}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions sx={{ p: 4 }}>
          <Button
            onClick={() => setSyncDialogOpen(false)}
            sx={{
              color: "#8B7355",
              fontWeight: 800,
              textDecoration: "underline",
            }}
          >
            {t("settings.cancel")}
          </Button>
          <Button
            onClick={handleConfirmSync}
            variant="contained"
            disabled={selectedStocks.length === 0}
            sx={{
              borderRadius: "12px",
              background: semanticTokens.app.primary,
              color: semanticTokens.app.onPrimary,
              fontWeight: 900,
              border: "2px solid #2D4A35",
              boxShadow: "0 4px 0 #2D4A35",
              "&:hover": {
                background: semanticTokens.app.primary,
                transform: "translateY(2px)",
                boxShadow: "0 2px 0 #2D4A35",
              },
            }}
          >
            {t("settings.confirmAdd", { count: selectedStocks.length })}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{
          sx: {
            background: "#FAF3E0",
            borderRadius: "24px",
            border: "2px solid #5D4037",
            color: "#5D4037",
            minWidth: "320px",
            backgroundImage: "none",
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 900, color: "#E53935" }}>
          {t("settings.deleteStocks")}
        </DialogTitle>
        <DialogContent>
          {stocks.length === 0 ? (
            <Typography variant="body2" sx={{ color: "#8B7355", mt: 2 }}>
              {t("home.emptyWatchlist")}
            </Typography>
          ) : (
            <>
              <Box sx={{ mb: 2 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={
                        deleteSelectedStocks.length === stocks.length &&
                        stocks.length > 0
                      }
                      indeterminate={
                        deleteSelectedStocks.length > 0 &&
                        deleteSelectedStocks.length < stocks.length
                      }
                      onChange={handleToggleDeleteSelectAll}
                      sx={{
                        color: "#8B7355",
                        "&.Mui-checked": { color: "#E53935" },
                      }}
                    />
                  }
                  label={
                    <Typography
                      variant="body2"
                      sx={{ color: "#5D4037", fontWeight: 700 }}
                    >
                      {t("settings.selectAll")}
                    </Typography>
                  }
                />
              </Box>
              <List dense sx={{ maxHeight: "300px", overflow: "auto" }}>
                {stocks.map((stock) => (
                  <ListItem key={stock.id} disablePadding>
                    <FormControlLabel
                      control={
                        <Checkbox
                          size="small"
                          checked={deleteSelectedStocks.includes(stock.id)}
                          onChange={() => handleToggleDeleteStock(stock.id)}
                          sx={{
                            color: "#8B7355",
                            "&.Mui-checked": { color: "#E53935" },
                          }}
                        />
                      }
                      label={
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 700, color: "#5D4037" }}
                        >
                          {stock.id} - {stock.name}
                        </Typography>
                      }
                      sx={{ width: "100%", ml: 0, mr: 0 }}
                    />
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 4 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            sx={{
              color: "#8B7355",
              fontWeight: 800,
              textDecoration: "underline",
            }}
          >
            {t("settings.cancel")}
          </Button>
          <Button
            onClick={handleConfirmDelete}
            variant="contained"
            disabled={deleteSelectedStocks.length === 0}
            sx={{
              borderRadius: "12px",
              background: "#E53935",
              color: "#FFF",
              fontWeight: 900,
              border: "2px solid #B71C1C",
              boxShadow: "0 4px 0 #B71C1C",
              "&:hover": {
                background: "#D32F2F",
                transform: "translateY(2px)",
                boxShadow: "0 2px 0 #B71C1C",
              },
            }}
          >
            {t("settings.delete")} ({deleteSelectedStocks.length})
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}

export default Setting;
